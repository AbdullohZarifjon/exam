import { Types } from 'mongoose';
import { Question, Exam } from '../models/index.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../lib/errors.js';

export interface CreateQuestionInput {
  examId: string;
  text: string;
  options: { text: string }[];
  correctOptionIndexes: number[];
  explanation?: string;
  imageUrl?: string;
  isActive?: boolean;
}

async function assertCanEdit(examId: string, userId: string, role: string) {
  if (!Types.ObjectId.isValid(examId)) throw new BadRequestError('Invalid examId');
  const exam = await Exam.findById(examId);
  if (!exam) throw new NotFoundError('Exam not found');
  if (role !== 'admin' && String(exam.createdBy) !== userId) {
    throw new ForbiddenError('You can only modify questions of exams you created');
  }
  // Questions are locked once the exam is published (and frozen forever
  // once archived) so every student's paper stays identical.
  if (exam.status !== 'draft') {
    throw new BadRequestError(`Questions of a ${exam.status} exam cannot be changed.`);
  }
  return exam;
}

export async function createQuestion(input: CreateQuestionInput, userId: string, role: string) {
  const exam = await assertCanEdit(input.examId, userId, role);

  // Materialize options first so we know their _ids
  const optionDocs = input.options.map((o) => ({ text: o.text }));
  const tempQuestion = new Question({
    examId: exam._id,
    text: input.text,
    options: optionDocs,
    correctOptionIds: [],
    explanation: input.explanation,
    imageUrl: input.imageUrl || undefined,
    isActive: input.isActive ?? true,
  });

  // Map the human-friendly indexes to the freshly created option _ids
  tempQuestion.correctOptionIds = input.correctOptionIndexes.map((i) => {
    const opt = tempQuestion.options[i];
    if (!opt) throw new BadRequestError(`correctOptionIndexes out of range: ${i}`);
    return opt._id as Types.ObjectId;
  });

  return tempQuestion.save();
}

export async function getQuestion(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError('Invalid id');
  const q = await Question.findById(id);
  if (!q) throw new NotFoundError('Question not found');
  return q;
}

export async function listQuestionsForExam(examId: string) {
  if (!Types.ObjectId.isValid(examId)) throw new BadRequestError('Invalid examId');
  return Question.find({ examId }).sort({ createdAt: 1 });
}

export async function updateQuestion(
  id: string,
  userId: string,
  role: string,
  patch: Partial<Omit<CreateQuestionInput, 'examId' | 'correctOptionIndexes'>> & {
    correctOptionIndexes?: number[];
  },
) {
  const question = await getQuestion(id);
  await assertCanEdit(String(question.examId), userId, role);

  if (patch.text !== undefined) question.text = patch.text;
  if (patch.options !== undefined) {
    if (patch.options.length !== 4) throw new BadRequestError('Exactly 4 options are required');
    question.options = patch.options.map((o) => ({ text: o.text })) as typeof question.options;
  }
  if (patch.explanation !== undefined) question.explanation = patch.explanation;
  // NOTE: `imageUrl` is intentionally NOT settable via the generic update
  // endpoint — it holds the raw S3 key and is only mutated by the upload
  // confirm/remove flow. Accepting it here previously let presigned GET
  // URLs be persisted as keys, producing nested presigned URLs on read.
  if (patch.isActive !== undefined) question.isActive = patch.isActive;

  if (patch.correctOptionIndexes) {
    question.correctOptionIds = patch.correctOptionIndexes.map((i) => {
      const opt = question.options[i];
      if (!opt) throw new BadRequestError(`correctOptionIndexes out of range: ${i}`);
      return opt._id as Types.ObjectId;
    });
  }

  await question.save();
  return question;
}

export async function deleteQuestion(id: string, userId: string, role: string) {
  const question = await getQuestion(id);
  await assertCanEdit(String(question.examId), userId, role);
  await question.deleteOne();
}
