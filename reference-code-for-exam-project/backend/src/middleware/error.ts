import type { Context, Next } from 'hono';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError, ValidationError } from '../lib/errors.js';
import { ok, type ErrorResponse } from '../lib/response.js';
import { env } from '../config/env.js';

/**
 * Final error handler. Converts any thrown error into a consistent
 * JSON envelope. Logs the stack in development only.
 */
export const errorHandler = async (err: Error, c: Context) => {
  const { statusCode, body } = mapError(err, c);
  return c.json(body, statusCode as 400 | 401 | 403 | 404 | 409 | 422 | 500);
};

function mapError(err: unknown, c: Context): { statusCode: number; body: ErrorResponse } {
  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      body: {
        success: false,
        error: { code: err.code, message: err.message, details: err.details },
      },
    };
  }

  if (err instanceof ZodError) {
    const ve = new ValidationError('Validation failed', err.flatten().fieldErrors);
    return {
      statusCode: ve.statusCode,
      body: { success: false, error: { code: ve.code, message: ve.message, details: ve.details } },
    };
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return {
      statusCode: 422,
      body: {
        success: false,
        error: { code: 'MONGOOSE_VALIDATION', message: err.message, details: err.errors },
      },
    };
  }

  if (err instanceof mongoose.Error.CastError) {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: { code: 'CAST_ERROR', message: `Invalid ${err.path}: ${err.value}` },
      },
    };
  }

  // Mongo duplicate key
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((err as any)?.code === 11000) {
    return {
      statusCode: 409,
      body: {
        success: false,
        error: { code: 'DUPLICATE_KEY', message: 'Resource already exists' },
      },
    };
  }

  // Unknown — log and hide details in production
  console.error('💥 Unhandled error:', err);
  const message =
    env.NODE_ENV === 'production'
      ? 'Internal server error'
      : ((err as Error)?.message ?? 'Unknown error');
  return {
    statusCode: 500,
    body: { success: false, error: { code: 'INTERNAL_ERROR', message } },
  };
}

/** 404 handler for unmatched routes. */
export function notFoundHandler(c: Context) {
  return c.json(
    {
      success: false,
      error: { code: 'NOT_FOUND', message: `Route ${c.req.method} ${c.req.path} not found` },
    } satisfies ErrorResponse,
    404,
  );
}

/** Tiny helper to return a 200 success body consistently. */
export const jsonOk = <T>(c: Context, data: T) => c.json(ok(data));
