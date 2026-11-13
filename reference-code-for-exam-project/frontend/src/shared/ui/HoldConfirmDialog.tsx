import { useEffect, useRef, useState, type ReactNode } from "react";
import { Warning } from "@phosphor-icons/react";
import { Modal } from "./Modal";
import { Button } from "./Button";

/**
 * Destructive-action confirmation modal with a press-and-hold button.
 *
 * The confirm button only fires after `holdMs` of continuous press
 * (mouse or keyboard). The button fills left-to-right as the hold
 * progresses; releasing early (pointer up / cancel) aborts and snaps
 * the fill back to empty. Prevents accidental deletes while keeping
 * the interaction to a single gesture.
 */
export function HoldConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  holdLabel = "Hold to delete",
  holdingLabel = "Keep holding…",
  cancelLabel = "Cancel",
  holdMs = 2000,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  holdLabel?: string;
  holdingLabel?: string;
  cancelLabel?: string;
  /** How long the button must be held, in milliseconds. */
  holdMs?: number;
  loading?: boolean;
}) {
  const [progress, setProgress] = useState(0);
  const holdingRef = useRef(false);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  const firedRef = useRef(false);

  const stop = () => {
    holdingRef.current = false;
    cancelAnimationFrame(rafRef.current);
    setProgress(0);
  };

  // Reset whenever the dialog closes or a new target opens.
  useEffect(() => {
    stop();
    firedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const start = (e: React.PointerEvent | React.KeyboardEvent) => {
    if (loading || firedRef.current) return;
    if ("key" in e && e.key !== " " && e.key !== "Enter") return;
    if ("key" in e && e.repeat) return;
    e.preventDefault();
    holdingRef.current = true;
    startRef.current = performance.now();
    const tick = () => {
      if (!holdingRef.current) return;
      const p = Math.min(1, (performance.now() - startRef.current) / holdMs);
      setProgress(p);
      if (p >= 1) {
        holdingRef.current = false;
        firedRef.current = true;
        onConfirm();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const holding = progress > 0;

  return (
    <Modal
      open={open}
      onClose={loading ? () => undefined : onClose}
      title={title}
      icon={<Warning size={20} weight="fill" className="text-red-600" />}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading || holding} autoFocus>
            {cancelLabel}
          </Button>
          <button
            type="button"
            aria-label={holdLabel}
            disabled={loading}
            onPointerDown={start}
            onPointerUp={stop}
            onPointerLeave={stop}
            onKeyDown={start}
            onKeyUp={stop}
            className="relative h-10 min-w-36 select-none overflow-hidden rounded-xl bg-red-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span
              className="absolute inset-y-0 left-0 bg-red-950/60"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
            <span className="relative">
              {loading ? "Deleting…" : holding ? `${holdingLabel} ${Math.ceil((holdMs * (1 - progress)) / 1000)}s` : holdLabel}
            </span>
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-relaxed text-red-900">
        <Warning size={16} weight="fill" className="mt-0.5 shrink-0" />
        <div>{description}</div>
      </div>
      <p className="mt-3 text-xs leading-5 text-text-muted">
        Press and hold the red button for {Math.round(holdMs / 1000)} seconds to confirm. Release to cancel.
      </p>
    </Modal>
  );
}
