import type { Context, Next } from 'hono';
import { ForbiddenError } from '../lib/errors.js';
import type { Role } from '../config/constants.js';

/**
 * Restricts a route to one or more roles. Must be used AFTER `requireAuth`.
 *
 * @example router.get('/admin/...', requireAuth, requireRole('admin'), handler)
 */
export const requireRole =
  (...roles: Role[]) =>
  async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!user) throw new ForbiddenError('Authentication required');

    if (!roles.includes(user.role as Role)) {
      throw new ForbiddenError(`Requires one of roles: ${roles.join(', ')}`);
    }
    await next();
  };
