import { client } from "../../../shared/api";
import type { Attempt, AttemptWithStudent } from "../model/attempt.types";

export const attemptsApi = {
  get(id: string) {
    return client<{ success: true; data: Attempt }>(`/attempts/${id}`);
  },
  listForExam(examId: string) {
    return client<{ success: true; data: AttemptWithStudent[] }>(`/exams/${examId}/attempts`);
  },
  answer(attemptId: string, questionId: string, givenOptionIds: string[]) {
    return client<{ success: true; data: { ok: true } }>(`/attempts/${attemptId}/answer`, {
      method: "POST",
      body: JSON.stringify({ questionId, givenOptionIds }),
    });
  },
  finish(attemptId: string) {
    return client<{ success: true; data: { attempt: Attempt } }>("/auth/student/finish", {
      method: "POST",
      body: JSON.stringify({ attemptId }),
    });
  },
  resultByToken(token: string) {
    return client<{
      success: true;
      data: {
        attempt: Attempt;
        passingScorePercent: number | null;
        passingScorePoints?: number | null;
      };
    }>(`/auth/student/result/${encodeURIComponent(token)}`);
  },
};
