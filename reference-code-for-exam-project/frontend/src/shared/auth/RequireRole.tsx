import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

import { useAuthStore, type Role } from "../../app/store/auth.store";
import { ROUTES } from "../config/routes";

/**
 * Restricts a route to one or more staff roles. Sits behind `RequireAuth`,
 * so an unauthenticated visitor has already been sent to /login — the
 * no-identity branch below is a defensive default for standalone use.
 * Students are redirected to the candidate entry page; staff with the
 * wrong role go to the dashboard.
 */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const identity = useAuthStore((s) => s.identity);

  if (!identity) return <Navigate to={ROUTES.LOGIN} replace />;
  if (identity.ownerType !== "User") return <Navigate to={ROUTES.HOME} replace />;
  if (!roles.includes(identity.user.role)) return <Navigate to={ROUTES.DASHBOARD} replace />;

  return <>{children}</>;
}
