import { Hono } from 'hono';
import { Types } from 'mongoose';
import { questionService, uploadService } from '../services/index.js';
import { jsonOk, requireAuth, requireRole, v } from '../middleware/index.js';
import { questionCreateSchema, questionUpdateSchema } from '../validators/common.js';
import { serializeQuestion, serializeQuestions } from '../serializers/index.js';
import { BadRequestError } from '../lib/errors.js';

const question = new Hono();

/**
 * GET /questions?examId=...
 * List all questions for a given exam. Admin/teacher only.
 */
question.get('/', requireAuth, requireRole('teacher', 'admin'), async (c) => {
  const examId = c.req.query('examId');
  if (!examId) throw new BadRequestError('examId query param is required');
  if (!Types.ObjectId.isValid(examId)) throw new BadRequestError('Invalid examId');
  const list = await questionService.listQuestionsForExam(examId);
  return jsonOk(c, await serializeQuestions(list));
});

/**
 * GET /questions/:id
 * Get a single question (admin/teacher).
 */
question.get('/:id', requireAuth, requireRole('teacher', 'admin'), async (c) => {
  const id = c.req.param('id')!;
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError('Invalid id');
  const q = await questionService.getQuestion(id);
  return jsonOk(c, await serializeQuestion(q));
});

/**
 * POST /questions
 * Create a new question. `correctOptionIndexes` references the
 * `options[]` array in the same request body.
 */
question.post(
  '/',
  requireAuth,
  requireRole('teacher', 'admin'),
  v(questionCreateSchema),
  async (c) => {
    const user = c.get('user');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (c as any).get('body');
    const created = await questionService.createQuestion(body, user.sub, user.role ?? '');
    return jsonOk(c, await serializeQuestion(created));
  },
);

/**
 * PATCH /questions/:id
 * Update a question.
 */
question.patch(
  '/:id',
  requireAuth,
  requireRole('teacher', 'admin'),
  v(questionUpdateSchema),
  async (c) => {
    const user = c.get('user');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (c as any).get('body');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params = (c as any).get('params') as { id?: string };
    const updated = await questionService.updateQuestion(
      params.id!,
      user.sub,
      user.role ?? '',
      body,
    );
    return jsonOk(c, await serializeQuestion(updated));
  },
);

/**
 * DELETE /questions/:id
 * Delete a question.
 */
question.delete('/:id', requireAuth, requireRole('teacher', 'admin'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id')!;
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError('Invalid id');
  await questionService.deleteQuestion(id, user.sub, user.role ?? '');
  return jsonOk(c, { id, deleted: true });
});

/**
 * DELETE /questions/:id/image
 * Remove the image attached to a question. Idempotent: no-op if no image.
 */
question.delete('/:id/image', requireAuth, requireRole('teacher', 'admin'), async (c) => {
  const id = c.req.param('id')!;
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError('Invalid id');
  const result = await uploadService.removeImageForQuestion(id);
  return jsonOk(c, result);
});

export default question;
