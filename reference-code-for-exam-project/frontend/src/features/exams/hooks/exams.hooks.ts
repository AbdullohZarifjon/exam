import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../shared/config/routes";
import { examsApi } from "../api/exams.api";
import type { CreateExamInput, ExamStatus, UpdateExamInput } from "../model/exam.types";

export const examKeys = {
  all: ["exams"] as const,
  list: (status?: ExamStatus) => [...examKeys.all, "list", status ?? "all"] as const,
  detail: (id: string) => [...examKeys.all, "detail", id] as const,
};

export function useExams(status?: ExamStatus) {
  return useQuery({ queryKey: examKeys.list(status), queryFn: () => examsApi.list(status) });
}
export function useExam(id: string) {
  return useQuery({ queryKey: examKeys.detail(id), queryFn: () => examsApi.get(id), enabled: Boolean(id) });
}
export function useCreateExam() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (body: CreateExamInput) => examsApi.create(body),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: examKeys.all }); navigate(ROUTES.EXAM_DETAIL(res.data.id)); },
  });
}
export function usePublishExam() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => examsApi.publish(id), onSuccess: () => qc.invalidateQueries({ queryKey: examKeys.all }) });
}
export function useArchiveExam() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => examsApi.archive(id), onSuccess: () => qc.invalidateQueries({ queryKey: examKeys.all }) });
}
export function useUpdateExam() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, body }: { id: string; body: UpdateExamInput }) => examsApi.update(id, body), onSuccess: () => qc.invalidateQueries({ queryKey: examKeys.all }) });
}
export function useDeleteExam() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => examsApi.remove(id), onSuccess: () => qc.invalidateQueries({ queryKey: examKeys.all }) });
}
