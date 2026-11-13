import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

import { Button, Field, Input } from "../shared/ui";
import { useLogin } from "../features/auth/hooks/auth.hooks";
import { getErrorTranslationKey } from "../shared/api/errors";
import { loginSchema, type LoginInput } from "../features/auth/model/auth.schema";
import { ROUTES } from "../shared/config/routes";
import { useAuthStore } from "../app/store/auth.store";

export function LoginPage() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
 const { mutate, isPending, error } = useLogin();

 useEffect(() => {
  if (isAuthenticated) navigate(ROUTES.DASHBOARD, { replace: true });
 }, [isAuthenticated, navigate]);

 const {
  register,
  handleSubmit,
  formState: { errors },
 } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

 return (
  <div>
   <h1 className="text-[28px] font-bold tracking-tight">{t("auth.login.title")}</h1>
   <p className="mt-1 text-sm text-text-muted">{t("auth.login.subtitle")}</p>

   <form onSubmit={handleSubmit((d) => mutate(d))} className="mt-8 flex flex-col gap-4">
    <Field label="Username" required error={errors.username?.message}>
     <Input autoComplete="username" {...register("username")} />
    </Field>
    <Field label={t("auth.login.password")} required error={errors.password?.message}>
     <Input type="password" autoComplete="current-password" {...register("password")} />
    </Field>
    {error ? (
     <div
      role="alert"
      aria-live="assertive"
      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
     >
      {error instanceof Error &&
      error.name === "ApiError" &&
      (error as { httpStatus?: number }).httpStatus === 401
       ? t("errors.invalidCredentials")
       : t(getErrorTranslationKey(error))}
     </div>
    ) : null}
    <Button type="submit" loading={isPending} className="mt-2 w-full">
     {isPending ? t("auth.login.submitting") : t("auth.login.submit")}
    </Button>
   </form>
  </div>
 );
}
