import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import i18n from "@/app/i18n"; // adjust to wherever your i18next instance lives
import { getErrorTranslationKey } from "@/shared/api";

/**
 * Any mutation WITHOUT its own `onError` falls back to this. Note: if a
 * mutation defines its own `onError`, TanStack Query does NOT also call
 * this default - the local one fully replaces it. That's why hooks that
 * need custom branching (e.g. useChangePassword) call
 * getErrorTranslationKey() themselves inside their own onError.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      onError: (error) => {
        toast.error(i18n.t(getErrorTranslationKey(error), { ns: "api-responses" }));
      },
    },
  },
});
