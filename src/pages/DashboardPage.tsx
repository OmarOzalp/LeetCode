import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAppStore } from "@/lib/store";
import { Page, PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { CategoryProgress } from "@/components/dashboard/CategoryProgress";
import { DifficultyCard, ProgressSummaryCard, TodayCard } from "@/components/dashboard/StatsOverview";
import { FilterBar, ProblemTable, statusCounts } from "@/components/dashboard/ProblemTable";
import { allPatterns, computeStats, continueTarget, DEFAULT_FILTERS, filterProblems, randomUnsolved, type ProblemFilters, type StatusFilter } from "@/lib/stats";
import { dailyPractice } from "@/lib/review";
import { toast } from "@/components/ui/Toast";

function toParams(f: ProblemFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (f.status !== "all") params.set("status", f.status);
  if (f.category !== "all") params.set("topic", f.category);
  if (f.difficulty !== "all") params.set("difficulty", f.difficulty);
  if (f.pattern !== "all") params.set("pattern", f.pattern);
  if (f.query) params.set("q", f.query);
  return params;
}

function readFilters(sp: URLSearchParams): ProblemFilters {
  return {
    status: (sp.get("status") as StatusFilter) ?? DEFAULT_FILTERS.status,
    category: sp.get("topic") ?? "all",
    difficulty: (sp.get("difficulty") as ProblemFilters["difficulty"]) ?? "all",
    pattern: sp.get("pattern") ?? "all",
    query: sp.get("q") ?? "",
  };
}

export default function DashboardPage() {
  const problems = useAppStore((s) => s.problems);
  const categories = useAppStore((s) => s.categories);
  const progress = useAppStore((s) => s.progress);
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  // Filters live in state (so rapid successive updates never read a stale
  // snapshot) and are mirrored to the URL so they survive reloads and links.
  const [filters, setFilterState] = useState<ProblemFilters>(() => readFilters(sp));
  const written = useRef(sp.toString());

  useEffect(() => {
    const qs = toParams(filters).toString();
    if (qs !== written.current) {
      written.current = qs;
      setSp(new URLSearchParams(qs), { replace: true });
    }
  }, [filters, setSp]);

  // External navigation (e.g. a link to /?topic=trees while already here).
  useEffect(() => {
    const qs = sp.toString();
    if (qs !== written.current) {
      written.current = qs;
      setFilterState(readFilters(sp));
    }
  }, [sp]);

  const setFilters = (patch: Partial<ProblemFilters>) => setFilterState((f) => ({ ...f, ...patch }));

  const stats = useMemo(() => computeStats(problems, categories, progress), [problems, categories, progress]);
  const filtered = useMemo(() => filterProblems(problems, progress, filters), [problems, progress, filters]);
  const counts = useMemo(() => statusCounts(problems, progress), [problems, progress]);
  const patterns = useMemo(() => allPatterns(problems), [problems]);
  const today = useMemo(() => dailyPractice(problems, progress), [problems, progress]);
  const cont = useMemo(() => continueTarget(problems, progress), [problems, progress]);

  const goRandom = () => {
    const p = randomUnsolved(problems, progress);
    if (p) navigate(`/problems/${p.slug}`);
    else toast.success("Every problem is solved!");
  };

  return (
    <Page wide>
      <PageHeader
        title="Blind 75"
        subtitle={`${problems.length} curated problems across ${categories.filter((c) => c.problems.length).length} topics. Solve them in Python, run tests, compare with the optimal approach.`}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_1fr_1.15fr]">
        <ProgressSummaryCard stats={stats} />
        <DifficultyCard stats={stats} />
        <TodayCard items={today} continueTo={cont} onRandom={goRandom} />
      </div>

      <div className="mt-4">
        <CategoryProgress stats={stats} active={filters.category} onSelect={(category) => setFilters({ category })} />
      </div>

      <Card className="mt-4">
        <div className="border-b border-border p-3">
          <FilterBar filters={filters} onChange={setFilters} counts={counts} patterns={patterns} />
        </div>
        <ProblemTable problems={filtered} progress={progress} onPattern={(pattern) => setFilters({ pattern })} activePattern={filters.pattern} />
        <div className="border-t border-border px-4 py-2 text-xs text-subtle">
          Showing {filtered.length} of {problems.length}
        </div>
      </Card>
    </Page>
  );
}
