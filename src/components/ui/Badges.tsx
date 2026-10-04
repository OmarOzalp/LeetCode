import clsx from "clsx";
import { Check, Circle, CircleDot, RotateCcw } from "lucide-react";
import type { ProblemStatus } from "@shared/api";
import { categoryColor, categoryName, type Difficulty } from "@shared/categories";

export function DifficultyBadge({ difficulty, className }: { difficulty: Difficulty; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-px text-xs font-medium",
        difficulty === "Easy" && "bg-easy/12 text-easy",
        difficulty === "Medium" && "bg-medium/12 text-medium",
        difficulty === "Hard" && "bg-hard/12 text-hard",
        className,
      )}
    >
      {difficulty}
    </span>
  );
}

export function CategoryTag({ category, className, short }: { category: string; className?: string; short?: boolean }) {
  const name = categoryName(category);
  return (
    <span className={clsx("inline-flex items-center gap-1.5 text-xs text-muted whitespace-nowrap", className)}>
      <span className="size-1.5 shrink-0 rounded-full" style={{ background: categoryColor(category) }} />
      {short ? name.replace("Dynamic Programming", "DP").replace(" / Priority Queue", "") : name}
    </span>
  );
}

export function PatternTag({ children, onClick, active }: { children: string; onClick?: () => void; active?: boolean }) {
  const cls = clsx(
    "inline-flex items-center rounded-md border px-1.5 py-px text-[11px] whitespace-nowrap",
    active ? "border-accent/50 bg-accent-soft text-fg" : "border-border text-muted",
    onClick && "hover:border-border-strong hover:text-fg cursor-pointer",
  );
  return onClick ? (
    <button type="button" className={cls} onClick={onClick}>
      {children}
    </button>
  ) : (
    <span className={cls}>{children}</span>
  );
}

export const STATUS_LABELS: Record<ProblemStatus, string> = {
  not_started: "Not Started",
  attempted: "Attempted",
  solved: "Solved",
  review: "Review",
};

export function StatusIcon({ status, className }: { status: ProblemStatus; className?: string }) {
  const label = STATUS_LABELS[status];
  if (status === "solved")
    return (
      <span title={label} className={clsx("inline-flex size-[18px] items-center justify-center rounded-full bg-success/15 text-success", className)}>
        <Check className="size-3" strokeWidth={3} />
        <span className="sr-only">{label}</span>
      </span>
    );
  if (status === "attempted")
    return (
      <span title={label} className={clsx("inline-flex size-[18px] items-center justify-center text-warning", className)}>
        <CircleDot className="size-4" />
        <span className="sr-only">{label}</span>
      </span>
    );
  if (status === "review")
    return (
      <span title={label} className={clsx("inline-flex size-[18px] items-center justify-center rounded-full bg-review/15 text-review", className)}>
        <RotateCcw className="size-3" strokeWidth={2.5} />
        <span className="sr-only">{label}</span>
      </span>
    );
  return (
    <span title={label} className={clsx("inline-flex size-[18px] items-center justify-center text-border-strong", className)}>
      <Circle className="size-4" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function ComplexityPill({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" | "neutral" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs",
        tone === "good" && "border-success/30 bg-success/10",
        tone === "bad" && "border-danger/30 bg-danger/10",
        (!tone || tone === "neutral") && "border-border bg-surface-2",
      )}
    >
      <span className="text-muted">{label}</span>
      <code className="font-mono text-[12px] text-fg">{value}</code>
    </span>
  );
}
