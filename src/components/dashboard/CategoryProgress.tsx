import clsx from "clsx";
import type { OverallStats } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { categoryColor } from "@shared/categories";

export function CategoryProgress({
  stats,
  active,
  onSelect,
}: {
  stats: OverallStats;
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="text-xs font-medium text-muted">Progress by topic</div>
        {active !== "all" && (
          <button className="text-xs text-muted hover:text-fg" onClick={() => onSelect("all")}>
            Clear topic filter
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
        {stats.byCategory.map((c) => {
          const pct = c.total ? (c.solved / c.total) * 100 : 0;
          const isActive = active === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(isActive ? "all" : c.id)}
              className={clsx(
                "group flex flex-col gap-1 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-surface-2",
                isActive && "bg-surface-2 ring-1 ring-border-strong",
              )}
              aria-pressed={isActive}
              title={`Filter by ${c.name}`}
            >
              <div className="flex items-center justify-between gap-2 text-[13px]">
                <span className="truncate">{c.name}</span>
                <span className="shrink-0 text-xs text-muted tabular-nums">
                  {c.solved} / {c.total}
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-surface-3">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: categoryColor(c.id) }} />
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
