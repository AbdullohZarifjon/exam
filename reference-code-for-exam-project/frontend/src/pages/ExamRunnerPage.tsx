import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
 ArrowLeft,
 ArrowRight,
 CheckCircle,
 Circle,
 Clock,
 Hourglass,
 PaperPlaneTilt,
} from "@phosphor-icons/react";

import { Button, Spinner } from "../shared/ui";
import { ROUTES } from "../shared/config/routes";
import { useAnswerQuestion, useAttempt, useFinishExam } from "../features/attempts/hooks/attempts.hooks";
import { useAutoLogoutOnExpiry, useExamCountdown } from "../features/attempts/hooks/runner.hooks";
import { useExamRunnerStore } from "../features/attempts/model/exam-runner.store";
import { SubmitExamDialog } from "../features/attempts/components/SubmitExamDialog";
import { formatTimer } from "../shared/lib/format";

/** Stable empty reference so answer lookups don't allocate per render. */
const NO_ANSWER: string[] = [];

export function ExamRunnerPage() {
 const { attemptId = "" } = useParams<{ attemptId: string }>();
 const { t } = useTranslation();
 const { data, isLoading } = useAttempt(attemptId);
 const answer = useAnswerQuestion(attemptId);
 const finish = useFinishExam();

 const attempt = data?.data;

 /* ------------------------------ Runner store ------------------------------ */

 const hydrate = useExamRunnerStore((s) => s.hydrate);
 const stageAnswer = useExamRunnerStore((s) => s.stageAnswer);
 const questions = useExamRunnerStore((s) => s.questions);
 const answers = useExamRunnerStore((s) => s.answers);
 const pendingAnswers = useExamRunnerStore((s) => s.pendingAnswers);
 const hydratedAttemptId = useExamRunnerStore((s) => s.attemptId);

 // Load the served snapshot + saved answers ONCE per attempt. Afterwards
 // the store is the display source of truth: answers are synced per
 // question and this query is never invalidated while the exam runs.
 useEffect(() => {
  if (attempt) hydrate(attempt);
 }, [attempt, hydrate]);

 const [index, setIndex] = useState(0);
 const current = questions[index];

 /** In-flight selection (instant feedback) falls back to the confirmed answer. */
 const displayedFor = useCallback(
  (questionId: string) => pendingAnswers[questionId] ?? answers[questionId] ?? NO_ANSWER,
  [pendingAnswers, answers],
 );
 const currentAnswer = current ? displayedFor(current.questionId) : NO_ANSWER;
 const answeredCount = useMemo(
  () => questions.reduce((count, q) => (displayedFor(q.questionId).length > 0 ? count + 1 : count), 0),
  [questions, displayedFor],
 );

 /* --------------------------------- Timer ---------------------------------- */

 const isLive = attempt?.status === "in-progress";
 const { remainingMs: remaining, isExpired } = useExamCountdown(attempt?.expiresAt, Boolean(isLive));
 const autoLogout = useAutoLogoutOnExpiry(attemptId, Boolean(isLive && isExpired));

 /* -------------------------------- Actions --------------------------------- */

 const onSelect = useCallback(
  (optionId: string) => {
   // Past the deadline the backend rejects answers — don't send any.
   if (!current || !isLive || isExpired) return;
   // Multi-select is always on: questions may have several correct
   // options and the backend grades by exact set equality.
   const next = currentAnswer.includes(optionId)
    ? currentAnswer.filter((id) => id !== optionId)
    : [...currentAnswer, optionId];
   // Echo the selection for instant display, then sync it to the backend.
   // The store commits it only after the request answers 200.
   stageAnswer(current.questionId, next);
   answer.mutate({ questionId: current.questionId, givenOptionIds: next });
  },
  [current, isLive, isExpired, currentAnswer, stageAnswer, answer],
 );

 /* ------------------------------- Submit flow ------------------------------ */

 const isFinishing = finish.isPending;
 const unansweredCount = questions.length - answeredCount;
 const [isSubmitDialogOpen, setSubmitDialogOpen] = useState(false);

 const openSubmitDialog = useCallback(() => {
  if (!isFinishing) setSubmitDialogOpen(true);
 }, [isFinishing]);

 // The final request grades and revokes the session — it must not be
 // dismissed midway, so closing (backdrop, Escape, X, Cancel) is blocked.
 const closeSubmitDialog = useCallback(() => {
  if (!isFinishing) setSubmitDialogOpen(false);
 }, [isFinishing]);

 const confirmSubmit = useCallback(() => {
  if (isFinishing) return;
  finish.mutate(attemptId);
 }, [isFinishing, finish, attemptId]);

 if (isLoading) {
  return (
   <div className="flex h-screen items-center justify-center text-[#8A9BB8]">
    <Spinner />
   </div>
  );
 }
 if (!attempt) {
  return (
   <div className="flex min-h-screen items-center justify-center p-6 text-center">
    <div>
     <p className="text-base font-semibold">Attempt not found</p>
     <Link to={ROUTES.HOME} className="mt-3 inline-block text-sm text-accent hover:underline">
      Go home
     </Link>
    </div>
   </div>
  );
 }

 if (attempt.status !== "in-progress") {
  return (
   <div className="flex min-h-screen items-center justify-center p-6 text-center">
    <div>
     <p className="text-base font-semibold">{t("exam.runner.submitted")}</p>
     {attempt.resultToken ? (
      <Link
       to={ROUTES.RESULT(attempt.resultToken)}
       className="mt-3 inline-block text-sm text-accent hover:underline"
      >
       See your result →
      </Link>
     ) : null}
    </div>
   </div>
  );
 }

 // One quiet frame while the snapshot is copied into the runner store.
 if (hydratedAttemptId !== attempt.id) {
  return (
   <div className="flex h-screen items-center justify-center text-[#8A9BB8]">
    <Spinner />
   </div>
  );
 }

 // Time is up: the backend stopped accepting answers, every selection is
 // already saved, so there is nothing left to submit. The student is signed
 // out automatically and lands on their result page.
 if (isExpired) {
  const signOutFailed = autoLogout.phase === "failed";
  return (
   <div className="flex min-h-[100dvh] items-center justify-center bg-bg px-6">
    <div className="w-full max-w-sm text-center">
     <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF2FA] text-text-muted">
      <Hourglass size={26} weight="duotone" />
     </div>
     <p className="mt-5 text-lg font-semibold tracking-tight text-navy-900">{t("exam.runner.expired")}</p>
     {signOutFailed ? (
      <>
       <p className="mt-2 text-sm text-text-muted">{t("exam.runner.signOutFailed")}</p>
       <Button className="mt-5" onClick={autoLogout.retry} loading={autoLogout.isSigningOut}>
        {t("exam.runner.retry")}
       </Button>
      </>
     ) : (
      <p aria-live="polite" className="mt-2 inline-flex items-center gap-2 text-sm text-text-muted">
       <Spinner className="h-3.5 w-3.5" />
       {t("exam.runner.signingOut")}
      </p>
     )}
    </div>
   </div>
  );
 }

 return (
  <div className="min-h-[100dvh] bg-bg">
   {/* Top bar — timer + progress */}
   <header className="sticky top-0 z-20 border-b border-border bg-surface">
    <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-6">
     <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
       {t("exam.runner.question", { n: index + 1, total: questions.length })}
      </span>
      <span className="text-[#CBD6EF]">·</span>
      <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
       {answeredCount}/{questions.length} answered
      </span>
     </div>
     <div className="flex items-center gap-2 font-mono text-sm tabular-nums">
      <Clock size={14} weight="bold" className="text-text-muted" />
      <span className={remaining < 5 * 60_000 ? "text-red-600" : "text-navy-700"}>
       {t("exam.runner.timeLeft")}: {formatTimer(remaining)}
      </span>
     </div>
    </div>
   </header>

   <main className="mx-auto max-w-3xl px-6 py-12">
    {current ? (
     <div>
      <div className="flex items-center gap-2">
       <p className="text-xl font-semibold leading-snug text-navy-900">{current.text}</p>
      </div>

      <div className="mt-8 space-y-2.5">
       {current.options.map((opt) => {
        const isSelected = currentAnswer.includes(opt.id);
        return (
         <button
          key={opt.id}
          type="button"
          onClick={() => onSelect(opt.id)}
          className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition-colors ${
           isSelected
            ? "border-accent bg-accent-soft text-navy-900"
            : "border-border bg-white text-navy-700 hover:border-border-strong"
          }`}
         >
          {isSelected ? (
           <CheckCircle size={18} weight="fill" className="text-accent" />
          ) : (
           <Circle size={18} className="text-[#CBD6EF]" />
          )}
          {opt.text}
         </button>
        );
       })}
      </div>

      {/* Nav strip */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
       <Button variant="ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
        <ArrowLeft size={14} weight="bold" />
        {t("exam.runner.previous")}
       </Button>

       <div className="flex flex-wrap gap-1.5">
        {questions.map((q, i) => {
         const answered = displayedFor(q.questionId).length > 0;
         return (
          <button
           key={q.questionId}
           type="button"
           onClick={() => setIndex(i)}
           className={`h-7 w-7 rounded-full font-mono text-[11px] transition-colors ${
            i === index
             ? "bg-navy-900 text-white"
             : answered
              ? "bg-accent-soft text-accent"
              : "bg-[#EEF2FA] text-text-muted"
           }`}
          >
           {i + 1}
          </button>
         );
        })}
       </div>

       {index < questions.length - 1 ? (
        <Button onClick={() => setIndex((i) => i + 1)}>
         {t("exam.runner.next")}
         <ArrowRight size={14} weight="bold" />
        </Button>
       ) : (
        <Button onClick={openSubmitDialog} loading={finish.isPending} variant="primary">
         <PaperPlaneTilt size={14} weight="fill" />
         {t("exam.runner.submit")}
        </Button>
       )}
      </div>
     </div>
    ) : null}
   </main>

   {/* Final submission — confirm is time-gated when questions were left blank */}
   <SubmitExamDialog
    open={isSubmitDialogOpen}
    onClose={closeSubmitDialog}
    onConfirm={confirmSubmit}
    unansweredCount={unansweredCount}
    totalQuestions={questions.length}
    loading={finish.isPending}
   />
  </div>
 );
}
