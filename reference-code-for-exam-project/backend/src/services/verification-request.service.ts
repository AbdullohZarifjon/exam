import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { Types } from 'mongoose';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Exam, Student, VerificationRequest, VERIFY_REQUEST_STATUS, BiometricEvent } from '../models/index.js';
import { config } from '../config/s3.js';
import { createGetUrl, deleteObject } from '../lib/s3.js';
import { BadRequestError, ConflictError, NotFoundError, AppError } from '../lib/errors.js';
import { EXAM_STATUS, FACE_STATUS, BIOMETRIC_EVENT } from '../config/constants.js';
import * as biometricService from './biometric.service.js';
import * as faceAuthService from './face-auth.service.js';
import { env } from '../config/env.js';

const PENDING_TTL_MS = 10 * 60 * 1000; // request waits at most 10 minutes
const PHOTO_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // selfie kept 7 days after decision

const s3Client = new S3Client({
  region: config.s3.region,
  endpoint: config.s3.endpoint,
  forcePathStyle: config.s3.forcePathStyle,
  credentials: { accessKeyId: config.s3.accessKeyId, secretAccessKey: config.s3.secretAccessKey },
});

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

function tokenMatches(candidate: string, storedHash: string) {
  const a = Buffer.from(hashToken(candidate));
  const b = Buffer.from(storedHash);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function expireIfStale(req: any) {
  if (req.status === VERIFY_REQUEST_STATUS.PENDING && req.expiresAt.getTime() <= Date.now()) {
    req.status = VERIFY_REQUEST_STATUS.EXPIRED;
    req.ttlAt = new Date(Date.now() + PHOTO_RETENTION_MS);
    await req.save();
  }
  return req;
}

/**
 * Kiosk: create a verification request. The student enters their code and
 * takes a live selfie; staff compare selfie vs enrollment photo in the
 * Verification tab and approve/deny. The code is only a lookup key —
 * the human ID check is the proof.
 */
export async function createRequest(input: { examId: string; studentCode: string; imageBase64: string; ip?: string; ua?: string }) {
  if (!Types.ObjectId.isValid(input.examId)) throw new BadRequestError('Invalid examId');
  const exam = await Exam.findById(input.examId);
  if (!exam) throw new NotFoundError('Exam not found');
  if (exam.status !== EXAM_STATUS.PUBLISHED) throw new ConflictError('Exam is not published');

  const code = input.studentCode.trim().toUpperCase();
  const student = await Student.findOne({ studentCode: code });
  // Single generic error: distinct messages would let anyone on the LAN
  // enumerate valid codes / account states.
  if (!student || !student.isActive || (student.face as any)?.status !== FACE_STATUS.ENROLLED) {
    throw new BadRequestError('Could not verify that student code');
  }

  // Throttle: at most 3 requests per student+exam per 10 minutes, and at
  // most 20 requests per exam per 10 minutes (queue-flood protection).
  // Each request costs a face embed + S3 upload, so this is also DoS control.
  const windowStart = new Date(Date.now() - 10 * 60 * 1000);
  const recentForStudent = await VerificationRequest.countDocuments({
    examId: exam._id, studentId: student._id, createdAt: { $gte: windowStart },
  });
  if (recentForStudent >= 3) {
    throw new AppError('Too many verification requests for this student — wait a few minutes.', 429, 'RATE_LIMITED');
  }
  const recentForExam = await VerificationRequest.countDocuments({
    examId: exam._id, createdAt: { $gte: windowStart },
  });
  if (recentForExam >= 20) {
    throw new AppError('Too many verification requests right now — wait a few minutes.', 429, 'RATE_LIMITED');
  }

  // One pending request per student+exam (prevents queue spam).
  const pending = await VerificationRequest.findOne({
    examId: exam._id, studentId: student._id, status: VERIFY_REQUEST_STATUS.PENDING,
  });
  if (pending && pending.expiresAt.getTime() > Date.now()) {
    throw new ConflictError('A verification request for this student is already pending');
  }

  // The selfie must contain exactly one clear face, like enrollment.
  const svc = (await biometricService.embedImage(input.imageBase64)) as any;
  if (!Array.isArray(svc?.embedding) || svc.embedding.length === 0) {
    throw new BadRequestError('No face detected in the selfie');
  }
  const faceCount = typeof svc.faceCount === 'number' ? svc.faceCount : 1;
  if (faceCount !== 1) throw new BadRequestError('More than one face detected — take a selfie of only yourself');
  if (typeof svc.quality === 'number' && svc.quality < env.FACE_MIN_QUALITY) {
    throw new BadRequestError(`Selfie quality too low (${Math.round(svc.quality * 100)}%) — closer, well-lit photo needed`);
  }

  // Candidates for the admin view — reuses the SAME embedding as the
  // quality check above (identify() would embed the selfie a 2nd time).
  let candidates: { studentId: string; score: number }[] = [];
  try {
    const match = await biometricService.identifyByEmbedding(svc.embedding);
    candidates = (match?.candidates ?? []).filter((c: any) => c?.studentId).slice(0, 5);
  } catch { /* admin still sees claimed student + selfie */ }

  const claimToken = randomBytes(24).toString('hex');
  const req = await VerificationRequest.create({
    examId: exam._id,
    studentId: student._id,
    studentCode: code,
    candidates,
    status: VERIFY_REQUEST_STATUS.PENDING,
    expiresAt: new Date(Date.now() + PENDING_TTL_MS),
    claimTokenHash: hashToken(claimToken),
  });

  // Store the selfie (deleted 7 days after the decision via ttlAt + sweep).
  const photoKey = `verify-requests/${req._id}`;
  try {
    const base64Data = input.imageBase64.includes(',') ? input.imageBase64.split(',')[1] : input.imageBase64;
    await s3Client.send(new PutObjectCommand({
      Bucket: config.s3.bucket, Key: photoKey,
      Body: Buffer.from(base64Data, 'base64'), ContentType: 'image/jpeg',
    }));
    req.photoKey = photoKey;
    await req.save();
  } catch { /* request still valid without photo; admin sees candidates */ }

  await BiometricEvent.create({
    studentId: student._id, examId: exam._id, event: BIOMETRIC_EVENT.FAIL,
    model: svc.model, ip: input.ip, ua: input.ua,
    detail: `verify-request created (${String(req._id)})`,
  });

  return { requestId: String(req._id), claimToken, status: req.status, expiresAt: req.expiresAt };
}

/**
 * Kiosk poll (every 10s). Returns pending/denied/expired, or — on approval —
 * starts/resumes the attempt and returns the full auth payload ONCE.
 */
export async function pollAndClaim(requestId: string, claimToken: string, ip?: string, ua?: string) {
  if (!Types.ObjectId.isValid(requestId)) throw new BadRequestError('Invalid request id');
  const req = await VerificationRequest.findById(requestId);
  if (!req) throw new NotFoundError('Request not found');
  if (!tokenMatches(claimToken, req.claimTokenHash)) throw new BadRequestError('Invalid claim token');

  await expireIfStale(req);
  if (req.status === VERIFY_REQUEST_STATUS.PENDING) return { status: 'pending' as const };
  if (req.status === VERIFY_REQUEST_STATUS.DENIED) return { status: 'denied' as const };
  if (req.status === VERIFY_REQUEST_STATUS.EXPIRED) return { status: 'expired' as const };
  if (req.status === VERIFY_REQUEST_STATUS.CLAIMED) return { status: 'claimed' as const };

  // Approved — claim exactly once.
  const claimed = await VerificationRequest.findOneAndUpdate(
    { _id: req._id, status: VERIFY_REQUEST_STATUS.APPROVED },
    { $set: { status: VERIFY_REQUEST_STATUS.CLAIMED } },
    { new: true },
  );
  if (!claimed) return { status: 'claimed' as const };

  let result;
  try {
    result = await faceAuthService.startAttemptForApprovedRequest(
      String(req.studentId), String(req.examId), String(req.decidedBy ?? ''), ip, ua,
    );
  } catch (err) {
    // Roll the claim back so the kiosk can retry instead of spinning
    // forever on a request that can never be claimed.
    await VerificationRequest.updateOne(
      { _id: req._id, status: VERIFY_REQUEST_STATUS.CLAIMED },
      { $set: { status: VERIFY_REQUEST_STATUS.APPROVED } },
    );
    throw err;
  }
  return { status: 'approved' as const, result };
}

export async function listForStaff() {
  const list = await VerificationRequest.find().sort({ createdAt: -1 }).limit(100).lean();
  for (const r of list as any[]) {
    if (r.status === VERIFY_REQUEST_STATUS.PENDING && new Date(r.expiresAt).getTime() <= Date.now()) {
      r.status = VERIFY_REQUEST_STATUS.EXPIRED;
      if (!r.ttlAt) r.ttlAt = new Date(Date.now() + PHOTO_RETENTION_MS);
    }
  }
  const out = [];
  for (const r of list as any[]) {
    const [exam, student] = await Promise.all([
      Exam.findById(r.examId).lean(),
      Student.findById(r.studentId).lean(),
    ]);
    let selfieUrl: string | undefined;
    let enrollmentPhotoUrl: string | undefined;
    if (r.photoKey) { try { selfieUrl = await createGetUrl(r.photoKey); } catch { /* expired key */ } }
    const enrollKey = (student as any)?.face?.photoKey || `faces/${r.studentId}`;
    try { enrollmentPhotoUrl = await createGetUrl(enrollKey); } catch { /* none */ }
    out.push({
      id: String(r._id),
      status: r.status,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
      decidedAt: r.decidedAt ?? null,
      exam: exam ? { id: String(exam._id), title: exam.title } : null,
      student: student ? { id: String(student._id), fullName: student.fullName, studentCode: student.studentCode } : null,
      claimedCode: r.studentCode,
      candidates: (r.candidates ?? []).map((c: any) => ({ studentId: String(c.studentId), score: c.score })),
      selfieUrl, enrollmentPhotoUrl,
    });
  }
  return out;
}

export async function decide(requestId: string, staffId: string, approve: boolean, ip?: string, ua?: string) {
  if (!Types.ObjectId.isValid(requestId)) throw new BadRequestError('Invalid request id');
  const req = await VerificationRequest.findById(requestId);
  if (!req) throw new NotFoundError('Request not found');
  await expireIfStale(req);
  if (req.status !== VERIFY_REQUEST_STATUS.PENDING) {
    throw new ConflictError(`Request is already ${req.status}`);
  }
  const now = new Date();
  req.status = approve ? VERIFY_REQUEST_STATUS.APPROVED : VERIFY_REQUEST_STATUS.DENIED;
  req.decidedBy = staffId as never;
  req.decidedAt = now;
  req.ttlAt = new Date(now.getTime() + PHOTO_RETENTION_MS);
  await req.save();

  await BiometricEvent.create({
    studentId: req.studentId, examId: req.examId,
    event: BIOMETRIC_EVENT.OVERRIDE, ip, ua,
    detail: `verify-request ${approve ? 'approved' : 'denied'} by staff ${staffId} (${String(req._id)})`,
  });
  return { id: String(req._id), status: req.status };
}

/**
 * Hourly sweep: (a) expire pending requests past their 10-minute window
 * (sets status + 7-day ttlAt), (b) delete selfie objects whose 7-day
 * retention has passed. Mongo TTL removes the documents themselves.
 */
export async function cleanupExpiredPhotos() {
  await VerificationRequest.updateMany(
    { status: VERIFY_REQUEST_STATUS.PENDING, expiresAt: { $lte: new Date() } },
    [{ $set: {
      status: VERIFY_REQUEST_STATUS.EXPIRED,
      ttlAt: { $add: [new Date(), PHOTO_RETENTION_MS] },
    } }],
  );
  const expired = await VerificationRequest.find({ ttlAt: { $lte: new Date() } }).lean();
  for (const r of expired as any[]) {
    if (r.photoKey) { try { await deleteObject(r.photoKey); } catch { /* already gone */ } }
  }
  // Mongo TTL index removes the documents themselves; this only
  // guarantees the S3 bytes are gone even if TTL lags.
  return expired.length;
}

export function startVerifyCleanup() {
  const run = () => cleanupExpiredPhotos().catch(() => undefined);
  run();
  return setInterval(run, 60 * 60 * 1000);
}
