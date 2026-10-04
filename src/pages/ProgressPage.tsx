import { useMemo, useRef } from "react";
import { Link } from "react-router";
import { Activity, Download, Upload } from "lucide-react";
import type { AppState } from "@shared/api";
import { categoryColor } from "@shared/categories";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { computeStats } from "@/lib/stats";
import { relativeTime } from "@/lib/format";
import { Page, PageHeader } from "@/components/layout/AppShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DifficultyBadge, StatusIcon } from "@/components/ui/Badges";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { DifficultyCard } from "@/components/dashboard/StatsOverview";
import { CONFIDENCE_LEVELS } from "@/components/problem/ConfidencePicker";
import { toast } from "@/components/ui/Toast";

const WEEKS = 18;
const DAY = 86_400_000;

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ProgressPage() {
  const problems = useAppStore((s) => s.problems);
  const categories = useAppStore((s) => s.categories);
  const progress = useAppStore((s) => s.progress);
  const health = useAppStore((s) => s.health);
  const reloadState = useAppStore((s) => s.reloadState);
  const fileRef = useRef<HTMLInputElement>(null);
  const stats = useMemo(() => computeStats(problems, categories, progress), [problems, categories, progress]);

  const activity = useMemo(() => {
    const byDay = new Map<string, number>();
    const recent: Array<{ slug: string; at: string; passed: number; total: number; allPassed: boolean }> = [];
    let runs = 0;
    let passedRuns = 0;
    for (const [slug, p] of Object.entries(progress)) {
      for (const h of p.history ?? []) {
        const k = dayKey(new Date(h.at));
        byDay.set(k, (byDay.get(k) ?? 0) + 1);
        recent.push({ slug, ...h });
        runs++;
        if (h.allPassed) passedRuns++;
      }
    }
    recent.sort((a, b) => (a.at < b.at ? 1 : -1));
    // streak: consecutive days with activity ending today or yesterday
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const k = dayKey(new Date(today.getTime() - i * DAY));
      if (byDay.get(k)) streak++;
      else if (i > 0) break;
    }
    return { byDay, recent: recent.slice(0, 12), runs, passedRuns, streak };
  }, [progress]);

  const confidence = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    for (const p of Object.values(progress)) if (p.confidence) counts[p.confidence - 1]++;
    return counts;
  }, [progress]);
  const rated = confidence.reduce((a, b) => a + b, 0);
  const avgConf = rated ? confidence.reduce((s, c, i) => s + c * (i + 1), 0) / rated : null;

  const exportUrl = "/api/state/export";
  const onImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as AppState;
      await api.importState(data);
      await reloadState();
      toast.success("Progress imported");
    } catch (e) {
      toast.error(`Import failed: ${(e as Error).message}`);
    }
  };

  return (
    <Page wide>
      <PageHeader
        title="Progress"
        subtitle="Everything is stored locally on this computer."
        actions={
          <>
            <a href={exportUrl} download>
              <Button size="sm" icon={<Download className="size-3.5" />}>
                Export
              </Button>
            </a>
            <Button size="sm" icon={<Upload className="size-3.5" />} onClick={() => fileRef.current?.click()}>
              Import
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onImport(f);
                e.target.value = "";
              }}
            />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Solved" value={`${stats.solved}`} sub={`of ${stats.total} · ${stats.percent}%`} />
        <Stat label="Test runs" value={`${activity.runs}`} sub={activity.runs ? `${Math.round((activity.passedRuns / activity.runs) * 100)}% all passed` : "none yet"} />
        <Stat label="Day streak" value={`${activity.streak}`} sub={activity.streak === 1 ? "day" : "days"} />
        <Stat label="Hints used" value={`${stats.hintsUsed}`} sub="across all problems" />
        <Stat label="Solutions revealed" value={`${stats.solutionsRevealed}`} sub="problems" />
        <Stat label="Avg confidence" value={avgConf ? avgConf.toFixed(1) : "—"} sub={rated ? `${rated} rated` : "rate after solving"} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Activity" icon={<Activity className="size-4" />} subtitle={`Test runs per day, last ${WEEKS} weeks`} />
          <div className="overflow-x-auto p-4">
            <Heatmap byDay={activity.byDay} />
          </div>
        </Card>
        <DifficultyCard stats={stats} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="By topic" />
          <div className="grid gap-x-8 gap-y-2.5 p-4 sm:grid-cols-2">
            {stats.byCategory.map((c) => (
              <Link key={c.id} to={`/?topic=${c.id}`} className="group block">
                <div className="mb-1 flex justify-between text-[13px]">
                  <span className="group-hover:text-accent">{c.name}</span>
                  <span className="text-xs text-muted tabular-nums">
                    {c.solved}/{c.total}
                  </span>
                </div>
                <ProgressBar value={c.solved} max={c.total} color={categoryColor(c.id)} height={5} />
              </Link>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Confidence" subtitle="How independently you solved rated problems" />
          <div className="flex h-[180px] items-end gap-3 px-5 pt-4 pb-3">
            {confidence.map((count, i) => {
              const max = Math.max(1, ...confidence);
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1" title={`${count} problem(s): ${CONFIDENCE_LEVELS[i].label}`}>
                  <span className="text-xs text-muted tabular-nums">{count || ""}</span>
                  <div className="w-full rounded-t-[4px] bg-accent" style={{ height: `${(count / max) * 110}px`, minHeight: count ? 3 : 0, opacity: 0.45 + i * 0.13 }} />
                  <span className="text-xs font-medium tabular-nums">{i + 1}</span>
                  <span className="text-center text-[10px] leading-tight text-subtle">{CONFIDENCE_LEVELS[i].label}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Recent runs" />
        <div className="p-2">
          {activity.recent.length === 0 ? (
            <p className="px-2 py-3 text-[13px] text-muted">No test runs yet. Open a problem and press Run Tests.</p>
          ) : (
            <table className="w-full text-[13px]">
              <tbody>
                {activity.recent.map((r, i) => {
                  const p = problems.find((x) => x.slug === r.slug);
                  if (!p) return null;
                  return (
                    <tr key={i} className="border-b border-border/60 last:border-0">
                      <td className="w-8 px-2 py-1.5">
                        <StatusIcon status={progress[r.slug]?.status ?? "not_started"} />
                      </td>
                      <td className="px-2 py-1.5">
                        <Link to={`/problems/${r.slug}`} className="font-medium hover:text-accent">
                          {p.title}
                        </Link>
                      </td>
                      <td className="px-2 py-1.5">
                        <DifficultyBadge difficulty={p.difficulty} />
                      </td>
                      <td className={`px-2 py-1.5 text-xs tabular-nums ${r.allPassed ? "text-success" : "text-danger"}`}>
                        {r.passed}/{r.total} passed
                      </td>
                      <td className="px-2 py-1.5 text-right text-xs text-muted">{relativeTime(r.at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {health && <p className="mt-4 text-xs text-subtle">Progress file: {health.dataFile} (daily backups are kept next to it).</p>}
    </Page>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      <div className="text-[11px] text-subtle">{sub}</div>
    </Card>
  );
}

/** GitHub-style calendar: columns are weeks, rows are weekdays. One hue, darker = more runs. */
function Heatmap({ byDay }: { byDay: Map<string, number> }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today.getTime() + (6 - today.getDay()) * DAY);
  const start = new Date(end.getTime() - (WEEKS * 7 - 1) * DAY);
  const cells: Array<{ date: Date; count: number; future: boolean }> = [];
  for (let t = start.getTime(); t <= end.getTime(); t += DAY) {
    const d = new Date(t);
    cells.push({ date: d, count: byDay.get(dayKey(d)) ?? 0, future: d > today });
  }
  const level = (c: number) => (c === 0 ? 0 : c <= 1 ? 1 : c <= 3 ? 2 : c <= 6 ? 3 : 4);
  const fills = ["var(--surface-3)", "color-mix(in oklab, var(--accent) 30%, var(--surface-3))", "color-mix(in oklab, var(--accent) 55%, var(--surface-3))", "color-mix(in oklab, var(--accent) 78%, var(--surface-3))", "var(--accent)"];
  const weeks: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return (
    <div className="inline-flex flex-col gap-2">
      <div className="flex gap-[3px]">
        {weeks.map((w, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {w.map((c) => (
              <div
                key={c.date.getTime()}
                className="size-[13px] rounded-[3px]"
                style={{ background: c.future ? "transparent" : fills[level(c.count)] }}
                title={c.future ? undefined : `${c.count} run${c.count === 1 ? "" : "s"} on ${c.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 self-end text-[11px] text-subtle">
        Less
        {fills.map((f, i) => (
          <span key={i} className="size-[11px] rounded-[3px]" style={{ background: f }} />
        ))}
        More
      </div>
    </div>
  );
}
