import { env } from "../config/env";
import { ApiError, type BackendErrorResponse } from "./client.type";

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

type RequestOptions = RequestInit & {
  /** Abort the request after this many ms. Omit to disable. */
  timeoutMs?: number;
  /**
   * Skip the automatic 401 -> refresh -> retry flow for this call.
   * Use this where retrying after a refresh doesn't make sense
   * (e.g. the sign-out call itself). Defaults to false (refresh enabled).
   */
  skipAuthRefresh?: boolean;
};

/**
 * @param TResponse   shape of a successful response body (whatever your
 *                     backend actually sends - including its own envelope,
 *                     e.g. ApiResponse<T> = { code, message, data: T })
 * @param TErrorBody  shape of THIS endpoint's structured error body
 *                     (defaults to the app-wide BackendErrorResponse)
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
        // Refresh itself failed - surface the original 401. isRefreshing
        // has already been reset via .finally(), so the next 401 anywhere
        // in the app will correctly attempt a fresh refresh again.
        throw err;
      }

      return await doRequest<TResponse, TErrorBody>(endpoint, options);
    }

    throw err;
  }
}

async function doRequest<TResponse, TErrorBody>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const { timeoutMs, skipAuthRefresh, ...init } = options;

  const timeoutController = timeoutMs ? new AbortController() : undefined;
  const timeoutId = timeoutController ? setTimeout(() => timeoutController.abort(), timeoutMs) : undefined;
  const signal =
    timeoutController && init.signal
      ? AbortSignal.any([init.signal, timeoutController.signal])
      : (timeoutController?.signal ?? init.signal);

  const isFormLike = init.body instanceof FormData || init.body instanceof Blob;

  let res: Response;
  try {
    res = await fetch(env.backend + endpoint, {
      ...init,
      credentials: init.credentials ?? "include",
      headers: {
        ...(isFormLike ? {} : { "Content-Type": "application/json" }),
        ...init.headers,
      },
      signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    // Never got a response at all - offline, DNS, CORS, etc.
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
    const body = data as { message?: string };
    throw new ApiError<TErrorBody>(body?.message || `API error: ${res.status}`, res.status, data as TErrorBody);
  }

  // Whatever the backend sent, as-is - including its own envelope if it has
  // one. We don't add a second layer on top of that.
  return data as TResponse;
}

async function refreshTokenRequest(): Promise<void> {
  const res = await fetch(env.backend + "/refresh-token", {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    let errorData: unknown;
    try {
      errorData = await res.json();
    } catch {
      errorData = undefined;
    }
    throw new ApiError("Refresh token expired", res.status, errorData);
  }
}

/**
 * Type guard + generic type assertion in one. Pass the expected error body
 * type explicitly at each call site to get a fully typed `error.body`:
 *
 *   if (isApiError<ValidationErrorBody>(err)) {
 *     err.body?.fields // typed
 *   }
 */
export function isApiError<TBody = BackendErrorResponse>(error: unknown): error is ApiError<TBody> {
  return error instanceof ApiError;
}
