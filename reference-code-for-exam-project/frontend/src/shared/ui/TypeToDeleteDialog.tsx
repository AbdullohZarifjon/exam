import { type ReactNode } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

/** Name-gated deletion with explicit button or Enter confirmation. */
export function TypeToDeleteDialog({
  open,
  onClose,
  onConfirm,
  title,
  entityName,
  description,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  entityName: string;
  description: ReactNode;
  loading?: boolean;
}) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      confirmText={entityName}
      confirmLabel="Delete exam"
      description={description}
      loading={loading}
    />
  );
}
