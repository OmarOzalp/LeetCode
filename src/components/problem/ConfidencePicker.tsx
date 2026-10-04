import clsx from "clsx";

export const CONFIDENCE_LEVELS = [
  { value: 1, label: "No idea" },
  { value: 2, label: "Needed solution" },
  { value: 3, label: "Needed hints" },
  { value: 4, label: "Small help" },
  { value: 5, label: "Independently" },
] as const;

export function ConfidencePicker({ value, onChange, compact }: { value?: number | null; onChange: (v: number) => void; compact?: boolean }) {
  return (
    <div className={clsx("grid gap-1", compact ? "grid-cols-5" : "grid-cols-5")} role="radiogroup" aria-label="Confidence">
      {CONFIDENCE_LEVELS.map((c) => {
        const active = value === c.value;
        return (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(c.value)}
            title={`${c.value} – ${c.label}`}
            className={clsx(
              "flex flex-col items-center gap-0.5 rounded-md border px-1 py-1.5 text-center transition-colors",
              active ? "border-accent bg-accent-soft text-fg" : "border-border text-muted hover:border-border-strong hover:text-fg",
            )}
          >
            <span className="text-[13px] font-semibold tabular-nums">{c.value}</span>
            <span className="text-[10px] leading-tight">{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}
