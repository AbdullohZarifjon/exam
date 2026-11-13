import { Link, useNavigate, useParams } from "react-router-dom";
import { useMemo } from "react";
import { CaretLeft, CaretRight, List as ListIcon, ArrowUUpLeft } from "@phosphor-icons/react";

import { Button, Card, ConfirmDialog, EmptyState, Spinner } from "../shared/ui";
import { ROUTES } from "../shared/config/routes";
import { useExam } from "../features/exams/hooks/exams.hooks";
import { useQuestion, useQuestions, useDeleteQuestion } from "../features/questions/hooks/questions.hooks";
import { QuestionForm } from "../features/questions/components/QuestionForm";
import type { Exam } from "../features/exams/model/exam.types";

/**
 * Single-question page.
 *
 * Lives at `/exams/:examId/questions/:questionId` and supports:
 *  - "new" as the id (creates a fresh question)
 *  - any real id (edits that question)
 *
 * Prev / Next navigation lets staff flick through a 1000-question bank
 * without going back to the list every time.
 */
export function QuestionDetailPage() {
 const { examId = "", questionId = "" } = useParams<{
  examId: string;
  questionId: string;
 }>();
 const navigate = useNavigate();
 const { data: examData, isLoading: examLoading } = useExam(examId);
 const { data: questions, isLoading: qLoading } = useQuestions(examId);
 const isNew = questionId === "new";

 const { data: questionData, isLoading: qLoadingSingle } = useQuestion(questionId);
 const delQ = useDeleteQuestion(examId);

 const list = useMemo(() => questions?.data ?? [], [questions]);

 // Find current index in the list (sorted by createdAt desc to match the bank order).
 const currentIndex = useMemo(() => {
  if (isNew || !questionData) return -1;
  return list.findIndex((q) => q.id === questionData.data.id);
 }, [list, questionData, isNew]);

 const prev = currentIndex > 0 ? list[currentIndex - 1] : null;
 const next = currentIndex >= 0 && currentIndex < list.length - 1 ? list[currentIndex + 1] : null;

 if (examLoading) {
  return (
   <div className="flex h-40 items-center justify-center text-[#8A9BB8]">
    <Spinner />
   </div>
  );
 }
 if (!examData) return <EmptyState title="Exam not found" />;
 const exam: Exam = examData.data;

 // Loading only the single-question record (skip when creating).
 if (!isNew && (qLoadingSingle || qLoading)) {
  return (
   <div className="flex h-40 items-center justify-center text-[#8A9BB8]">
    <Spinner />
   </div>
  );
 }
 if (!isNew && !questionData) return <EmptyState title="Question not found" />;
 if (isNew && exam.status !== "draft") {
  return <EmptyState title="Questions are locked" description={`This exam is ${exam.status} — new questions cannot be added.`} />;
 }

 const question = questionData?.data;

 return (
  <div>
   <Link
    to={ROUTES.EXAM_QUESTIONS(examId)}
    className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-text-muted hover:text-navy-900"
   >
    <ArrowUUpLeft size={11} weight="bold" />
    Back to question bank
   </Link>

   <div className="mt-4 flex items-end justify-between gap-4">
    <div>
     <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">{exam.title}</p>
     <h1 className="mt-1 text-[28px] font-bold tracking-tight">
      {isNew ? "New question" : `Question ${currentIndex >= 0 ? currentIndex + 1 : "—"}`}
     </h1>
    </div>
    <div className="flex items-center gap-2">
     {!isNew && question && exam.status === "draft" ? (
      <DeleteButton
       onConfirm={() => {
        delQ.mutate(question.id, {
         onSuccess: () => navigate(ROUTES.EXAM_QUESTIONS(examId)),
        });
       }}
       loading={delQ.isPending}
       label={question.text}
      />
     ) : null}
     <Link to={ROUTES.EXAM_QUESTIONS(examId)}>
      <Button variant="secondary">
       <ListIcon size={14} weight="bold" />
       All questions
      </Button>
     </Link>
    </div>
   </div>

   <div className="mt-6">
    <QuestionForm
     exam={exam}
     question={question}
     mode={isNew ? "create" : "edit"}
     onDone={() => navigate(ROUTES.EXAM_QUESTIONS(examId))}
     showCard={false}
    />
   </div>

   {/* Prev / next navigation */}
   {!isNew ? (
    <Card className="mt-8">
     <div className="flex items-center justify-between gap-2">
      {prev ? (
       <Link
        to={ROUTES.EXAM_QUESTION_DETAIL(examId, prev.id)}
        className="group flex flex-1 items-center gap-3 rounded-md p-2 hover:bg-bg"
       >
        <CaretLeft size={14} weight="bold" className="text-[#8A9BB8] group-hover:text-accent" />
        <div className="min-w-0">
         <p className="font-mono text-[11px] uppercase tracking-wider text-[#8A9BB8]">Previous</p>
         <p className="line-clamp-1 text-sm text-navy-900 group-hover:text-accent">{prev.text}</p>
        </div>
       </Link>
      ) : (
       <div className="flex-1 font-mono text-[11px] uppercase tracking-wider text-[#CBD6EF]">First question</div>
      )}
      {next ? (
       <Link
        to={ROUTES.EXAM_QUESTION_DETAIL(examId, next.id)}
        className="group flex flex-1 items-center justify-end gap-3 rounded-md p-2 text-right hover:bg-bg"
       >
        <div className="min-w-0">
         <p className="font-mono text-[11px] uppercase tracking-wider text-[#8A9BB8]">Next</p>
         <p className="line-clamp-1 text-sm text-navy-900 group-hover:text-accent">{next.text}</p>
        </div>
        <CaretRight size={14} weight="bold" className="text-[#8A9BB8] group-hover:text-accent" />
       </Link>
      ) : (
       <div className="flex-1 text-right font-mono text-[11px] uppercase tracking-wider text-[#CBD6EF]">
        Last question
       </div>
      )}
     </div>
    </Card>
   ) : null}
  </div>
 );
}

function DeleteButton({ onConfirm, loading, label }: { onConfirm: () => void; loading: boolean; label: string }) {
 return (
  <ConfirmDialog
   trigger={
    <Button variant="ghost" disabled={loading}>
     Delete
    </Button>
   }
   title="Delete this question?"
   confirmText={label}
   confirmLabel="Delete question"
   loading={loading}
   onConfirm={onConfirm}
   description={
    <>
     “{label}” will be removed from the bank. Submitted attempts keep their snapshot, so past scores are
     unaffected.
    </>
   }
  />
 );
}
