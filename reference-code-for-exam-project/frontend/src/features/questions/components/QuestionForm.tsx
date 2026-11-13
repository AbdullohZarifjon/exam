import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useFieldArray, useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, Circle } from "@phosphor-icons/react";

import { Button, Card, ImageDropzone } from "../../../shared/ui";
import {
  createQuestionSchema,
  updateQuestionSchema,
  type CreateQuestionInput,
  type UpdateQuestionInput,
} from "../model/question.types";
import { questionKeys, useCreateQuestion, useUpdateQuestion, useRemoveQuestionImage } from "../hooks/questions.hooks";
import type { Exam } from "../../exams/model/exam.types";
import type { Question } from "../model/question.types";
import { uploadApi, uploadFileToS3 } from "../api/upload.api";

/**
 * Shared question form. Used by:
 *   - ExamDetailPage (inline new-question form)
 *   - QuestionDetailPage (full-page create/edit with prev/next nav)
 *
 * `mode="create"` initialises with two blank fields.
 * `mode="edit"` initialises with the given question and supports Remove/Replace.
 */
export function QuestionForm({
  exam,
  question,
  mode,
  onDone,
  primaryLabel,
  showCard = true,
}: {
  exam: Exam;
  question?: Question;
  mode: "create" | "edit";
  onDone: () => void;
  primaryLabel?: string;
  showCard?: boolean;
}) {
  if (mode === "create") {
    return (
      <QuestionFormBody
        exam={exam}
        primaryLabel={primaryLabel ?? "Save question"}
        onDone={onDone}
        showCard={showCard}
      />
    );
  }
  if (!question) return null;
  return (
    <QuestionFormEditBody
      exam={exam}
      question={question}
      primaryLabel={primaryLabel ?? "Save changes"}
      onDone={onDone}
      showCard={showCard}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Create variant                                                     */
/* ------------------------------------------------------------------ */
function QuestionFormBody({
  exam,
  onDone,
  primaryLabel,
  showCard,
}: {
  exam: Exam;
  onDone: () => void;
  primaryLabel: string;
  showCard: boolean;
}) {
  const { t } = useTranslation();
  const create = useCreateQuestion(exam.id);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | undefined>(undefined);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<CreateQuestionInput>({
    resolver: zodResolver(createQuestionSchema),
    defaultValues: {
      examId: exam.id,
      text: "",
      options: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }],
      correctOptionIndexes: [0],
      imageUrl: "",
      isActive: true,
    },
  });

  const opts = useFieldArray({ control, name: "options" });
  const correct = watch("correctOptionIndexes") ?? [];

  const handleImageChange = (file: File | null) => {
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setImageFile(file);
  };

  const handleFormSubmit = async (data: CreateQuestionInput) => {
    const created = await create.mutateAsync({ ...data, imageUrl: undefined });
    const newQuestionId = created.data.id;

    if (imageFile) {
      setUploading(true);
      setUploadProgress(0);
      try {
        const {
          data: { uploadId, uploadUrl },
        } = await uploadApi.requestUpload("question", newQuestionId, imageFile);
        await uploadFileToS3(uploadUrl, imageFile, (pct) => setUploadProgress(pct));
        await uploadApi.confirmUpload(uploadId);
      } finally {
        setUploading(false);
        setUploadProgress(undefined);
      }
    }
    onDone();
  };

  const body = (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
      <textarea
        className="min-h-[64px] w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-navy-900 outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15"
        placeholder={t("questions.form.text")}
        {...register("text")}
      />
      {errors.text ? <p className="text-xs text-red-700">{errors.text.message}</p> : null}

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-navy-800">Options</span>
        {opts.fields.map((f, i) => {
          const isCorrect = correct.includes(i);
          return (
            <div key={f.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = isCorrect
                    ? correct.filter((x) => x !== i)
                    : [...correct, i];
                  register("correctOptionIndexes").onChange({
                    target: { value: next, name: "correctOptionIndexes" },
                  } as never);
                }}
                className={isCorrect ? "text-accent" : "text-[#CBD6EF] hover:text-text-muted"}
                aria-label="Mark correct"
              >
                {isCorrect ? <CheckCircle size={18} weight="fill" /> : <Circle size={18} />}
              </button>
              <input
                className="h-9 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-navy-900 outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15"
                placeholder={`Option ${i + 1}`}
                {...register(`options.${i}.text` as const)}
              />
            </div>
          );
        })}
      </div>

      <Controller control={control} name="correctOptionIndexes" render={() => <input type="hidden" />} />

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-navy-800">Image</span>
        <ImageDropzone
          value={imagePreview}
          onChange={handleImageChange}
          progress={uploadProgress}
          disabled={uploading}
        />
      </div>

      <textarea
        className="min-h-[60px] w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-navy-900 outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15"
        placeholder="Explanation (optional)"
        {...register("explanation")}
      />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={create.isPending || uploading}>
          {primaryLabel}
        </Button>
      </div>
    </form>
  );

  return showCard ? <Card>{body}</Card> : body;
}

/* ------------------------------------------------------------------ */
/*  Edit variant                                                       */
/* ------------------------------------------------------------------ */
function QuestionFormEditBody({
  exam,
  question,
  onDone,
  primaryLabel,
  showCard,
}: {
  exam: Exam;
  question: Question;
  onDone: () => void;
  primaryLabel: string;
  showCard: boolean;
}) {
  const { t } = useTranslation();
  // Published/archived exams are locked — questions are view-only.
  const readOnly = exam.status !== "draft";
  const update = useUpdateQuestion(exam.id);
  const queryClient = useQueryClient();
  const removeImage = useRemoveQuestionImage(exam.id);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(question.imageUrl ?? null);
  const [pendingRemove, setPendingRemove] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | undefined>(undefined);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<UpdateQuestionInput>({
    resolver: zodResolver(updateQuestionSchema),
    defaultValues: {
      text: question.text,
      options: Array.from({ length: 4 }, (_, i) => question.options[i] ? { id: question.options[i].id, text: question.options[i].text } : { text: "" }),
      correctOptionIndexes: question.correctOptionIndexes ?? [],
      explanation: question.explanation ?? "",
      imageUrl: question.imageUrl ?? "",
      isActive: question.isActive,
    },
  });

  const opts = useFieldArray({ control, name: "options" });
  const correct = watch("correctOptionIndexes") ?? [];

  const handleImageChange = (file: File | null) => {
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      setPendingRemove(true);
      return;
    }
    setImagePreview((prev) => {
      if (prev && prev !== question.imageUrl) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setImageFile(file);
    setPendingRemove(false);
  };

  const handleFormSubmit = async (data: UpdateQuestionInput) => {
    if (imageFile) {
      setUploading(true);
      setUploadProgress(0);
      try {
        const {
          data: { uploadId, uploadUrl },
        } = await uploadApi.requestUpload("question", question.id, imageFile);
        await uploadFileToS3(uploadUrl, imageFile, (pct) => setUploadProgress(pct));
        const confirmed = await uploadApi.confirmUpload(uploadId);
        if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
        setImagePreview(confirmed.data.imageUrl);
        setImageFile(null);
        setPendingRemove(false);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: questionKeys.detail(question.id) }),
          queryClient.invalidateQueries({ queryKey: questionKeys.byExam(exam.id) }),
        ]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Image upload failed");
        return;
      } finally {
        setUploading(false);
        setUploadProgress(undefined);
      }
      // Save the other fields without closing the editor after an image upload.
      update.mutate(
        { id: question.id, body: { ...data, imageUrl: undefined } },
        { onSuccess: () => toast.success("Image uploaded and question saved") },
      );
      return;
    }

    if (pendingRemove && question.imageUrl) {
      await removeImage.mutateAsync(question.id);
      update.mutate({ id: question.id, body: data }, { onSuccess: () => onDone() });
      return;
    }

    update.mutate({ id: question.id, body: data }, { onSuccess: () => onDone() });
  };

  const body = (
    <form onSubmit={rhfHandleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
     {readOnly ? (
      <p className="rounded-xl border border-border bg-bg px-3.5 py-2.5 text-xs text-text-muted">
       This exam is {exam.status} and locked — questions are view-only and cannot be changed.
      </p>
     ) : null}
     <fieldset disabled={readOnly} className="flex min-w-0 flex-col gap-4">
      <textarea
        className="min-h-[64px] w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-navy-900 outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15"
        placeholder={t("questions.form.text")}
        {...register("text")}
      />
      {errors.text ? <p className="text-xs text-red-700">{errors.text.message}</p> : null}

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-navy-800">Options</span>
        {opts.fields.map((f, i) => {
          const isCorrect = correct.includes(i);
          return (
            <div key={f.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = isCorrect
                    ? correct.filter((x) => x !== i)
                    : [...correct, i];
                  register("correctOptionIndexes").onChange({
                    target: { value: next, name: "correctOptionIndexes" },
                  } as never);
                }}
                className={isCorrect ? "text-accent" : "text-[#CBD6EF] hover:text-text-muted"}
                aria-label="Mark correct"
              >
                {isCorrect ? <CheckCircle size={18} weight="fill" /> : <Circle size={18} />}
              </button>
              <input
                className="h-9 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-navy-900 outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15"
                placeholder={`Option ${i + 1}`}
                {...register(`options.${i}.text` as const)}
              />
            </div>
          );
        })}
      </div>

      <Controller control={control} name="correctOptionIndexes" render={() => <input type="hidden" />} />

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-navy-800">Image</span>
        <ImageDropzone
          value={imagePreview}
          onChange={handleImageChange}
          progress={uploadProgress}
          disabled={uploading || readOnly}
        />
      </div>

      <textarea
        className="min-h-[60px] w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-navy-900 outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15"
        placeholder="Explanation (optional)"
        {...register("explanation")}
      />

     </fieldset>
     {!readOnly ? (
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={update.isPending || uploading}>
          {primaryLabel}
        </Button>
      </div>
     ) : null}
    </form>
  );

  return showCard ? <Card>{body}</Card> : body;
}
