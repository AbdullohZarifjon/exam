import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { OwnerType, Role } from '../config/constants.js';

/**
 * Token engine — pure sign/verify functions. No HTTP, no DB. The only
 * revocation mechanism is the `tv` (tokenVersion) claim on refresh
 * tokens: the server compares it against the owner's current counter.
 */
export type TokenType = 'access' | 'refresh';

export interface AccessPayload {
  sub: string;
  ownerType: OwnerType;
  role?: Role;
  examId?: string;
  typ: 'access';
}

export interface RefreshPayload extends Omit<AccessPayload, 'typ'> {
  typ: 'refresh';
  /** tokenVersion at issue time — revocation check happens on rotate. */
  tv: number;
}

const ACCESS_TTL = '15m';

/** Students get short exam-scoped sessions; staff live for 30 days. */
const REFRESH_TTL = {
  staff: env.JWT_REFRESH_EXPIRES_IN,
  student: '6h',
} as const;

/* ----------------------------- access tokens ----------------------------- */

export function signAccessToken(payload: Omit<AccessPayload, 'typ'>): string {
  const options: SignOptions = { expiresIn: ACCESS_TTL as SignOptions['expiresIn'] };
  return jwt.sign({ ...payload, typ: 'access' }, env.JWT_ACCESS_SECRET, options);
}

export function verifyAccessToken(token: string): AccessPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
  if (payload.typ !== 'access') {
    throw new Error('Invalid token type: expected access');
  }
  return payload;
}

/* ---------------------------- refresh tokens ----------------------------- */

export function signRefreshToken(payload: Omit<RefreshPayload, 'typ'>): string {
  const ttl = payload.ownerType === 'Student' ? REFRESH_TTL.student : REFRESH_TTL.staff;
  const options: SignOptions = { expiresIn: ttl as SignOptions['expiresIn'] };
  return jwt.sign({ ...payload, typ: 'refresh' }, env.JWT_REFRESH_SECRET, options);
}

export function verifyRefreshToken(token: string): RefreshPayload {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;
  if (payload.typ !== 'refresh') {
    throw new Error('Invalid token type: expected refresh');
  }
  if (typeof payload.tv !== 'number') {
    throw new Error('Refresh token missing tv claim');
  }
  return payload;
}
