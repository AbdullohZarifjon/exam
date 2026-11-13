import { env } from "../config/env";
import { ApiError, type BackendErrorResponse } from "./client.type";

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

type RequestOptions = RequestInit & {
  /** Abort the request after this many ms. Omit to disable. */
  timeoutMs?: number;
  /**
   * Skip the automatic 401 -> refresh -> retry flow for this call.
   * Use where retrying after a refresh doesn't make sense
   * (e.g. the sign-out call itself). Defaults to false.
   */
  skipAuthRefresh?: boolean;
};

/**
 * Fetch wrapper for the backend's `{ success, data }` envelope.
 *
 * Auth is cookie-based: the browser automatically attaches the
 * httpOnly `access_token` cookie (via `credentials: "include"`), and
 * on 401 this client rotates tokens once via `/auth/refresh` — whose
 * refresh cookie is path-scoped to that endpoint — then retries.
 *
 * @param TResponse   shape of a successful response body (including any
 *                    backend envelope, e.g. ApiResponse<T> = { success, data })
 * @param TErrorBody  shape of THIS endpoint's structured error body
 *                    (defaults to the app-wide BackendErrorResponse)
 */
export async function client<TResponse, TErrorBody = BackendErrorResponse>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  try {
    return await doRequest<TResponse, TErrorBody>(endpoint, options);
  } catch (err) {
    if (err instanceof ApiError && err.httpStatus === 401 && !options.skipAuthRefresh) {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshTokenRequest().finally(() => {
          isRefreshing = false;
        });
      }

      try {
        await refreshPromise;
      } catch {
        // Refresh itself failed — surface the original 401.
        throw err;
      }

      return await doRequest<TResponse, TErrorBody>(endpoint, options);
    }

    throw err;
  }
}

async function doRequest<TResponse, TErrorBody>(endpoint: string, options: RequestOptions = {}): Promise<TResponse> {
  const { timeoutMs, skipAuthRefresh: _skip, ...init } = options;

  const timeoutController = timeoutMs ? new AbortController() : undefined;
  const timeoutId = timeoutController ? setTimeout(() => timeoutController.abort(), timeoutMs) : undefined;
  const signal =
    timeoutController && init.signal
      ? AbortSignal.any([init.signal, timeoutController.signal])
      : (timeoutController?.signal ?? init.signal);

  const isFormLike = init.body instanceof FormData || init.body instanceof Blob;

  const headers: Record<string, string> = {
    ...(isFormLike ? {} : { "Content-Type": "application/json" }),
    ...((init.headers as Record<string, string> | undefined) ?? {}),
  };

  let res: Response;
  try {
    res = await fetch(env.backend + endpoint, {
      ...init,
      headers,
      credentials: "include", // send/accept the httpOnly auth cookies
      signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new ApiError(err instanceof Error ? err.message : "Network error", 0, undefined, true);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  let data: unknown = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const body = data as { error?: { message?: string }; message?: string };
    const message = body?.error?.message ?? body?.message ?? `API error: ${res.status}`;
    throw new ApiError<TErrorBody>(message, res.status, data as TErrorBody);
  }

  // Return the backend's envelope as-is. The backend uses
  // { success: true, data: T } — callers opt into .data via their hooks.
  return data as TResponse;
}

/**
 * Rotates the auth cookies via the path-scoped refresh cookie. On
 * success the backend also returns the current identity, which we push
 * into the auth store so a page reload restores UI state.
 */
async function refreshTokenRequest(): Promise<void> {
  const { setIdentity, clear } = useAuthStore.getState();

  const res = await fetch(env.backend + "/auth/refresh", {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    clear();
    throw new ApiError("Refresh token expired", res.status);
  }

  const json = (await res.json()) as {
    success: boolean;
    data?: { ownerType: "User" | "Student"; user?: unknown; student?: unknown };
  };

  const identity = json.data;
  if (!identity) {
    clear();
    throw new ApiError("Malformed refresh response", 500);
  }

  setIdentity(identity as never);
}

/** Type guard + generic type assertion. */
export function isApiError<TBody = BackendErrorResponse>(error: unknown): error is ApiError<TBody> {
  return error instanceof ApiError;
}

// Circular import kept at the bottom: the store doesn't import the client.
import { useAuthStore } from "../../app/store/auth.store";
