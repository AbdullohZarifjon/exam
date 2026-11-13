import { z } from "zod";

export const examStatusSchema = z.enum(["draft", "published", "archived"]);
export type ExamStatus = z.infer<typeof examStatusSchema>;

export const examSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: examStatusSchema,
  timerMinutes: z.number(),
  questionsToServe: z.number(),
  passingScorePercent: z.number().optional(),
  passingScorePoints: z.number().optional(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Exam = z.infer<typeof examSchema>;

export const createExamSchema = z
  .object({
    title: z.string().min(2, "At least 2 characters").max(200),
    description: z.string().max(2000).optional().or(z.literal("")),
    timerMinutes: z
      .number()
      .int()
      .min(1)
      .max(24 * 60),
    questionsToServe: z.number().int().min(1).max(100),
    passingMode: z.enum(["none", "percent", "points"]),
    passingScorePercent: z.number().min(0).max(100).optional(),
    passingScorePoints: z.number().int().min(1).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.passingMode === "percent" && (v.passingScorePercent === undefined || v.passingScorePercent === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["passingScorePercent"],
        message: "Enter a passing percentage",
      });
    }
    if (v.passingMode === "points" && (v.passingScorePoints === undefined || v.passingScorePoints === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["passingScorePoints"],
        message: "Enter a passing score in points",
      });
    }
  });

/** Strip unset passing fields into the API payload shape. */
export function toCreateExamPayload(v: z.infer<typeof createExamSchema>): CreateExamInput {
  return {
    title: v.title,
    description: v.description || undefined,
    timerMinutes: v.timerMinutes,
    questionsToServe: v.questionsToServe,
    ...(v.passingMode === "percent" && v.passingScorePercent != null
      ? { passingScorePercent: v.passingScorePercent }
      : {}),
    ...(v.passingMode === "points" && v.passingScorePoints != null ? { passingScorePoints: v.passingScorePoints } : {}),
  };
}

export type CreateExamInput = {
  title: string;
  description?: string;
  timerMinutes: number;
  questionsToServe: number;
  passingScorePercent?: number;
  passingScorePoints?: number;
};

export type UpdateExamInput = Omit<Partial<CreateExamInput>, "passingScorePercent" | "passingScorePoints"> & {
  passingScorePercent?: number | null;
  passingScorePoints?: number | null;
};

/** Unlike create, PATCH must explicitly clear previously saved optional settings. */
export function toUpdateExamPayload(v: z.infer<typeof createExamSchema>): UpdateExamInput {
  return {
    ...toCreateExamPayload(v),
    description: v.description || "",
    passingScorePercent: v.passingMode === "percent" ? v.passingScorePercent : null,
    passingScorePoints: v.passingMode === "points" ? v.passingScorePoints : null,
  };
}

export function filterExams(exams: Exam[], query: string): Exam[] {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return exams.filter((exam) => {
    const text = normalize(`${exam.title} ${exam.description ?? ""}`);
    return terms.every((term) => text.includes(term));
  });
}
