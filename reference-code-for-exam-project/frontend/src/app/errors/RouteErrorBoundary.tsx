import { useEffect } from "react";
import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowCounterClockwise, ArrowLeft, WarningCircle } from "@phosphor-icons/react";

import { Button } from "../../shared/ui";
import { ROUTES } from "../../shared/config/routes";

/** Renders the raw router error as developer-readable text. */
function ErrorDetails({ error }: { error: unknown }) {
  const { t } = useTranslation();

  let details: string;
  if (isRouteErrorResponse(error)) {
    details = `${error.status} ${error.statusText}\n${JSON.stringify(error.data, null, 2)}`;
  } else if (error instanceof Error) {
    details = error.stack ?? error.message;
  } else {
    details = String(error);
  }

  return (
    <details className="mt-5 rounded-lg border border-border bg-bg p-3 text-left">
      <summary className="cursor-pointer text-xs font-medium text-[#475A82]">{t("errors.page.details")}</summary>
      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-left font-mono text-[11px] leading-relaxed text-[#475A82]">
        {details}
      </pre>
    </details>
  );
}

/**
 * Router-level error boundary (`errorElement`). Renders any uncaught
 * render/effect error as a calm, on-brand recovery page instead of the
 * router's default "Unexpected Application Error" screen. Technical
 * details stay available for developers behind a collapsed section.
 */
export function RouteErrorBoundary() {
  const { t } = useTranslation();
  const error = useRouteError();
  const navigate = useNavigate();

  // Keep the original error in the console for debugging.
  useEffect(() => {
    console.error("[RouteErrorBoundary]", error);
  }, [error]);

  const isNotFound = isRouteErrorResponse(error) && error.status === 404;
  const heading = isNotFound ? t("errors.page.notFoundTitle") : t("errors.page.title");
  const subtitle = isNotFound ? t("errors.page.notFoundSubtitle") : t("errors.page.subtitle");

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-bg px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <img src="/logo.svg" alt="Bilim logo" className="mx-auto h-10 w-10" />
        <div className="mt-5 flex justify-center text-red-700">
          <WarningCircle size={28} weight="duotone" />
        </div>
        <h1 className="mt-3 font-display text-xl font-semibold tracking-tight">{heading}</h1>
        <p className="mt-2 text-sm text-text-muted">{subtitle}</p>

        {import.meta.env.DEV ? <ErrorDetails error={error} /> : null}

        <div className="mt-6 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => navigate(ROUTES.HOME)}>
            <ArrowLeft size={14} weight="bold" />
            {t("errors.page.home")}
          </Button>
          <Button onClick={() => window.location.reload()}>
            <ArrowCounterClockwise size={14} weight="bold" />
            {t("errors.page.reload")}
          </Button>
        </div>
      </div>
    </div>
  );
}