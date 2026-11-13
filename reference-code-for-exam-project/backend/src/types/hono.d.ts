/**
 * Augment Hono's context with our app-specific variables
 * (e.g. the authenticated user) so handlers stay type-safe.
 */
import 'hono';
import type { BaseJwtPayload } from '../lib/jwt.js';

declare module 'hono' {
  interface ContextVariableMap {
    user: BaseJwtPayload;
  }
}
