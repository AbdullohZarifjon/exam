import { Link, useParams } from "react-router-dom";
import { CheckCircle, X, Circle, ArrowUUpLeft } from "@phosphor-icons/react";

import { Card, EmptyState, Spinner, StatusBadge } from "../shared/ui";
import { useAttempt } from "../features/attempts/hooks/attempts.hooks";
import { useExam } from "../features/exams/hooks/exams.hooks";
import { ROUTES } from "../shared/config/routes";

/**
 * Submission detail on its own page.
 *
 * Replaces the inline expansion on the exam-detail page. Shows the per-question
 * breakdown with correct vs given option(s), timing, and a summary header.
 */
export function AttemptDetailPage() {
 const { id = "" } = useParams<{ id: string }>();
 const { data, isLoading } = useAttempt(id);

 if (isLoading) {
  return (
   <div className="flex h-40 items-center justify-center text-[#8A9BB8]">
    <Spinner />
   </div>
  );
 }
 if (!data) return <EmptyState title="Attempt not found" />;
 const a = data.data;

 return (
  <div>
   <Link
    to={ROUTES.EXAM_SUBMISSIONS(a.examId)}
    className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-text-muted hover:text-navy-900"
   >
    <ArrowUUpLeft size={11} weight="bold" />
    Back to submissions
   </Link>

   <AttemptHeader attempt={a} />

   <Card className="mt-6 p-4">
    <p className="font-mono text-[11px] uppercase tracking-wider text-[#8A9BB8]">Authentication</p>
    <p className="mt-1.5 text-sm font-medium text-navy-900">
     {authLabel(a.identityAssurance?.method ?? "face")}
     {a.identityAssurance?.score != null ? (
      <span className="font-mono text-xs font-normal text-text-muted">
       {" "}· score {a.identityAssurance.score.toFixed(3)}
       {a.identityAssurance.gap != null ? ` · gap ${a.identityAssurance.gap.toFixed(3)}` : ""}
       {a.identityAssurance.model ? ` · ${a.identityAssurance.model}` : ""}
      </span>
     ) : null}
    </p>
    {(a.entryLog?.length ?? 0) > 0 ? (
     <div className="mt-4 border-t border-border pt-3">
      <p className="font-mono text-[11px] uppercase tracking-wider text-[#8A9BB8]">Entries ({a.entryLog!.length})</p>
      <ul className="mt-2 space-y-1">
       {a.entryLog!.map((e, i) => (
        <li key={i} className="flex flex-wrap items-center gap-x-3 text-xs text-navy-800">
         <span className="font-mono text-text-muted">{String(i + 1).padStart(2, "0")}</span>
         <span>{e.at ? new Date(e.at).toLocaleString() : "—"}</span>
         <span className="font-medium">{authLabel(e.method)}</span>
         {e.score != null ? <span className="font-mono text-text-muted">score {e.score.toFixed(3)}</span> : null}
         {e.gap != null ? <span className="font-mono text-text-muted">gap {e.gap.toFixed(3)}</span> : null}
         {e.model ? <span className="font-mono text-text-muted">{e.model}</span> : null}
        </li>
       ))}
      </ul>
     </div>
    ) : null}
   </Card>

   <div className="mt-8">
    <h2 className="mb-3 text-sm font-semibold tracking-tight">Question-by-question</h2>
    <div className="space-y-2">
     {a.questions.map((q, i) => {
      const givenTexts = q.options.filter((o) => q.givenOptionIds.includes(o.id)).map((o) => o.text);
      return (
       <Card key={q.questionId} className="p-4">
        <div className="flex items-start gap-4">
         <div className="flex shrink-0 flex-col items-center gap-1">
          <span className="font-mono text-xs text-[#8A9BB8]">{String(i + 1).padStart(2, "0")}</span>
          {q.isCorrect === null ? (
           <Circle size={18} className="text-[#CBD6EF]" />
          ) : q.isCorrect ? (
           <CheckCircle size={20} weight="fill" className="text-accent" />
          ) : (
           <X size={20} weight="bold" className="text-red-600" />
          )}
         </div>
         <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
           <p className="text-sm font-medium text-navy-900">{q.text}</p>
          </div>
          <ul className="mt-2 space-y-1">
           {q.options.map((opt) => {
            const wasGiven = q.givenOptionIds.includes(opt.id);
            const isRight = q.isCorrect === true && wasGiven;
            const isWrong = q.isCorrect === false && wasGiven;
            const isPickedLive = wasGiven && q.isCorrect === null;
            // Graded: green when right, red when wrong. In-progress
            // (isCorrect === null): highlight the student's live pick so
            // staff can see progress — correctness is unknown until submit.
            return (
             <li
              key={opt.id}
              className={cn(
               "flex items-center gap-2 rounded-md px-2 py-1 text-sm",
               isRight && "bg-accent-soft text-accent",
               isWrong && "bg-red-50 text-red-800",
               isPickedLive && "bg-accent-soft font-medium text-navy-900 ring-1 ring-accent/40",
               !wasGiven && "text-[#475A82]",
              )}
             >
              {isRight || isPickedLive ? (
               <CheckCircle size={14} weight="fill" className={isPickedLive ? "text-accent" : undefined} />
              ) : isWrong ? (
               <X size={14} weight="bold" />
              ) : (
               <Circle size={14} />
              )}
              {opt.text}
             </li>
            );
           })}
          </ul>
          {givenTexts.length === 0 ? (
           <p className="mt-2 font-mono text-[11px] text-[#8A9BB8]">Not answered</p>
          ) : null}
         </div>
         <div className="shrink-0 text-right font-mono text-xs text-text-muted">
          {q.isCorrect === null ? "—" : q.isCorrect ? "+1" : "+0"}
         </div>
        </div>
       </Card>
      );
     })}
    </div>
   </div>
  </div>
 );
}

function AttemptHeader({
 attempt,
}: {
 attempt: ReturnType<typeof useAttempt> extends { data: infer D } ? (D extends { data: infer X } ? X : never) : never;
}) {
 const { examId } = attempt;
 const { data: examData } = useExam(examId);
 const examTitle = examData?.data.title;
 const answeredCount = attempt.questions.filter((q) => q.givenOptionIds.length > 0).length;
 const submittedPct =
  attempt.score != null && attempt.maxScore != null && attempt.maxScore > 0
   ? Math.round((attempt.score / attempt.maxScore) * 100)
   : (attempt.scorePercent ?? 0);

 return (
  <div className="mt-4 flex items-start justify-between gap-4">
   <div>
    <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">{examTitle ?? "Exam"}</p>
    <h1 className="mt-1 text-[28px] font-bold tracking-tight">{attempt.studentId ? "Submission" : "Attempt"}</h1>
    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-text-muted">
     <StatusBadge status={attempt.status} />
     <span>Started: {new Date(attempt.startedAt).toLocaleString()}</span>
     {attempt.submittedAt ? <span>· Submitted: {new Date(attempt.submittedAt).toLocaleString()}</span> : null}
     <span>· Expires: {new Date(attempt.expiresAt).toLocaleString()}</span>
    </div>
   </div>
   <Card className="min-w-[200px] p-4 text-right">
    {attempt.status === "in-progress" ? (
     <>
      <p className="font-mono text-[11px] uppercase tracking-wider text-[#8A9BB8]">Progress</p>
      <p className="mt-1 text-[28px] font-bold tracking-tight text-navy-900">
       {answeredCount} / {attempt.questions.length}
      </p>
      <p className="font-mono text-xs text-text-muted">answered · grading on submit</p>
     </>
    ) : (
     <>
      <p className="font-mono text-[11px] uppercase tracking-wider text-[#8A9BB8]">Score</p>
      <p className="mt-1 text-[28px] font-bold tracking-tight text-navy-900">
       {attempt.score != null && attempt.maxScore != null
        ? `${attempt.score} / ${attempt.maxScore}`
        : `${attempt.totalCorrect ?? 0}/${attempt.totalQuestions ?? 0}`}
      </p>
      <p className="font-mono text-xs text-text-muted">{submittedPct}%</p>
     </>
    )}
   </Card>
  </div>
 );
}

function authLabel(method: string) {
  if (method === "staff-verified") return "Desk verify (staff ID check)";
  if (method === "face+rerank") return "Face scan + rerank";
  return "Face scan";
}

function cn(...parts: (string | false | null | undefined)[]) {
 return parts.filter(Boolean).join(" ");
}
