import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Environment configuration with runtime validation.
 * Fails fast on boot if something important is missing.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  // Rotating JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

  CORS_ORIGIN: z.string().default('*'),

  // S3 / object storage (MinIO in dev, AWS S3 / R2 / Spaces in prod).
  // Defaults assume the bundled MinIO container on :9000.
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().min(1).default('exam-images'),
  S3_ACCESS_KEY_ID: z.string().min(1).default('minioadmin'),
  S3_SECRET_ACCESS_KEY: z.string().min(1).default('minioadmin'),
  S3_FORCE_PATH_STYLE: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  // Bootstrap admin (created automatically on first boot, if absent).
  // `ADMIN` is the admin USERNAME (login id, not an email). Staff
  // accounts (admins/teachers) can never be created from outside:
  // only this env-bootstrapped admin can create them, via the
  // admin-only /auth/admin/users endpoints. `ADMIN_USERNAME` is a
  // deprecated alias for `ADMIN`.
  ADMIN_USERNAME: z.string().min(3).optional(),
  ADMIN: z.string().min(3).optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  FACE_SERVICE_URL: z.string().url().default('http://localhost:8000'),
  FACE_MATCH_THRESHOLD: z.coerce.number().min(0).max(1).default(0.6),
  FACE_GAP_THRESHOLD: z.coerce.number().min(0).max(1).default(0.08),
  FACE_MIN_QUALITY: z.coerce.number().min(0).max(1).default(0.35),
  FACE_MODEL: z.string().default('buffalo_s'),
  FACE_CONSENT_VERSION: z.string().default('v1-uz'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
