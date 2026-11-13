import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Camera, MagnifyingGlass, PencilSimple, Plus, Trash, Warning } from "@phosphor-icons/react";
import { useEnroll, useFacePhoto, useRevoke } from "../features/face/hooks/face.hooks";
import { processUploadedFiles } from "../features/face/components/FaceUpload";
import { useQueryClient } from "@tanstack/react-query";

import { Button, Card, EmptyState, Field, HoldConfirmDialog, Input, Modal, Spinner } from "../shared/ui";
import { useAuthStore } from "../app/store/auth.store";
import {
 useStudents,
 useCreateStudent,
 useUpdateStudent,
 useDeleteStudent,
} from "../features/students/hooks/students.hooks";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
 createStudentSchema,
 updateStudentSchema,
 type CreateStudentInput,
 type Student,
 type UpdateStudentInput,
} from "../features/students/model/student.types";
import { formatRelative } from "../shared/lib/format";
import { isApiError } from "../shared/api";

const PAGE_SIZE = 24;

export function StudentsPage() {
 const { t } = useTranslation();
 const [search, setSearch] = useState("");
 const [page, setPage] = useState(1);
 const { data, isLoading } = useStudents(search.trim(), page, PAGE_SIZE);
 const [open, setOpen] = useState(false);
 const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);

 const total = data?.data.total ?? 0;
 const pages = data?.data.pages ?? 1;
 const items = data?.data.items ?? [];
 const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
 const to = (page - 1) * PAGE_SIZE + items.length;

 return (
  <div>
   <div className="mb-6 flex items-end justify-between">
    <div>
     <h1 className="text-[28px] font-bold tracking-tight">{t("students.title")}</h1>
     <p className="mt-1 text-sm text-text-muted">{t("students.subtitle")}</p>
    </div>
    <Button onClick={() => setOpen(true)}>
     <Plus size={14} weight="bold" />
     {t("students.new")}
    </Button>
   </div>

   <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="relative w-full max-w-sm">
     <Input
      value={search}
      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
      placeholder={t("students.search.placeholder")}
      aria-label={t("students.search.label")}
      className="pl-9"
     />
     <MagnifyingGlass size={15} weight="bold" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8A9BB8]" />
    </div>
    <p className="text-xs text-text-muted">{!isLoading && total > 0 ? `${from}–${to} ${t("students.pagination.of")} ${total}` : ""}</p>
   </div>

   {isLoading ? (
    <div className="flex h-40 items-center justify-center text-[#8A9BB8]">
     <Spinner />
    </div>
   ) : total === 0 ? (
    <EmptyState
     title={search.trim() ? t("students.noResults.title") : "No students yet"}
     description={search.trim() ? t("students.noResults.description") : "Add students before starting an exam. They have no passwords — they identify by face at a kiosk."}
     action={search.trim() ? undefined : <Button onClick={() => setOpen(true)}>{t("students.new")}</Button>}
    />
   ) : (
    <>
     <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((s) => (
       <StudentCard key={s.id} student={s} onEdit={() => setStudentToEdit(s)} />
      ))}
     </div>
     {pages > 1 ? (
      <div className="mt-5 flex items-center justify-center gap-3">
       <Button
        variant="ghost"
        size="sm"
        disabled={page <= 1}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
       >
        {t("students.pagination.prev")}
       </Button>
       <span className="text-xs text-text-muted">{t("students.pagination.page", { page, pages })}</span>
       <Button
        variant="ghost"
        size="sm"
        disabled={page >= pages}
        onClick={() => setPage((p) => Math.min(pages, p + 1))}
       >
        {t("students.pagination.next")}
       </Button>
      </div>
     ) : null}
    </>
   )}

   <NewStudentModal open={open} onClose={() => setOpen(false)} />
   {studentToEdit ? (
    <EditStudentModal
     key={studentToEdit.id}
     student={studentToEdit}
     onClose={() => setStudentToEdit(null)}
    />
   ) : null}
  </div>
 );
}

function StudentCard({ student, onEdit }: { student: Student; onEdit: () => void }) {
 const del = useDeleteStudent();
 const [confirming, setConfirming] = useState(false);
 return (
  <Card className="p-4">
   <div className="flex items-start justify-between gap-2">
    <div className="min-w-0">
     <p className="truncate text-sm font-medium">{student.fullName}</p>
     <p className="mt-0.5 truncate font-mono text-xs text-text-muted">{student.studentCode}</p>
    </div>
    <div className="flex shrink-0 gap-1">
     <button
      type="button"
      onClick={onEdit}
      aria-label="Edit"
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#8A9BB8] hover:bg-bg hover:text-accent"
     >
      <PencilSimple size={14} />
     </button>
     <button
      type="button"
      onClick={() => setConfirming(true)}
      className="cursor-pointer inline-flex h-7 w-7 items-center justify-center rounded-md text-[#8A9BB8] hover:bg-bg hover:text-red-600"
      aria-label="Delete"
     >
      <Trash size={14} />
     </button>
    </div>
   </div>
   <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-[#8A9BB8]">
    {formatRelative(student.updatedAt)}
   </p>
   <HoldConfirmDialog
    open={confirming}
    onClose={() => setConfirming(false)}
    onConfirm={() => del.mutate(student.id, { onSuccess: () => setConfirming(false) })}
    loading={del.isPending}
    title="Delete student?"
    description={
     <>
      <strong>{student.fullName}</strong> ({student.studentCode}) will be permanently removed, including their face enrollment. This cannot be undone.
     </>
    }
   />
  </Card>
 );
}

function NewStudentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
 const { t } = useTranslation();
 const create = useCreateStudent();
 const {
  register,
  handleSubmit,
  reset,
  formState: { errors },
 } = useForm<CreateStudentInput>({ resolver: zodResolver(createStudentSchema) });

 return (
  <Modal open={open} onClose={onClose} title={t("students.create.title")}>
   <form
    onSubmit={handleSubmit((d) =>
     create.mutate(d, {
      onSuccess: () => {
       reset();
       onClose();
      },
     }),
    )}
    className="flex flex-col gap-4"
   >
    <Field label={t("students.name")} required error={errors.fullName?.message}>
     <Input autoComplete="off" {...register("fullName")} />
    </Field>
    {/* Optional: leave empty and the backend assigns the next generated code. */}
    <Field
     label={t("students.code")}
     error={errors.studentCode?.message}
     hint={t("students.create.codeHint")}
    >
     <Input
      placeholder="STU-2026-00001"
      autoComplete="off"
      className="font-mono"
      {...register("studentCode")}
     />
    </Field>
    <div className="flex justify-end gap-2 pt-2">
     <Button type="button" variant="ghost" onClick={onClose}>
      Cancel
     </Button>
     <Button type="submit" loading={create.isPending}>
      Add
     </Button>
    </div>
   </form>
  </Modal>
 );
}

function EditStudentModal({ student, onClose }: { student: Student; onClose: () => void }) {
 const { t } = useTranslation();
 const update = useUpdateStudent();
 // Only an admin may re-assign the student code (e.g. to fix a typo).
 // The backend enforces the same rule — this is a UX affordance, not the
 // security boundary.
 const identity = useAuthStore((s) => s.identity);
 const isAdmin = identity?.ownerType === "User" && identity.user.role === "admin";
 const {
  register,
  handleSubmit,
  formState: { errors },
 } = useForm<UpdateStudentInput>({
  resolver: zodResolver(updateStudentSchema),
  defaultValues: {
   fullName: student.fullName,
   studentCode: student.studentCode,
 
  },
 });

 const close = () => (update.isPending ? null : onClose());

 return (
  <Modal
   open
   onClose={close}
   title={t("students.edit.title")}
   description={t("students.edit.subtitle")}
  >
   <form
    onSubmit={handleSubmit((d) => {
     const body: UpdateStudentInput = {
      fullName: d.fullName,
     };
     // Send the code only when an admin actually changed it — keeps
     // teacher payloads code-free and avoids no-op writes. The backend
     // re-normalises to upper-case and answers 403/409 on violation.
     const nextCode = d.studentCode?.trim().toUpperCase();
     if (isAdmin && nextCode && nextCode !== student.studentCode) {
      body.studentCode = nextCode;
     }
     update.mutate({ id: student.id, body }, { onSuccess: onClose });
    })}
    className="flex flex-col gap-4"
   >
    {/* Admins can re-assign the code (must stay unique); teachers see it read-only. */}
    <Field
     label={t("students.code")}
     error={errors.studentCode?.message}
     hint={isAdmin ? t("students.edit.codeHintAdmin") : t("students.edit.codeHint")}
    >
     <Input
      placeholder="STU-2026-00001"
      autoComplete="off"
      className="font-mono"
      disabled={!isAdmin}
      {...register("studentCode")}
     />
    </Field>
    <Field label={t("students.name")} required error={errors.fullName?.message}>
     <Input autoComplete="off" {...register("fullName")} />
    </Field>
    <FaceSection student={student} />
    <div className="flex justify-end gap-2 pt-2">
     <Button type="button" variant="ghost" onClick={close} disabled={update.isPending}>
      {t("students.edit.cancel")}
     </Button>
     <Button type="submit" loading={update.isPending}>
      {t("students.edit.submit")}
     </Button>
    </div>
   </form>
  </Modal>
 );
}

/**
 * FaceID photo management inside the edit modal: view the stored
 * enrollment photo, replace it (re-enroll), or delete the face
 * entirely (revoke). Photos live in MinIO (faces/<studentId>); the
 * presigned URL comes from the staff-only /face/:id/photo endpoint.
 */
function FaceSection({ student }: { student: Student }) {
 const { data, isLoading } = useFacePhoto(student.id);
 const enroll = useEnroll();
 const revoke = useRevoke();
 const queryClient = useQueryClient();
 const [confirming, setConfirming] = useState(false);
 const [busy, setBusy] = useState(false);
 const [msg, setMsg] = useState<string | null>(null);

 const photoUrl = data?.data?.url ?? null;
 const enrolled = student.faceStatus === "enrolled";
 const loadingPhoto = isLoading || busy;

 const refresh = () => {
  void queryClient.invalidateQueries({ queryKey: ["face-photo", student.id] });
  void queryClient.invalidateQueries({ queryKey: ["students"] });
 };

 const onPick = async (files: FileList | null) => {
  if (!files || files.length === 0) return;
  setBusy(true);
  setMsg(null);
  try {
   const [processed] = await processUploadedFiles(files);
   if (!processed) return;
   await enroll.mutateAsync({ studentId: student.id, imageBase64: processed.imageBase64 });
   setMsg("Photo updated. The kiosk will use the new face.");
   refresh();
  } catch (e) {
   setMsg(isApiError(e) ? e.message : "Could not update the photo. Try a clearer, centered face photo.");
  } finally {
   setBusy(false);
  }
 };

 const doDelete = () => {
  revoke.mutate(student.id, {
   onSuccess: () => { setConfirming(false); setMsg("Face deleted. The student can no longer use the kiosk."); refresh(); },
   onError: () => setMsg("Could not delete the face."),
  });
 };

 return (
  <div className="overflow-hidden rounded-2xl border border-border">
   <div className="group relative max-h-[480px] aspect-[3/4] w-full bg-bg">
    {photoUrl && !loadingPhoto ? (
     <img
      src={photoUrl}
      alt={`Enrollment photo of ${student.fullName}`}
      className="h-full w-full object-cover"
     />
    ) : (
     <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#8A9BB8]">
      <Camera size={34} weight="duotone" />
      <span className="text-xs">No photo yet</span>
     </div>
    )}

    {/* Status pill */}
    <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white">
     {enrolled ? "Enrolled" : "Not enrolled"}
     {student.faceEnrolledAt && enrolled ? ` · ${formatRelative(student.faceEnrolledAt)}` : ""}
    </span>

    {/* Delete — top-right corner */}
    {enrolled && !confirming ? (
     <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label="Delete face"
      className="absolute right-3 top-3 z-20 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white opacity-80 transition-opacity hover:bg-red-700 hover:opacity-100 group-hover:opacity-100"
     >
      <Trash size={14} weight="bold" />
     </button>
    ) : null}

    {confirming ? (
     <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-navy-950/70 p-6 text-center">
      <p className="text-sm font-semibold text-white">Delete this face?</p>
      <p className="text-xs text-[#A9BBDD]">The student can no longer use the kiosk.</p>
      <div className="flex gap-2">
       <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setConfirming(false)} disabled={revoke.isPending}>
        Cancel
       </Button>
       <Button size="sm" disabled={revoke.isPending} onClick={doDelete}>
        {revoke.isPending ? <Spinner className="h-3.5 w-3.5" /> : null}Delete
       </Button>
      </div>
     </div>
    ) : (
     <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-navy-950/45 opacity-0 transition-opacity duration-200 hover:opacity-100">
      <span className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-xs font-semibold text-navy-900 shadow-lg">
       <Camera size={15} weight="bold" />
       {enrolled ? "Change photo" : "Enroll photo"}
      </span>
      <input type="file" accept="image/*" className="hidden" onChange={(e) => void onPick(e.target.files)} />
     </label>
    )}

    {loadingPhoto ? (
     <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-navy-950/55">
      <Spinner className="h-6 w-6 text-white" />
      <span className="text-xs font-medium text-white">{busy ? "Uploading photo…" : "Loading photo…"}</span>
     </div>
    ) : null}
   </div>
   {student.isLookalike ? (
    <p className="flex items-center gap-1.5 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700">
     <Warning size={13} weight="bold" /> Look-alike pair — kiosk routes this student to admin verification.
    </p>
   ) : null}
   {msg ? <p className="bg-white px-4 py-2 text-xs text-navy-700">{msg}</p> : null}
  </div>
 );
}

