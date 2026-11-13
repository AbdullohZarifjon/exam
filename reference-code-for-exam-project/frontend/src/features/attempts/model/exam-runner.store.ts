import { create } from "zustand";

import type { Attempt, AttemptQuestion } from "./attempt.types";

/**
 * Client-side state for one exam session (the runner).
 *
 * Data-flow contract:
 * - The served question snapshot is loaded ONCE per attempt (`hydrate`) and
 *   is never refetched when answers change.
 * - `answers` mirrors ONLY server-confirmed state: a selection is written
 *   here after the backend answers 200 to POST /attempts/:id/answer.
 * - `pendingAnswers` is the in-flight echo used for instant UI feedback;
 *   it is committed over or discarded on failure (see the actions).
 */
interface ExamRunnerState {
  attemptId: string | null;
  questions: AttemptQuestion[];
  /** Server-confirmed answers, keyed by questionId. */
  answers: Record<string, string[]>;
  /** Selections sent to the backend but not confirmed yet. */
  pendingAnswers: Record<string, string[]>;

  /** Loads the served snapshot + saved answers. Runs once per attempt. */
  hydrate: (attempt: Attempt) => void;
  /** Echoes a selection for display while the sync request is in flight. */
  stageAnswer: (questionId: string, givenOptionIds: string[]) => void;
  /** Confirms a selection (backend answered 200). */
  commitAnswer: (questionId: string, givenOptionIds: string[]) => void;
  /** Rolls an unconfirmed selection back after a failed request. */
  discardAnswer: (questionId: string) => void;
  /** Clears the whole session (called after finish/logout). */
  reset: () => void;
}

const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

export const useExamRunnerStore = create<ExamRunnerState>()((set) => ({
  attemptId: null,
  questions: [],
  answers: {},
  pendingAnswers: {},

  hydrate(attempt) {
    set((state) => {
      // Never clobber synced answers with a refetch of the same attempt.
      if (state.attemptId === attempt.id) return state;
      const answers: Record<string, string[]> = {};
      for (const q of attempt.questions) {
        answers[q.questionId] = q.givenOptionIds;
      }
      return { attemptId: attempt.id, questions: attempt.questions, answers, pendingAnswers: {} };
    });
  },

  stageAnswer(questionId, givenOptionIds) {
    set((state) => ({ pendingAnswers: { ...state.pendingAnswers, [questionId]: givenOptionIds } }));
  },

  commitAnswer(questionId, givenOptionIds) {
    set((state) => {
      const pendingAnswers = { ...state.pendingAnswers };
      // Keep the echo if a NEWER selection for this question is still in
      // flight — committing an older payload must not drop it.
      const pending = state.pendingAnswers[questionId];
      if (pending === undefined || sameIds(pending, givenOptionIds)) {
        delete pendingAnswers[questionId];
      }
      return { answers: { ...state.answers, [questionId]: givenOptionIds }, pendingAnswers };
    });
  },

  discardAnswer(questionId) {
    set((state) => {
      if (state.pendingAnswers[questionId] === undefined) return state;
      const pendingAnswers = { ...state.pendingAnswers };
      delete pendingAnswers[questionId];
      return { pendingAnswers };
    });
  },

  reset() {
    set({ attemptId: null, questions: [], answers: {}, pendingAnswers: {} });
  },
}));
