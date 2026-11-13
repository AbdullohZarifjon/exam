import type { Context, Next } from 'hono';
import { verifyAccessToken } from '../lib/jwt.js';
import { getAccessCookie } from '../lib/cookies.js';
import { UnauthorizedError } from '../lib/errors.js';

/**
 * Resolves the access token from (in order):
 *   1. `Authorization: Bearer <token>` header — used by Swagger UI and
 *      machine clients.
 *   2. `access_token` httpOnly cookie — used by the browser app.
 *
 * Attaches the decoded payload to `c.var.user`; throws 401 otherwise.
 */
function resolveAccessToken(c: Context): string {
  const header = c.req.header('authorization');
  if (header?.toLowerCase().startsWith('bearer ')) {
    const token = header.slice(7).trim();
    if (token) return token;
  }
  const cookie = getAccessCookie(c);
  if (cookie) return cookie;
  throw new UnauthorizedError('Missing access token');
}

export async function requireAuth(c: Context, next: Next) {
  try {
    const payload = verifyAccessToken(resolveAccessToken(c));
    c.set('user', payload);
    await next();
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError('Invalid or expired access token');
  }
}
