import { isApiError } from "./client";
import type { BackendErrorResponse } from "./client.type";

/**
 * Known business error codes from the backend. Keep this in sync with the
 * backend's error catalog — ask for a shared source of truth (OpenAPI enum,
 * shared constants package, a wiki page) if one doesn't exist yet.
 */
export const ErrorCode = {
  INVALID_CREDENTIALS: 7998842,
  ACCOUNT_LOCKED: 7998843,
  EMAIL_TAKEN: 7998844,
  VALIDATION_FAILED: 7998900,
  // TODO: replace with your backend's real code for "current password is wrong"
  INVALID_CURRENT_PASSWORD: 7998845,
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** code -> i18n key. Swap these string values for real t() keys/calls. */
const errorMessageKeys: Partial<Record<number, string>> = {
  [ErrorCode.INVALID_CREDENTIALS]: "errors.invalidCredentials",
  [ErrorCode.ACCOUNT_LOCKED]: "errors.accountLocked",
  [ErrorCode.EMAIL_TAKEN]: "errors.emailTaken",
  [ErrorCode.VALIDATION_FAILED]: "errors.validationFailed",
};

/**
 * One place to turn ANY caught error into a translation key. Priority:
 *   1. no HTTP response at all (offline, timeout)     -> generic network key
 *   2. backend sent a business code we recognize       -> specific key
 *   3. backend error, code we don't have a key for yet -> generic bucket by HTTP status
 *   4. not even an ApiError (shouldn't normally happen) -> generic fallback
 */
export function getErrorTranslationKey(error: unknown): string {
  if (!isApiError<BackendErrorResponse>(error)) return "errors.generic";
  if (error.isNetworkError) return "errors.network";

  const code = error.body?.code;
  if (code !== undefined && code in errorMessageKeys) {
    return errorMessageKeys[code]!;
  }

  switch (error.httpStatus) {
    case 401:
      return "errors.unauthorized";
    case 403:
      return "errors.forbidden";
    case 404:
      return "errors.notFound";
    case 500:
      return "errors.server";
    default:
      return "errors.generic";
  }
}
