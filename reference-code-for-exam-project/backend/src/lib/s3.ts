import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config/s3.js';

const s3 = new S3Client({
  region: config.s3.region,
  endpoint: config.s3.endpoint,
  forcePathStyle: config.s3.forcePathStyle,
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  },
});

/**
 * Key naming — no extension in the key, ever. Re-uploading to the same
 * entity key overwrites the old object, so a question always has at
 * most one image.
 *   question images: "questions/{questionId}"
 */
export function buildKey(entityType: string, entityId: string): string {
  return `${entityType}/${entityId}`;
}

export function createPutUrl(key: string, contentType: string) {
  const cmd = new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, cmd, { expiresIn: config.s3.putUrlExpirySeconds });
}

export function createGetUrl(key: string) {
  const cmd = new GetObjectCommand({ Bucket: config.s3.bucket, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn: config.s3.getUrlExpirySeconds });
}

export async function objectExists(key: string) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: config.s3.bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export function deleteObject(key: string) {
  return s3.send(new DeleteObjectCommand({ Bucket: config.s3.bucket, Key: key }));
}
