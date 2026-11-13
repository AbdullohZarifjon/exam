import { isApiError } from "./client";
import type { BackendErrorResponse } from "./client.type";

/**
 * Known business error codes from the backend. Keep in sync with the
 * backend's `lib/errors.ts` — adjust the strings as the API evolves.
 */
export const ErrorCode = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  /** The attempt's timer ran out — answers are no longer accepted. */
  ATTEMPT_EXPIRED: "ATTEMPT_EXPIRED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
  CAST_ERROR: "CAST_ERROR",
  DUPLICATE_KEY: "DUPLICATE_KEY",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  MONGOOSE_VALIDATION: "MONGOOSE_VALIDATION",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** code -> i18n key. */
const errorMessageKeys: Partial<Record<string, string>> = {
  [ErrorCode.UNAUTHORIZED]: "errors.unauthorized",
  [ErrorCode.FORBIDDEN]: "errors.forbidden",
  [ErrorCode.NOT_FOUND]: "errors.notFound",
  [ErrorCode.VALIDATION_ERROR]: "errors.validation",
  [ErrorCode.CONFLICT]: "errors.conflict",
  [ErrorCode.ATTEMPT_EXPIRED]: "errors.attemptExpired",
  [ErrorCode.INTERNAL_ERROR]: "errors.server",
};

/**
 * One place to turn ANY caught error into a translation key. Priority:
 *   1. no HTTP response at all (offline, timeout)    -> generic network key
 *   2. backend sent a business code we recognize    -> specific key
 *   3. backend error, code we don't have a key for  -> generic bucket by HTTP status
 *   4. not even an ApiError                         -> generic fallback
 */
export function getErrorTranslationKey(error: unknown): string {
  if (!isApiError<BackendErrorResponse>(error)) return "errors.generic";
  if (error.isNetworkError) return "errors.network";

  const code = error.body?.code;
  if (code && code in errorMessageKeys) {
    return errorMessageKeys[code]!;
  }

  switch (error.httpStatus) {
    case 400:
      return "errors.badRequest";
    case 401:
      return "errors.unauthorized";
    case 403:
      return "errors.forbidden";
    case 404:
      return "errors.notFound";
    case 409:
      return "errors.conflict";
    case 422:
      return "errors.validation";
    case 500:
      return "errors.server";
    default:
      return "errors.generic";
  }
}
