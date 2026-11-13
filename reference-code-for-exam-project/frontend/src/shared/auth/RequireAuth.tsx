import { Navigate } from "react-router-dom";
import { useEffect, type ReactNode } from "react";

import { useAuthStore } from "../../app/store/auth.store";
import { ROUTES } from "../config/routes";
import { Spinner } from "../ui";

/**
 * Guards a route tree that requires a signed-in identity; everyone else
 * is sent to the login page.
 *
 * On mount it revalidates the persisted identity against `/auth/me`
 * (the localStorage copy may be stale — cookies expire or get revoked),
 * then gates:
 *
 *  - identity present       → render the protected subtree right away;
 *  - revalidation in flight → centered spinner (a valid cookie session
 *                             must not bounce to /login before the
 *                             request answers);
 *  - no identity            → replace the history entry with /login.
 *
 * Role checks (admin /  / ...) belong to `RequireRole`.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const identity = useAuthStore((s) => s.identity);
  const sessionChecked = useAuthStore((s) => s.sessionChecked);
  const fetchIdentity = useAuthStore((s) => s.fetchIdentity);

  useEffect(() => {
    // The persisted identity may be stale (cookies expired); revalidate.
    void fetchIdentity();
  }, [fetchIdentity]);

  if (identity) return <>{children}</>;

  if (!sessionChecked) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center" role="status">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return <Navigate to={ROUTES.LOGIN} replace />;
}