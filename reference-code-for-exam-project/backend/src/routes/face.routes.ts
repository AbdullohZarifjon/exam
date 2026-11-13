// @ts-nocheck
import { Hono } from 'hono';
import { jsonOk, requireAuth, requireRole, v } from '../middleware/index.js';
import { ROLES } from '../config/constants.js';
import { faceIdentifySchema, faceEnrollSchema, verifyRequestCreateSchema } from '../validators/common.js';
import * as faceAuthService from '../services/face-auth.service.js';
import * as verifyService from '../services/verification-request.service.js';
import * as biometricService from '../services/biometric.service.js';
import { setAuthCookies } from '../lib/cookies.js';
import { createGetUrl, objectExists } from '../lib/s3.js';
import { BiometricEvent, Student } from '../models/index.js';
import { Types } from 'mongoose';

/**
 * Face identification only (kiosk, LAN).
 */

const face = new Hono();

/**
 * POST /api/face/identify
 * Face-only identification: image -> student -> published exam -> attempt + cookies.
 * Strict block on low score / low gap; no TTL, no QR, no human approval step.
 */
face.post('/identify', v(faceIdentifySchema), async (c) => {
  const body = (c as unknown as { get: (k: string) => unknown }).get('body') as { imageBase64: string; examId: string };
  const ip = c.req.header('x-forwarded-for') || 'unknown';
  const ua = c.req.header('user-agent') || undefined;
  const result = await faceAuthService.identifyAndStartAttempt(body.imageBase64, body.examId, ip, ua);
  setAuthCookies(c, result.tokens.access, result.tokens.refresh);
  return jsonOk(c, { ownerType: result.ownerType, student: result.student, exam: result.exam, attempt: result.attempt, assurance: result.assurance });
});

/**
 * POST /api/face/enroll
 * Staff-supervised enrollment (desk). Body: studentId + imageBase64. Teacher/admin only.
 */
face.post('/enroll', requireAuth, requireRole(ROLES.ADMIN), v(faceEnrollSchema), async (c) => {
  const body = (c as unknown as { get: (k: string) => unknown }).get('body') as { studentId: string; imageBase64: string };
  const u = (c as unknown as { get: (k: string) => { sub: string } }).get('user');
  const enrolled = await biometricService.enrollStudent(body.studentId, body.imageBase64, u.sub);
  return jsonOk(c, { ok: true, quality: enrolled.quality, model: enrolled.model });
});

/**
 * POST /api/face/verify-request — kiosk: look-alike student enters code +
 * live selfie, staff approve/deny in the Verification tab.
 */
face.post('/verify-request', v(verifyRequestCreateSchema), async (c) => {
  const body = (c as unknown as { get: (k: string) => unknown }).get('body') as { examId: string; studentCode: string; imageBase64: string };
  const created = await verifyService.createRequest({
    examId: body.examId, studentCode: body.studentCode, imageBase64: body.imageBase64,
    ip: c.req.header('x-forwarded-for') || 'unknown', ua: c.req.header('user-agent') || undefined,
  });
  return jsonOk(c, created);
});

/**
 * GET /api/face/verify-request/:id/status?token= — kiosk poll (10s).
 * On approval, claims the request: starts/resumes the attempt and sets
 * the student auth cookies.
 */
face.get('/verify-request/:id/status', async (c) => {
  const id = c.req.param('id');
  const token = c.req.header('x-claim-token') || '';
  const out = await verifyService.pollAndClaim(id, token, c.req.header('x-forwarded-for') || 'unknown', c.req.header('user-agent') || undefined);
  if (out.status === 'approved' && 'result' in out && out.result) {
    setAuthCookies(c, out.result.tokens.access, out.result.tokens.refresh);
    return jsonOk(c, { status: 'approved', ownerType: out.result.ownerType, student: out.result.student, exam: out.result.exam, attempt: out.result.attempt, assurance: out.result.assurance });
  }
  return jsonOk(c, { status: out.status });
});

/** GET /api/face/verify-requests — staff queue (selfie vs enrollment photo). */
face.get('/verify-requests', requireAuth, requireRole(ROLES.TEACHER, ROLES.ADMIN), async (c) => {
  return jsonOk(c, await verifyService.listForStaff());
});

/** POST /api/face/verify-requests/:id/approve|deny — staff decision. */
for (const action of ['approve', 'deny'] as const) {
  face.post(`/verify-requests/:id/${action}`, requireAuth, requireRole(ROLES.TEACHER, ROLES.ADMIN), async (c) => {
    const u = (c as unknown as { get: (k: string) => { sub: string } }).get('user');
    const decided = await verifyService.decide(c.req.param('id'), u.sub, action === 'approve', c.req.header('x-forwarded-for') || 'unknown', c.req.header('user-agent') || undefined);
    return jsonOk(c, decided);
  });
}

/**
 * DELETE /api/face/:studentId/revoke -- staff or the student themself
 */
face.delete('/:studentId/revoke', requireAuth, async (c) => {
  const id = c.req.param('studentId');
  if (!Types.ObjectId.isValid(id)) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid id' } }, 400);
  const u = (c as unknown as { get: (k: string) => { sub: string; ownerType: string } }).get('user');
  // A student may only revoke their own face; staff may revoke anyone's.
  if (u.ownerType === 'Student' && u.sub !== id) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only revoke your own face' } }, 403);
  }
  return jsonOk(c, await biometricService.revokeStudent(id, c.req.header('x-forwarded-for')));
});

/**
 * GET /api/face/audit -- admin only, recent biometric events
 */
face.get('/audit', requireAuth, requireRole(ROLES.ADMIN), async (c) => {
  const events = await BiometricEvent.find().sort({ createdAt: -1 }).limit(200).lean();
  return jsonOk(c, events);
});

/**
 * POST /api/face/reverify -- PLACEHOLDER for v2 continuous verification.
 * Intentionally not implemented in v1; returns 501 so the runner can call it
 * later without breaking.
 */
face.post('/reverify', requireAuth, async (c) => {
  return c.json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Continuous verification not enabled in v1' } }, 501);
});

/**
 * GET /api/face/:studentId/photo
 * Staff — presigned GET URL for the enrollment photo (faces/<studentId>).
 */
face.get('/:studentId/photo', requireAuth, requireRole(ROLES.TEACHER, ROLES.ADMIN), async (c) => {
  const id = c.req.param('studentId');
  const student = await Student.findById(id).select('face.photoKey');
  if (!student) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Student not found' } }, 404);
  const key = (student.face as any)?.photoKey || `faces/${id}`;
  if (!(await objectExists(key))) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'No photo' } }, 404);
  }
  const url = await createGetUrl(key);
  return jsonOk(c, { url, key });
});

export default face;
