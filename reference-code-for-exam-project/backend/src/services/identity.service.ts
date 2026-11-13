import { Attempt, Student } from '../models/index.js';
import * as attemptService from './attempt.service.js';
import { randomToken } from '../lib/id.js';
import { NotFoundError } from '../lib/errors.js';

/**
 * Finishes the exam: grades + generates a private result token. The
 * route layer revokes the student's session (bumps tokenVersion) and
 * clears the cookies afterwards.
 *
 * `studentId` is the authenticated caller — the attempt must belong to
 * them. Without this check any student could finalize another
 * student's attempt and steal its result token (BUG-006).
 */
export async function finishExamAndRevokeSession(attemptId: string, studentId: string) {
  const attempt = await Attempt.findOne({ _id: attemptId, studentId });
  if (!attempt) throw new NotFoundError('Attempt not found');
  const submitted = await attemptService.submitAttempt(attemptId, String(attempt.studentId));
  submitted.resultToken = randomToken(24);
  await submitted.save();
  return toResultSummary(submitted);
}

/**
 * Result/finish payload: score + statistics ONLY. Questions and their
 * answers (including correct option IDs) never leave the server on
 * these capability-token endpoints.
 */
export function toResultSummary(attempt: any) {
  return {
    id: String(attempt._id),
    examId: String(attempt.examId),
    studentId: String(attempt.studentId),
    status: attempt.status,
    startedAt: attempt.startedAt,
    expiresAt: attempt.expiresAt,
    submittedAt: attempt.submittedAt ?? null,
    totalQuestions: attempt.totalQuestions ?? null,
    totalCorrect: attempt.totalCorrect ?? null,
    score: attempt.score ?? null,
    maxScore: attempt.maxScore ?? null,
    scorePercent: attempt.scorePercent ?? null,
    resultToken: attempt.resultToken ?? null,
  };
}

/** Capability-token lookup for the public result page. */
export async function getAttemptByResultToken(token: string) {
  const attempt = await Attempt.findOne({ resultToken: token });
  if (!attempt) throw new NotFoundError('Result not found');
  return toResultSummary(attempt);
}

/** Fetch a student by their code (for staff to look up before verifying). */
export async function getStudentByCode(studentCode: string) {
  const student = await Student.findOne({ studentCode });
  if (!student) throw new NotFoundError('Student not found');
  return student;
}
