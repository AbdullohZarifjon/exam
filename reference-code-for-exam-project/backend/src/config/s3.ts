function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

/**
 * Centralized config. Every module imports `{ config }` from here —
 * nothing else reads process.env directly.
 */
export const config = {
  s3: {
    endpoint: process.env.S3_ENDPOINT || undefined, // unset = AWS default
    region: required('S3_REGION'),
    bucket: required('S3_BUCKET'),
    accessKeyId: required('S3_ACCESS_KEY_ID'),
    secretAccessKey: required('S3_SECRET_ACCESS_KEY'),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    putUrlExpirySeconds: Number(process.env.S3_PUT_URL_EXPIRY_SECONDS ?? 900),
    getUrlExpirySeconds: Number(process.env.S3_GET_URL_EXPIRY_SECONDS ?? 86400),
    maxFileSizeBytes: Number(process.env.S3_MAX_FILE_SIZE_BYTES ?? 5 * 1024 * 1024),
    allowedExtensions: (process.env.S3_ALLOWED_EXTENSIONS ?? 'png,jpg,jpeg,webp,gif').split(','),
  },
  cleanup: {
    enabled: process.env.S3_CLEANUP_ENABLED === 'true',
    unconfirmedAfterSeconds: Number(process.env.S3_CLEANUP_UNCONFIRMED_AFTER_SECONDS ?? 86400),
    intervalSeconds: Number(process.env.S3_CLEANUP_INTERVAL_SECONDS ?? 3600),
  },
} as const;
