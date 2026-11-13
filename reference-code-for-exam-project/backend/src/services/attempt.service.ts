import { Types } from 'mongoose';
import { Attempt, Exam, Question, toObjectId } from '../models/index.js';
import type { AttemptDoc } from '../models/attempt.model.js';
import { ATTEMPT_STATUS, EXAM_STATUS } from '../config/constants.js';
import { AttemptExpiredError, BadRequestError, ConflictError, NotFoundError } from '../lib/errors.js';
import { shuffle } from '../lib/shuffle.js';

/**
 * Starts a new attempt. Every question is the same: a random sample of
 * `questionsToServe` active questions, each worth 1 point.
 */
export async function startAttempt(examId: string, studentId: string) {
  if (!Types.ObjectId.isValid(examId)) throw new BadRequestError('Invalid examId');

  const exam = await Exam.findById(examId);
  if (!exam) throw new NotFoundError('Exam not found');
  if (exam.status !== EXAM_STATUS.PUBLISHED) {
    throw new BadRequestError('Exam is not published');
  }

  // One-attempt rule: exactly one attempt per student per exam, ever —
  // but the student may RE-ENTER that same attempt while time remains
  // (e.g. after a power outage / disconnect). Re-entry resumes the same
  // paper, same deadline, saved answers intact; the caller logs the entry.
  const anyExisting = await Attempt.findOne({
    examId: exam._id,
    studentId: toObjectId(studentId),
  }).sort({ createdAt: 1 });
  if (anyExisting) {
    if (anyExisting.status === ATTEMPT_STATUS.IN_PROGRESS) {
      if (anyExisting.expiresAt.getTime() > Date.now()) {
        return anyExisting; // resume — never a second attempt
      }
      // In-progress but past the deadline: finalize it, then block.
      await submitAttempt(String(anyExisting._id), studentId);
    }
    throw new ConflictError('You have already completed this exam.', {
      attemptId: String(anyExisting._id),
      status: anyExisting.status,
    });
  }

  const n = Math.min(exam.questionsToServe, 100);
  const sampled = await Question.aggregate([
    { $match: { examId: exam._id, isActive: true } },
    { $sample: { size: n } },
  ]);

  const orderedQuestions = shuffle(sampled);

  const questions = orderedQuestions.map((q) => {
    return {
      questionId: q._id,
      text: q.text,
      options: shuffle(q.options),
      correctOptionIds: q.correctOptionIds,
      givenOptionIds: [] as Types.ObjectId[],
      isCorrect: null as boolean | null,
      answeredAt: null as Date | null,
    };
  });

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + exam.timerMinutes * 60 * 1000);

  return Attempt.create({
    examId: exam._id,
    studentId: toObjectId(studentId),
    status: ATTEMPT_STATUS.IN_PROGRESS,
    durationMinutes: exam.timerMinutes,
    startedAt,
    expiresAt,
    questions,
    totalQuestions: questions.length,
  });
}

/**
 * Records the student's answer for a single embedded question.
 * Uses `arrayFilters` to update only the matching sub-document.
 */
export async function answerQuestion(
  attemptId: string,
  questionId: string,
  givenOptionIds: string[],
  studentId: string,
) {
  if (!Types.ObjectId.isValid(attemptId)) throw new BadRequestError('Invalid attemptId');
  if (!Types.ObjectId.isValid(questionId)) throw new BadRequestError('Invalid questionId');

  const attempt = await Attempt.findOne({ _id: attemptId, studentId: toObjectId(studentId) });
  if (!attempt) throw new NotFoundError('Attempt not found');
  if (attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) {
    throw new ConflictError('Attempt is no longer in progress');
  }
  // Answers are synced per question DURING the exam. Once the timer is up
  // the backend simply stops accepting them — rejected WITHOUT any write.
  // The attempt is finalized by the logout/finish call (or lazily later).
  if (attempt.expiresAt.getTime() <= Date.now()) {
    throw new AttemptExpiredError();
  }

  // Ensure the question actually belongs to this attempt + that the
  // given option ids are among the served options
  const sub = attempt.questions.find((q) => String(q.questionId) === questionId);
  if (!sub) throw new BadRequestError('Question does not belong to this attempt');

  const validOptionIds = new Set(sub.options.map((o) => String(o._id)));
  for (const id of givenOptionIds) {
    if (!validOptionIds.has(id)) {
      throw new BadRequestError(`Option ${id} does not belong to this question`);
    }
  }

  const result = await Attempt.updateOne(
    { _id: attemptId, status: ATTEMPT_STATUS.IN_PROGRESS },
    {
      $set: {
        'questions.$[q].givenOptionIds': givenOptionIds.map(toObjectId),
        'questions.$[q].answeredAt': new Date(),
      },
    },
    { arrayFilters: [{ 'q.questionId': toObjectId(questionId) }] },
  );

  if (result.modifiedCount === 0) {
    // The pre-check passed but the write didn't land — the deadline crossed
    // (or the attempt was finalized) between the read and the write.
    // Re-read so the client gets the real reason, not a generic failure.
    const fresh = await Attempt.findById(attemptId).select('status expiresAt');
    if (!fresh) throw new NotFoundError('Attempt not found');
    if (fresh.status !== ATTEMPT_STATUS.IN_PROGRESS) {
      throw new ConflictError('Attempt is no longer in progress');
    }
    if (fresh.expiresAt.getTime() <= Date.now()) throw new AttemptExpiredError();
    throw new BadRequestError('Could not record answer');
  }
  return { ok: true };
}

/**
 * Set-comparison grading: works for both single-choice and multi-select.
 * Fills `isCorrect` on every embedded question and the attempt's score
 * fields. Pure with respect to persistence — the caller decides when to save.
 */
function gradeAttemptQuestions(attempt: AttemptDoc) {
  let totalCorrect = 0;
  let score = 0;
  let maxScore = 0;
  for (const q of attempt.questions) {
    const given = new Set(q.givenOptionIds.map(String));
    const correct = new Set(q.correctOptionIds.map(String));
    const isCorrect = given.size === correct.size && [...given].every((id) => correct.has(id));
    q.isCorrect = isCorrect;
    maxScore += 1;
    if (isCorrect) {
      totalCorrect++;
      score += 1;
    }
  }

  attempt.totalCorrect = totalCorrect;
  attempt.score = score;
  attempt.maxScore = maxScore;
  attempt.scorePercent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
}

/**
 * Grades and finalises an attempt.
 *
 * Finalization is allowed past the deadline — the runner signs the student
 * out a few seconds after the timer expires, and the already-synced answers
 * still need grading. An attempt finalized after its deadline ends as
 * `expired`; one submitted on time ends as `submitted`.
 */
export async function submitAttempt(attemptId: string, studentId: string) {
  if (!Types.ObjectId.isValid(attemptId)) throw new BadRequestError('Invalid attemptId');

  const attempt = await Attempt.findOne({ _id: attemptId, studentId: toObjectId(studentId) });
  if (!attempt) throw new NotFoundError('Attempt not found');
  if (attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) {
    throw new ConflictError('Attempt is already finalized');
  }

  gradeAttemptQuestions(attempt);

  const isPastDeadline = attempt.expiresAt.getTime() <= Date.now();
  attempt.status = isPastDeadline ? ATTEMPT_STATUS.EXPIRED : ATTEMPT_STATUS.SUBMITTED;
  // When the attempt effectively ended: the actual moment for an on-time
  // submit, the deadline itself for a late/abandoned one.
  attempt.submittedAt = isPastDeadline ? attempt.expiresAt : new Date();
  await attempt.save();
  return attempt;
}

export async function getAttempt(
  attemptId: string,
  studentId: string,
  ownerType: string,
  role?: string,
) {
  if (!Types.ObjectId.isValid(attemptId)) throw new BadRequestError('Invalid attemptId');
  const filter: Record<string, unknown> = { _id: attemptId };
  if (ownerType !== 'User' || (role !== 'admin' && role !== 'teacher')) {
    filter.studentId = toObjectId(studentId);
  }
  const attempt = await Attempt.findOne(filter);
  if (!attempt) throw new NotFoundError('Attempt not found');
  return attempt;
}

export async function listMyAttempts(studentId: string) {
  return Attempt.find({ studentId: toObjectId(studentId) }).sort({ createdAt: -1 });
}

/**
 * List attempts for a given exam, including student name/code and score.
 * Used by the staff "results" view on the exam detail page.
 */
export async function listAttemptsForExam(examId: string) {
  if (!Types.ObjectId.isValid(examId)) throw new BadRequestError('Invalid examId');
  return Attempt.aggregate([
    { $match: { examId: toObjectId(examId) } },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: 'students',
        localField: 'studentId',
        foreignField: '_id',
        as: 'student',
      },
    },
    { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
  ]);
}
