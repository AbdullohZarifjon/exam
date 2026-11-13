/**
 * Standardized success/error response shapes.
 * All endpoints return one of these two so the API is predictable.
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export const ok = <T>(data: T): SuccessResponse<T> => ({ success: true, data });
