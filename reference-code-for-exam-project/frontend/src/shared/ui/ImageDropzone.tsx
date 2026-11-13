import { useEffect, useRef, useState, type DragEvent } from "react";
import { CloudArrowUp, X, Image as ImageIcon, ArrowsClockwise } from "@phosphor-icons/react";
import { cn } from "../lib/cn";

/**
 * Friendly image dropzone.
 *
 *  - Click or drag-and-drop a file (PNG/JPG/WebP, up to `maxBytes`).
 *  - Paste from clipboard (⌘V / Ctrl+V while focused).
 *  - Shows an inline preview with filename + size + a remove button.
 *  - Optional `progress` (0–100) shows an uploading bar inside the preview.
 *  - Errors are surfaced inline, no native popups.
 */
export function ImageDropzone({
  value, // current preview URL (string) or null
  onChange, // (file | null) -> void
  onError, // (message) -> void
  progress, // optional 0–100
  accept = "image/png,image/jpeg,image/jpg,image/webp",
  maxBytes = 20 * 1024 * 1024,
  disabled = false,
}: {
  value: string | null;
  onChange: (file: File | null) => void;
  onError?: (msg: string) => void;
  progress?: number;
  accept?: string;
  maxBytes?: number;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [meta, setMeta] = useState<{ name: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep `meta` in sync with the chosen file.
  useEffect(() => {
    if (!value) {
      setMeta(null);
    }
  }, [value]);

  const pickFile = (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      const msg = "Only image files are supported.";
      setError(msg);
      onError?.(msg);
      return;
    }
    if (file.size > maxBytes) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      const maxMb = (maxBytes / (1024 * 1024)).toFixed(0);
      const msg = `That image is ${mb} MB — please keep it under ${maxMb} MB.`;
      setError(msg);
      onError?.(msg);
      return;
    }
    setError(null);
    setMeta({ name: file.name, size: file.size });
    onChange(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    pickFile(e.dataTransfer.files?.[0]);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Listen for paste events while the dropzone is focused.
  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
    if (file) {
      e.preventDefault();
      pickFile(file);
    }
  };

  const remove = () => {
    setError(null);
    setMeta(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const uploading = typeof progress === "number" && progress < 100;

  return (
    <div>
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-border bg-bg">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            aria-label="Replace image"
            className="block w-full cursor-pointer disabled:cursor-not-allowed"
          >
            <img src={value} alt="Preview" className="block max-h-72 w-full object-contain" />
          </button>
          {uploading ? (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10">
              <div
                className="h-full bg-accent transition-[width] duration-150"
                style={{ width: `${Math.max(0, Math.min(100, progress ?? 0))}%` }}
              />
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-2 border-t border-border bg-surface px-3 py-2">
            <div className="flex min-w-0 items-center gap-2 text-xs text-[#475A82]">
              <ImageIcon size={14} className="shrink-0 text-[#8A9BB8]" />
              <span className="truncate font-mono">{meta?.name ?? "image"}</span>
              {meta ? <span className="font-mono text-[#8A9BB8]">· {formatBytes(meta.size)}</span> : null}
              {uploading ? (
                <span className="inline-flex items-center gap-1 font-mono text-accent">
                  <ArrowsClockwise size={12} className="animate-spin" />
                  {progress}%
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
                className="inline-flex h-7 items-center gap-1 rounded-xl border border-border bg-surface px-2 text-xs font-medium text-navy-700 hover:bg-bg disabled:opacity-50"
              >
                <ArrowsClockwise size={12} weight="bold" />
                Replace
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={disabled}
                className="inline-flex h-7 items-center gap-1 rounded-xl border border-border bg-surface px-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                <X size={12} weight="bold" />
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onPaste={onPaste}
          className={cn(
            "relative flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-surface px-6 py-8 text-center transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
            isDragging
              ? "border-accent bg-accent-soft/60 text-accent"
              : "border-border text-text-muted hover:border-accent/40 hover:bg-bg",
            disabled && "pointer-events-none opacity-60",
          )}
        >
          <CloudArrowUp size={28} weight="duotone" className={cn(isDragging ? "text-accent" : "text-[#8A9BB8]")} />
          <div className="text-sm text-navy-700">
            <span className="font-medium">Click to upload</span> <span className="text-text-muted">or drag and drop</span>
          </div>
          <div className="font-mono text-[11px] uppercase tracking-wider text-[#8A9BB8]">
            PNG · JPG · WEBP &nbsp;·&nbsp; up to {formatBytes(maxBytes)}
          </div>
        </div>
      )}

      {/* Single hidden file input — always present so the Replace / dropzone
          buttons can trigger it via the ref regardless of preview state. */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => pickFile(e.target.files?.[0])}
        className="sr-only"
      />

      {error ? <p className="mt-1.5 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
