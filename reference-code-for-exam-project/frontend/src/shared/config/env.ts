/**
 * Frontend env. Vite exposes only VITE_* vars; everything else is private.
 */
export const env = {
  backend: import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000",
} as const;
