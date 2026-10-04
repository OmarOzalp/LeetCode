import { useMemo } from "react";
import { Link } from "react-router";
import { AlarmClock, CalendarCheck, Eye, Flame, Gauge, RotateCcw, TrendingDown, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useAppStore } from "@/lib/store";
import { Page, PageHeader } from "@/components/layout/AppShell";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { CategoryTag, DifficultyBadge } from "@/components/ui/Badges";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { categoryStrengths, dailyPractice, reviewSections, weakestAreas, type ReviewItem } from "@/lib/review";
import { daysSince, relativeTime } from "@/lib/format";
import { categoryColor } from "@shared/categories";

export default function ReviewPage() {
  const problems = useAppStore((s) => s.problems);
  const categories = useAppStore((s) => s.categories);
  const progress = useAppStore((s) => s.progress);

  const today = useMemo(() => dailyPractice(problems, progress), [problems, progress]);
  const sections = useMemo(() => reviewSections(problems, progress), [problems, progress]);
  const weak = useMemo(() => weakestAreas(categories, progress), [categories, progress]);
  const untouched = useMemo(() => categoryStrengths(categories, progress).filter((c) => c.attempted === 0), [categories, progress]);
  const anyActivity = Object.values(progress).some((p) => p.attempts > 0 || p.status !== "not_started");

  return (
    <Page wide>
      <PageHeader title="Review" subtitle="Problems worth revisiting, based on failed runs, low confidence, revealed solutions and time since you solved them." />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader title="Today's review" icon={<CalendarCheck className="size-4" />} subtitle="A small daily set: mostly problems to revisit, plus one new one. Changes each day." />
          <ol className="flex flex-col gap-1 p-3">
            {today.map(({ problem, reason }, i) => (
              <li key={problem.slug}>
                <Link to={`/problems/${problem.slug}`} className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-surface-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium">{problem.title}</span>
                    <span className="block truncate text-xs text-muted">{reason}</span>
                  </span>
                  <CategoryTag category={problem.category} short className="hidden sm:inline-flex" />
                  <DifficultyBadge difficulty={problem.difficulty} />
                </Link>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <CardHeader title="Weakest areas" icon={<TrendingDown className="size-4" />} subtitle="Topics you've started, ranked by coverage, confidence, failed runs and revealed solutions." />
          <div className="p-4 pt-3">
            {weak.length === 0 ? (
              <p className="text-[13px] text-muted">Attempt a few problems and your weakest topics will show up here.</p>
            ) : (
              <ol className="flex flex-col gap-3">
                {weak.slice(0, 5).map((w, i) => (
                  <li key={w.category.id} className="flex items-center gap-3">
                    <span className="w-4 text-xs text-subtle tabular-nums">{i + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2 text-[13px]">
                        <Link to={`/?topic=${w.category.id}`} className="truncate font-medium hover:text-accent">
                          {w.category.name}
                        </Link>
                        <span className="shrink-0 text-xs text-muted tabular-nums">
                          {w.solved}/{w.total} solved
                          {w.avgConfidence !== null && ` · conf ${w.avgConfidence.toFixed(1)}`}
                          {w.failRate > 0 && ` · ${Math.round(w.failRate * 100)}% runs failed`}
                        </span>
                      </div>
                      <ProgressBar value={w.solved} max={w.total} height={4} color={categoryColor(w.category.id)} className="mt-1" />
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {untouched.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <div className="mb-1.5 text-xs text-muted">Not started yet</div>
                <div className="flex flex-wrap gap-1.5">
                  {untouched.map((c) => (
                    <Link key={c.category.id} to={`/?topic=${c.category.id}`} className="rounded-md border border-border px-2 py-0.5 text-xs text-muted hover:border-border-strong hover:text-fg">
                      {c.category.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {!anyActivity ? (
        <Card className="mt-4">
          <EmptyState icon={<RotateCcw className="size-7" />} title="Nothing to review yet">
            As you run tests, use hints, reveal solutions and rate your confidence, this page will surface the problems that need another pass.
          </EmptyState>
        </Card>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ReviewList title="Needs review" icon={<RotateCcw className="size-4" />} items={sections.needsReview} empty="Mark a problem as “Review” to queue it here." meta={(x) => x.reasons.slice(1, 2).join("") || "Marked for review"} />
          <ReviewList
            title="Longest time since solved"
            icon={<AlarmClock className="size-4" />}
            items={sections.longestSinceSolved}
            empty="Solved problems will appear here as they age."
            meta={(x) => `Solved ${relativeTime(x.progress.solvedAt)}`}
          />
          <ReviewList
            title="Most failed attempts"
            icon={<Flame className="size-4" />}
            items={sections.mostFailed}
            empty="No failed runs yet."
            meta={(x) => `${x.progress.failedAttempts} failed of ${x.progress.attempts} runs`}
          />
          <ReviewList
            title="Lowest confidence"
            icon={<Gauge className="size-4" />}
            items={sections.lowestConfidence}
            empty="Rate your confidence after solving to see this list."
            meta={(x) => `Confidence ${x.progress.confidence}/5`}
          />
          <ReviewList
            title="Optimal solution revealed"
            icon={<Eye className="size-4" />}
            items={sections.solutionRevealed}
            empty="You haven't revealed any solutions."
            meta={(x) => `Revealed ${relativeTime(x.progress.solutionRevealedAt)}${x.progress.everPassed ? "" : " · not passed yet"}`}
          />
          <ReviewList
            title="Recently failed"
            icon={<XCircle className="size-4" />}
            items={sections.recentlyFailed}
            empty="Your latest runs all passed."
            meta={(x) => `${x.progress.lastResult!.passed}/${x.progress.lastResult!.total} passed · ${relativeTime(x.progress.lastAttemptAt)}`}
          />
        </div>
      )}
    </Page>
  );
}

function ReviewList({ title, icon, items, empty, meta }: { title: string; icon: ReactNode; items: ReviewItem[]; empty: string; meta: (x: ReviewItem) => string }) {
  return (
    <Card className="flex flex-col">
      <CardHeader title={title} icon={icon} action={items.length > 0 ? <span className="text-xs text-subtle tabular-nums">{items.length}</span> : undefined} />
      <div className="p-2 pt-2">
        {items.length === 0 ? (
          <p className="px-2 py-3 text-xs text-subtle">{empty}</p>
        ) : (
          <ul>
            {items.map((x) => {
              const stale = daysSince(x.progress.solvedAt);
              return (
                <li key={x.problem.slug}>
                  <Link to={`/problems/${x.problem.slug}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{x.problem.title}</span>
                      <span className="block truncate text-[11.5px] text-muted" title={stale !== null ? `${stale} days since solved` : undefined}>
                        {meta(x)}
                      </span>
                    </span>
                    <DifficultyBadge difficulty={x.problem.difficulty} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
