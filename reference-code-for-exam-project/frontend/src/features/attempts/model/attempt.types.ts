import { z } from "zod";

export const attemptStatusSchema = z.enum(["in-progress", "submitted", "expired"]);
export type AttemptStatus = z.infer<typeof attemptStatusSchema>;

export const attemptOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
});
export type AttemptOption = z.infer<typeof attemptOptionSchema>;

export const attemptQuestionSchema = z.object({
  questionId: z.string(),
  text: z.string(),
  options: z.array(attemptOptionSchema),
  givenOptionIds: z.array(z.string()),
  isCorrect: z.boolean().nullable(),
  answeredAt: z.string().nullable(),
});
export type AttemptQuestion = z.infer<typeof attemptQuestionSchema>;

export const attemptSchema = z.object({
  id: z.string(),
  examId: z.string(),
  studentId: z.string(),
  status: attemptStatusSchema,
  durationMinutes: z.number(),
  startedAt: z.string(),
  expiresAt: z.string(),
  submittedAt: z.string().nullable(),
  totalQuestions: z.number().nullable(),
  totalCorrect: z.number().nullable(),
  score: z.number().nullable(),
  maxScore: z.number().nullable(),
  scorePercent: z.number().nullable(),
  identityAssurance: z.object({ method: z.string(), verifiedAt: z.string().nullable(), score: z.number().nullable(), gap: z.number().nullable(), model: z.string().nullable() }).nullable().optional(),
  entryLog: z.array(z.object({ at: z.string().nullable(), method: z.string(), score: z.number().nullable(), gap: z.number().nullable(), model: z.string().nullable(), staffId: z.string().nullable() })).optional(),
  resultToken: z.string().nullable(),
  questions: z.array(attemptQuestionSchema),
});
export type Attempt = z.infer<typeof attemptSchema>;

export const attemptWithStudentSchema = attemptSchema.extend({
  student: z
    .object({
      id: z.string(),
      fullName: z.string(),
      studentCode: z.string(),
    })
    .nullable(),
});
export type AttemptWithStudent = z.infer<typeof attemptWithStudentSchema>;
