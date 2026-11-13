import { Hono } from 'hono';
import { Types } from 'mongoose';
import { attemptService } from '../services/index.js';
import { jsonOk, requireAuth, v } from '../middleware/index.js';
import { answerQuestionSchema } from '../validators/common.js';
import { serializeAttempt, serializeAttempts } from '../serializers/index.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../lib/errors.js';

const attempt = new Hono();

/**
 * GET /attempts
 * List the current student's attempts. Admin/teacher can pass `?studentId=`.
 */
attempt.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  if (user.ownerType !== 'Student') {
    throw new ForbiddenError(
      'Only students can list their own attempts here. Staff should use admin endpoints.',
    );
  }
  const list = await attemptService.listMyAttempts(user.sub);
  return jsonOk(c, serializeAttempts(list));
});

/**
 * GET /attempts/:id
 * Fetch a single attempt (own only, unless staff).
 */
attempt.get('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError('Invalid id');
  const a = await attemptService.getAttempt(id, user.sub, user.ownerType, user.role);
  return jsonOk(c, serializeAttempt(a));
});

/**
 * POST /attempts/:attemptId/answer
 * Record (or update) the student's answer to one question.
 */
attempt.post('/:attemptId/answer', requireAuth, v(answerQuestionSchema), async (c) => {
  const user = c.get('user');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = (c as any).get('body') as { questionId: string; givenOptionIds: string[] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params = (c as any).get('params') as { attemptId: string };
  await attemptService.answerQuestion(
    params.attemptId,
    body.questionId,
    body.givenOptionIds,
    user.sub,
  );
  return jsonOk(c, { ok: true });
});

export default attempt;
