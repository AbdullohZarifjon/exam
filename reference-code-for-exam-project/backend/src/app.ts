import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/index.js';
import api from './routes/index.js';
import { buildOpenApiApp } from './openapi/registry.js';

/**
 * Root app. Mounts:
 *   /api/*        — the actual REST API (Hono router)
 *   /api/doc      — OpenAPI 3.1 JSON spec
 *   /api/swagger  — Swagger UI
 */
export function createApp() {
  const app = new Hono();

  // ----- global middleware -----
  app.use('*', logger());
  // Basic security headers (LAN app; no HSTS over plain HTTP).
  app.use('*', async (c, next) => {
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('Referrer-Policy', 'no-referrer');
    await next();
  });
  app.use(
    '*',
    cors({
      origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((s) => s.trim()),
      credentials: true,
      allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // ----- root -----
  app.get('/', (c) =>
    c.json({
      name: 'Exam Platform API',
      version: '1.0.0',
      docs: '/api/swagger',
      openapi: '/api/doc',
      health: '/api/health',
    }),
  );

  // ----- API -----
  app.route('/api', api);

  // ----- OpenAPI + Swagger UI -----
  const openapi = buildOpenApiApp();
  app.route('/api', openapi);

  // ----- error + 404 (must be last) -----
  app.onError((err, c) => errorHandler(err, c));
  app.notFound(notFoundHandler);

  return app;
}
