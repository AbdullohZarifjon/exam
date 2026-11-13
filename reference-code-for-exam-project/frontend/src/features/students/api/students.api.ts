import { client } from "../../../shared/api";
import type { CreateStudentInput, Student, UpdateStudentInput } from "../model/student.types";

export interface StudentListResult {
  items: Student[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const studentsApi = {
  list(params?: { q?: string; page?: number; limit?: number }) {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const suffix = qs.toString() ? `?${qs}` : "";
    return client<{ success: true; data: StudentListResult }>(`/auth/students${suffix}`);
  },
  byCode(code: string) {
    return client<{ success: true; data: Student }>(`/auth/students/by-code/${encodeURIComponent(code)}`);
  },
  create(body: CreateStudentInput) {
    return client<{ success: true; data: Student }>("/auth/students", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  update(id: string, body: UpdateStudentInput) {
    return client<{ success: true; data: Student }>(`/auth/students/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  remove(id: string) {
    return client<{ success: true; data: { id: string; deleted: true } }>(`/auth/students/${id}`, {
      method: "DELETE",
    });
  },
};
