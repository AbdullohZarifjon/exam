/**
 * Staff roles. Students are identity-only, identified by face at a kiosk.
 */
export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const OWNER_TYPES = {
  USER: 'User',
  STUDENT: 'Student',
} as const;

export type OwnerType = (typeof OWNER_TYPES)[keyof typeof OWNER_TYPES];

export const EXAM_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

export type ExamStatus = (typeof EXAM_STATUS)[keyof typeof EXAM_STATUS];

export const ATTEMPT_STATUS = {
  IN_PROGRESS: 'in-progress',
  SUBMITTED: 'submitted',
  EXPIRED: 'expired',
} as const;

export type AttemptStatus = (typeof ATTEMPT_STATUS)[keyof typeof ATTEMPT_STATUS];

export const FACE_STATUS = {
  NOT_ENROLLED: 'not-enrolled',
  ENROLLED: 'enrolled',
  REVOKED: 'revoked',
} as const;

export type FaceStatus = (typeof FACE_STATUS)[keyof typeof FACE_STATUS];

export const BIOMETRIC_EVENT = {
  ENROLL: 'enroll',
  IDENTIFY: 'identify',
  FAIL: 'fail',
  REVOKE: 'revoke',
  /** Admin-approved verification request (staff ID check, e.g. twins). */
  OVERRIDE: 'override',
} as const;

export const BUSINESS_RULES = {
  MAX_QUESTIONS_PER_EXAM: 100,
  MIN_QUESTIONS_PER_EXAM: 1,
  OPTIONS_PER_QUESTION: 4,
  MAX_TIMER_MINUTES: 24 * 60,
  FACE_MAX_ATTEMPTS: 5,
  FACE_COOLDOWN_S: 30,
} as const;
