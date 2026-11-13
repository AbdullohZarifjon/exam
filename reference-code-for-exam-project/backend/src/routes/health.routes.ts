import { Hono } from 'hono';
import mongoose from 'mongoose';
import { jsonOk } from '../middleware/index.js';

const health = new Hono();

/**
 * GET /health
 * Liveness/readiness probe. Reports DB state too.
 */
health.get('/', (c) => {
  const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'][
    mongoose.connection.readyState
  ];
  return jsonOk(c, {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: dbState,
    env: process.env.NODE_ENV,
  });
});

export default health;
