import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle, XCircle, ArrowRight, Exam } from "@phosphor-icons/react";

import { Card, Spinner } from "../shared/ui";
import { ROUTES } from "../shared/config/routes";
import { useResultByToken } from "../features/attempts/hooks/attempts.hooks";

export function ResultPage() {
 const { token = "" } = useParams<{ token: string }>();
 const { t } = useTranslation();
 const { data, isLoading, error } = useResultByToken(token);

 if (isLoading) {
  return (
   <div className="flex min-h-screen items-center justify-center text-[#8A9BB8]">
    <Spinner />
   </div>
  );
 }

 if (error || !data) {
  return (
   <div className="flex min-h-screen items-center justify-center p-6 text-center">
    <div>
     <p className="text-base font-semibold">Invalid or unused link</p>
     <Link to={ROUTES.HOME} className="mt-3 inline-block text-sm text-accent hover:underline">
      Go home
     </Link>
    </div>
   </div>
  );
 }

 const attempt = data.data.attempt;
 // Passing threshold: percent OR fixed points — whichever the exam defines.
 // With neither configured, the exam is ungraded and no pass/fail verdict
 // is shown (replaces the old hardcoded 60% fallback, BUG-008).
 const { passingScorePercent, passingScorePoints } = data.data;
 const passed =
  passingScorePercent != null
   ? (attempt.scorePercent ?? 0) >= passingScorePercent
   : passingScorePoints != null
    ? (attempt.score ?? 0) >= passingScorePoints
    : null;

 return (
  <div className="min-h-[100dvh] bg-bg px-6 py-16">
   <div className="mx-auto max-w-xl">
    <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">{t("exam.result.title")}</p>
    <Card className="mt-3 text-center">
     <div
      className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
       passed === null
        ? "bg-[#EEF2FA] text-text-muted"
        : passed
         ? "bg-accent-soft text-accent"
         : "bg-red-50 text-red-700"
      }`}
     >
      {passed === null ? (
       <Exam size={28} weight="duotone" />
      ) : passed ? (
       <CheckCircle size={28} weight="fill" />
      ) : (
       <XCircle size={28} weight="fill" />
      )}
     </div>
     <p className="mt-4 text-3xl font-semibold tracking-tight">
      {t("exam.result.percent", { pct: attempt.scorePercent ?? 0 })}
     </p>
     <p className="mt-1 text-sm text-text-muted">
      {attempt.score != null && attempt.maxScore != null
       ? `${attempt.score} / ${attempt.maxScore} correct`
       : t("exam.result.score", {
         correct: attempt.totalCorrect ?? 0,
         total: attempt.totalQuestions ?? 0,
        })}
     </p>
     {passed !== null ? (
      <p
       className={`mt-3 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        passed ? "bg-accent-soft text-accent" : "bg-red-50 text-red-800"
       }`}
      >
       {passed ? t("exam.result.passed") : t("exam.result.failed")}
      </p>
     ) : null}
    </Card>

    <p className="mt-8 text-center text-xs text-text-muted">
     {t("exam.result.shareLink")}: <span className="font-mono">{token}</span>
    </p>

    <div className="mt-6 text-center">
     <Link to={ROUTES.HOME} className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
      Done <ArrowRight size={12} weight="bold" />
     </Link>
    </div>
   </div>
  </div>
 );
}
