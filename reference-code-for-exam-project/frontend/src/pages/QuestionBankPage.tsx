import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { Plus, MagnifyingGlass, CaretLeft, CaretRight, PencilSimple, Trash, ImageSquare } from "@phosphor-icons/react";

import { Button, Card, ConfirmDialog, EmptyState, Spinner } from "../shared/ui";
import { ROUTES } from "../shared/config/routes";
import { useExam } from "../features/exams/hooks/exams.hooks";
import { useQuestions, useDeleteQuestion } from "../features/questions/hooks/questions.hooks";
import type { Question } from "../features/questions/model/question.types";
import { cn } from "../shared/lib/cn";

/**
 * Question bank index for a single exam.
 *
 * The exam-detail page links here instead of rendering every question inline:
 * at 1000+ questions that becomes unusable. This page gives the staff a
 * search box, quick filters, and a keyboard-friendly table — clicking a row
 * opens the question on its own page (with prev/next navigation).
 */

const PAGE_SIZE = 20;

type ImageFilter = "all" | "with-image" | "no-image";
type ActiveFilter = "all" | "active" | "inactive";

export function QuestionBankPage() {
 const { examId = "" } = useParams<{ examId: string }>();
 const [params, setParams] = useSearchParams();
 const search = params.get("q") ?? "";
 const image = (params.get("img") ?? "all") as ImageFilter;
 const active = (params.get("a") ?? "all") as ActiveFilter;
 const page = Math.max(1, Number(params.get("p") ?? "1"));

 const { data: examData, isLoading: examLoading } = useExam(examId);
 const { data: qs, isLoading: qLoading } = useQuestions(examId);
 const delQ = useDeleteQuestion(examId);

 const updateParam = (key: string, value: string) => {
  const next = new URLSearchParams(params);
  if (value === "" || value === "all") next.delete(key);
  else next.set(key, value);
  if (key !== "p") next.delete("p");
  setParams(next, { replace: true });
 };

 const all: Question[] = qs?.data ?? [];

 const filtered = useMemo(() => {
  const q = search.trim().toLowerCase();
  return all
   .filter((row) => {
    if (q && !row.text.toLowerCase().includes(q)) return false;
    if (image === "with-image" && !row.imageUrl) return false;
    if (image === "no-image" && row.imageUrl) return false;
    if (active === "active" && !row.isActive) return false;
    if (active === "inactive" && row.isActive) return false;
    return true;
   });
  // No client-side re-sort: preserve the backend order (createdAt ascending).
 }, [all, search, image, active]);

 const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
 const safePage = Math.min(page, totalPages);
 const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

 if (examLoading || qLoading) {
  return (
   <div className="flex h-40 items-center justify-center text-[#8A9BB8]">
    <Spinner />
   </div>
  );
 }
 if (!examData) return <EmptyState title="Exam not found" />;

 const exam = examData.data;

 return (
  <div>
   <Link
    to={ROUTES.EXAM_DETAIL(examId)}
    className="font-mono text-[11px] uppercase tracking-wider text-text-muted hover:text-navy-900"
   >
    ← {exam.title}
   </Link>

   <div className="mt-4 flex items-end justify-between gap-4">
    <div>
     <h1 className="text-[28px] font-bold tracking-tight">Question bank</h1>
     <p className="mt-1 text-sm text-text-muted">
      {filtered.length} of {all.length} questions
      {filtered.length !== all.length ? " match your filters" : ""}.
     </p>
    </div>
    {exam.status === "draft" ? (
     <Link to={ROUTES.EXAM_QUESTION_DETAIL(examId, "new")}>
      <Button>
       <Plus size={14} weight="bold" />
       New question
      </Button>
     </Link>
    ) : null}
   </div>

   {/* Filters */}
   <Card className="mt-6 p-4">
    <div className="flex flex-wrap items-center gap-2">
     <div className="relative min-w-[220px] flex-1">
      <MagnifyingGlass
       size={14}
       weight="bold"
       className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8A9BB8]"
      />
      <input
       autoFocus
       type="search"
       value={search}
       onChange={(e) => updateParam("q", e.target.value)}
       placeholder="Search question text…"
       className="h-9 w-full rounded-xl border border-border bg-surface pl-8 pr-3 text-sm text-navy-900 outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15"
      />
     </div>

     <FilterPills
      label="Image"
      value={image}
      options={[
       { v: "all", label: "All" },
       { v: "with-image", label: "With image" },
       { v: "no-image", label: "No image" },
      ]}
      onChange={(v) => updateParam("img", v)}
     />

     <FilterPills
      label="Status"
      value={active}
      options={[
       { v: "all", label: "All" },
       { v: "active", label: "Active" },
       { v: "inactive", label: "Inactive" },
      ]}
      onChange={(v) => updateParam("a", v)}
     />
    </div>
   </Card>

   {/* Table */}
   <div className="mt-6">
    {filtered.length === 0 ? (
     <EmptyState
      title={all.length === 0 ? "No questions yet" : "No matches"}
      description={
       all.length === 0 ? "Add a few questions, then publish when ready." : "Try clearing some filters."
      }
      action={
       all.length === 0 && exam.status === "draft" ? (
        <Link to={ROUTES.EXAM_QUESTION_DETAIL(examId, "new")}>
         <Button>
          <Plus size={14} weight="bold" />
          New question
         </Button>
        </Link>
       ) : undefined
      }
     />
    ) : (
     <Card className="overflow-hidden p-0">
      <table className="w-full text-sm">
       <thead className="bg-bg text-left text-xs uppercase tracking-wider text-text-muted">
        <tr>
         <th className="px-4 py-3 font-medium">#</th>
         <th className="px-4 py-3 font-medium">Question</th>
         <th className="px-4 py-3 font-medium">Image</th>
         <th className="px-4 py-3 font-medium">Status</th>
         <th className="px-4 py-3 font-medium" />
        </tr>
       </thead>
       <tbody className="divide-y divide-border">
        {slice.map((q, i) => (
         <tr key={q.id} className="group hover:bg-bg">
          <td className="px-4 py-3 font-mono text-xs text-[#8A9BB8]">
           {String((safePage - 1) * PAGE_SIZE + i + 1).padStart(2, "0")}
          </td>
          <td className="px-4 py-3">
           <Link
            to={ROUTES.EXAM_QUESTION_DETAIL(examId, q.id)}
            className="line-clamp-1 max-w-[640px] font-medium text-navy-900 group-hover:text-accent"
           >
            {q.text}
           </Link>
           <p className="mt-0.5 font-mono text-[11px] text-[#8A9BB8]">{q.options.length} options</p>
          </td>
          <td className="px-4 py-3 text-text-muted">
           {q.imageUrl ? (
            <span
             title="Has image"
             aria-label="Has image"
             className="inline-flex h-7 items-center gap-1 rounded-xl border border-border bg-surface px-2 font-mono text-[11px] text-navy-700"
            >
             <ImageSquare size={13} weight="bold" className="text-accent" />
             yes
            </span>
           ) : (
            <span className="font-mono text-xs">—</span>
           )}
          </td>
          <td className="px-4 py-3">
           <span
            className={cn(
             "inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider",
             q.isActive ? "text-accent" : "text-[#8A9BB8]",
            )}
           >
            <span
             aria-hidden
             className={cn("inline-block h-px w-3", q.isActive ? "bg-accent" : "bg-[#CBD6EF]")}
            />
            {q.isActive ? "active" : "inactive"}
           </span>
          </td>
          <td className="px-4 py-3 text-right">
           <div className="flex justify-end gap-1">
            <Link
             to={ROUTES.EXAM_QUESTION_DETAIL(examId, q.id)}
             className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#8A9BB8] hover:bg-bg hover:text-accent"
             aria-label="Edit"
            >
             <PencilSimple size={14} />
            </Link>
            {exam.status === "draft" ? <DeleteRowButton question={q} onConfirm={() => delQ.mutate(q.id)} loading={delQ.isPending} /> : null}
           </div>
          </td>
         </tr>
        ))}
       </tbody>
      </table>
     </Card>
    )}

    {totalPages > 1 ? (
     <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
      <span className="font-mono">
       Page {safePage} of {totalPages}
      </span>
      <div className="flex gap-1">
       <Button
        variant="secondary"
        size="sm"
        disabled={safePage <= 1}
        onClick={() => updateParam("p", String(safePage - 1))}
       >
        <CaretLeft size={12} weight="bold" />
        Previous
       </Button>
       <Button
        variant="secondary"
        size="sm"
        disabled={safePage >= totalPages}
        onClick={() => updateParam("p", String(safePage + 1))}
       >
        Next
        <CaretRight size={12} weight="bold" />
       </Button>
      </div>
     </div>
    ) : null}
   </div>
  </div>
 );
}

function FilterPills({
 label,
 value,
 options,
 onChange,
}: {
 label: string;
 value: string;
 options: { v: string; label: string }[];
 onChange: (v: string) => void;
}) {
 return (
  <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-0.5">
   <span className="px-2 font-mono text-[10px] uppercase tracking-wider text-[#8A9BB8]">{label}</span>
   {options.map((opt) => {
    const active = value === opt.v;
    return (
     <button
      key={opt.v}
      type="button"
      onClick={() => onChange(opt.v)}
      className={cn(
       "h-7 rounded px-2 text-xs font-medium transition-colors",
       active ? "bg-navy-900 text-white" : "text-[#475A82] hover:bg-bg",
      )}
     >
      {opt.label}
     </button>
    );
   })}
  </div>
 );
}

function DeleteRowButton({
 question,
 onConfirm,
 loading,
}: {
 question: Question;
 onConfirm: () => void;
 loading: boolean;
}) {
 const [open, setOpen] = useState(false);
 return (
  <>
   <button
    type="button"
    onClick={(e) => {
     e.preventDefault();
     e.stopPropagation();
     setOpen(true);
    }}
    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#8A9BB8] hover:bg-bg hover:text-red-600"
    aria-label="Delete"
   >
    <Trash size={14} />
   </button>
   <ConfirmDialog
    open={open}
    onClose={() => !loading && setOpen(false)}
    onConfirm={() => {
     onConfirm();
     setOpen(false);
    }}
    title="Delete this question?"
    confirmText={question.text}
    confirmLabel="Delete question"
    loading={loading}
    description={
     <>
      “{question.text}” will be removed from the bank. Submitted attempts keep their snapshot, so past scores are
      unaffected.
     </>
    }
   />
  </>
 );
}
