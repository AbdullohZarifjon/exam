import { Upload, Question } from '../models/index.js';
import { config } from '../config/s3.js';
import { buildKey, createPutUrl, createGetUrl, objectExists, deleteObject } from '../lib/s3.js';
import { BadRequestError, NotFoundError } from '../lib/errors.js';

/**
 * Presigned-URL upload flow. Question images are a SINGLE-image entity:
 * the key is always "questions/{questionId}", so a re-upload overwrites
 * the previous image in place.
 */

export async function requestUpload(input: {
  entityType: string;
  entityId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}): Promise<{ uploadId: string; uploadUrl: string; key: string }> {
  if (input.entityType !== 'question') throw new BadRequestError('Unsupported entity type');

  const extension = input.fileName.split('.').pop()?.toLowerCase() ?? '';
  if (!config.s3.allowedExtensions.includes(extension)) {
    throw new BadRequestError(`Extension .${extension} not allowed`);
  }
  if (input.sizeBytes > config.s3.maxFileSizeBytes) {
    throw new BadRequestError('File too large');
  }
  if (!input.contentType.startsWith('image/')) {
    throw new BadRequestError('Only image uploads are supported');
  }

  const question = await Question.findById(input.entityId);
  if (!question) throw new NotFoundError('Question not found');

  const key = buildKey(input.entityType, input.entityId);
  const uploadUrl = await createPutUrl(key, input.contentType);

  // Upsert: re-requesting an upload for the same question reuses the row.
  const row = await Upload.findOneAndUpdate(
    { key },
    {
      entityType: input.entityType,
      entityId: input.entityId,
      key,
      originalName: input.fileName,
      extension,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      status: 'pending',
      confirmedAt: null,
    },
    { upsert: true, new: true },
  );

  return { uploadId: String(row._id), uploadUrl, key };
}

/**
 * The whole point of confirmation: don't trust the client's word —
 * verify the object actually exists with a HEAD request.
 */
export async function confirmUpload(uploadId: string): Promise<{ key: string; imageUrl: string }> {
  const row = await Upload.findById(uploadId);
  if (!row || row.status !== 'pending') throw new BadRequestError('Invalid upload');

  if (!(await objectExists(row.key))) throw new BadRequestError('Object not found in storage');

  row.status = 'confirmed';
  row.confirmedAt = new Date();
  await row.save();

  // Attach to the question in the same step — no orphaned references.
  await Question.updateOne({ _id: row.entityId }, { $set: { imageUrl: row.key } });

  return { key: row.key, imageUrl: await createGetUrl(row.key) };
}

/** Soft-delete: flip status, let the (opt-in) cleanup sweep remove bytes. */
export async function deleteUpload(uploadId: string): Promise<void> {
  const row = await Upload.findById(uploadId);
  if (!row) throw new NotFoundError('Upload not found');
  row.status = 'unconfirmed';
  await row.save();
  await Question.updateOne({ _id: row.entityId }, { $unset: { imageUrl: 1 } });
}

/**
 * Remove the image attached to a given question. Looks up the latest
 * confirmed/pending Upload row for this question and marks it unconfirmed,
 * then unsets the question's imageUrl field. Idempotent: calling on a
 * question that has no image is a no-op.
 */
export async function removeImageForQuestion(questionId: string): Promise<{ removed: boolean }> {
  if (!questionId.match(/^[a-f\d]{24}$/i)) throw new BadRequestError('Invalid questionId');
  const row = await Upload.findOne({ entityType: 'question', entityId: questionId }).sort({
    createdAt: -1,
  });
  if (row) {
    row.status = 'unconfirmed';
    await row.save();
  }
  await Question.updateOne({ _id: questionId }, { $unset: { imageUrl: 1 } });
  return { removed: true };
}

/** Presigned GET for serving — generated per read, never stored. */
export async function getImageUrl(key: string): Promise<string> {
  return createGetUrl(key);
}
