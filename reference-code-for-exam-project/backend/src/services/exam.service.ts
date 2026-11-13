import { Types } from 'mongoose';
import { Exam, Question } from '../models/index.js';
import { EXAM_STATUS, type ExamStatus } from '../config/constants.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../lib/errors.js';

export interface CreateExamInput {
  title: string;
  description?: string;
  timerMinutes: number;
  questionsToServe: number;
  passingScorePercent?: number;
  passingScorePoints?: number;
  createdBy: string;
}

export async function createExam(input: CreateExamInput) {
  return Exam.create({ ...input, status: EXAM_STATUS.DRAFT });
}

export async function getExam(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError('Invalid exam id');
  const exam = await Exam.findById(id);
  if (!exam) throw new NotFoundError('Exam not found');
  return exam;
}

export async function listExams(filter: { status?: ExamStatus; createdBy?: string } = {}) {
  return Exam.find(filter).sort({ createdAt: -1 });
}

export async function updateExam(
  id: string,
  userId: string,
  role: string,
  patch: Record<string, unknown>,
) {
  const exam = await getExam(id);

  // Only the creator or an admin can edit
  if (role !== 'admin' && String(exam.createdBy) !== userId) {
    throw new ForbiddenError('You can only modify exams you created');
  }
  if (exam.status === EXAM_STATUS.ARCHIVED) {
    throw new BadRequestError('Cannot modify an archived exam');
  }

  // Lifecycle transitions must go through the dedicated publish/archive
  // endpoints — Draft -> Published -> Archived, never backwards.
  if (patch.status !== undefined) {
    if (patch.status !== exam.status) {
      throw new BadRequestError(
        'Use POST /exams/:id/publish or POST /exams/:id/archive to change exam status — direct status updates are not allowed',
      );
    }
    delete patch.status; // no-op same-status write
  }

  // Published exams are locked: only title and description may change.
  // Passing score, duration and questions-per-student are frozen at publish
  // time so every student's paper and grading stay identical.
  if (exam.status === EXAM_STATUS.PUBLISHED) {
    const lockedFields = ['timerMinutes', 'questionsToServe', 'passingScorePercent', 'passingScorePoints'] as const;
    for (const field of lockedFields) {
      if (patch[field] !== undefined && patch[field] !== exam[field]) {
        throw new BadRequestError(
          `Published exams are locked — ${field} cannot be changed. Only title and description can be edited.`,
        );
      }
    }
    // Strip no-op locked fields so the save below only touches title/description.
    for (const field of lockedFields) {
      if (patch[field] !== undefined) delete patch[field];
    }
  }

  // Passing score modes are mutually exclusive.
  const nextPercent =
    patch.passingScorePercent !== undefined
      ? patch.passingScorePercent
      : exam.passingScorePercent;
  const nextPoints =
    patch.passingScorePoints !== undefined ? patch.passingScorePoints : exam.passingScorePoints;
  if (nextPercent !== undefined && nextPoints !== undefined && nextPercent !== null && nextPoints !== null) {
    throw new BadRequestError('Use either passingScorePercent or passingScorePoints, not both');
  }

  // Explicit null clears an optional passing threshold on PATCH.
  for (const field of ['passingScorePercent', 'passingScorePoints']) {
    if (patch[field] === null) patch[field] = undefined;
  }
  Object.assign(exam, patch);

  await exam.save();
  return exam;
}

export async function deleteExam(id: string, userId: string, role: string) {
  const exam = await getExam(id);
  if (role !== 'admin' && String(exam.createdBy) !== userId) {
    throw new ForbiddenError('You can only delete exams you created');
  }
  // Only drafts can be deleted. Published exams are locked and archived
  // exams are kept for view/analytics — neither may be deleted.
  if (exam.status !== EXAM_STATUS.DRAFT) {
    throw new BadRequestError(`Only draft exams can be deleted (current status: ${exam.status}).`);
  }
  await exam.deleteOne();
  // Cascade: remove all questions belonging to this exam
  await Question.deleteMany({ examId: exam._id });
}

/**
 * Publishes an exam — but only if it actually has enough active questions:
 * at least `questionsToServe` active questions total.
 */
export async function publishExam(id: string, userId: string, role: string) {
  const exam = await getExam(id);
  if (role !== 'admin' && String(exam.createdBy) !== userId) {
    throw new ForbiddenError('You can only publish exams you created');
  }
  // Lifecycle is one-way: Draft -> Published -> Archived.
  if (exam.status !== EXAM_STATUS.DRAFT) {
    throw new BadRequestError(`Only draft exams can be published (current status: ${exam.status}).`);
  }

  // Total active questions across the bank
  const activeCount = await Question.countDocuments({ examId: exam._id, isActive: true });
  if (activeCount < exam.questionsToServe) {
    throw new BadRequestError(
      `Exam needs at least ${exam.questionsToServe} active questions to be published (currently ${activeCount}).`,
    );
  }

  exam.status = EXAM_STATUS.PUBLISHED;
  await exam.save();
  return exam;
}

/**
 * Archives a published exam. One-way: Published -> Archived.
 * Archived exams are read-only (view/analytics) and are hidden from the
 * student-facing exam list, which only ever serves `published` exams.
 */
export async function archiveExam(id: string, userId: string, role: string) {
  const exam = await getExam(id);
  if (role !== 'admin' && String(exam.createdBy) !== userId) {
    throw new ForbiddenError('You can only archive exams you created');
  }
  if (exam.status !== EXAM_STATUS.PUBLISHED) {
    throw new BadRequestError(`Only published exams can be archived (current status: ${exam.status}).`);
  }
  exam.status = EXAM_STATUS.ARCHIVED;
  await exam.save();
  return exam;
}
