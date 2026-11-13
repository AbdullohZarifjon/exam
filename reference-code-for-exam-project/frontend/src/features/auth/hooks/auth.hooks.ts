import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ROUTES } from "../../../shared/config/routes";
import { useAuthStore } from "../../../app/store/auth.store";
import { createStaffUser, listStaffUsers, login, logout, resetStaffPassword } from "../api/auth.api";
import type { CreateStaffInput, LoginInput, ResetPasswordInput } from "../model/auth.schema";

/* --------------------------------- Login --------------------------------- */

export function useLogin() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: login,
    onSuccess: (res) => {
      // Cookies are already set by the browser; remember who we are.
      useAuthStore.getState().setIdentity({ ownerType: "User", user: res.data.user });
      toast.success(`Welcome back, ${res.data.user.fullName.split(" ")[0]}.`);
      navigate(ROUTES.DASHBOARD, { replace: true });
    },
  });
}

/* --------------------------- Staff (admin only) --------------------------- */

export const STAFF_USERS_KEY = ["staff-users"] as const;

export function useStaffUsers() {
  return useQuery({ queryKey: STAFF_USERS_KEY, queryFn: listStaffUsers });
}

export function useCreateStaffUser() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (body: CreateStaffInput) => createStaffUser(body),
    onSuccess: () => {
      toast.success(t("staff.created"));
      void queryClient.invalidateQueries({ queryKey: STAFF_USERS_KEY });
    },
    onError: () => toast.error(t("staff.createFailed")),
  });
}

export function useResetStaffPassword() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ResetPasswordInput }) =>
      resetStaffPassword(id, body),
    onSuccess: () => {
      toast.success(t("staff.passwordReset"));
      void queryClient.invalidateQueries({ queryKey: STAFF_USERS_KEY });
    },
    onError: () => toast.error(t("staff.resetFailed")),
  });
}

/* -------------------------------- Logout ---------------------------------- */

export function useLogout() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const clear = useAuthStore((s) => s.clear);

  return useMutation({
    mutationFn: () => logout(),
    onSettled: () => {
      clear();
      toast.success(t("auth.loggedOut"));
      navigate(ROUTES.LOGIN, { replace: true });
    },
  });
}

export type { LoginInput, CreateStaffInput, ResetPasswordInput };
