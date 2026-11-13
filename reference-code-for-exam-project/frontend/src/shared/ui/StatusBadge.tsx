
import { cn } from "../lib/cn";

/**
 * Status label — typographic, not a pill. Navy tones for the new system.
 */

type ExamStatus = "draft" | "published" | "archived";
type AttemptStatus = "in-progress" | "submitted" | "expired";

const examTone: Record<ExamStatus, string> = {
  draft: "text-text-muted",
  published: "text-accent",
  archived: "text-amber-700",
};

const examRule: Record<ExamStatus, string> = {
  draft: "bg-[#CBD6EF]",
  published: "bg-accent",
  archived: "bg-amber-600",
};

const attemptTone: Record<AttemptStatus, string> = {
  "in-progress": "text-sky-700",
  submitted: "text-accent",
  expired: "text-red-700",
};

const attemptRule: Record<AttemptStatus, string> = {
  "in-progress": "bg-sky-600",
  submitted: "bg-accent",
  expired: "bg-red-700",
};

function isAttemptStatus(s: string): s is AttemptStatus {
  return s === "in-progress" || s === "submitted" || s === "expired";
}

function isExamStatus(s: string): s is ExamStatus {
  return s === "draft" || s === "published" || s === "archived";
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  let toneClass = "text-text-muted";
  let ruleClass = "bg-[#8A9BB8]";
  let label = status;

  if (isExamStatus(status)) {
    toneClass = examTone[status];
    ruleClass = examRule[status];
  } else if (isAttemptStatus(status)) {
    toneClass = attemptTone[status];
    ruleClass = attemptRule[status];
    label = status.replace("-", " ");
  }

  return (
    <span className={cn("inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em]", toneClass, className)}>
      <span aria-hidden className={cn("inline-block h-px w-3", ruleClass)} />
      {label}
    </span>
  );
}
