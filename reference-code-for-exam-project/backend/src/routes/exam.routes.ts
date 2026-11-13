import { Hono } from 'hono';
import { Types } from 'mongoose';
import { attemptService, examService } from '../services/index.js';
import { jsonOk, requireAuth, v, requireRole } from '../middleware/index.js';
import {
  examCreateSchema,
  examUpdateSchema,
  assertExamCrossFields,
} from '../validators/common.js';
import {
  serializeAttemptsWithStudent,
  serializeExam,
  serializeExams,
} from '../serializers/index.js';
import { EXAM_STATUS, ROLES } from '../config/constants.js';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../lib/errors.js';
import { getAccessCookie } from '../lib/cookies.js';
import { verifyAccessToken } from '../lib/jwt.js';

const exam = new Hono();

exam.use('*', (c, next) => next());

/**
 * GET /exams
 * - If the caller is unauthenticated OR a student, only `published` exams
 *   are visible; requesting another status returns an empty list.
 * - Staff see all exams (filtered by `?status=` if provided).
 */
exam.get('/', async (c) => {
  const status = c.req.query('status') as 'draft' | 'published' | 'archived' | undefined;

  if (status && !Object.values(EXAM_STATUS).includes(status)) {
    throw new BadRequestError('Invalid exam status');
  }

  // This public route does not run requireAuth. Resolve browser cookies and
  // Bearer credentials explicitly; expired credentials must trigger the
  // client's normal refresh flow instead of silently returning public data.
  const header = c.req.header('authorization');
  const token = header?.toLowerCase().startsWith('bearer ')
    ? header.slice(7).trim()
    : getAccessCookie(c);
  let user: ReturnType<typeof verifyAccessToken> | undefined;
  if (token) {
    try {
      user = verifyAccessToken(token);
    } catch {
      throw new UnauthorizedError('Invalid or expired access token');
    }
  }
  const isStaff = user?.ownerType === 'User' &&
    (user.role === ROLES.ADMIN || user.role === ROLES.TEACHER);

  if (!user || !isStaff) {
    return jsonOk(
      c,
      status && status !== EXAM_STATUS.PUBLISHED
        ? []
        : serializeExams(await examService.listExams({ status: EXAM_STATUS.PUBLISHED })),
    );
  }

  return jsonOk(
    c,
    serializeExams(
      await examService.listExams({
        ...(status ? { status } : {}),
        ...(user.role === ROLES.TEACHER ? { createdBy: user.sub! } : {}),
      }),
    ),
  );
});

/**
 * GET /exams/:id
 * Fetch a single exam. Published exams are publicly readable; draft/archived
 * exams require authentication.
 */
exam.get('/:id', async (c) => {
  const id = c.req.param('id')!;
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError('Invalid id');
  const e = await examService.getExam(id);

  if (e.status !== EXAM_STATUS.PUBLISHED) {
    // Resolve the caller the same way `requireAuth` does (Bearer header or
    // access cookie) — cookie-only browser requests previously fell through
    // to a 400 because only the Authorization header was checked.
    const header = c.req.header('authorization');
    const cookie = getAccessCookie(c);
    let user: { ownerType: string; role?: string; sub?: string } | undefined;
    try {
      const token = header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : cookie;
      if (token) user = verifyAccessToken(token);
    } catch {
      user = undefined;
    }

    // Students and anonymous callers can never see non-published exams.
    if (!user || user.ownerType === 'Student') throw new NotFoundError('Exam not found');

    // Teachers may only open their own drafts; admins can open any.
    if (user.role !== ROLES.ADMIN && String(e.createdBy) !== user.sub) {
      throw new NotFoundError('Exam not found');
    }
  }
  return jsonOk(c, serializeExam(e));
});

/* -------- Teacher / Admin only -------- */

/**
 * POST /exams
 * Create a new exam in `draft` status.
 */
exam.post(
  '/',
  requireAuth,
  requireRole(ROLES.TEACHER, ROLES.ADMIN),
  v(examCreateSchema),
  async (c) => {
    const user = c.get('user');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (c as any).get('body');
    assertExamCrossFields(body);
    const created = await examService.createExam({ ...body, createdBy: user.sub });
    return jsonOk(c, serializeExam(created));
  },
);

/**
 * PATCH /exams/:id
 * Update an exam. Only the creator or an admin.
 */
exam.patch(
  '/:id',
  requireAuth,
  requireRole(ROLES.TEACHER, ROLES.ADMIN),
  v(examUpdateSchema),
  async (c) => {
    const user = c.get('user');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (c as any).get('body');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params = (c as any).get('params') as { id?: string };
    const id = params.id!;
    assertExamCrossFields(body);
    const updated = await examService.updateExam(id, user.sub, user.role ?? '', body);
    return jsonOk(c, serializeExam(updated));
  },
);

/**
 * DELETE /exams/:id
 * Delete an exam AND all its questions. Only the creator or an admin.
 */
exam.delete('/:id', requireAuth, requireRole(ROLES.TEACHER, ROLES.ADMIN), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError('Invalid id');
  await examService.deleteExam(id, user.sub, user.role ?? '');
  return jsonOk(c, { id, deleted: true });
});

/**
 * POST /exams/:id/publish
 * Publish an exam (only if it has enough active questions).
 */
exam.post('/:id/publish', requireAuth, requireRole(ROLES.TEACHER, ROLES.ADMIN), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError('Invalid id');
  const published = await examService.publishExam(id, user.sub, user.role ?? '');
  return jsonOk(c, serializeExam(published));
});

/**
 * POST /exams/:id/archive
 * Archive a published exam (one-way Published -> Archived).
 */
exam.post('/:id/archive', requireAuth, requireRole(ROLES.TEACHER, ROLES.ADMIN), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError('Invalid id');
  const archived = await examService.archiveExam(id, user.sub, user.role ?? '');
  return jsonOk(c, serializeExam(archived));
});

/**
 * GET /exams/:id/attempts
 * Staff: list all attempts for this exam, joined with student info.
 */
exam.get('/:id/attempts', requireAuth, requireRole(ROLES.TEACHER, ROLES.ADMIN), async (c) => {
  const examId = c.req.param('id')!;
  if (!Types.ObjectId.isValid(examId)) throw new BadRequestError('Invalid id');
  const list = await attemptService.listAttemptsForExam(examId);
  return jsonOk(c, serializeAttemptsWithStudent(list));
});

export default exam;
