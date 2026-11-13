import { client } from "../../../shared/api";
import type { CreateExamInput, Exam, ExamStatus, UpdateExamInput } from "../model/exam.types";

export const examsApi = {
  list(status?: ExamStatus) {
    const qs = status ? `?status=${status}` : "";
    return client<{ success: true; data: Exam[] }>(`/exams${qs}`);
  },
  get(id: string) {
    return client<{ success: true; data: Exam }>(`/exams/${id}`);
  },
  create(body: CreateExamInput) {
    return client<{ success: true; data: Exam }>("/exams", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  publish(id: string) {
    return client<{ success: true; data: Exam }>(`/exams/${id}/publish`, { method: "POST" });
  },
  archive(id: string) {
    return client<{ success: true; data: Exam }>(`/exams/${id}/archive`, { method: "POST" });
  },
  update(id: string, body: UpdateExamInput) {
    return client<{ success: true; data: Exam }>(`/exams/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  remove(id: string) {
    return client<{ success: true; data: { id: string; deleted: true } }>(`/exams/${id}`, {
      method: "DELETE",
    });
  },
};
