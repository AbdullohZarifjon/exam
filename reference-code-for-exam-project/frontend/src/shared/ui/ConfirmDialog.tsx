import { cloneElement, isValidElement, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from "react";
import { Warning } from "@phosphor-icons/react";
import { Modal } from "./Modal";
import { Button } from "./Button";

/**
 * Destructive-action confirmation modal.
 *
 * The user must type the exact `confirmText` (defaulting to `title`) to enable
 * the destructive button. Prevents accidental deletes.
 *
 * Two ways to use it:
 *   1. Controlled: pass `open` and `onClose`, render it next to your own trigger.
 *   2. Self-contained: pass `trigger={...}` (a clickable element); the dialog
 *      manages its own open state. `onConfirm` is called when the user confirms.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  confirmLabel = "Delete forever",
  loading = false,
  children,
  trigger,
}: {
  open?: boolean;
  onClose?: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmText?: string;
  confirmLabel?: string;
  loading?: boolean;
  children?: ReactNode;
  trigger?: ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
}) {
  const expected = (confirmText ?? title).trim();
  const [typed, setTyped] = useState("");
  const matches = expected !== "" && typed.trim() === expected;
  const submitted = useRef(false);
  const hintId = useId();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const visible = isControlled ? open! : internalOpen;
  const close = () => {
    if (loading) return;
    if (!isControlled) setInternalOpen(false);
    else onClose?.();
  };

  // Reset confirmation when reopening or selecting another entity.
  useEffect(() => {
    setTyped("");
    submitted.current = false;
  }, [visible, expected]);

  // A failed request can be explicitly retried, but never auto-submitted.
  useEffect(() => {
    if (!loading) submitted.current = false;
  }, [loading]);

  const confirm = () => {
    if (!visible || !matches || loading || submitted.current) return;
    submitted.current = true;
    onConfirm();
  };

  const body = (
    <Modal
      open={visible}
      onClose={close}
      title={title}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={confirm} disabled={!matches} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900">
        <Warning size={16} weight="fill" className="mt-0.5 shrink-0" />
        <div className="leading-relaxed">{description}</div>
      </div>

      {children ? <div className="mt-4">{children}</div> : null}

      <div className="mt-5">
        <label className="block">
          <span className="block text-[13px] font-medium text-navy-800">
            Type <span className="font-mono text-navy-900">{expected}</span> to confirm
          </span>
          <input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={expected}
            disabled={loading}
            autoComplete="off"
            spellCheck={false}
            aria-describedby={hintId}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              if (!e.nativeEvent.isComposing && !e.repeat) confirm();
            }}
            className="mt-1.5 h-10 w-full rounded-xl border border-border bg-surface px-3 font-mono text-sm text-navy-900 outline-none focus:border-red-700/60 focus:ring-2 focus:ring-red-700/15"
          />
        </label>
        <p id={hintId} className="mt-2 text-xs text-text-muted" aria-live="polite">
          {loading
            ? "Deleting…"
            : matches
              ? `Text matched. Click ${confirmLabel} or press Enter to continue.`
              : "Enter the matching text above to enable confirmation. Typing alone will not delete anything."}
        </p>
      </div>
    </Modal>
  );

  if (trigger && isValidElement(trigger)) {
    // Clone the trigger so clicking it opens the dialog. We deliberately don't
    // stop propagation — callers decide whether to stop the event themselves.
    return (
      <>
        {cloneElement(trigger, {
          onClick: (e: React.MouseEvent) => {
            trigger.props.onClick?.(e);
            if (!e.defaultPrevented) setInternalOpen(true);
          },
        })}
        {body}
      </>
    );
  }
  return body;
}
