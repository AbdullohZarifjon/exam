import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Plus, MagnifyingGlass, Trash, PencilSimple } from "@phosphor-icons/react";

import {
 Button,
 EmptyState,
 Field,
 Input,
 Modal,
 Spinner,
 StatusBadge,
 Textarea,
 TypeToDeleteDialog,
} from "../shared/ui";
import { ROUTES } from "../shared/config/routes";
import { useExams, useDeleteExam, useCreateExam, useUpdateExam } from "../features/exams/hooks/exams.hooks";
import {
 createExamSchema,
 toCreateExamPayload,
 toUpdateExamPayload,
 filterExams,
} from "../features/exams/model/exam.types";
import type { Exam, ExamStatus } from "../features/exams/model/exam.types";
import { formatRelative } from "../shared/lib/format";

const tabs: Array<{ value: ExamStatus | "all"; label: string }> = [
 { value: "all", label: "All" },
 { value: "published", label: "Published" },
 { value: "draft", label: "Drafts" },
 { value: "archived", label: "Archived" },
];

export function ExamsListPage() {
 const { t } = useTranslation();
 const [status, setStatus] = useState<ExamStatus | "all">("all");
 const [q, setQ] = useState("");
 const [createOpen, setCreateOpen] = useState(false);
 const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
 const [examToEdit, setExamToEdit] = useState<Exam | null>(null);

 const filter = status === "all" ? undefined : status;
 const { data, isLoading, isError, refetch } = useExams(filter);
 const del = useDeleteExam();

 const filtered = filterExams(data?.data ?? [], q);
 const hasFilters = status !== "all" || q.trim().length > 0;
 const clearFilters = () => {
  setStatus("all");
  setQ("");
 };

 const closeDelete = () => (del.isPending ? null : setExamToDelete(null));

 return (
  <div>
   <div className="mb-6 flex items-end justify-between gap-4">
    <div>
     <h1 className="text-[28px] font-bold tracking-tight">{t("exams.title")}</h1>
     <p className="mt-1 text-sm text-text-muted">{t("exams.subtitle")}</p>
    </div>
    <Button onClick={() => setCreateOpen(true)}>
     <Plus size={14} weight="bold" />
     {t("exams.new")}
    </Button>
   </div>

   <div className="mb-4 flex flex-wrap items-center gap-3">
    <div className="flex gap-0.5 rounded-full border border-border bg-white p-1">
     {tabs.map((tab) => (
      <button
       key={tab.value}
       type="button"
       onClick={() => setStatus(tab.value)}
       aria-pressed={status === tab.value}
       className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        status === tab.value ? "bg-navy-900 text-white" : "text-[#475A82] hover:text-navy-900"
       }`}
      >
       {tab.label}
      </button>
     ))}
    </div>
    <div className="relative ml-auto w-full max-w-xs">
     <MagnifyingGlass size={14} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A9BB8]" />
     <Input
      type="search"
      aria-label={t("exams.search")}
      placeholder={t("exams.search")}
      value={q}
      onChange={(e) => setQ(e.target.value)}
      className="pl-9"
     />
    </div>
   </div>

   {isLoading ? (
    <div className="flex h-40 items-center justify-center text-[#8A9BB8]">
     <Spinner />
    </div>
   ) : isError ? (
    <EmptyState
     title={t("exams.loadError")}
     action={
      <Button variant="secondary" onClick={() => void refetch()}>
       {t("exams.retry")}
      </Button>
     }
    />
   ) : filtered.length === 0 ? (
    <EmptyState
     title={t(hasFilters ? "exams.noMatches" : "exams.empty")}
     action={
      hasFilters ? (
       <Button size="sm" variant="secondary" onClick={clearFilters}>
        {t("exams.clearFilters")}
       </Button>
      ) : (
       <Button size="sm" onClick={() => setCreateOpen(true)}>
        <Plus size={14} weight="bold" />
        {t("exams.new")}
       </Button>
      )
     }
    />
   ) : (
    <div className="overflow-x-auto rounded-2xl border border-border bg-white">
     <table className="w-full text-sm">
      <thead className="border-b border-border bg-bg/60 text-left font-mono text-[10px] uppercase tracking-wider text-text-muted">
       <tr>
        <th className="px-5 py-3">{t("exams.table.title")}</th>
        <th className="px-5 py-3">{t("exams.table.status")}</th>
        <th className="px-5 py-3">{t("exams.table.duration")}</th>
        <th className="px-5 py-3">{t("exams.table.questions")}</th>
        <th className="px-5 py-3">{t("exams.table.updated")}</th>
        <th className="px-5 py-3 w-10"></th>
       </tr>
      </thead>
      <tbody>
       {filtered.map((exam) => (
        <ExamRow
         key={exam.id}
         exam={exam}
         onEdit={() => setExamToEdit(exam)}
         onDelete={() => setExamToDelete(exam)}
        />
       ))}
      </tbody>
     </table>
    </div>
   )}

   {createOpen ? <ExamFormModal onClose={() => setCreateOpen(false)} /> : null}
   {examToEdit ? <ExamFormModal key={examToEdit.id} exam={examToEdit} onClose={() => setExamToEdit(null)} /> : null}

   <TypeToDeleteDialog
    open={examToDelete !== null}
    onClose={closeDelete}
    onConfirm={() => {
     if (!examToDelete) return;
     del.mutate(examToDelete.id, { onSuccess: () => setExamToDelete(null) });
    }}
    title={t("exams.delete.title")}
    entityName={examToDelete?.title ?? ""}
    loading={del.isPending}
    description={
     <>
      This permanently removes <span className="font-semibold">{examToDelete?.title}</span>, its question bank,
      and every submission. It cannot be undone.
     </>
    }
   />
  </div>
 );
}

function ExamRow({ exam, onEdit, onDelete }: { exam: Exam; onEdit: () => void; onDelete: () => void }) {
 const { t } = useTranslation();
 return (
  <tr className="border-b border-border last:border-b-0 hover:bg-bg/50">
   <td className="px-5 py-3.5">
    <Link to={ROUTES.EXAM_DETAIL(exam.id)} className="font-medium text-navy-900 hover:text-accent">
     {exam.title}
    </Link>
    {exam.description ? <p className="mt-0.5 text-xs text-text-muted line-clamp-1">{exam.description}</p> : null}
   </td>
   <td className="px-5 py-3.5">
    <StatusBadge status={exam.status} />
   </td>
   <td className="px-5 py-3.5 font-mono text-xs text-navy-700">{exam.timerMinutes} min</td>
   <td className="px-5 py-3.5 font-mono text-xs text-navy-700">{exam.questionsToServe}</td>
   <td className="px-5 py-3.5 text-text-muted">{formatRelative(exam.updatedAt)}</td>
   <td className="whitespace-nowrap px-5 py-3.5 text-right">
    <Button
     variant="ghost"
     size="sm"
     onClick={onEdit}
     aria-label={t("exams.edit.title")}
     disabled={exam.status === "archived"}
     title={t(exam.status === "archived" ? "exams.edit.archived" : "exams.edit.title")}
    >
     <PencilSimple size={14} weight="bold" />
    </Button>
    <Button
     variant="ghost"
     size="sm"
     onClick={onDelete}
     aria-label="Delete exam"
     disabled={exam.status !== "draft"}
     title={exam.status !== "draft" ? "Only draft exams can be deleted" : undefined}
    >
     <Trash size={14} weight="bold" className="text-text-muted" />
    </Button>
   </td>
  </tr>
 );
}

/* ------------------------------------------------------------------ */
/* Create exam modal                         */
/* ------------------------------------------------------------------ */

function ExamFormModal({ exam, onClose }: { exam?: Exam; onClose: () => void }) {
 const { t } = useTranslation();
 const create = useCreateExam();
 const update = useUpdateExam();
 const { isPending, error } = exam ? update : create;
 const isPublished = exam?.status === "published";

 const {
  register,
  handleSubmit,
  setValue,
  watch,
  reset,
  formState: { errors },
 } = useForm<FormValues>({
  resolver: zodResolver(createExamSchema),
  defaultValues: {
   title: exam?.title ?? "",
   description: exam?.description ?? "",
   timerMinutes: exam?.timerMinutes ?? 45,
   questionsToServe: exam?.questionsToServe ?? 100,
   passingMode: exam?.passingScorePercent != null ? "percent" : exam?.passingScorePoints != null ? "points" : "none",
   passingScorePercent: exam?.passingScorePercent ?? undefined,
   passingScorePoints: exam?.passingScorePoints ?? undefined,
  },
 });

 type FormValues = {
  title: string;
  description?: string;
  timerMinutes: number;
  questionsToServe: number;
  passingMode: "none" | "percent" | "points";
  passingScorePercent?: number;
  passingScorePoints?: number;
 };

 const passingMode = watch("passingMode");
 const close = () => (isPending ? null : onClose());
 const submit = (d: FormValues) => {
  if (exam) {
   update.mutate({ id: exam.id, body: toUpdateExamPayload(d) }, { onSuccess: onClose });
  } else {
   create.mutate(toCreateExamPayload(d), {
    onSuccess: () => {
     reset();
     onClose();
    },
   });
  }
 };


 return (
  <Modal
   open
   onClose={close}
   title={t(exam ? "exams.edit.title" : "exams.create.title")}
   description={t(exam ? "exams.edit.subtitle" : "exams.create.subtitle")}
   maxWidth="max-w-4xl"
   footer={
    <div className="flex items-center justify-end gap-2">
     <Button type="button" variant="ghost" onClick={close} disabled={isPending}>
      {t("exams.create.cancel")}
     </Button>
     <Button type="submit" form="exam-form" loading={isPending}>
      {t(exam ? "exams.edit.submit" : "exams.create.submit")}
     </Button>
    </div>
   }
  >
   <form id="exam-form" onSubmit={handleSubmit(submit)} className="flex flex-col">
    {error ? (
     <p role="alert" className="mb-4 text-sm text-red-700">
      {error.message}
     </p>
    ) : null}
    <fieldset disabled={isPending} className="min-w-0">
     {/* Two-pane layout: basics on the left, duration, count & passing on the right, split by a vertical line */}
     <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-0">
      {/* Left column — exam basics */}
      <div className="flex flex-col gap-4 md:pr-6">
       <Field
        label={t("exams.create.name")}
        required
        error={errors.title?.message}
        hint={t("exams.create.nameHint")}
       >
        <Input placeholder={t("exams.create.namePlaceholder")} {...register("title")} />
       </Field>

       <Field label={t("exams.create.description")} hint={t("exams.create.descriptionHint")}>
        <Textarea
         rows={2}
         placeholder={t("exams.create.descriptionPlaceholder")}
         {...register("description")}
        />
       </Field>
      </div>

      {/* Right column — split from the basics by a vertical rule (stacks below on small screens) */}
      <div className="flex flex-col gap-4 border-t border-border pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
       <Field label={t("exams.create.timerMinutes")} required error={errors.timerMinutes?.message}>
        <Input
         type="number"
         min={1}
         max={24 * 60}
         aria-label={t("exams.create.timerMinutes")}
         disabled={isPublished}
         {...register("timerMinutes", { valueAsNumber: true })}
        />
       </Field>

       <Field
        label={t("exams.create.questionsToServe")}
        required
        error={errors.questionsToServe?.message}
        hint={t("exams.create.serveHint")}
       >
        <Input type="number" min={1} max={100} disabled={isPublished} {...register("questionsToServe", { valueAsNumber: true })} />
       </Field>

       {/* Passing score — percent OR fixed points OR none */}
       <Field
        label={t("exams.create.passingScore")}
        error={
         (errors.passingScorePercent?.message ?? errors.passingScorePoints?.message) as string | undefined
        }
       >
        <div className="flex flex-col gap-2">
         <div className="flex gap-0.5 rounded-full border border-border bg-white p-1">
          {(["none", "percent", "points"] as const).map((mode) => (
           <button
            key={mode}
            type="button"
            disabled={isPublished}
            onClick={() => setValue("passingMode", mode, { shouldValidate: true })}
            aria-pressed={passingMode === mode}
            className={`min-w-0 flex-1 rounded-full px-2 py-2 text-xs font-medium transition-colors ${
             passingMode === mode ? "bg-accent text-white" : "text-[#475A82] hover:text-navy-900"
            }`}
           >
            {t(`exams.create.passingMode.${mode}`)}
           </button>
          ))}
         </div>
         {passingMode === "percent" ? (
          <Input
           type="number"
           min={0}
           max={100}
           placeholder="60"
           disabled={isPublished}
           {...register("passingScorePercent", {
            setValueAs: (v) => (v === "" || v === null ? undefined : Number(v)),
           })}
          />
         ) : null}
         {passingMode === "points" ? (
          <Input
           type="number"
           min={1}
           placeholder="25"
           disabled={isPublished}
           {...register("passingScorePoints", {
            setValueAs: (v) => (v === "" || v === null ? undefined : Number(v)),
           })}
          />
         ) : null}
         <p className="text-xs text-text-muted">{t("exams.create.passingHint")}</p>
        </div>
       </Field>
      </div>

     </div>
    </fieldset>
   </form>
  </Modal>
 );
}
