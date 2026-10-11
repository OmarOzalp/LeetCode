import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { BookOpen, Brain, Compass, Flame, Gauge, Play, Target, Zap } from "lucide-react";
import type { DrillsResponse } from "@shared/api";
import { dayKey } from "@shared/srs";
import { useAppStore } from "@/lib/store";
import { allCards, bestSprint, buildSession, deckStats, drillStreak, recentAccuracy, type DeckStats, type DrillCard } from "@/lib/drills";
import { Page, PageHeader, PageSpinner } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState, Kbd } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useHotkeys } from "@/hooks/useHotkeys";
import { toast } from "@/components/ui/Toast";

const GROUP_ORDER = ["Python", "Interview templates", "Big-O"];

export default function DrillsPage() {
  const loadDrills = useAppStore((s) => s.loadDrills);
  const cached = useAppStore((s) => s.drillContent);
  const [content, setContent] = useState<DrillsResponse | null>(cached);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadDrills()
      .then(setContent)
      .catch((e: Error) => setError(e.message));
  }, [loadDrills]);
  if (error) return <EmptyState title="Couldn't load drills">{error}</EmptyState>;
  if (!content) return <PageSpinner />;
  return <DrillsHome content={content} />;
}

function MasteryBar({ stats }: { stats: DeckStats }) {
  const pct = (n: number) => (stats.total ? (n / stats.total) * 100 : 0);
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-3" title={`${stats.mastered} mastered · ${stats.learning} learning · ${stats.fresh} new`}>
      <div className="h-full bg-success" style={{ width: `${pct(stats.mastered)}%` }} />
      <div className="h-full bg-accent/70" style={{ width: `${pct(stats.learning)}%` }} />
    </div>
  );
}

function DrillsHome({ content }: { content: DrillsResponse }) {
  const navigate = useNavigate();
  const states = useAppStore((s) => s.drills);
  const days = useAppStore((s) => s.drillDays);
  const resetDrills = useAppStore((s) => s.resetDrills);
  const [confirmReset, setConfirmReset] = useState(false);
  const cards = useMemo(() => allCards(content), [content]);
  const today = dayKey(new Date());
  const overall = useMemo(() => deckStats(cards, states, today), [cards, states, today]);
  const review = useMemo(() => buildSession("review", cards, states, { today }), [cards, states, today]);
  const weak = useMemo(() => buildSession("weak", cards, states, { today }), [cards, states, today]);
  const streak = drillStreak(days);
  const week = recentAccuracy(days, 7);
  const todayStats = days[today];
  const best = bestSprint(days);
  const dueCount = review.filter((c) => states[c.id]).length;
  const newCount = review.length - dueCount;

  const byTopic = useMemo(() => {
    const m = new Map<string, DrillCard[]>();
    for (const c of cards) m.set(c.topicId, [...(m.get(c.topicId) ?? []), c]);
    return m;
  }, [cards]);

  const groups = useMemo(() => {
    const g = new Map<string, typeof content.topics>();
    for (const t of content.topics) g.set(t.group, [...(g.get(t.group) ?? []), t]);
    return [...g.entries()].sort((a, b) => (GROUP_ORDER.indexOf(a[0]) + 99) % 99 - (GROUP_ORDER.indexOf(b[0]) + 99) % 99);
  }, [content]);

  useHotkeys({ enter: () => review.length && navigate("/drills/session?mode=review") });

  const patternStats = deckStats(byTopic.get("patterns") ?? [], states, today);

  return (
    <Page wide>
      <PageHeader
        title="Drills"
        subtitle="Short spaced-repetition reps for the Python methods, interview templates and Big-O you need to be fast at. Every answer is checked by running Python."
      />

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-muted">
              <Brain className="size-3.5" /> Daily review
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-4xl font-semibold tracking-tight tabular-nums">{review.length}</span>
              <span className="text-[13px] text-muted">
                cards today · {dueCount} due for review, {newCount} new
              </span>
            </div>
            <p className="mt-2 text-[13px] text-muted">
              Cards you answer correctly come back after 1, 3, 7, 14, 30 days; misses come back today. Hints and choices count as help, so the card returns sooner.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button variant="primary" icon={<Play className="size-3.5" />} disabled={!review.length} onClick={() => navigate("/drills/session?mode=review")}>
              {review.length ? "Start review" : "All caught up"}
              {review.length > 0 && <Kbd>↵</Kbd>}
            </Button>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              <Flame className={streak ? "size-3.5 text-warning" : "size-3.5"} /> {streak} day streak
            </span>
            <span className="text-xs text-muted">{todayStats?.reviewed ?? 0} answered today</span>
          </div>
        </Card>

        <Card className="grid grid-cols-3 gap-3 p-5">
          <Stat label="Mastered" value={overall.mastered} sub={`of ${overall.total} cards`} tone="text-success" />
          <Stat label="Learning" value={overall.learning} sub={`${overall.fresh} new`} tone="text-accent" />
          <Stat label="7-day accuracy" value={week.reviewed ? `${Math.round((week.correct / week.reviewed) * 100)}%` : "—"} sub={week.reviewed ? `${(week.avgMs / 1000).toFixed(1)}s per card` : "no answers yet"} />
          <div className="col-span-3">
            <MasteryBar stats={overall} />
            <div className="mt-1.5 flex gap-3 text-[11px] text-subtle">
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-success" /> mastered
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-accent/70" /> learning
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-surface-3" /> new
              </span>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <ModeCard
          icon={<Zap className="size-4 text-warning" />}
          title="Speed round"
          text={`60 seconds, as many as you can. Best: ${best}.`}
          to="/drills/session?mode=sprint"
          cta="Go"
        />
        <ModeCard
          icon={<Target className="size-4 text-danger" />}
          title="Weak spots"
          text={weak.length ? `${weak.length} cards you miss or answer slowly.` : "Cards you miss or answer slowly collect here."}
          to="/drills/session?mode=weak"
          cta="Drill"
          disabled={!weak.length}
        />
        <ModeCard
          icon={<Compass className="size-4 text-accent" />}
          title="Pattern recognition"
          text={`Read a Blind 75 problem (title hidden), name the technique. ${patternStats.mastered}/${patternStats.total} mastered.`}
          to="/drills/session?mode=patterns"
          cta="Drill"
        />
      </div>

      {groups.map(([group, topics]) => (
        <section key={group} className="mt-8">
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-subtle uppercase">{group}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {topics.map((t) => {
              const tc = byTopic.get(t.id) ?? [];
              const st = deckStats(tc, states, today);
              return (
                <Card key={t.id} className="flex flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-[14px] font-semibold">{t.title}</h3>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted">{t.blurb}</p>
                    </div>
                    {st.due > 0 && <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-accent tabular-nums">{st.due} due</span>}
                  </div>
                  <div className="mt-3">
                    <MasteryBar stats={st} />
                    <div className="mt-1.5 text-[11px] text-subtle tabular-nums">
                      {st.mastered}/{st.total} mastered · {t.methods.length} cards · {t.drills.length} drills · {t.quiz.length} quiz
                    </div>
                  </div>
                  <div className="mt-auto flex gap-2 pt-3">
                    <Button size="sm" variant="primary" icon={<Play className="size-3" />} onClick={() => navigate(`/drills/session?mode=topic&topic=${t.id}`)} disabled={!tc.length}>
                      Drill
                    </Button>
                    <Button size="sm" icon={<BookOpen className="size-3" />} onClick={() => navigate(`/drills/topics/${t.id}`)}>
                      {t.methods.length ? "Learn" : "Reference"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ))}

      <div className="mt-10 flex items-center justify-between border-t border-border pt-4 text-xs text-subtle">
        <span className="inline-flex items-center gap-1.5">
          <Gauge className="size-3.5" /> Python topics are shared with the CodeToGo app; templates, Big-O and pattern recognition are extra here.
        </span>
        <button type="button" className="hover:text-danger" onClick={() => setConfirmReset(true)}>
          Reset drill progress…
        </button>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset all drill progress?"
        danger
        confirmLabel="Reset drills"
        onCancel={() => setConfirmReset(false)}
        onConfirm={async () => {
          setConfirmReset(false);
          await resetDrills();
          toast.info("Drill progress reset");
        }}
      >
        Every card goes back to new and your drill streak and history are cleared. Problem progress is not affected.
      </ConfirmDialog>
    </Page>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string | number; sub: string; tone?: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums ${tone ?? ""}`}>{value}</div>
      <div className="text-[11px] text-subtle">{sub}</div>
    </div>
  );
}

function ModeCard({ icon, title, text, to, cta, disabled }: { icon: React.ReactNode; title: string; text: string; to: string; cta: string; disabled?: boolean }) {
  const navigate = useNavigate();
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold">{title}</div>
        <div className="text-xs text-muted">{text}</div>
      </div>
      <Button size="sm" onClick={() => navigate(to)} disabled={disabled}>
        {cta}
      </Button>
    </Card>
  );
}

