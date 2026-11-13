import { useEffect, useMemo, useRef, useState } from "react";
import { CaretDown, MagnifyingGlass, Warning, X } from "@phosphor-icons/react";
import { cn } from "../../../shared/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeTone?: "amber" | "emerald" | "slate";
}

const tone: Record<string, string> = {
  amber: "bg-amber-100 text-amber-800",
  emerald: "bg-emerald-100 text-emerald-800",
  slate: "bg-slate-100 text-slate-600",
};

/**
 * Custom searchable dropdown (input + listbox).
 * Type to filter, Arrow keys to move, Enter to select, Esc to close.
 */
export function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Search…",
  hint,
  emptyText = "No matches",
}: {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  emptyText?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;
  const selectedLabel = selected ? `${selected.label}${selected.sublabel ? ` · ${selected.sublabel}` : ""}` : "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.sublabel ?? "").toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => setHighlight(filtered.length ? 0 : -1), [filtered.length, query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (v: string) => {
    onChange(v);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const displayValue = open && query ? query : selectedLabel;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="block text-[13px] font-semibold tracking-tight text-navy-800">{label}</span>
      <div ref={rootRef} className="relative">
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border bg-white pl-3 pr-2 transition-shadow",
            open ? "border-navy-600 ring-2 ring-accent/20" : "border-border-strong",
          )}
        >
          <MagnifyingGlass size={15} weight="bold" className="shrink-0 text-[#8A9BB8]" />
          <input
            ref={inputRef}
            value={displayValue}
            placeholder={!selectedLabel && !query ? placeholder : ""}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              // Typing a new search clears the previous selection once it diverges.
              if (value && e.target.value !== selectedLabel) onChange("");
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
              else if (e.key === "Enter" && open && highlight >= 0 && filtered[highlight]) { e.preventDefault(); pick(filtered[highlight].value); }
              else if (e.key === "Escape") { setOpen(false); setQuery(""); }
            }}
            role="combobox"
            aria-expanded={open}
            aria-controls="searchable-listbox"
            aria-activedescendant={highlight >= 0 ? `opt-${highlight}` : undefined}
            className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#8A9BB8]"
          />
          {value && !open ? (
            <button type="button" aria-label="Clear selection" onClick={() => { onChange(""); setQuery(""); inputRef.current?.focus(); }} className="cursor-pointer rounded-full p-1 text-[#8A9BB8] hover:text-navy-800">
              <X size={14} weight="bold" />
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Toggle options"
            onClick={() => { setOpen((o) => !o); inputRef.current?.focus(); }}
            className="cursor-pointer rounded-lg p-1.5 text-navy-700 transition-transform hover:bg-accent-soft/60"
          >
            <span className={cn("block transition-transform", open && "rotate-180")}><CaretDown size={15} weight="bold" /></span>
          </button>
        </div>

        {open ? (
          <ul id="searchable-listbox" role="listbox" className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-auto rounded-2xl border border-border bg-white p-1.5 shadow-xl shadow-navy-900/10">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-text-muted">{emptyText}</li>
            ) : (
              filtered.map((o, i) => {
                const isSelected = o.value === value;
                return (
                  <li key={o.value}>
                    <button
                      id={`opt-${i}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(o.value)}
                      onMouseEnter={() => setHighlight(i)}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left",
                        i === highlight ? "bg-accent-soft/70" : "bg-transparent",
                      )}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-900 text-[11px] font-bold text-white">
                        {o.label.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-navy-900">{o.label}</span>
                        {o.sublabel ? <span className="block truncate font-mono text-[11px] text-text-muted">{o.sublabel}</span> : null}
                      </span>
                      {o.badge ? (
                        <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", tone[o.badgeTone ?? "slate"])}>
                          {o.badgeTone === "amber" ? <Warning size={11} weight="bold" /> : null}
                          {o.badge}
                        </span>
                      ) : null}
                      {isSelected ? <span className="shrink-0 text-xs font-bold text-navy-600">✓</span> : null}
                    </button>
                  </li>
                );
              })
            )}
            {filtered.length > 0 ? (
              <li className="px-3 py-2 text-center text-[10px] leading-4 text-[#8A9BB8]">↑↓ navigate · Enter select · Esc close</li>
            ) : null}
          </ul>
        ) : null}
      </div>
      {hint ? <p className="text-xs text-text-muted">{hint}</p> : null}
    </div>
  );
}
