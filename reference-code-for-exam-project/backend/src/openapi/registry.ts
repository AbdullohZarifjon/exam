import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';

/**
 * OpenAPI + Swagger UI.
 *
 * The full request/response schemas live with the route handlers
 * (validators/common.ts) and are NOT duplicated here. This module serves
 * a hand-maintained summary spec that documents the auth contract —
 * especially the cookie behavior, which is invisible to generated specs.
 */
const spec = {
  openapi: '3.1.0',
  info: {
    title: 'Exam Platform API',
    version: '2.0.0',
    description: [
      '## Authentication',
      '',
      'Tokens are delivered as **httpOnly cookies** and rotated on every refresh:',
      '',
      '- `access_token` — 15 min TTL, sent with every `/api` request',
      '- `refresh_token` — 30 days (staff) / 6 hours (students), scoped to `/api/auth/refresh` only',
      '',
      'Revocation is **stateless**: refresh tokens carry a `tv` (tokenVersion) claim.',
      '`POST /api/auth/logout-all` bumps the owner counter, instantly invalidating',
      'every outstanding refresh token. Access tokens age out within 15 minutes.',
      '',
      '`Authorization: Bearer <accessToken>` also works for Swagger "Try it out"',
      'and machine clients — log in below and paste the access token via the',
      'browser devtools (or call `/api/auth/login` with curl and read the Set-Cookie).',
    ].join('\n'),
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'Auth' },
    { name: 'Exams' },
    { name: 'Questions' },
    { name: 'Attempts' },
    { name: 'Face' },
  ],
  paths: {
    '/api/health': {
      get: { tags: ['Auth'], summary: 'Health check', responses: { 200: { description: 'OK' } } },
    },
    '/api/auth/admin/users': {
      get: {
        tags: ['Auth'],
        summary: 'List staff users (admin only)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'OK' }, 403: { description: 'Admin only' } },
      },
      post: {
        tags: ['Auth'],
        summary: 'Create a staff user — admin only. There is no public registration; the first admin is bootstrapped from ADMIN / ADMIN_PASSWORD env vars.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' } } },
        },
        responses: { 200: { description: 'OK' }, 403: { description: 'Admin only' } },
      },
    },
    '/api/auth/admin/users/{id}/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset a staff user password — admin only (revokes their sessions)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' }, 403: { description: 'Admin only' }, 404: { description: 'User not found' } },
      },
      patch: {
        tags: ['Auth'],
        summary: 'Reset a staff user password — admin only (revokes their sessions)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' }, 403: { description: 'Admin only' }, 404: { description: 'User not found' } },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Staff login — sets access + refresh cookies',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: { username: { type: 'string' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Identity + session cookies set' } },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate cookies (stateless revocation via tokenVersion)',
        responses: {
          200: { description: 'Fresh cookies set, identity returned' },
          401: { description: 'No/revoked/expired refresh token' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Clear auth cookies on this device',
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/auth/logout-all': {
      post: {
        tags: ['Auth'],
        summary: 'Bump tokenVersion — log out everywhere',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current identity (staff or student)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/face/identify': {
      post: {
        tags: ['Face'],
        summary:
          'Face identify — image to student + attempt',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' } } },
        },
        responses: { 200: { description: 'Pending request (shortCode + token + expiry)' } },
      },
      get: {
        tags: ['Face'],
        summary: 'Face audit log (admin)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/face/enroll': {
      post: {
        tags: ['Face'],
        summary:
          'Student claims an approved request — SINGLE-USE, sets exam-scoped student cookies',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' } } },
        },
        responses: { 200: { description: 'Attempt started, cookies set' } },
      },
    },
                    '/api/auth/student/finish': {
      post: {
        tags: ['Auth'],
        summary: 'Submit attempt, revoke student session, get result token',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Graded attempt + resultToken' } },
      },
    },
    '/api/auth/student/result/{token}': {
      get: {
        tags: ['Auth'],
        summary: 'Public result page by capability token',
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Graded attempt' } },
      },
    },
    '/api/auth/students': {
      get: {
        tags: ['Auth'],
        summary: 'List students (teacher/admin)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'OK' } },
      },
      post: {
        tags: ['Auth'],
        summary:
          'Create a student (teacher/admin) — studentCode optional, auto-generated when omitted',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/auth/students/{id}': {
      patch: {
        tags: ['Auth'],
        summary: "Update a student name (staff) — studentCode is immutable",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } },
      },
      delete: {
        tags: ['Auth'],
        summary: 'Delete a student (staff)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/face/audit': {
      get: {
        tags: ['Face'],
        summary: 'Public student lookup by code',
        parameters: [{ name: 'code', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Student or null' } },
      },
    },
    '/api/exams': {
      get: {
        tags: ['Exams'],
        summary: 'List exams (published are public)',
        responses: { 200: { description: 'OK' } },
      },
      post: {
        tags: ['Exams'],
        summary: 'Create exam (teacher/admin)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/exams/{id}': {
      get: {
        tags: ['Exams'],
        summary: 'Get exam (published are public)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } },
      },
      patch: {
        tags: ['Exams'],
        summary: 'Update exam (owner/admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } },
      },
      delete: {
        tags: ['Exams'],
        summary: 'Delete exam (owner/admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/exams/{id}/publish': {
      post: {
        tags: ['Exams'],
        summary: 'Publish exam',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/exams/{id}/attempts': {
      get: {
        tags: ['Exams'],
        summary: 'List attempts with student info (staff)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } },
      },
    },
            '/api/questions': {
      get: {
        tags: ['Questions'],
        summary: 'List questions for an exam (?examId=)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'OK' } },
      },
      post: {
        tags: ['Questions'],
        summary: 'Create question (owner/admin)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/questions/{id}': {
      get: {
        tags: ['Questions'],
        summary: 'Get question',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } },
      },
      patch: {
        tags: ['Questions'],
        summary: 'Update question (owner/admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } },
      },
      delete: {
        tags: ['Questions'],
        summary: 'Delete question (owner/admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/attempts': {
      get: {
        tags: ['Attempts'],
        summary: 'List own attempts (student)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/attempts/{id}': {
      get: {
        tags: ['Attempts'],
        summary: 'Get attempt (own, or staff)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/attempts/{attemptId}/answer': {
      post: {
        tags: ['Attempts'],
        summary: 'Record/update answer for one question (student)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'attemptId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
} as const;

/** Mounts GET /api/doc (spec JSON) and GET /api/swagger (Swagger UI). */
export function buildOpenApiApp() {
  const app = new OpenAPIHono();

  app.get('/doc', (c) => c.json(spec));
  app.get('/swagger', swaggerUI({ url: '/api/doc', title: 'Exam Platform API' }));

  return app;
}
