import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import clsx from "clsx";
import { ArrowDown, ArrowUp, Search, X } from "lucide-react";
import type { ProblemProgress, ProblemSummary } from "@shared/api";
import { CATEGORIES } from "@shared/categories";
import { CategoryTag, DifficultyBadge, PatternTag, StatusIcon } from "@/components/ui/Badges";
import { Segmented } from "@/components/ui/Tabs";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/Card";
import { relativeTime } from "@/lib/format";
import { matchesStatus, statusOf, type ProblemFilters, type StatusFilter } from "@/lib/stats";

type SortKey = "order" | "title" | "difficulty" | "category" | "last" | "attempts";
const DIFF_ORDER = { Easy: 0, Medium: 1, Hard: 2 } as const;

export function FilterBar({
  filters,
  onChange,
  counts,
  patterns,
}: {
  filters: ProblemFilters;
  onChange: (f: Partial<ProblemFilters>) => void;
  counts: Record<StatusFilter, number>;
  patterns: string[];
}) {
  const anyFilter = filters.category !== "all" || filters.difficulty !== "all" || filters.pattern !== "all" || filters.query || filters.status !== "all";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented<StatusFilter>
        value={filters.status}
        onChange={(status) => onChange({ status })}
        items={[
          { id: "all", label: "All", count: counts.all },
          { id: "unsolved", label: "Unsolved", count: counts.unsolved },
          { id: "attempted", label: "Attempted", count: counts.attempted },
          { id: "solved", label: "Solved", count: counts.solved },
          { id: "review", label: "Review", count: counts.review },
        ]}
      />
      <Select
        aria-label="Filter by topic"
        value={filters.category}
        onChange={(e) => onChange({ category: e.target.value })}
        options={[{ value: "all", label: "All topics" }, ...CATEGORIES.map((c) => ({ value: c.id, label: c.name }))]}
        className="w-[170px]"
      />
      <Select
        aria-label="Filter by difficulty"
        value={filters.difficulty}
        onChange={(e) => onChange({ difficulty: e.target.value as ProblemFilters["difficulty"] })}
        options={[
          { value: "all", label: "All difficulties" },
          { value: "Easy", label: "Easy" },
          { value: "Medium", label: "Medium" },
          { value: "Hard", label: "Hard" },
        ]}
        className="w-[140px]"
      />
      <Select
        aria-label="Filter by pattern"
        value={filters.pattern}
        onChange={(e) => onChange({ pattern: e.target.value })}
        options={[{ value: "all", label: "All patterns" }, ...patterns.map((p) => ({ value: p, label: p }))]}
        className="w-[150px]"
      />
      <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-[260px]">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-subtle" />
        <input
          type="search"
          value={filters.query}
          onChange={(e) => onChange({ query: e.target.value })}
          placeholder="Search problems…"
          aria-label="Search problems"
          className="h-8 w-full rounded-lg border border-border bg-surface pr-2 pl-8 text-[13px] placeholder:text-subtle hover:border-border-strong focus:border-accent focus:outline-none"
        />
      </div>
      {anyFilter && (
        <button
          type="button"
          onClick={() => onChange({ status: "all", category: "all", difficulty: "all", pattern: "all", query: "" })}
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-muted hover:bg-surface-2 hover:text-fg"
        >
          <X className="size-3.5" /> Reset
        </button>
      )}
    </div>
  );
}

export function statusCounts(problems: ProblemSummary[], progress: Record<string, ProblemProgress>): Record<StatusFilter, number> {
  const out: Record<StatusFilter, number> = { all: 0, unsolved: 0, attempted: 0, solved: 0, review: 0 };
  for (const p of problems) {
    const s = statusOf(progress, p.slug);
    for (const f of Object.keys(out) as StatusFilter[]) if (matchesStatus(s, f)) out[f]++;
  }
  return out;
}

export function ProblemTable({
  problems,
  progress,
  onPattern,
  activePattern,
}: {
  problems: ProblemSummary[];
  progress: Record<string, ProblemProgress>;
  onPattern: (p: string) => void;
  activePattern: string;
}) {
  const navigate = useNavigate();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "order", dir: 1 });

  const rows = useMemo(() => {
    const val = (p: ProblemSummary): string | number => {
      const pr = progress[p.slug];
      switch (sort.key) {
        case "order":
          return p.order;
        case "title":
          return p.title.toLowerCase();
        case "difficulty":
          return DIFF_ORDER[p.difficulty] * 1000 + p.order;
        case "category":
          return p.order;
        case "last":
          return pr?.lastAttemptAt ?? "";
        case "attempts":
          return pr?.attempts ?? 0;
      }
    };
    return [...problems].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (va < vb) return -sort.dir;
      if (va > vb) return sort.dir;
      return a.order - b.order;
    });
  }, [problems, progress, sort]);

  const header = (key: SortKey, label: string, className?: string) => (
    <th className={clsx("px-3 py-2 text-left font-medium", className)}>
      <button
        type="button"
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "last" || key === "attempts" ? -1 : 1 }))}
        className={clsx("inline-flex items-center gap-1 hover:text-fg", sort.key === key && "text-fg")}
      >
        {label}
        {sort.key === key && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </th>
  );

  if (!rows.length) {
    return <EmptyState title="No problems match these filters" icon={<Search className="size-7" />}>Try clearing the search or picking another topic.</EmptyState>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-[13px]">
        <thead className="text-xs text-muted">
          <tr className="border-b border-border">
            <th className="w-12 px-3 py-2 text-left font-medium">Status</th>
            {header("order", "#", "w-10")}
            {header("title", "Problem")}
            {header("difficulty", "Difficulty", "w-28")}
            {header("category", "Topic", "w-48")}
            {header("last", "Last attempt", "w-28")}
            {header("attempts", "Attempts", "w-24 text-right")}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const pr = progress[p.slug];
            return (
              <tr
                key={p.slug}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("a,button")) return;
                  navigate(`/problems/${p.slug}`);
                }}
                className="group cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-surface-2/70"
              >
                <td className="px-3 py-2.5">
                  <StatusIcon status={pr?.status ?? "not_started"} />
                </td>
                <td className="px-3 py-2.5 text-xs text-subtle tabular-nums">{p.order + 1}</td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <Link to={`/problems/${p.slug}`} className="font-medium text-fg group-hover:text-accent">
                      {p.title}
                    </Link>
                    <span className="hidden gap-1 xl:inline-flex">
                      {p.patterns.slice(0, 2).map((t) => (
                        <PatternTag key={t} active={activePattern === t} onClick={() => onPattern(activePattern === t ? "all" : t)}>
                          {t}
                        </PatternTag>
                      ))}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <DifficultyBadge difficulty={p.difficulty} />
                </td>
                <td className="px-3 py-2.5">
                  <CategoryTag category={p.category} short />
                </td>
                <td className="px-3 py-2.5 text-xs text-muted" title={pr?.lastAttemptAt ? new Date(pr.lastAttemptAt).toLocaleString() : undefined}>
                  {relativeTime(pr?.lastAttemptAt)}
                </td>
                <td className="px-3 py-2.5 text-right text-xs text-muted tabular-nums">
                  {pr?.attempts ? (
                    <span>
                      {pr.attempts}
                      {pr.failedAttempts > 0 && <span className="text-subtle"> ({pr.failedAttempts} failed)</span>}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
