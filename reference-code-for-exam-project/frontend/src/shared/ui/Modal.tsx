
import { useEffect, useLayoutEffect, useId, useState, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import { cn } from "../lib/cn";

const EXIT_ANIMATION_MS = 150;

function exitAnimationMs(): number {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : EXIT_ANIMATION_MS;
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  maxWidth?: string;
  dismissible?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  icon,
  description,
  children,
  footer,
  className,
  maxWidth = "max-w-md",
  dismissible = true,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [mounted, setMounted] = useState(open);
  const isClosing = mounted && !open;

  useLayoutEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (open) return;
    const timer = window.setTimeout(() => setMounted(false), exitAnimationMs());
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarGap = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarGap > 0) body.style.paddingRight = `${scrollbarGap}px`;
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !dismissible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissible, onClose]);

  if (!mounted) return null;

  const showClose = dismissible;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}>
      <button
        type="button"
        aria-label="Close"
        className={cn("modal-backdrop absolute inset-0 h-full w-full border-0 bg-transparent", isClosing && "modal-backdrop-exit")}
        onClick={dismissible ? onClose : undefined}
      />
      <div className={cn("modal-panel relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-3xl border border-border bg-white", maxWidth, isClosing && "modal-panel-exit", className)}>
        <div className="flex items-start gap-4 border-b border-border px-6 py-5">
          {icon ? <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">{icon}</span> : null}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-[16px] font-bold leading-tight tracking-tight text-navy-900">{title}</h2>
            {description ? <p id={descriptionId} className="mt-1 text-[13px] leading-relaxed text-text-muted">{description}</p> : null}
          </div>
          {showClose ? (
            <button type="button" onClick={onClose} aria-label="Close dialog" className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-white text-text-muted transition-colors hover:bg-accent-soft hover:text-navy-900">
              <X size={16} weight="bold" />
            </button>
          ) : null}
        </div>
        <div className="min-h-0 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? <div className="border-t border-border bg-bg px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
