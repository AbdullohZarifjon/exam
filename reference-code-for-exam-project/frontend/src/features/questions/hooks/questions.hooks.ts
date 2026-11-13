import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { questionsApi } from "../api/questions.api";
import type { CreateQuestionInput, UpdateQuestionInput } from "../model/question.types";

export const questionKeys = {
  all: ["questions"] as const,
  byExam: (examId: string) => [...questionKeys.all, "exam", examId] as const,
  detail: (id: string) => [...questionKeys.all, "detail", id] as const,
};

export function useQuestions(examId: string) {
  return useQuery({
    queryKey: questionKeys.byExam(examId),
    queryFn: () => questionsApi.list(examId),
    enabled: Boolean(examId),
  });
}

export function useQuestion(id: string | undefined) {
  return useQuery({
    queryKey: id ? questionKeys.detail(id) : ["questions", "detail", "noop"],
    queryFn: () => questionsApi.get(id!),
    enabled: Boolean(id) && id !== "new",
  });
}

export function useCreateQuestion(examId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<CreateQuestionInput, "examId">) => questionsApi.create({ ...body, examId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: questionKeys.byExam(examId) }),
  });
}

export function useUpdateQuestion(examId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateQuestionInput }) => questionsApi.update(id, body),
    onSuccess: (_data, { id }) => Promise.all([
      qc.invalidateQueries({ queryKey: questionKeys.byExam(examId) }),
      qc.invalidateQueries({ queryKey: questionKeys.detail(id) }),
    ]),
  });
}

export function useDeleteQuestion(examId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => questionsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: questionKeys.byExam(examId) }),
  });
}

export function useRemoveQuestionImage(examId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => questionsApi.removeImage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: questionKeys.byExam(examId) }),
  });
}
