import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "../../../shared/config/routes";
import { showErrorToast } from "../../../shared/api";
import { useAuthStore } from "../../../app/store/auth.store";
import { attemptsApi } from "../api/attempts.api";
import type { Attempt } from "../model/attempt.types";
import { useExamRunnerStore } from "../model/exam-runner.store";

export const attemptKeys = {
  all: ["attempts"] as const,
  detail: (id: string) => [...attemptKeys.all, "detail", id] as const,
  resultByToken: (token: string) => [...attemptKeys.all, "result", token] as const,
  byExam: (examId: string) => [...attemptKeys.all, "byExam", examId] as const,
};

export function useAttemptsForExam(examId: string) {
  return useQuery({
    queryKey: attemptKeys.byExam(examId),
    queryFn: () => attemptsApi.listForExam(examId),
    enabled: Boolean(examId),
  });
}

/* --------------------------------- Get attempt ----------------------------- */

export function useAttempt(attemptId: string | undefined, options?: { pollWhileInProgress?: boolean }) {
  const pollWhileInProgress = options?.pollWhileInProgress ?? true;
  return useQuery({
    queryKey: attemptKeys.detail(attemptId ?? ""),
    queryFn: () => attemptsApi.get(attemptId!),
    enabled: Boolean(attemptId),
    refetchInterval: (q) => {
      // Auto-stop polling once the attempt is no longer in-progress.
      const data = q.state.data as { data?: Attempt } | undefined;
      const status = data?.data?.status;
      // The runner opts out of polling entirely: it keeps the snapshot in
      // its own store and syncs answers per question instead.
      return pollWhileInProgress && status === "in-progress" ? 30_000 : false;
    },
  });
}

/**
 * Syncs ONE question's answer to the backend. The attempt query is
 * deliberately NOT invalidated: the runner store is the display source of
 * truth, and the confirmed selection is committed into it on success (or
 * rolled back with a toast on failure).
 */
export function useAnswerQuestion(attemptId: string) {
  const commitAnswer = useExamRunnerStore((s) => s.commitAnswer);
  const discardAnswer = useExamRunnerStore((s) => s.discardAnswer);

  return useMutation({
    mutationFn: ({ questionId, givenOptionIds }: { questionId: string; givenOptionIds: string[] }) =>
      attemptsApi.answer(attemptId, questionId, givenOptionIds),
    onSuccess: (_res, { questionId, givenOptionIds }) => commitAnswer(questionId, givenOptionIds),
    onError: (error, { questionId }) => {
      discardAnswer(questionId);
      showErrorToast(error);
    },
  });
}

/* --------------------------------- Finish ---------------------------------- */

/**
 * Signs the student out and lands them on their result page. Used both for
 * an early submit and for the automatic logout after the timer expires —
 * the backend grades from the already-synced answers either way.
 */
export function useFinishExam() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const clear = useAuthStore((s) => s.clear);
  const resetRunner = useExamRunnerStore((s) => s.reset);
  return useMutation({
    mutationFn: (attemptId: string) => attemptsApi.finish(attemptId),
    onSuccess: (res) => {
      qc.setQueryData(attemptKeys.detail(res.data.attempt.id), res);
      resetRunner();
      clear();
      navigate(ROUTES.RESULT(res.data.attempt.resultToken ?? ""), { replace: true });
    },
  });
}

/* --------------------------------- Public result --------------------------- */

export function useResultByToken(token: string | undefined) {
  return useQuery({
    queryKey: attemptKeys.resultByToken(token ?? ""),
    queryFn: () => attemptsApi.resultByToken(token!),
    enabled: Boolean(token),
  });
}

/** Admin: delete a result to reset the one-attempt lock for a student. */
