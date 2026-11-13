import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(3, "At least 3 characters").max(40).regex(/^[a-z0-9_.-]+$/i, "Letters, numbers, _ . - only"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Admin-only staff creation. There is no public registration: the
 * first admin is bootstrapped from ADMIN / ADMIN_PASSWORD env vars
 * on the backend, and every teacher (or further admin) is created
 * by that admin through this form.
 */
export const createStaffSchema = z.object({
  fullName: z.string().min(2, "At least 2 characters").max(80),
  username: z.string().min(3, "At least 3 characters").max(40).regex(/^[a-z0-9_.-]+$/i, "Letters, numbers, _ . - only"),
  password: z.string().min(8, "At least 8 characters").max(128),
  role: z.enum(["teacher", "admin"]).default("teacher"),
});
export type CreateStaffInput = z.infer<typeof createStaffSchema>;

/** Admin-only password reset for one staff account. */
export const resetPasswordSchema = z.object({
  password: z.string().min(8, "At least 8 characters").max(128),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
