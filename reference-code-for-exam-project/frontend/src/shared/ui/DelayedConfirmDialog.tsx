import { useEffect, useState, type ReactNode } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

/** Radius of the inline countdown ring, in SVG user units. */
const RING_RADIUS = 9;
/** Full circumference of the countdown ring — used as its dash length. */
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Confirmation dialog whose confirm action unlocks after `delayMs`.
 *
 * While locked only Cancel is actionable and the confirm button renders an
 * inline countdown ring so the wait is visible. With `delayMs: 0` the dialog
 * behaves as a plain confirm and the button is enabled immediately.
 *
 * Dismissal is delegated to `onClose` in every case (backdrop, Escape, and
 * the header X) so callers can block closing while a request is in flight.
 */
export function DelayedConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  delayMs = 0,
  loading = false,
  lockedHint,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  /** How long the confirm button stays locked after opening, in milliseconds. */
  delayMs?: number;
  loading?: boolean;
  /** Shown while the confirm button is locked — also announced to screen readers. */
  lockedHint?: string;
}) {
  const [isLocked, setIsLocked] = useState(delayMs > 0);
  const [isRingRunning, setIsRingRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(() => Math.ceil(delayMs / 1000));

  useEffect(() => {
    // No delay configured (or dialog closed): confirm stays immediately available.
    if (!open || delayMs <= 0) {
      setIsLocked(false);
      setIsRingRunning(false);
      return;
    }

    setIsLocked(true);
    setIsRingRunning(false);
    setSecondsLeft(Math.ceil(delayMs / 1000));

    // Start the ring one frame after mount so its CSS transition animates
    // from a full circle down to empty across the whole delay.
    const ringStart = requestAnimationFrame(() => setIsRingRunning(true));

    const deadline = Date.now() + delayMs;
    const ticker = window.setInterval(() => {
      setSecondsLeft(Math.ceil(Math.max(0, deadline - Date.now()) / 1000));
    }, 100);
    const unlock = window.setTimeout(() => {
      setIsLocked(false);
      setIsRingRunning(false);
    }, delayMs);

    return () => {
      cancelAnimationFrame(ringStart);
      window.clearInterval(ticker);
      window.clearTimeout(unlock);
    };
  }, [open, delayMs]);

  const confirm = () => {
    if (isLocked || loading) return;
    onConfirm();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex items-center justify-end gap-2">
          {/* Safe action first: autofocus lands here while confirm is locked. */}
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading} autoFocus>
            {cancelLabel}
          </Button>
          <Button type="button" variant="primary" onClick={confirm} disabled={isLocked} loading={loading}>
            {isLocked && !loading ? (
              <CountdownRing running={isRingRunning} secondsLeft={secondsLeft} durationMs={delayMs} />
            ) : null}
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {description}

      {isLocked && lockedHint ? (
        <p aria-live="polite" className="mt-3 text-xs text-text-muted">
          {lockedHint}
        </p>
      ) : null}
    </Modal>
  );
}

/** Small ring that drains over `durationMs`, showing the remaining seconds inside. */
function CountdownRing({
  running,
  secondsLeft,
  durationMs,
}: {
  running: boolean;
  secondsLeft: number;
  durationMs: number;
}) {
  return (
    <span aria-hidden="true" className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
      <svg viewBox="0 0 20 20" className="h-5 w-5 -rotate-90">
        <circle cx="10" cy="10" r={RING_RADIUS} strokeWidth="2.5" className="fill-none stroke-current opacity-25" />
        <circle
          cx="10"
          cy="10"
          r={RING_RADIUS}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={running ? RING_CIRCUMFERENCE : 0}
          style={{ transition: `stroke-dashoffset ${durationMs}ms linear` }}
          className="fill-none stroke-current"
        />
      </svg>
      <span className="absolute text-[9px] font-semibold leading-none tabular-nums">{secondsLeft}</span>
    </span>
  );
}
