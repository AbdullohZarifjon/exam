/**
 * Generic shape most structured backend error bodies share, e.g.:
 *   { "code": "NOT_FOUND", "message": "Exam not found" }
 *
 * `code` here is a BUSINESS error code from the backend (string in our
 * project) — it has nothing to do with the HTTP status. The same HTTP
 * status (e.g. 400) can carry many different business codes.
 *
 * Extend this per-endpoint when a response includes extra fields.
 */
export interface BackendErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Thrown for every failed request. Carries the HTTP status separately
 * from the backend's own structured error body, on purpose — neither
 * can ever silently overwrite the other.
 */
export class ApiError<TBody = BackendErrorResponse> extends Error {
  readonly httpStatus: number;
  readonly body?: TBody;
  /** True if thrown before any HTTP response came back (offline, timeout, CORS). */
  readonly isNetworkError: boolean;

  constructor(message: string, httpStatus: number, body?: TBody, isNetworkError = false) {
    super(message);
    this.name = "ApiError";
    this.httpStatus = httpStatus;
    this.body = body;
    this.isNetworkError = isNetworkError;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
