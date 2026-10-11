import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import clsx from "clsx";
import { ArrowLeft, CheckCircle2, PartyPopper, RotateCcw, Timer, XCircle, Zap } from "lucide-react";
import type { DrillsResponse } from "@shared/api";
import { useAppStore } from "@/lib/store";
import { allCards, bestSprint, buildSession, type DrillCard, type SessionMode } from "@/lib/drills";
import { PageSpinner } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { InlineMarkdown } from "@/components/ui/Markdown";
import { CodeDrillCard, type CardResult } from "@/components/drills/CodeDrillCard";
import { ChoiceCard, PatternPrompt, PatternReveal } from "@/components/drills/ChoiceCard";
import { useHotkeys } from "@/hooks/useHotkeys";

const SPRINT_MS = 60_000;

export default function DrillSessionPage() {
  const [sp] = useSearchParams();
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
  return <Session key={sp.toString()} content={content} />;
}

interface Answer {
  card: DrillCard;
  result: CardResult;
}

function sessionTitle(mode: SessionMode, content: DrillsResponse, topic?: string, method?: string): string {
  if (mode === "review") return "Daily review";
  if (mode === "sprint") return "Speed round";
  if (mode === "weak") return "Weak spots";
  if (mode === "patterns") return "Pattern recognition";
  if (mode === "missed") return "Missed cards";
  if (mode === "method") {
    for (const t of content.topics) {
      const m = t.methods.find((x) => x.id === method);
      if (m) return m.name;
    }
  }
  return content.topics.find((t) => t.id === topic)?.title ?? "Drills";
}

function Session({ content }: { content: DrillsResponse }) {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const mode = (sp.get("mode") as SessionMode) || "review";
  const topicId = sp.get("topic") ?? undefined;
  const methodId = sp.get("method") ?? undefined;
  const ids = sp.get("ids")?.split(",").filter(Boolean);
  const recordDrill = useAppStore((s) => s.recordDrill);
  const recordSprint = useAppStore((s) => s.recordSprint);
  const drillDays = useAppStore((s) => s.drillDays);

  const methodNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of content.topics) for (const x of t.methods) m.set(x.id, x.name);
    return m;
  }, [content]);

  const [queue, setQueue] = useState<DrillCard[]>(() =>
    buildSession(mode, allCards(content), useAppStore.getState().drills, { topicId, methodId, ids }),
  );
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const requeued = useRef(new Set<string>());
  const sprint = mode === "sprint";
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const sprintRecorded = useRef(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (!sprint) return;
    setDeadline(Date.now() + SPRINT_MS);
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [sprint]);

  const timeUp = sprint && deadline !== null && now >= deadline;
  const finished = index >= queue.length || timeUp;
  const card = queue[index];

  const onAnswered = useCallback(
    (c: DrillCard, r: CardResult) => {
      setAnswers((a) => [...a, { card: c, result: r }]);
      void recordDrill({ cardId: c.id, kind: c.kind, correct: r.correct, ms: r.ms, assisted: r.assisted, sprint });
      // Missed cards come back a few cards later in the same session (once).
      if (!r.correct && !sprint && !requeued.current.has(c.id)) {
        requeued.current.add(c.id);
        setQueue((q) => {
          const at = Math.min(q.length, index + 4);
          return [...q.slice(0, at), c, ...q.slice(at)];
        });
      }
    },
    [recordDrill, sprint, index],
  );
  const onNext = useCallback(() => setIndex((i) => i + 1), []);

  useEffect(() => {
    if (finished && sprint && !sprintRecorded.current) {
      sprintRecorded.current = true;
      void recordSprint(answers.filter((a) => a.result.correct).length);
    }
  }, [finished, sprint, answers, recordSprint]);

  useHotkeys({ escape: () => finished && navigate("/drills") }, finished);

  const correct = answers.filter((a) => a.result.correct).length;
  const title = sessionTitle(mode, content, topicId, methodId);

  if (!queue.length) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="max-w-md">
          <EmptyState
            icon={<PartyPopper className="size-8" />}
            title={mode === "review" ? "All caught up" : mode === "weak" ? "No weak spots yet" : "Nothing to drill here"}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/drills/session?mode=sprint">
                  <Button variant="primary" icon={<Zap className="size-3.5" />}>
                    Speed round
                  </Button>
                </Link>
                <Link to="/drills">
                  <Button>Back to Drills</Button>
                </Link>
              </div>
            }
          >
            {mode === "review"
              ? "Nothing is due and there are no new cards left. Come back tomorrow, or do a speed round."
              : mode === "weak"
                ? "Cards you miss or answer slowly will collect here."
                : "Try another topic."}
          </EmptyState>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-surface/60 px-4">
        <Link to="/drills" className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted hover:bg-surface-2 hover:text-fg">
          <ArrowLeft className="size-3.5" /> Drills
        </Link>
        <h1 className="truncate text-[13px] font-semibold">{title}</h1>
        <div className="ml-auto flex items-center gap-4 text-xs text-muted tabular-nums">
          {sprint && deadline && (
            <span className={clsx("inline-flex items-center gap-1 font-mono text-[13px]", deadline - now < 10_000 ? "text-danger" : "text-fg")}>
              <Timer className="size-3.5" />
              {Math.max(0, Math.ceil((deadline - now) / 1000))}s
            </span>
          )}
          <span className="inline-flex items-center gap-1" aria-label={`${correct} correct`} title="Correct">
            <CheckCircle2 className="size-3.5 text-success" /> {correct}
          </span>
          <span className="inline-flex items-center gap-1" aria-label={`${answers.length - correct} missed`} title="Missed">
            <XCircle className="size-3.5 text-danger" /> {answers.length - correct}
          </span>
          {!sprint && (
            <span>
              {Math.min(index + 1, queue.length)} / {queue.length}
            </span>
          )}
        </div>
      </header>
      {!sprint && <ProgressBar value={Math.min(index, queue.length)} max={queue.length} height={2} className="rounded-none" />}
      {sprint && deadline && <ProgressBar value={Math.max(0, deadline - now)} max={SPRINT_MS} height={2} className="rounded-none" color="var(--warning)" />}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-5 py-8">
          {finished ? (
            <Summary
              answers={answers}
              sprint={sprint}
              best={bestSprint(drillDays)}
              seconds={(Date.now() - startedAt.current) / 1000}
              onAgain={() => navigate(`/drills/session?${new URLSearchParams({ ...Object.fromEntries(sp), n: String(Date.now()) })}`)}
            />
          ) : (
            card && <CardView key={`${index}-${card.id}`} card={card} methodNames={methodNames} onAnswered={(r) => onAnswered(card, r)} onNext={onNext} sprint={sprint} />
          )}
        </div>
      </div>
    </div>
  );
}

function CardView({
  card,
  methodNames,
  onAnswered,
  onNext,
  sprint,
}: {
  card: DrillCard;
  methodNames: Map<string, string>;
  onAnswered: (r: CardResult) => void;
  onNext: () => void;
  sprint: boolean;
}) {
  // Advance at most once per card (a focused Next button and a speed-round
  // auto-advance could otherwise both fire and skip a card).
  const advanced = useRef(false);
  const next = useCallback(() => {
    if (advanced.current) return;
    advanced.current = true;
    onNext();
  }, [onNext]);
  const wrapped = onAnswered;

  if (card.kind === "drill") {
    return (
      <CodeDrillCard
        item={card.item}
        topicId={card.topicId}
        topicTitle={card.topicTitle}
        methodName={card.methodId ? methodNames.get(card.methodId) : undefined}
        onAnswered={onAnswered}
        onNext={next}
        autoAdvance={sprint}
      />
    );
  }
  if (card.kind === "quiz") {
    const q = card.quiz;
    return (
      <ChoiceCard
        kicker={`${card.topicTitle}${card.methodId && methodNames.get(card.methodId) ? ` · ${methodNames.get(card.methodId)}` : ""} · Quiz`}
        question={<InlineMarkdown>{q.question}</InlineMarkdown>}
        code={q.code}
        options={q.options}
        answer={q.answer}
        explanation={<InlineMarkdown>{q.explanation}</InlineMarkdown>}
        onAnswered={wrapped}
        onNext={next}
        autoAdvance={sprint}
      />
    );
  }
  const p = card.card;
  return (
    <ChoiceCard
      kicker="Pattern recognition · title hidden"
      question="Which technique fits this problem?"
      body={<PatternPrompt markdown={p.prompt} />}
      options={p.options}
      answer={p.answer}
      explanation={<InlineMarkdown>{p.explanation}</InlineMarkdown>}
      reveal={<PatternReveal slug={p.slug} title={p.title} difficulty={p.difficulty} approach={p.approach} also={p.also} />}
      onAnswered={wrapped}
      onNext={next}
      autoAdvance={sprint}
    />
  );
}

function Summary({ answers, sprint, best, seconds, onAgain }: { answers: Answer[]; sprint: boolean; best: number; seconds: number; onAgain: () => void }) {
  const correct = answers.filter((a) => a.result.correct).length;
  const pct = answers.length ? Math.round((correct / answers.length) * 100) : 0;
  const avg = answers.length ? answers.reduce((s, a) => s + a.result.ms, 0) / answers.length / 1000 : 0;
  // A card answered wrong then right later still counts as missed.
  const missedIds = [...new Set(answers.filter((a) => !a.result.correct).map((a) => a.card.id))];
  const titleOf = (c: DrillCard) => (c.kind === "drill" ? c.item.title : c.kind === "quiz" ? c.quiz.question : c.card.title);
  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <div className="text-center">
        <div className="text-[11px] font-semibold tracking-wide text-subtle uppercase">{sprint ? "Time!" : "Session complete"}</div>
        <div className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">
          {sprint ? correct : `${pct}%`}
        </div>
        <div className="mt-1 text-[13px] text-muted">
          {sprint
            ? `correct answers in 60 seconds · best ${Math.max(best, correct)}`
            : `${correct} of ${answers.length} correct · ${avg.toFixed(1)}s per card · ${Math.round(seconds / 60) || "<1"} min`}
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {missedIds.length > 0 && (
          <Link to={`/drills/session?mode=missed&ids=${missedIds.join(",")}`}>
            <Button variant="primary" icon={<RotateCcw className="size-3.5" />}>
              Drill the {missedIds.length} missed again
            </Button>
          </Link>
        )}
        <Button onClick={onAgain} variant={missedIds.length ? "secondary" : "primary"}>
          {sprint ? "Another speed round" : "Another round"}
        </Button>
        <Link to="/drills">
          <Button variant="ghost">Back to Drills</Button>
        </Link>
      </div>
      <Card className="divide-y divide-border">
        {answers.map((a, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2 text-[13px]">
            {a.result.correct ? <CheckCircle2 className="size-4 shrink-0 text-success" /> : <XCircle className="size-4 shrink-0 text-danger" />}
            <span className="min-w-0 flex-1 truncate">
              <InlineMarkdown>{titleOf(a.card)}</InlineMarkdown>
            </span>
            {a.card.kind === "drill" && <code className="hidden shrink-0 font-mono text-xs text-muted sm:inline">{a.card.item.answer}</code>}
            <span className="w-12 shrink-0 text-right text-xs text-subtle tabular-nums">{(a.result.ms / 1000).toFixed(1)}s</span>
          </div>
        ))}
      </Card>
      <p className="text-center text-xs text-subtle">
        Cards you got right unaided come back later (1 → 3 → 7 → 14 → 30 days); misses come back today and tomorrow.
      </p>
    </div>
  );
}
