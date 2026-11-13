import { serve } from '@hono/node-server';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';
import { authService, biometricService } from './services/index.js';
import { startVerifyCleanup } from './services/verification-request.service.js';

async function main() {
  await connectDB();

  // Create the env-configured bootstrap admin (ADMIN / ADMIN_PASSWORD)
  // if it does not exist yet. Staff accounts can never be registered
  // from outside — this is the only automatic account creation.
  await authService.ensureBootstrapAdmin();

  // Resync the face-service FAISS gallery from Mongo (source of truth).
  // Best-effort with a few retries: the face-service may still be
  // starting, and kiosk scans fall back to Mongo search meanwhile.
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const { count } = await biometricService.rebuildFaceIndex();
      console.log(`✅ Face gallery rebuilt from Mongo: ${count} enrolled`);
      break;
    } catch (err) {
      if (attempt === 5) {
        console.warn('⚠️  Face gallery rebuild failed after 5 attempts — kiosk will use the Mongo fallback until restart.');
      } else {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  // Selfie retention sweep (7-day TTL for verification-request photos).
  startVerifyCleanup();

  const app = createApp();

  const server = serve(
    {
      fetch: app.fetch,
      port: env.PORT,
    },
    (info) => {
      console.log(`🚀 Server running on http://localhost:${info.port}`);
      console.log(`📚 Swagger UI:    http://localhost:${info.port}/api/swagger`);
      console.log(`📄 OpenAPI JSON:  http://localhost:${info.port}/api/doc`);
    },
  );

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down…`);
    server.close();
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('💥 Fatal startup error:', err);
  process.exit(1);
});
