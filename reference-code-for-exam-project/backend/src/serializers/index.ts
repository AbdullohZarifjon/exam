import { Types } from 'mongoose';
import type { StudentDoc } from '../models/student.model.js';
import { createGetUrl } from '../lib/s3.js';

export interface ExamJson {
  id: string;
  title: string;
  description?: string;
  status: string;
  timerMinutes: number;
  questionsToServe: number;
  passingScorePercent?: number;
  passingScorePoints?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const serializeExam = (e: any): ExamJson => ({
  id: String(e._id),
  title: e.title,
  description: e.description,
  status: e.status,
  timerMinutes: e.timerMinutes,
  questionsToServe: e.questionsToServe,
  passingScorePercent: e.passingScorePercent,
  passingScorePoints: e.passingScorePoints,
  createdBy: String(e.createdBy),
  createdAt: e.createdAt.toISOString(),
  updatedAt: e.updatedAt.toISOString(),
});

export const serializeExams = (list: any[]): ExamJson[] => list.map(serializeExam);

export const serializeQuestion = async (q: any) => {
  // `imageUrl` on the document stores the raw S3 KEY (e.g. "questions/<id>").
  // Guard against legacy rows where a full presigned URL was persisted —
  // signing a signed URL produces a nested, broken URL.
  const raw = (q.imageUrl as string | undefined) || undefined;
  const isKey = Boolean(raw) && !/^https?:\/\//i.test(raw!) && !raw!.includes('?');
  const imageKey: string | undefined = isKey ? raw : undefined;
  const imageUrl = imageKey ? await createGetUrl(imageKey) : undefined;
  return {
    id: String(q._id),
    examId: String(q.examId),
    text: q.text,
    options: q.options.map((o: any) => ({ id: String(o._id), text: o.text })),
    /** Indexes into `options` — lets the edit form pre-select correct answers. */
    correctOptionIndexes: (q.options as { _id: Types.ObjectId }[]).reduce<number[]>((acc, o, i) => {
      if (q.correctOptionIds.some((id: Types.ObjectId) => String(id) === String(o._id)))
        acc.push(i);
      return acc;
    }, []),
    explanation: q.explanation,
    imageKey, // S3 key — for re-uploads
    imageUrl, // presigned GET URL — short-lived
    isActive: q.isActive,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  };
};

export const serializeQuestions = async (list: any[]) => Promise.all(list.map(serializeQuestion));

export const serializeStudent = (s: StudentDoc | any) => ({
  id: String(s._id),
  fullName: s.fullName,
  studentCode: s.studentCode,
  isActive: s.isActive,
  // True when this student is in a look-alike cluster (twin/sibling):
  // the kiosk will route them to admin verification.
  isLookalike: Array.isArray(s.face?.lookalikeWith) && s.face.lookalikeWith.length > 0,
  // Face status for the dashboard coverage card + enrollment desk badges.
  // Matches FACE_STATUS ('not-enrolled' | 'enrolled' | 'revoked').
  faceStatus: (s.face?.status as string | undefined) ?? 'not-enrolled',
  faceEnrolledAt: s.face?.enrolledAt ? s.face.enrolledAt.toISOString() : null,
  createdAt: s.createdAt.toISOString(),
  updatedAt: s.updatedAt.toISOString(),
});

export const serializeStudents = (list: any[]) => list.map(serializeStudent);

/**
 * Staff accounts are Users. Password hashes and
 * token counters never leave the database.
 */
export const serializeAttempt = (a: any) => ({
  id: String(a._id),
  examId: String(a.examId),
  studentId: String(a.studentId),
  status: a.status,
  durationMinutes: a.durationMinutes,
  startedAt: a.startedAt.toISOString(),
  expiresAt: a.expiresAt.toISOString(),
  submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
  totalQuestions: a.totalQuestions,
  totalCorrect: a.totalCorrect,
  score: a.score ?? 0,
  maxScore: a.maxScore ?? 0,
  scorePercent: a.scorePercent,
  identityAssurance: a.identityAssurance ? { method: a.identityAssurance.method || 'face', verifiedAt: a.identityAssurance.verifiedAt ? new Date(a.identityAssurance.verifiedAt).toISOString() : null, score: a.identityAssurance.score ?? null, gap: a.identityAssurance.gap ?? null, model: a.identityAssurance.model ?? null } : null, identityFlags: a.identityFlags ?? [],
  entryLog: (a.entryLog ?? []).map((e: any) => ({ at: e.at ? new Date(e.at).toISOString() : null, method: e.method ?? 'face', score: e.score ?? null, gap: e.gap ?? null, model: e.model ?? null, staffId: e.staffId ?? null })),
  resultToken: a.resultToken ?? null,
  questions: a.questions.map((q: any) => ({
    questionId: String(q.questionId),
    text: q.text,
    options: q.options.map((o: any) => ({ id: String(o._id), text: o.text })),
    givenOptionIds: (q.givenOptionIds ?? []).map((id: Types.ObjectId) => String(id)),
    isCorrect: q.isCorrect,
    answeredAt: q.answeredAt ? q.answeredAt.toISOString() : null,
  })),
});

export const serializeAttempts = (list: any[]) => list.map(serializeAttempt);

/**
 * Serialize an attempt row that was joined with the student collection
 * via aggregation (used by the staff "results" view).
 */
export const serializeAttemptWithStudent = (a: any) => ({
  ...serializeAttempt(a),
  student: a.student
    ? {
        id: String(a.student._id),
        fullName: a.student.fullName,
        studentCode: a.student.studentCode,
      }
    : null,
});

export const serializeAttemptsWithStudent = (list: any[]) => list.map(serializeAttemptWithStudent);
