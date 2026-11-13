import { z } from "zod";

export const questionOptionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1).max(500),
});

export const questionSchema = z.object({
  id: z.string(),
  examId: z.string(),
  text: z.string(),
  options: z.array(questionOptionSchema),
  correctOptionIndexes: z.array(z.number().int().min(0)),
  explanation: z.string().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Question = z.infer<typeof questionSchema>;

export const createQuestionSchema = z.object({
  examId: z.string(),
  text: z.string().min(1).max(2000),
  options: z
    .array(z.object({ text: z.string().min(1).max(500) }))
    .length(4, "Exactly 4 options"),
  correctOptionIndexes: z.array(z.number().int().min(0)).min(1, "Mark at least one correct option"),
  explanation: z.string().max(2000).optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

export const updateQuestionSchema = createQuestionSchema.omit({ examId: true }).partial();
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
