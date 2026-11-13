import { z } from 'zod';
import { BadRequestError } from '../lib/errors.js';
import {
  ROLES,
  OWNER_TYPES,
  EXAM_STATUS,
  ATTEMPT_STATUS,
} from '../config/constants.js';

/* --------------------------------- Primitives --------------------------------- */

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId');
export const idSchema = z.object({ id: objectIdSchema });

/**
 * Permissive email check.
 *
 * We don't want the strict HTML5 regex Zod ships with — it rejects legitimate
 * addresses like `maria@school.example` or anything with newer TLDs. A plain
 * `local@domain.tld` shape is enough: the address still gets normalised to
 * lowercase and trimmed.
 */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9_.-]+$/, 'Username may only contain letters, numbers, _ . -');

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email');

/* --------------------------------- Auth (Staff: admin/teacher/moderator) --------------------------------- */

/**
 * Admin-only staff creation. There is NO public self-registration:
 * staff accounts are created either by the env-bootstrapped admin
 * (`ADMIN` / `ADMIN_PASSWORD`, see services/auth.service.ts) or by
 * an authenticated admin through `POST /auth/admin/users`.
 * The requested role defaults to teacher; an admin may also mint
 * another admin through the same admin-only endpoint.
 */
export const staffCreateSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(80).trim(),
    username: usernameSchema,
    password: z.string().min(8).max(128),
    role: z.enum([ROLES.TEACHER, ROLES.ADMIN]).optional().default(ROLES.TEACHER),
  }),
});

/** Admin-only password reset for one staff account. */
export const staffPasswordResetSchema = z.object({
  body: z.object({
    password: z.string().min(8).max(128),
  }),
  params: idSchema,
});

export const loginSchema = z.object({
  body: z.object({
    username: usernameSchema,
    password: z.string().min(1),
  }),
});

/* --------------------------------- Students (identity-only) --------------------------------- */

/**
 * Create a student. `studentCode` is optional: omitted or '' means the
 * backend assigns the next generated code (`STU-<year>-<seq>`, see
 * services/student-code.service.ts). An explicit code is normalised to
 * upper-case so it always matches how public lookups (GET /candidates/
 * lookup) query codes.
 */
export const studentCreateSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(80).trim(),
    studentCode: z.string().min(2).max(40).trim().toUpperCase().optional().or(z.literal('')),

  }),
});

/**
 * Update a student. `studentCode` is deliberately omitted: it is the
 * student's permanent identifier and can never be changed after
 * creation (the service enforces this as a second layer). An empty
 * `email` clears the stored address.
 */
export const studentUpdateSchema = z.object({
  body: studentCreateSchema.shape.body
    .partial()
    /**
     * `studentCode` is immutable for teachers, but an ADMIN may re-assign
     * it (e.g. to fix a typo). The role check lives in the route/service —
     * the schema only guards the shape (2–40 chars, normalised upper-case,
     * same rules as creation).
     */
    .extend({ studentCode: z.string().min(2).max(40).trim().toUpperCase().optional() }),
  params: idSchema,
});

/**
 * Candidate verification requests. The student's device creates the
 * request and later claims the approval with its secret token; the
 * moderator resolves it after scanning the request's QR (short code).
 */
// removed: moderator/verification - replaced by face

/* --------------------------------- Moderators (admin-managed accounts) --------------------------------- */

// removed: moderator/verification - replaced by face

/** Activate / deactivate a moderator account. */
// removed: moderator/verification - replaced by face

/** Password reset — also bumps the moderator's tokenVersion (kills sessions). */
// removed: moderator/verification - replaced by face

/* ------------------------- Exam moderator assignment ------------------------- */

/**
 * ADMIN-only attachment of a moderator to one exam. Attached moderators
 * (and admins) are the only ones who can verify candidate requests for
 * the exam — this is the credential gate for the verification console.
 */
// removed: moderator/verification - replaced by face

/** ADMIN-only removal of an attached moderator (path carries both ids). */
// removed: moderator/verification - replaced by face


export const faceIdentifySchema = z.object({
  body: z.object({
    imageBase64: z.string().min(1000).max(5000000),
    examId: objectIdSchema,
  }),
});

export const verifyRequestCreateSchema = z.object({
  body: z.object({
    examId: objectIdSchema,
    studentCode: z.string().min(2).max(40).trim(),
    imageBase64: z.string().min(1000).max(5000000),
  }),
});

export const faceEnrollSchema = z.object({
  body: z.object({
    studentId: objectIdSchema,
    imageBase64: z.string().min(1000).max(5000000),
    consent: z.boolean().default(true),
  }),
});

/* --------------------------------- Response shapes --------------------------------- */

export const userResponseSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  username: z.string(),
  role: z.enum(Object.values(ROLES) as [string, ...string[]]),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const studentResponseSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  studentCode: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/* --------------------------------- Exams --------------------------------- */

export const examCreateSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(200).trim(),
    description: z.string().max(2000).trim().optional(),
    timerMinutes: z
      .number()
      .int()
      .min(1)
      .max(24 * 60),
    questionsToServe: z.number().int().min(1).max(100).default(100),
    passingScorePercent: z.number().min(0).max(100).optional(),
    passingScorePoints: z.number().int().min(1).max(100).optional(),
  }),
});

/** Cross-field validation shared by create + update (service layer). */
export function assertExamCrossFields(v: {
  passingScorePercent?: number | null;
  passingScorePoints?: number | null;
}) {
  if (v.passingScorePercent != null && v.passingScorePoints != null) {
    throw new BadRequestError('Use either passingScorePercent or passingScorePoints, not both');
  }
}

export const examUpdateSchema = z.object({
  body: examCreateSchema.shape.body.partial().extend({
    passingScorePercent: examCreateSchema.shape.body.shape.passingScorePercent.nullable(),
    passingScorePoints: examCreateSchema.shape.body.shape.passingScorePoints.nullable(),
    status: z.enum(Object.values(EXAM_STATUS) as [string, ...string[]]).optional(),
  }),
  params: idSchema,
});

export const examResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(Object.values(EXAM_STATUS) as [string, ...string[]]),
  timerMinutes: z.number(),
  questionsToServe: z.number(),
  passingScorePercent: z.number().optional(),
  passingScorePoints: z.number().optional(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/* --------------------------------- Questions --------------------------------- */

export const questionCreateSchema = z.object({
  body: z.object({
    examId: objectIdSchema,
    text: z.string().min(1).trim(),
    options: z
      .array(z.object({ text: z.string().min(1).max(500).trim() }))
      .length(4, 'A question needs exactly 4 options'),
    correctOptionIndexes: z.array(z.number().int().min(0)).min(1),
    explanation: z.string().max(2000).trim().optional(),
    imageUrl: z.string().url().max(2000).optional().or(z.literal('')),
    isActive: z.boolean().default(true),
  }),
});

export const questionUpdateSchema = z.object({
  body: questionCreateSchema.shape.body
    .omit({ examId: true, correctOptionIndexes: true })
    .partial()
    .extend({ correctOptionIndexes: z.array(z.number().int().min(0)).min(1).optional() }),
  params: idSchema,
});

export const questionResponseSchema = z.object({
  id: z.string(),
  examId: z.string(),
  text: z.string(),
  options: z.array(z.object({ id: z.string(), text: z.string() })),
  explanation: z.string().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/* --------------------------------- Attempts --------------------------------- */

export const answerQuestionSchema = z.object({
  params: z.object({ attemptId: objectIdSchema }),
  body: z.object({
    questionId: objectIdSchema,
    // An empty array is valid: it clears the answer (multi-select toggle-off).
    givenOptionIds: z.array(objectIdSchema).max(4),
  }),
});

export const attemptQuestionViewSchema = z.object({
  questionId: z.string(),
  text: z.string(),
  options: z.array(z.object({ id: z.string(), text: z.string() })),
  givenOptionIds: z.array(z.string()),
  isCorrect: z.boolean().nullable(),
  answeredAt: z.string().nullable(),
});

export const attemptResponseSchema = z.object({
  id: z.string(),
  examId: z.string(),
  studentId: z.string(),
  status: z.enum(Object.values(ATTEMPT_STATUS) as [string, ...string[]]),
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
  questions: z.array(attemptQuestionViewSchema),
});

export const attemptWithStudentResponseSchema = attemptResponseSchema.extend({
  student: studentResponseSchema
    .pick({ id: true, fullName: true, studentCode: true })
    .nullable(),
});

/* --------------------------------- Auth responses --------------------------------- */
/* Tokens travel in httpOnly cookies — never in the response body. */

export const userAuthResponseSchema = z.object({
  ownerType: z.literal('User'),
  user: userResponseSchema,
});

export const studentAuthResponseSchema = z.object({
  ownerType: z.literal('Student'),
  student: studentResponseSchema,
  exam: z.object({
    id: z.string(),
    title: z.string(),
    timerMinutes: z.number(),
  }),
  moderator: z.object({ id: z.string(), fullName: z.string() }),
  attempt: attemptResponseSchema,
});
