// @ts-nocheck
import { env } from '../config/env.js';
import { BadRequestError } from '../lib/errors.js';
import { Student } from '../models/index.js';
import { FACE_STATUS, BIOMETRIC_EVENT } from '../config/constants.js';
import { BiometricEvent } from '../models/index.js';
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { config } from '../config/s3.js';
import { createGetUrl, objectExists } from '../lib/s3.js';

/**
 * Provider-agnostic face client. All inference runs on-prem (face-service,
 * Faster. FACE_SERVICE_URL) - no image ever leaves the LAN.
 *
 * face-service contract:
 *   POST /embed    { imageBase64 } -> { embedding:number[], quality:number, model:string }
 *   POST /identify { embedding }   -> { studentId, score, gap, model, quality } (best match)
 *   POST /enroll   { studentId, embedding } -> { ok:true }
 *   DELETE /student/:id -> { ok:true }
 */

const s3Client = new S3Client({
  region: config.s3.region,
  endpoint: config.s3.endpoint,
  forcePathStyle: config.s3.forcePathStyle,
  credentials: { accessKeyId: config.s3.accessKeyId, secretAccessKey: config.s3.secretAccessKey },
});

async function fetchFace(path: string, init?: RequestInit) {
  const base = env.FACE_SERVICE_URL.replace(/\/$/, '');
  const res = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers as Record<string, string> | undefined) },
    ...init,
  });
  if (!res.ok) {
    // FastAPI answers errors as { detail: "No face detected" } — surface that
    // to staff instead of hiding it behind a bare status code.
    let detail = '';
    try {
      const body = (await res.clone().json()) as { detail?: string };
      detail = typeof body?.detail === 'string' ? body.detail : '';
    } catch { /* non-JSON error body — fall through to the generic message */ }
    throw new BadRequestError(
      detail || (res.status === 400
        ? 'No face detected — upload a clear, centered, well-lit photo of the student.'
        : `Face service error (${res.status})`),
    );
  }
  return res.json();
}

export async function embedImage(imageBase64: string) {
  return fetchFace('/embed', { method: 'POST', body: JSON.stringify({ imageBase64 }) });
}

export async function enrollStudent(studentId: string, imageBase64: string, enrolledBy?: string) {
  const svc = await embedImage(imageBase64);
  if (!Array.isArray(svc?.embedding) || svc.embedding.length === 0) {
    throw new BadRequestError('Face service did not return an embedding');
  }
  // Enrollment gate: exactly one clear, close enough face. A group shot or a
  // distant face embeds the wrong embedding and must never reach the kiosk.
  const faceCount = typeof svc.faceCount === 'number' ? svc.faceCount : 1;
  if (faceCount !== 1) {
    throw new BadRequestError('More than one face detected — upload a photo of only this student, clear and centered.');
  }
  if (typeof svc.quality === 'number' && svc.quality < env.FACE_MIN_QUALITY) {
    throw new BadRequestError(
      `Face photo quality too low (${Math.round(svc.quality * 100)}%, minimum ${Math.round(env.FACE_MIN_QUALITY * 100)}%) — use a closer, well-lit photo with the face clearly visible.`,
    );
  }
  const student = await Student.findById(studentId).select('+face.embedding');
  if (!student) throw new BadRequestError('Student not found');
  student.face = {
    ...(student.face as object),
    status: FACE_STATUS.ENROLLED,
    embedding: svc.embedding,
    enrolledAt: new Date(),
    enrolledBy: enrolledBy as never,
    qualityScore: svc.quality,
    model: svc.model,
  } as never;
  (student as never as { faceConsentAt: Date }).faceConsentAt = new Date();
  (student as never as { faceConsentVersion: string }).faceConsentVersion = env.FACE_CONSENT_VERSION;
  // Store enrollment photo (faces/<studentId>, overwrite = replace)
  const photoKey = `faces/${studentId}`;
  try {
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const buffer = Buffer.from(base64Data, 'base64');
    await s3Client.send(new PutObjectCommand({ Bucket: config.s3.bucket, Key: photoKey, Body: buffer, ContentType: 'image/jpeg' }));
    (student.face as any).photoKey = photoKey;
  } catch { /* photo store is best-effort; embedding is authoritative */ }
  await student.save();
  try {
    await fetchFace('/enroll', { method: 'POST', body: JSON.stringify({ studentId, embedding: svc.embedding }) });
  } catch { /* index rebuild fallback is lazy */ }

  // Look-alike (twin/sibling) detection: search the gallery with the new
  // embedding. Any OTHER student within the match threshold is flagged
  // both ways — flagged students are routed to supervised desk
  // verification at the kiosk instead of the unsupervised face path.
  // Best-effort: enrollment succeeds even if the check is unavailable.
  let lookalikeDetail = '';
  try {
    const match = await fetchFace('/identify', { method: 'POST', body: JSON.stringify({ embedding: svc.embedding }) });
    const rivals = (match?.candidates ?? []).filter(
      (c: { studentId?: string; score?: number }) =>
        c?.studentId && c.studentId !== studentId && (c.score ?? 0) >= env.FACE_MATCH_THRESHOLD,
    );
    if (rivals.length > 0) {
      const rivalIds = rivals.map((c: { studentId: string }) => c.studentId);
      await Student.updateOne(
        { _id: studentId },
        { $addToSet: { 'face.lookalikeWith': { $each: rivalIds } } },
      );
      await Student.updateMany(
        { _id: { $in: rivalIds } },
        { $addToSet: { 'face.lookalikeWith': studentId } },
      );
      lookalikeDetail = ` lookalike-flagged:${rivalIds.join(',')}`;
    }
  } catch { /* flagging is best-effort */ }

  await BiometricEvent.create({
    studentId, event: BIOMETRIC_EVENT.ENROLL, score: null, model: svc.model, detail: `quality=${svc.quality}${lookalikeDetail}`,
  });
  return { embedding: svc.embedding, quality: svc.quality, model: svc.model };
}

export async function identifyByEmbedding(embedding: number[]) {
  try {
    const result = await fetchFace('/identify', { method: 'POST', body: JSON.stringify({ embedding }) });
    if (result?.count === 0) return identifyLocally(embedding);
    const candidates = Array.isArray(result?.candidates)
      ? result.candidates.filter((c: { studentId?: string }) => c?.studentId)
      : result?.studentId
        ? [{ studentId: result.studentId, score: result.score }]
        : [];
    return {
      studentId: result?.studentId ?? candidates[0]?.studentId ?? null,
      score: result?.score ?? candidates[0]?.score ?? 0,
      gap: result?.gap ?? 0,
      model: result?.model ?? 'buffalo_s',
      count: result?.count,
      candidates,
    };
  } catch {
    return identifyLocally(embedding);
  }
}

export async function identify(imageBase64: string, ip?: string, ua?: string) {
  const svc = await embedImage(imageBase64);
  if (!Array.isArray(svc?.embedding) || svc.embedding.length === 0) {
    throw new BadRequestError('Face service did not return an embedding');
  }
  // Enrollment gate: exactly one clear, close enough face. A group shot or a
  // distant face embeds the wrong embedding and must never reach the kiosk.
  const faceCount = typeof svc.faceCount === 'number' ? svc.faceCount : 1;
  if (faceCount !== 1) {
    throw new BadRequestError('More than one face detected — upload a photo of only this student, clear and centered.');
  }
  if (typeof svc.quality === 'number' && svc.quality < env.FACE_MIN_QUALITY) {
    throw new BadRequestError(
      `Face photo quality too low (${Math.round(svc.quality * 100)}%, minimum ${Math.round(env.FACE_MIN_QUALITY * 100)}%) — use a closer, well-lit photo with the face clearly visible.`,
    );
  }
  // Prefer the face-service FAISS gallery (fast at 45k scale). Fall back
  // to a brute-force Mongo cosine scan if the service is unreachable OR
  // its gallery is empty (e.g. index file lost — startup rebuild heals
  // this, but a kiosk scan must never hard-fail because of it).
  try {
    const result = await fetchFace('/identify', { method: 'POST', body: JSON.stringify({ embedding: svc.embedding }) });
    if (result?.count === 0) return identifyLocally(svc.embedding);
    // Normalize to the shared shape (candidates = distinct students, best first).
    const candidates = Array.isArray(result?.candidates)
      ? result.candidates.filter((c: { studentId?: string }) => c?.studentId)
      : result?.studentId
        ? [{ studentId: result.studentId, score: result.score }]
        : [];
    return {
      studentId: result?.studentId ?? candidates[0]?.studentId ?? null,
      score: result?.score ?? candidates[0]?.score ?? 0,
      gap: result?.gap ?? 0,
      model: result?.model ?? svc.model,
      count: result?.count,
      candidates,
    };
  } catch {
    return identifyLocally(svc.embedding);
  }
}

/**
 * Rebuilds the face-service FAISS gallery from Mongo (source of truth).
 * Called once on backend startup, best-effort: the kiosk keeps working
 * through the Mongo fallback even if the face-service is not up yet.
 */
export async function rebuildFaceIndex(): Promise<{ ok: boolean; count: number }> {
  const students = await Student.find({ 'face.status': FACE_STATUS.ENROLLED })
    .select('_id +face.embedding')
    .lean();
  const items = students
    .filter((s) => Array.isArray((s as unknown as { face?: { embedding?: number[] } }).face?.embedding))
    .map((s) => ({
      studentId: String(s._id),
      embedding: (s as unknown as { face: { embedding: number[] } }).face.embedding,
    }));
  const result = await fetchFace('/rebuild', { method: 'POST', body: JSON.stringify({ items }) });
  return { ok: true, count: result?.count ?? items.length };
}

async function identifyLocally(probe: number[]) {
  const students = await Student.find({ 'face.status': FACE_STATUS.ENROLLED }).select('_id +face.embedding').lean();
  const norm = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  const probeNorm = norm(probe);
  const scored = students.map((s) => {
    const emb = (s as unknown as { face?: { embedding?: number[] } }).face?.embedding || [];
    const en = norm(emb);
    let dot = 0;
    const len = Math.min(probe.length, emb.length);
    for (let i = 0; i < len; i++) dot += probe[i] * emb[i];
    return { id: String(s._id), score: dot / (probeNorm * en) };
  }).sort((a, b) => b.score - a.score);
  const top1 = scored[0];
  const top2 = scored[1];
  if (!top1) return { studentId: null, score: 0, gap: 0, model: 'local', candidates: [] };
  return {
    studentId: top1.id,
    score: top1.score,
    gap: top1.score - (top2?.score ?? 0),
    model: 'local',
    candidates: scored.slice(0, 5).map((s) => ({ studentId: s.id, score: s.score })),
  };
}

/**
 * Enrollment photo as base64 (Stage-2 rerank compares the probe against
 * the candidate's enrollment photo with the second model). null when
 * the student has no stored photo.
 */
export async function getEnrollmentPhotoBase64(studentId: string): Promise<string | null> {
  const student = await Student.findById(studentId).select('face.photoKey');
  if (!student) return null;
  const photoKey = (student.face as any)?.photoKey || `faces/${studentId}`;
  try {
    const obj = await s3Client.send(new GetObjectCommand({ Bucket: config.s3.bucket, Key: photoKey }));
    const bytes = await obj.Body?.transformToByteArray();
    if (!bytes) return null;
    return Buffer.from(bytes).toString('base64');
  } catch {
    return null;
  }
}

/**
 * Stage-2 pairwise verification with the independent second model.
 * Returns the cosine score, or null when rerank is unavailable
 * (model not loaded / no enrollment photo / no face found).
 */
export async function verifyPair(probeImageBase64: string, studentId: string): Promise<number | null> {
  const gallery = await getEnrollmentPhotoBase64(studentId);
  if (!gallery) return null;
  try {
    const result = await fetchFace('/verify-pair', {
      method: 'POST',
      body: JSON.stringify({ probeImageBase64, galleryImageBase64: gallery }),
    });
    if (!result?.available || typeof result?.score !== 'number') return null;
    return result.score;
  } catch {
    return null;
  }
}

export async function revokeStudent(studentId: string, actorIp?: string) {
  const student = await Student.findById(studentId).select('+face.embedding');
  if (!student) throw new BadRequestError('Student not found');
  const photoKey = (student.face as any)?.photoKey || `faces/${studentId}`;
  student.set('face.status', FACE_STATUS.REVOKED);
  student.set('face.embedding', undefined);
  student.set('face.photoKey', undefined);
  await student.save();
  // Photo + index cleanup are best-effort: the embedding is already
  // cleared in Mongo, and startup rebuild resyncs the FAISS gallery.
  try { await s3Client.send(new DeleteObjectCommand({ Bucket: config.s3.bucket, Key: photoKey })); } catch {}
  try { await fetch(`${env.FACE_SERVICE_URL.replace(/\/$/, '')}/student/${studentId}`, { method: 'DELETE' }); } catch {}
  await BiometricEvent.create({ studentId, event: BIOMETRIC_EVENT.REVOKE, ip: actorIp });
  return { ok: true };
}
