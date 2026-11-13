/**
 * Generic shape most structured backend error bodies share, e.g.:
 *   { "code": 7998842, "message": "Invalid credentials" }
 *
 * `code` here is a BUSINESS error code from your backend — it has nothing
 * to do with the HTTP status. The same HTTP status (e.g. 400) can carry
 * many different business codes, and body.code is what actually tells you:
 *   - what really went wrong
 *   - which translation to show
 *   - whether to branch UI logic (e.g. show a "resend verification" button)
 *
 * Extend this per-endpoint when a response includes extra fields — see the
 * ValidationErrorBody example in the usage examples.
 */
export interface BackendErrorResponse {
  code: number;
  message: string;
  [key: string]: unknown;
}

/**
 * Thrown for every failed request. Carries the HTTP status separately from
 * the backend's own structured error body, on purpose — neither can ever
 * silently overwrite the other, unlike merging everything into one object.
 */
export class ApiError<TBody = BackendErrorResponse> extends Error {
  /** Raw HTTP status code (400, 401, 500, ...). Always a number, always present. */
  readonly httpStatus: number;
  /** Parsed JSON error body from the backend, if the response had one. */
  readonly body?: TBody;
  /**
   * True if this was thrown before any HTTP response came back at all
   * (offline, DNS failure, CORS, request timeout). `body` will be
   * undefined and `httpStatus` will be 0 in this case.
   */
  readonly isNetworkError: boolean;

  constructor(message: string, httpStatus: number, body?: TBody, isNetworkError = false) {
    super(message);
    this.name = "ApiError";
    this.httpStatus = httpStatus;
    this.body = body;
    this.isNetworkError = isNetworkError;
    // Needed for `instanceof` to keep working reliably when extending a
    // built-in like Error, depending on your tsconfig `target`.
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
