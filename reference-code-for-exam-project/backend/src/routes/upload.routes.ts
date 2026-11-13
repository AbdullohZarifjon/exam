import { Hono } from 'hono';
import { Types } from 'mongoose';
import { uploadService } from '../services/index.js';
import { jsonOk, requireAuth, requireRole, v } from '../middleware/index.js';
import { ROLES } from '../config/constants.js';
import { z } from 'zod';
import { BadRequestError } from '../lib/errors.js';

const upload = new Hono();

const requestSchema = z.object({
  entityType: z.literal('question'),
  entityId: z.string().regex(/^[a-f\d]{24}$/i),
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(3).max(100),
  sizeBytes: z.number().int().positive(),
});

const idSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parse = (schema: any, data: unknown) => schema.parse(data);

/**
 * POST /uploads/request
 * Issue a presigned PUT URL. The client uploads bytes straight to
 * storage — the backend never sees the file.
 */
upload.post('/request', requireAuth, requireRole(ROLES.TEACHER, ROLES.ADMIN), async (c) => {
  const body = parse(requestSchema, await c.req.json());
  const result = await uploadService.requestUpload(body);
  return jsonOk(c, result);
});

/**
 * POST /uploads/:id/confirm
 * HEAD-verify the object exists, mark confirmed, attach to the question.
 */
upload.post('/:id/confirm', requireAuth, requireRole(ROLES.TEACHER, ROLES.ADMIN), async (c) => {
  const { id } = parse(idSchema, { id: c.req.param('id') });
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError('Invalid id');
  const result = await uploadService.confirmUpload(id);
  return jsonOk(c, result);
});

/**
 * GET /uploads/image-url?key=...
 * Get a presigned GET URL for an existing image key.
 */
upload.get('/image-url', requireAuth, requireRole(ROLES.TEACHER, ROLES.ADMIN), async (c) => {
  const key = c.req.query('key');
  if (!key) throw new BadRequestError('key query param required');
  const imageUrl = await uploadService.getImageUrl(key);
  return jsonOk(c, { imageUrl });
});

/**
 * DELETE /uploads/:id
 * Soft-delete: detach from the question; cleanup sweep removes bytes later.
 */
upload.delete('/:id', requireAuth, requireRole(ROLES.TEACHER, ROLES.ADMIN), async (c) => {
  const { id } = parse(idSchema, { id: c.req.param('id') });
  if (!Types.ObjectId.isValid(id)) throw new BadRequestError('Invalid id');
  await uploadService.deleteUpload(id);
  return jsonOk(c, { id, deleted: true });
});

export default upload;
