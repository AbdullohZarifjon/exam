import { z } from "zod";

export const studentSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  studentCode: z.string(),
  isActive: z.boolean(),
  isLookalike: z.boolean().optional(),
  faceStatus: z.string().optional(),
  faceEnrolledAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Student = z.infer<typeof studentSchema>;

/**
 * `studentCode` is optional: leave it empty and the backend assigns the
 * next generated code (STU-<year>-<seq>). An explicit code must still be
 * unique — the API answers with a conflict otherwise.
 */
export const createStudentSchema = z.object({
  fullName: z.string().min(2).max(80),
  studentCode: z.string().min(2).max(40).trim().optional().or(z.literal("")),
});
export type CreateStudentInput = z.infer<typeof createStudentSchema>;

/**
 * Editable student fields. `studentCode` may only be re-assigned by an
 * ADMIN (the backend enforces the role); the UI disables the field for
 * teachers.
 */
export const updateStudentSchema = z.object({
  fullName: z.string().min(2).max(80),
  studentCode: z.string().min(2).max(40).trim().optional(),
});
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
