import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, type ReactNode } from "react";
import { Plus, ListBullets, Exam, CaretRight } from "@phosphor-icons/react";

import { Button, Card, EmptyState, Spinner, StatusBadge, TypeToDeleteDialog } from "../shared/ui";
import { ROUTES } from "../shared/config/routes";
import { useExam, usePublishExam, useArchiveExam, useDeleteExam } from "../features/exams/hooks/exams.hooks";
import { useQuestions } from "../features/questions/hooks/questions.hooks";
import { useAttemptsForExam } from "../features/attempts/hooks/attempts.hooks";

/**
 * Exam overview / hub page.
 *
 * At 1000+ questions and 1000+ submissions the old detail page became
 * unmanageable. Now this page just shows the exam metadata + two launchpads:
 *
 *  • Question bank  → /exams/:id/questions
 *  • Submissions   → /exams/:id/submissions
 *
 * Plus the -assignment panel: only admins may attach s,
 * and only attached s may verify candidate requests for the exam.
 *
 * Add / edit a question happens at its own URL with prev/next navigation.
 * View / grade a submission happens at its own URL too.
 */
export function ExamDetailPage() {
 const { id = "" } = useParams<{ id: string }>();
 const { t } = useTranslation();
 const { data, isLoading } = useExam(id);
 const publish = usePublishExam();
 const archive = useArchiveExam();
 const { data: questions } = useQuestions(id);
 const { data: attempts } = useAttemptsForExam(id);
 const del = useDeleteExam();
 const [deleteExamOpen, setDeleteExamOpen] = useState(false);

 if (isLoading) {
  return (
   <div className="flex h-40 items-center justify-center text-[#8A9BB8]">
    <Spinner />
   </div>
  );
 }
 if (!data) return <EmptyState title="Exam not found" />;

 const exam = data.data;
 const questionCount = questions?.data.length ?? 0;
 const activeQuestionCount = questions?.data.filter((q) => q.isActive).length ?? 0;
 const canPublish = activeQuestionCount >= exam.questionsToServe;
 const publishBlockReason = !canPublish ? `Need at least ${exam.questionsToServe} active questions` : "";
 const submitted = (attempts?.data ?? []).filter((a) => a.status !== "in-progress");

 return (
  <div>
   <Link
    to={ROUTES.EXAMS}
    className="font-mono text-[11px] uppercase tracking-wider text-text-muted hover:text-navy-900"
   >
    {t("exams.detail.backToList")}
   </Link>

   <div className="mt-4 flex items-start justify-between gap-4">
    <div>
     <h1 className="text-[28px] font-bold tracking-tight">{exam.title}</h1>
     {exam.description ? <p className="mt-1 text-sm text-text-muted">{exam.description}</p> : null}
     <div className="mt-3 flex flex-wrap items-center gap-2">
      <StatusBadge status={exam.status} />
      <span className="font-mono text-xs text-text-muted">{exam.timerMinutes} min</span>
      <span className="font-mono text-xs text-text-muted">
       {activeQuestionCount} active / {questionCount} total questions
      </span>
      {exam.passingScorePercent != null ? (
       <span className="font-mono text-xs text-text-muted">
        {t("exams.detail.passingPercent")}: {exam.passingScorePercent}%
       </span>
      ) : null}
      {exam.passingScorePoints != null ? (
       <span className="font-mono text-xs text-text-muted">
        {t("exams.detail.passingPoints")}: {exam.passingScorePoints}
       </span>
      ) : null}
     </div>
    </div>
    <div className="flex shrink-0 gap-2">
     {exam.status === "draft" ? (
      <Button
       onClick={() => publish.mutate(exam.id)}
       loading={publish.isPending}
       disabled={!canPublish}
       title={publishBlockReason}
      >
       {t("exams.detail.publish")}
      </Button>
     ) : null}
     {exam.status === "published" ? (
      <Button variant="secondary" onClick={() => archive.mutate(exam.id)} loading={archive.isPending}>
       {t("exams.detail.archive")}
      </Button>
     ) : null}
     {exam.status === "draft" ? (
      <Button variant="ghost" onClick={() => setDeleteExamOpen(true)}>
       Delete
      </Button>
     ) : null}
    </div>
   </div>

   {/* Quick links to the dedicated pages */}
   <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
    <HubCard
     icon={<ListBullets size={18} weight="duotone" />}
     title="Question bank"
     subtitle={
      <>
       <span className="font-mono text-navy-900">{questionCount}</span> questions
       {" · "}
       <span className="font-mono text-navy-900">{activeQuestionCount}</span> active
      </>
     }
     primary={
      <Link to={ROUTES.EXAM_QUESTIONS(exam.id)} className="inline-flex">
       <Button>
        <CaretRight size={14} weight="bold" />
        Manage questions
       </Button>
      </Link>
     }
     secondary={
      exam.status === "draft" ? (
       <Link
        to={ROUTES.EXAM_QUESTION_DETAIL(exam.id, "new")}
        className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
       >
        <Plus size={12} weight="bold" />
        Quick add
       </Link>
      ) : null
     }
    />

    <HubCard
     icon={<Exam size={18} weight="duotone" />}
     title="Submissions"
     subtitle={
      <>
       <span className="font-mono text-navy-900">{submitted.length}</span> submitted
       {" · "}
       <span className="font-mono text-navy-900">{(attempts?.data ?? []).length}</span> total
      </>
     }
     primary={
      <Link to={ROUTES.EXAM_SUBMISSIONS(exam.id)} className="inline-flex">
       <Button>
        <CaretRight size={14} weight="bold" />
        View submissions
       </Button>
      </Link>
     }
    />
   </div>

   {/* Face-based identity: no per-exam moderator list */}
   <div className="mt-4">
    {/* removed card */} <div data-exam-id={exam.id} />
   </div>

   <TypeToDeleteDialog
    open={deleteExamOpen}
    onClose={() => (del.isPending ? null : setDeleteExamOpen(false))}
    onConfirm={() =>
     del.mutate(exam.id, {
      onSuccess: () => setDeleteExamOpen(false),
     })
    }
    title="Delete this exam?"
    entityName={exam.title}
    loading={del.isPending}
    description={
     <>
      This permanently removes <span className="font-semibold">{exam.title}</span>, its question bank, and every
      submission. It cannot be undone.
     </>
    }
   />
  </div>
 );
}

function HubCard({
 icon,
 title,
 subtitle,
 primary,
 secondary,
}: {
 icon: ReactNode;
 title: string;
 subtitle: ReactNode;
 primary: ReactNode;
 secondary?: ReactNode;
}) {
 return (
  <Card className="flex items-start gap-4 p-5">
   <div className="mt-0.5 text-accent">{icon}</div>
   <div className="min-w-0 flex-1">
    <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
    <p className="mt-0.5 text-sm text-text-muted">{subtitle}</p>
    <div className="mt-4 flex items-center gap-3">
     {primary}
     {secondary}
    </div>
   </div>
  </Card>
 );
}