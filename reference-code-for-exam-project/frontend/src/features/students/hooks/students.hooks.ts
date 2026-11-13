import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { studentsApi } from "../api/students.api";
import type { CreateStudentInput, UpdateStudentInput } from "../model/student.types";

export const studentKeys = {
  all: ["students"] as const,
  list: (q = "", page = 1, limit = 24) => [...studentKeys.all, "list", q, page, limit] as const,
};

export function useStudents(q = "", page = 1, limit = 24) {
  return useQuery({
    queryKey: studentKeys.list(q, page, limit),
    queryFn: () => studentsApi.list({ q, page, limit }),
  });
}

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateStudentInput) => studentsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: studentKeys.all }),
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateStudentInput }) => studentsApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: studentKeys.all }),
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => studentsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: studentKeys.all }),
  });
}
