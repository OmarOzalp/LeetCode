import { Link, useNavigate } from "react-router";
import { ArrowRight, CalendarCheck, Play, Shuffle } from "lucide-react";
import type { OverallStats } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { DifficultyBadge } from "@/components/ui/Badges";
import type { ProblemSummary } from "@shared/api";

export function ProgressSummaryCard({ stats }: { stats: OverallStats }) {
  return (
    <Card className="flex flex-col justify-between p-5">
      <div>
        <div className="text-xs font-medium text-muted">Blind 75 Progress</div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-4xl font-semibold tracking-tight tabular-nums">{stats.solved}</span>
          <span className="text-lg text-subtle tabular-nums">/ {stats.total}</span>
          <span className="ml-1 text-[13px] text-muted">completed</span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {[
          { label: "Solved", value: stats.solved, cls: "text-success" },
          { label: "Attempted", value: stats.attempted, cls: "text-warning" },
          { label: "Review", value: stats.review, cls: "text-review" },
          { label: "Not started", value: stats.total - stats.solved - stats.attempted - stats.review, cls: "text-muted" },
        ].map((x) => (
          <div key={x.label} className="rounded-lg bg-surface-2/60 px-2.5 py-2">
            <div className={`text-base font-semibold tabular-nums ${x.cls}`}>{x.value}</div>
            <div className="text-[11px] text-subtle">{x.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <ProgressBar value={stats.solved} max={stats.total} height={8} />
        <div className="mt-2 flex justify-between text-xs text-muted tabular-nums">
          <span>{stats.percent}% complete</span>
          <span>
            {stats.remaining} remaining{stats.attempted ? ` · ${stats.attempted} in progress` : ""}
            {stats.review ? ` · ${stats.review} to review` : ""}
          </span>
        </div>
      </div>
    </Card>
  );
}

const DIFF_COLORS = { Easy: "var(--easy)", Medium: "var(--medium)", Hard: "var(--hard)" } as const;

export function DifficultyCard({ stats }: { stats: OverallStats }) {
  return (
    <Card className="p-5">
      <div className="mb-3 text-xs font-medium text-muted">By difficulty</div>
      <div className="flex flex-col gap-3">
        {(["Easy", "Medium", "Hard"] as const).map((d) => {
          const t = stats.byDifficulty[d];
          return (
            <div key={d}>
              <div className="mb-1 flex items-center justify-between text-[13px]">
                <DifficultyBadge difficulty={d} />
                <span className="text-muted tabular-nums">
                  <span className="text-fg">{t.solved}</span> / {t.total}
                </span>
              </div>
              <ProgressBar value={t.solved} max={t.total} color={DIFF_COLORS[d]} height={5} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function TodayCard({
  items,
  continueTo,
  onRandom,
}: {
  items: Array<{ problem: ProblemSummary; reason: string }>;
  continueTo: ProblemSummary | null;
  onRandom: () => void;
}) {
  const navigate = useNavigate();
  return (
    <Card className="flex flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-muted">
          <CalendarCheck className="size-3.5" /> Today's practice
        </div>
        <Link to="/review" className="text-xs text-muted hover:text-fg">
          Review →
        </Link>
      </div>
      <ol className="flex flex-col gap-1">
        {items.map(({ problem, reason }, i) => (
          <li key={problem.slug}>
            <Link
              to={`/problems/${problem.slug}`}
              className="group flex items-center gap-2.5 rounded-md px-1.5 py-1 hover:bg-surface-2"
            >
              <span className="w-3 text-xs text-subtle tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{problem.title}</span>
                <span className="block truncate text-[11px] text-subtle">{reason}</span>
              </span>
              <DifficultyBadge difficulty={problem.difficulty} />
            </Link>
          </li>
        ))}
        {items.length === 0 && <li className="text-xs text-muted">Everything is solved. Impressive.</li>}
      </ol>
      <div className="mt-auto flex gap-2 pt-4">
        {continueTo && (
          <Button size="sm" variant="primary" icon={<Play className="size-3.5" />} onClick={() => navigate(`/problems/${continueTo.slug}`)} title={continueTo.title}>
            Continue
          </Button>
        )}
        <Button size="sm" icon={<Shuffle className="size-3.5" />} onClick={onRandom}>
          Random unsolved
        </Button>
        {!continueTo && items[0] && (
          <Button size="sm" variant="ghost" onClick={() => navigate(`/problems/${items[0].problem.slug}`)}>
            Start <ArrowRight className="size-3.5" />
          </Button>
        )}
      </div>
    </Card>
  );
}
