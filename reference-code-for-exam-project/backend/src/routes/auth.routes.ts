import { Hono, type Context } from 'hono';
import { authService, identityService, studentService } from '../services/index.js';
import { Exam } from '../models/index.js';
import { jsonOk, v, requireAuth, requireRole } from '../middleware/index.js';
import { staffCreateSchema, staffPasswordResetSchema, loginSchema, studentCreateSchema, studentUpdateSchema } from '../validators/common.js';
import { serializeStudent, serializeStudents } from '../serializers/index.js';
import { setAuthCookies, clearAuthCookies, getRefreshCookie } from '../lib/cookies.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { UnauthorizedError, ForbiddenError, BadRequestError } from '../lib/errors.js';
import { ROLES } from '../config/constants.js';

const auth = new Hono();

function respondWithSession(c: unknown, result: { ownerType: string; user?: unknown; student?: unknown; tokens: { access: string; refresh: string } }) {
  const ctx = c as Parameters<typeof setAuthCookies>[0];
  setAuthCookies(ctx, result.tokens.access, result.tokens.refresh);
  const { tokens: _tokens, ...identity } = result;
  return jsonOk(ctx, identity);
}

// NOTE: there is deliberately NO public /register route. Staff accounts
// can never be created from outside: the first admin is bootstrapped
// from ADMIN / ADMIN_PASSWORD env vars on startup, and every further
// admin/teacher account is created by that admin through the
// admin-only /admin/users endpoints below.

auth.use('/admin/users', requireAuth, requireRole(ROLES.ADMIN));
auth.use('/admin/users/*', requireAuth, requireRole(ROLES.ADMIN));

auth.get('/admin/users', async (c) => {
  return jsonOk(c, await authService.listStaffUsers());
});

auth.post('/admin/users', v(staffCreateSchema), async (c) => {
  const body = (c as unknown as { get: (k: string) => unknown }).get('body');
  return jsonOk(c, await authService.createStaffUser(body as never));
});

async function handleResetPassword(c: Context) {
  const body = (c as unknown as { get: (k: string) => unknown }).get('body') as { password: string };
  const id = c.req.param('id')!;
  return jsonOk(c, await authService.resetStaffPassword(id, body.password));
}

// Both POST and PATCH are accepted for the reset so clients can use
// either convention; both are admin-only (see the auth.use above).
auth.post('/admin/users/:id/reset-password', v(staffPasswordResetSchema), handleResetPassword);
auth.patch('/admin/users/:id/reset-password', v(staffPasswordResetSchema), handleResetPassword);
auth.post('/admin/users/:id/password', v(staffPasswordResetSchema), handleResetPassword);

auth.post('/login', v(loginSchema), async (c) => {
  const body = (c as unknown as { get: (k: string) => unknown }).get('body') as { username: string; password: string };
  const result = await authService.login(body.username, body.password);
  return respondWithSession(c, result);
});

auth.post('/refresh', async (c) => {
  const raw = getRefreshCookie(c);
  if (!raw) throw new UnauthorizedError('No refresh token');
  const { tokens, ownerType } = await authService.rotateRefreshToken(raw);
  setAuthCookies(c, tokens.access, tokens.refresh);
  const payload = verifyAccessToken(tokens.access);
  const identity = ownerType === 'User'
    ? { ownerType, user: await authService.me(payload.sub) }
    : { ownerType, student: await authService.meStudent(payload.sub) };
  return jsonOk(c, identity);
});

auth.post('/logout', async (c) => {
  clearAuthCookies(c);
  return jsonOk(c, { ok: true });
});

auth.post('/logout-all', requireAuth, async (c) => {
  const u = c.get('user');
  await authService.revokeAllSessions(u.ownerType, u.sub);
  clearAuthCookies(c);
  return jsonOk(c, { ok: true });
});

auth.get('/me', requireAuth, async (c) => {
  const u = c.get('user');
  if (u.ownerType === 'User') return jsonOk(c, { ownerType: 'User', user: await authService.me(u.sub) });
  const student = await studentService.getStudent(u.sub);
  return jsonOk(c, { ownerType: 'Student', student: serializeStudent(student) });
});

auth.use('/students', requireAuth, requireRole(ROLES.TEACHER, ROLES.ADMIN));
auth.use('/students/*', requireAuth, requireRole(ROLES.TEACHER, ROLES.ADMIN));

auth.get('/students', async (c) => {
  const q = c.req.query('q');
  const page = Number(c.req.query('page')) || 1;
  const limit = Number(c.req.query('limit')) || 24;
  const result = await studentService.listStudents({ q, page, limit });
  return jsonOk(c, {
    items: serializeStudents(result.items as never),
    total: result.total,
    page: result.page,
    limit: result.limit,
    pages: result.pages,
  });
});

auth.get('/students/by-code/:code', async (c) => {
  const code = c.req.param('code')!;
  return jsonOk(c, serializeStudent(await identityService.getStudentByCode(code)));
});

auth.post('/students', v(studentCreateSchema), async (c) => {
  const body = (c as unknown as { get: (k: string) => unknown }).get('body');
  return jsonOk(c, serializeStudent(await studentService.createStudent(body as never)));
});

auth.patch('/students/:id', v(studentUpdateSchema), async (c) => {
  const body = (c as unknown as { get: (k: string) => unknown }).get('body');
  const id = c.req.param('id')!;
  const actorRole = (c as unknown as { get: (k: string) => { role?: string } }).get('user')?.role;
  return jsonOk(c, serializeStudent(await studentService.updateStudent(id, body as never, actorRole)));
});

auth.delete('/students/:id', async (c) => {
  const id = c.req.param('id')!;
  await studentService.deleteStudent(id);
  return jsonOk(c, { id, deleted: true });
});

auth.post('/student/finish', requireAuth, async (c) => {
  const u = c.get('user');
  if (u.ownerType !== 'Student') throw new ForbiddenError('Only confirmed students can use this endpoint');
  const body = (await c.req.json().catch(() => ({}))) as { attemptId?: string };
  if (!body.attemptId) throw new BadRequestError('attemptId is required');
  const attempt = await identityService.finishExamAndRevokeSession(body.attemptId, u.sub);
  await authService.revokeAllSessions('Student', u.sub);
  clearAuthCookies(c);
  return jsonOk(c, { attempt });
});

auth.get('/student/result/:token', async (c) => {
  const token = c.req.param('token')!;
  const attempt = await identityService.getAttemptByResultToken(token);
  const exam = await Exam.findById(attempt.examId).select('passingScorePercent passingScorePoints').lean();
  return jsonOk(c, { attempt, passingScorePercent: exam?.passingScorePercent ?? null, passingScorePoints: exam?.passingScorePoints ?? null });
});

export default auth;
