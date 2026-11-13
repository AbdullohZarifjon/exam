import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import i18n from "../../app/i18n";
import { getErrorTranslationKey } from "./errors";

/**
 * One toast for ANY failed request, using the shared error->i18n mapping.
 * Mutations that define their own `onError` (which suppresses the global
 * default below) call this so failure feedback stays consistent.
 */
export function showErrorToast(error: unknown) {
  const key = getErrorTranslationKey(error);
  // Fall back to the raw error message if the key isn't translated yet.
  const message = i18n.exists(key) ? i18n.t(key) : ((error as Error)?.message ?? "Unknown error");
  toast.error(message);
}

/**
 * Any mutation WITHOUT its own `onError` falls back to this. Local
 * onError fully replaces this default — that's why hooks that need
 * custom branching call getErrorTranslationKey() themselves.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      onError: showErrorToast,
      retry: false,
    },
    queries: {
      retry: (failureCount, error: unknown) => {
        // Don't retry 4xx — only transient network / 5xx
        if (failureCount >= 2) return false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const status = (error as any)?.httpStatus as number | undefined;
        if (status && status >= 400 && status < 500) return false;
        return true;
      },
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});
