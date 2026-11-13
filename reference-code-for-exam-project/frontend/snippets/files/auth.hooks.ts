import { toast } from "sonner";
import { useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ROUTES } from "@/shared/config";
import { useAuthStore } from "@/app";
import { isApiError, ErrorCode, getErrorTranslationKey } from "@/shared/api";
import { signin, signout, changePassword, generatePasswordResetLink, resetPassword } from "./auth.api";

export function useChangePassword() {
  const { t } = useTranslation("api-responses");

  return useMutation({
    mutationFn: changePassword,
    onSuccess: () => toast.success(t("auth.password-update.success")),
    onError: (error) => {
      // Needs specific branching (a distinct message for "wrong current
      // password" vs everything else), so it opts out of the global
      // default toast by defining its own onError.
      if (isApiError(error) && error.body?.code === ErrorCode.INVALID_CURRENT_PASSWORD) {
        toast.error(t("auth.password-update.wrong-current-password"));
        return;
      }
      toast.error(t(getErrorTranslationKey(error)));
    },
  });
}

export function useSignIn() {
  const navigate = useNavigate();
  const fetchUser = useAuthStore((s) => s.fetchUser);

  return useMutation({
    mutationFn: signin,
    onSuccess: async () => {
      await fetchUser();
      navigate(ROUTES.DASHBOARD);
    },
    // No onError needed - falls back to the QueryClient's default toast.
  });
}

export function useSignOut() {
  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: signout,
    onSuccess: () => {
      navigate(ROUTES.HOME);
      setUser(null);
    },
    // Previously had no onError at all, so a failed sign-out failed
    // completely silently. Now correctly surfaced by the global default.
  });
}

export function useGenerateLink(id: number) {
  return useMutation({
    mutationFn: () => generatePasswordResetLink(id),
    // No onError needed - falls back to the QueryClient's default toast.
  });
}

export function useChangePasswordReset() {
  const navigate = useNavigate();
  const fetchUser = useAuthStore((s) => s.fetchUser);

  return useMutation({
    mutationFn: resetPassword,
    onSuccess: async () => {
      await fetchUser();
      navigate(ROUTES.DASHBOARD);
    },
    // No onError needed - falls back to the QueryClient's default toast.
  });
}
