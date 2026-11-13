import type { Context } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { env } from '../config/env.js';

/**
 * Cookie layer for the rotating-JWT auth. Tokens live ONLY in httpOnly
 * cookies — the body of auth responses never contains them.
 *
 * Two cookies:
 *   access  — short-lived, sent on every /api request (path=/)
 *   refresh — long-lived, scoped to /api/auth/refresh so it is NOT
 *             attached to regular requests.
 */
export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

const isProd = env.NODE_ENV === 'production';

export const accessCookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 15 * 60, // seconds — matches the 15m access TTL
};

export const refreshCookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/api/auth/refresh',
  maxAge: 30 * 24 * 60 * 60, // seconds — staff refresh TTL
};

export function setAuthCookies(c: Context, accessToken: string, refreshToken: string) {
  setCookie(c, ACCESS_COOKIE, accessToken, accessCookieOpts);
  setCookie(c, REFRESH_COOKIE, refreshToken, refreshCookieOpts);
}

export function getRefreshCookie(c: Context): string | undefined {
  return getCookie(c, REFRESH_COOKIE);
}

/** Best-effort read of the access cookie (Bearer header takes priority). */
export function getAccessCookie(c: Context): string | undefined {
  return getCookie(c, ACCESS_COOKIE);
}

export function clearAuthCookies(c: Context) {
  deleteCookie(c, ACCESS_COOKIE, { path: '/' });
  deleteCookie(c, REFRESH_COOKIE, { path: '/api/auth/refresh' });
}
