import type { Context, Next } from 'hono';

/**
 * Wraps an async route handler so thrown errors propagate to the
 * error-handling middleware (instead of becoming unhandled rejections).
 */
export const asyncHandler =
  <E extends Record<string, unknown>>(
    fn: (c: Context<E>, next: Next) => Promise<Response | void>,
  ) =>
  (c: Context<E>, next: Next): Promise<Response | void> => {
    return Promise.resolve(fn(c, next)).catch((err) => {
      throw err;
    });
  };
