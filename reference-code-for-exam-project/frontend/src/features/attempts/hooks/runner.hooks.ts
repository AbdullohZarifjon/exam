import { useCallback, useEffect, useRef, useState } from "react";

import { useFinishExam } from "./attempts.hooks";

/** Grace period between the timer hitting zero and the automatic logout. */
export const AUTO_LOGOUT_DELAY_MS = 5_000;

export interface ExamCountdown {
  /** Milliseconds until the attempt's deadline (negative once expired). */
  remainingMs: number;
  isExpired: boolean;
}

/**
 * Ticks once per second while the attempt is live and computes the time
 * remaining until the backend deadline (`expiresAt`). Also covers the
 * "student reopened an already-expired attempt" case: the first computed
 * remaining value is <= 0, so expiry latches immediately.
 */
export function useExamCountdown(expiresAtIso: string | undefined, active: boolean): ExamCountdown {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    setNow(Date.now()); // resync with the wall clock once the deadline is known
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  const remainingMs = expiresAtIso ? new Date(expiresAtIso).getTime() - now : 0;
  return { remainingMs, isExpired: Boolean(expiresAtIso) && remainingMs <= 0 };
}

type AutoLogoutPhase = "idle" | "waiting" | "signing-out" | "failed";

/**
 * When the attempt's timer runs out the backend stops accepting answers and
 * there is nothing left to submit — every selection is already saved. This
 * hook waits `AUTO_LOGOUT_DELAY_MS`, then fires the logout+finalize request
 * exactly once (the finish flow navigates to the result page on success).
 * A network failure surfaces as `failed` with a `retry()` for the UI.
 */
export function useAutoLogoutOnExpiry(attemptId: string, enabled: boolean) {
  const { mutate: finishExam, isPending, isError } = useFinishExam();
  const [phase, setPhase] = useState<AutoLogoutPhase>("idle");

  // `mutate` is stable; the ref keeps the armed timer insulated from
  // re-renders without re-triggering the effect.
  const finishExamRef = useRef(finishExam);
  finishExamRef.current = finishExam;

  useEffect(() => {
    if (!enabled) {
      setPhase("idle");
      return;
    }
    setPhase("waiting");
    const id = setTimeout(() => {
      setPhase("signing-out");
      finishExamRef.current(attemptId);
    }, AUTO_LOGOUT_DELAY_MS);
    return () => clearTimeout(id);
  }, [enabled, attemptId]);

  useEffect(() => {
    if (isError && phase === "signing-out") setPhase("failed");
  }, [isError, phase]);

  const retry = useCallback(() => {
    setPhase("signing-out");
    finishExamRef.current(attemptId);
  }, [attemptId]);

  return { phase, retry, isSigningOut: isPending };
}
