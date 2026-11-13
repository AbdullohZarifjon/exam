import { randomBytes } from 'node:crypto';

/** URL-safe random token, 32 bytes (~43 chars) by default. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/**
 * Human-friendly opaque code: ~59 bits of entropy in 12
 * characters, typed/scanned easily. The alphabet deliberately omits
 * look-alikes (0/O, 1/I/L).
 */
export function randomShortCode(length = 12): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += alphabet[bytes[i]! % alphabet.length]!;
  }
  return code;
}
