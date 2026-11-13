import { client } from "../../../shared/api";
import type { CreateQuestionInput, Question, UpdateQuestionInput } from "../model/question.types";

export const questionsApi = {
  list(examId: string) {
    return client<{ success: true; data: Question[] }>(`/questions?examId=${examId}`);
  },
  get(id: string) {
    return client<{ success: true; data: Question }>(`/questions/${id}`);
  },
  create(body: CreateQuestionInput) {
    return client<{ success: true; data: Question }>("/questions", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  update(id: string, body: UpdateQuestionInput) {
    return client<{ success: true; data: Question }>(`/questions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  remove(id: string) {
    return client<{ success: true; data: { id: string; deleted: true } }>(`/questions/${id}`, {
      method: "DELETE",
    });
  },
  removeImage(id: string) {
    return client<{ success: true; data: { removed: boolean } }>(`/questions/${id}/image`, {
      method: "DELETE",
    });
  },
};
