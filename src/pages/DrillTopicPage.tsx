import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { ArrowLeft, Lightbulb, Play } from "lucide-react";
import type { DrillsResponse } from "@shared/api";
import { dayKey } from "@shared/srs";
import { useAppStore } from "@/lib/store";
import { allCards, deckStats } from "@/lib/drills";
import { Page, PageSpinner } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Card";
import { ComplexityPill } from "@/components/ui/Badges";
import { InlineMarkdown, Markdown } from "@/components/ui/Markdown";
import { RunnableCode } from "@/components/docs/RunnableCode";
import { ComplexitySheet } from "@/components/docs/ComplexitySheet";

export default function DrillTopicPage() {
  const { id } = useParams();
  const loadDrills = useAppStore((s) => s.loadDrills);
  const cached = useAppStore((s) => s.drillContent);
  const [content, setContent] = useState<DrillsResponse | null>(cached);
  useEffect(() => {
    void loadDrills().then(setContent);
  }, [loadDrills]);
  if (!content) return <PageSpinner />;
  const topic = content.topics.find((t) => t.id === id);
  if (!topic) return <EmptyState title="Unknown drill topic" />;
  return <TopicView content={content} topicId={topic.id} />;
}

function TopicView({ content, topicId }: { content: DrillsResponse; topicId: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const topic = content.topics.find((t) => t.id === topicId)!;
  const states = useAppStore((s) => s.drills);
  const cards = useMemo(() => allCards(content).filter((c) => c.topicId === topicId), [content, topicId]);
  const today = dayKey(new Date());

  // Scroll to a method card when linked as /drills/topics/x#method-id.
  useEffect(() => {
    if (!location.hash) return;
    requestAnimationFrame(() => document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ block: "start" }));
  }, [location.hash]);

  return (
    <Page>
      <Link to="/drills" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg">
        <ArrowLeft className="size-3.5" /> Drills
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold tracking-wide text-subtle uppercase">{topic.group}</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{topic.title}</h1>
          <p className="mt-1 max-w-2xl text-[13px] text-muted">{topic.blurb}</p>
        </div>
        <Button variant="primary" icon={<Play className="size-3.5" />} onClick={() => navigate(`/drills/session?mode=topic&topic=${topic.id}`)}>
          Drill {cards.length} cards
        </Button>
      </div>
      {topic.intro && <Markdown className="mb-6 max-w-3xl">{topic.intro}</Markdown>}

      {topic.id === "complexity" && (
        <div className="mb-8">
          <ComplexitySheet />
        </div>
      )}

      <div className="flex flex-col gap-4">
        {topic.methods.map((m) => {
          const mc = cards.filter((c) => c.methodId === m.id);
          const st = deckStats(mc, states, today);
          return (
            <Card key={m.id} id={m.id} className="scroll-mt-6 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-mono text-[14.5px] font-semibold">{m.name}</h2>
                  <p className="mt-1 text-[13.5px] text-muted">
                    <InlineMarkdown>{m.summary}</InlineMarkdown>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {m.complexity && <ComplexityPill label="Big-O" value={m.complexity} />}
                  {mc.length > 0 && (
                    <Button size="sm" icon={<Play className="size-3" />} onClick={() => navigate(`/drills/session?mode=method&method=${m.id}`)}>
                      Drill {mc.length}
                      {st.mastered > 0 && <span className="text-subtle">· {st.mastered} ✓</span>}
                    </Button>
                  )}
                </div>
              </div>
              {m.details && (
                <p className="mt-2 text-[13.5px] leading-relaxed">
                  <InlineMarkdown>{m.details}</InlineMarkdown>
                </p>
              )}
              <RunnableCode code={m.example} />
              <div className="-mt-1 mb-2">
                <div className="mb-1 text-[11px] font-medium tracking-wide text-subtle uppercase">Prints</div>
                <pre className="overflow-x-auto rounded-lg border border-border bg-surface-2/40 px-3.5 py-2 font-mono text-[12.5px] text-muted">{m.output}</pre>
              </div>
              {m.tip && (
                <div className="mt-2 flex gap-2 rounded-lg border border-warning/25 bg-warning/[0.06] px-3 py-2 text-[13px]">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" />
                  <span>
                    <InlineMarkdown>{m.tip}</InlineMarkdown>
                  </span>
                </div>
              )}
            </Card>
          );
        })}
        {topic.methods.length === 0 && topic.id !== "complexity" && <p className="text-[13px] text-muted">This topic has questions only — start a drill.</p>}
      </div>
    </Page>
  );
}
