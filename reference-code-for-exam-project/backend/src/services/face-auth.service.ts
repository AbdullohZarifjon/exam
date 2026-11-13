import { Types } from 'mongoose';
import { Student, Exam, BiometricEvent } from '../models/index.js';
import { env } from '../config/env.js';
import { FACE_STATUS, EXAM_STATUS, BIOMETRIC_EVENT, OWNER_TYPES } from '../config/constants.js';
import { signAccessToken, signRefreshToken } from '../lib/jwt.js';
import { UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, BadRequestError, AppError } from '../lib/errors.js';
import * as attemptService from './attempt.service.js';
import * as biometricService from './biometric.service.js';
import { toPublicStudent } from './auth.service.js';
import { serializeAttempt } from '../serializers/index.js';

/**
 * Cascaded face identification (1:N).
 *
 * Stage 1 (fast, every scan): buffalo_s embedding + FAISS top-5 +
 * score/gap gates. Clear pass → attempt starts. Clear fail → reject.
 * Borderline (score or gap in the grey zone) → Stage 2.
 *
 * Stage 2 (accurate, borderline only): pairwise rerank of the top
 * candidates with an independent second model (probe vs enrollment
 * photo). The candidate must confirm under the second model too.
 *
 * Desk (human): look-alike-flagged students (twins/siblings detected
 * at enrollment), ambiguous clusters (2+ students above threshold),
 * and anything Stage 2 cannot confirm are rejected to the supervised
 * enrollment desk, where staff verify an ID document and use
 * The kiosk itself never guesses.
 */

type Candidate = { studentId: string; score: number };

const FACE_FAIL_WINDOW_MS = 30 * 1000;
const FACE_FAIL_MAX = 5;

export async function identifyAndStartAttempt(imageBase64: string, examId: string, ip?: string, ua?: string): Promise<unknown> {
  const matchThreshold = env.FACE_MATCH_THRESHOLD;
  const gapThreshold = env.FACE_GAP_THRESHOLD;

  // Cooldown: 5 failed scans for this exam within a 30s window blocks
  // further scans (429). Counts the audited FAIL events, so it survives
  // restarts and covers every kiosk for the exam.
  if (Types.ObjectId.isValid(examId)) {
    const since = new Date(Date.now() - FACE_FAIL_WINDOW_MS);
    const recentFails = await BiometricEvent.countDocuments({
      examId: new Types.ObjectId(examId),
      event: BIOMETRIC_EVENT.FAIL,
      createdAt: { $gte: since },
    });
    if (recentFails >= FACE_FAIL_MAX) {
      throw new AppError('Too many failed scans — wait 30 seconds and try again.', 429, 'FACE_COOLDOWN', { retryAfterSeconds: 30 });
    }
  }

  const result = await biometricService.identify(imageBase64, ip, ua);
  const candidates: Candidate[] = (result?.candidates ?? [])
    .filter((c: { studentId?: string; score?: number }) => c?.studentId && typeof c?.score === 'number')
    .sort((a: Candidate, b: Candidate) => b.score - a.score);
  const top1 = candidates[0];

  const fail = async (detail: string, sid?: string, score?: number, gap?: number, model?: string): Promise<never> => {
    await BiometricEvent.create({
      studentId: sid ? new Types.ObjectId(sid) : undefined,
      examId: new Types.ObjectId(examId),
      event: BIOMETRIC_EVENT.FAIL,
      score, gap, model, ip, ua, detail,
    });
    throw new UnauthorizedError('Not recognized. Please go to the enrollment desk.');
  };

  if (!top1) { await fail('no-candidate', undefined, result?.score, result?.gap, result?.model); throw new UnauthorizedError('unreachable'); }

  // NOTE: `.select('+tokenVersion')` alone is an exclusive projection
  // (all default fields + tokenVersion). Adding field names would turn it
  // into an inclusive projection that drops `isActive`/`face.status` and
  // makes every enrolled student fail as "inactive".
  const student = await Student.findById(top1.studentId).select('+tokenVersion');
  if (!student || !student.isActive) { await fail('inactive', top1.studentId, top1.score, result?.gap, result?.model); throw new UnauthorizedError('unreachable'); }
  if ((student.face as unknown as { status?: string })?.status !== FACE_STATUS.ENROLLED) {
    await fail('not-enrolled', top1.studentId, top1.score, result?.gap, result?.model);
  }

  // Desk rule 1: look-alike-flagged (twin/sibling cluster) — the face
  // alone can never decide these, so a human verifies an ID document.
  const lookalikes = ((student.face as unknown as { lookalikeWith?: unknown[] })?.lookalikeWith ?? []);
  if (lookalikes.length > 0) {
    await BiometricEvent.create({
      studentId: top1.studentId, examId: new Types.ObjectId(examId), event: BIOMETRIC_EVENT.FAIL,
      score: top1.score, gap: result?.gap, model: result?.model, ip, ua,
      detail: 'lookalike-flagged: verification required',
    });
    throw new AppError('This face looks like another enrolled student — verification required.', 409, 'LOOKALIKE_VERIFICATION_REQUIRED', { examId });
  }

  // Desk rule 2: ambiguous cluster — 2+ distinct students above the
  // match threshold, even if top1-top2 gap happens to pass.
  const aboveThreshold = candidates.filter((c) => c.score >= matchThreshold);
  if (aboveThreshold.length >= 2) {
    await BiometricEvent.create({
      studentId: top1.studentId, examId: new Types.ObjectId(examId), event: BIOMETRIC_EVENT.FAIL,
      score: top1.score, gap: result?.gap, model: result?.model, ip, ua,
      detail: `ambiguous: ${aboveThreshold.length} candidates above threshold`,
    });
    throw new AppError('This face matches more than one student — verification required.', 409, 'LOOKALIKE_VERIFICATION_REQUIRED', { examId });
  }

  const gap = top1.score - (candidates[1]?.score ?? 0);

  // Stage 1: clear pass.
  if (top1.score >= matchThreshold && gap >= gapThreshold) {
    return startAttemptForStudent(student, examId, {
      method: 'face', score: top1.score, gap, model: result?.model, ip, ua,
    });
  }

  // Stage 2: borderline grey zone → independent-model rerank.
  const borderline =
    top1.score >= matchThreshold - 0.10 || gap >= gapThreshold - 0.04;
  if (borderline) {
    const rerank1 = await biometricService.verifyPair(imageBase64, top1.studentId);
    if (rerank1 !== null && rerank1 >= matchThreshold) {
      // Confirm the runner-up does NOT also confirm under model 2.
      let rerankGapOk = true;
      if (candidates[1]) {
        const rerank2 = await biometricService.verifyPair(imageBase64, candidates[1].studentId);
        if (rerank2 !== null && rerank1 - rerank2 < gapThreshold) rerankGapOk = false;
        if (rerank2 === null) rerankGapOk = false;
      }
      if (rerankGapOk) {
        return startAttemptForStudent(student, examId, {
          method: 'face+rerank', score: top1.score, gap, model: result?.model, ip, ua,
        });
      }
    }
    await fail(`rerank-failed score=${top1.score.toFixed(3)} gap=${gap.toFixed(3)}`, top1.studentId, top1.score, gap, result?.model);
  }

  await fail(`score-${top1.score.toFixed(3)} gap-${gap.toFixed(3)}`, top1.studentId, top1.score, gap, result?.model);
  throw new UnauthorizedError('unreachable');
}

async function startAttemptForStudent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  student: any,
  examId: string,
  assurance: { method: string; score?: number; gap?: number; model?: string; ip?: string; ua?: string; staffId?: string },
) {
  const exam = await Exam.findById(examId);
  if (!exam) throw new NotFoundError('Exam not found');
  if (exam.status !== EXAM_STATUS.PUBLISHED) throw new ConflictError('Exam is not published');

  const attempt = await attemptService.startAttempt(String(exam._id), String(student!._id));
  const now = new Date();
  attempt.identityAssurance = {
    method: assurance.method,
    verifiedAt: now,
    score: assurance.score ?? null,
    gap: assurance.gap ?? null,
    model: assurance.model ?? null,
  } as never;
  // Log every entry (first + each re-entry) into the submission snapshot.
  attempt.entryLog.push({
    at: now,
    method: assurance.method,
    score: assurance.score,
    gap: assurance.gap,
    model: assurance.model,
    staffId: assurance.staffId,
  } as never);
  await attempt.save();

  await BiometricEvent.create({
    studentId: student!._id,
    examId: exam._id,
    attemptId: attempt._id,
    event: assurance.method === 'staff-verified' ? BIOMETRIC_EVENT.OVERRIDE : BIOMETRIC_EVENT.IDENTIFY,
    score: assurance.score, gap: assurance.gap, model: assurance.model,
    ip: assurance.ip, ua: assurance.ua,
    detail: assurance.staffId ? `staff-${assurance.staffId}` : undefined,
  });

  const tokens = {
    access: signAccessToken({ sub: String(student!._id), ownerType: OWNER_TYPES.STUDENT, examId: String(exam._id) }),
    refresh: signRefreshToken({ sub: String(student!._id), ownerType: OWNER_TYPES.STUDENT, examId: String(exam._id), tv: (student as unknown as { tokenVersion?: number }).tokenVersion ?? 0 }),
  };

  return {
    ownerType: OWNER_TYPES.STUDENT,
    student: toPublicStudent(student),
    exam: { id: String(exam._id), title: exam.title, timerMinutes: exam.timerMinutes },
    attempt: serializeAttempt(attempt),
    tokens,
    assurance: { score: assurance.score ?? null, gap: assurance.gap ?? null, model: assurance.model ?? null, method: assurance.method },
  };
}

export async function getStudentByIdForFace(studentId: string) {
  const s = await Student.findById(studentId);
  if (!s) throw new NotFoundError('Student not found');
  return s;
}

/**
 * Claim path for an admin-approved verification request: starts or resumes
 * the attempt exactly like a verified entry, in the student's session.
 * `staffId` is the approving admin/teacher (audit).
 */
export async function startAttemptForApprovedRequest(studentId: string, examId: string, staffId: string, ip?: string, ua?: string) {
  const student = await Student.findById(studentId).select('+tokenVersion');
  if (!student || !student.isActive) throw new NotFoundError('Student not found');
  if ((student.face as unknown as { status?: string })?.status !== FACE_STATUS.ENROLLED) {
    throw new ConflictError('Student face is not enrolled — enroll at the desk first');
  }
  return startAttemptForStudent(student, examId, { method: 'staff-verified', ip, ua, staffId });
}
