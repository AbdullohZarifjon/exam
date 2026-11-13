import { Warning } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

import { DelayedConfirmDialog } from "../../../shared/ui";

/** How long "submit anyway" stays locked when questions are left blank, in ms. */
export const SUBMIT_UNLOCK_DELAY_MS = 2_000;

/**
 * Final submit confirmation for the exam runner.
 *
 * When questions were left blank, the confirm action is locked for
 * {@link SUBMIT_UNLOCK_DELAY_MS} behind a visible countdown — Cancel stays
 * available the whole time — and the copy warns how many questions are
 * unanswered. With everything answered it degrades to an immediate confirm.
 */
export function SubmitExamDialog({
  open,
  onClose,
  onConfirm,
  unansweredCount,
  totalQuestions,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Number of served questions the student has not answered. */
  unansweredCount: number;
  totalQuestions: number;
  /** True while the final submission request is in flight. */
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const hasUnanswered = unansweredCount > 0;

  return (
    <DelayedConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      loading={loading}
      delayMs={hasUnanswered ? SUBMIT_UNLOCK_DELAY_MS : 0}
      title={t("exam.runner.submitDialog.title")}
      description={
        hasUnanswered ? (
          <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            <Warning size={16} weight="fill" className="mt-0.5 shrink-0" />
            <div className="leading-relaxed">
              <p className="font-medium">
                {t("exam.runner.submitDialog.unanswered", { count: unansweredCount, total: totalQuestions })}
              </p>
              <p className="mt-1 text-amber-800">{t("exam.runner.submitDialog.unansweredNote")}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-[#475A82]">
            {t("exam.runner.submitDialog.allAnswered", { total: totalQuestions })}
          </p>
        )
      }
      confirmLabel={hasUnanswered ? t("exam.runner.submitDialog.submitAnyway") : t("exam.runner.submitDialog.submit")}
      cancelLabel={t("exam.runner.submitDialog.cancel")}
      lockedHint={t("exam.runner.submitDialog.lockedHint")}
    />
  );
}
