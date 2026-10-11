import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import clsx from "clsx";
import { CheckCircle2, Eye, Lightbulb, ListChecks, XCircle } from "lucide-react";
import type { DrillCheckResponse } from "@shared/api";
import type { DrillItem } from "@shared/drillSchema";
import { api } from "@/lib/api";
import { choicesFor, matchesKnownAnswer, sanitizeCode, splitLine } from "@/lib/drills";
import { HighlightedCode, InlineHighlight } from "@/components/ui/CodeBlock";
import { InlineMarkdown } from "@/components/ui/Markdown";
import { Button, Spinner } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Card";
import { ErrorBox } from "@/components/problem/TestResults";

export interface CardResult {
  correct: boolean;
  ms: number;
  assisted: boolean;
}

type Phase = "answering" | "checking" | "done";

/** "Complete the line": type the missing piece; Python decides if it's right. */
export function CodeDrillCard({
  item,
  topicId,
  topicTitle,
  methodName,
  onAnswered,
  onNext,
  autoAdvance,
}: {
  item: DrillItem;
  topicId: string;
  topicTitle: string;
  methodName?: string;
  onAnswered: (r: CardResult) => void;
  onNext: () => void;
  /** Speed rounds move on by themselves after a correct answer. */
  autoAdvance?: boolean;
}) {
  const [fill, setFill] = useState("");
  const [phase, setPhase] = useState<Phase>("answering");
  const [hint, setHint] = useState(false);
  const [choices, setChoices] = useState<string[] | null>(null);
  const [verdict, setVerdict] = useState<"correct" | "wrong" | "revealed" | null>(null);
  const [check, setCheck] = useState<DrillCheckResponse | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(performance.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [before, after] = useMemo(() => splitLine(item.line), [item.line]);
  const assisted = hint || choices !== null;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    if (phase === "done") {
      nextRef.current?.focus();
      if (autoAdvance && verdict === "correct") {
        const t = window.setTimeout(onNext, 700);
        return () => window.clearTimeout(t);
      }
    }
  }, [phase, autoAdvance, verdict, onNext]);

  const finish = (v: "correct" | "wrong" | "revealed", res: DrillCheckResponse | null, ms: number) => {
    setVerdict(v);
    setCheck(res);
    setElapsed(ms);
    setPhase("done");
    onAnswered({ correct: v === "correct", ms, assisted: assisted || v === "revealed" });
  };

  const submit = async (value: string) => {
    const text = sanitizeCode(value).trim();
    if (!text || phase !== "answering") return;
    const ms = performance.now() - started.current;
    setFill(text);
    setPhase("checking");
    try {
      const res = await api.checkDrill(item.id, text);
      finish(res.ok ? "correct" : "wrong", res, ms);
    } catch {
      // Server unreachable: fall back to the known answers.
      finish(matchesKnownAnswer(item, text) ? "correct" : "wrong", null, ms);
    }
  };

  const reveal = () => {
    if (phase !== "answering") return;
    finish("revealed", null, performance.now() - started.current);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void submit(fill);
    } else if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      if (item.hint) setHint(true);
      else if (!choices) setChoices(choicesFor(item));
    } else if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      if (!choices) setChoices(choicesFor(item));
    } else if (e.key === "Escape") {
      e.preventDefault();
      reveal();
    } else if (choices && fill === "" && /^[1-9]$/.test(e.key)) {
      const pick = choices[Number(e.key) - 1];
      if (pick) {
        e.preventDefault();
        void submit(pick);
      }
    }
  };

  const width = Math.max(10, Math.min(60, fill.length + 2));

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div>
        <div className="text-[11px] font-medium tracking-wide text-subtle uppercase">
          {topicTitle}
          {methodName ? ` · ${methodName}` : ""}
        </div>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">{item.title}</h2>
        <p className="mt-1 text-[14px] leading-relaxed text-muted">
          <InlineMarkdown>{item.task}</InlineMarkdown>
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-code-bg">
        <pre className="overflow-x-auto px-4 py-3 text-[13.5px]">
          {item.setup && <HighlightedCode code={item.setup} />}
          <div className="flex items-center whitespace-pre font-mono text-[13.5px] leading-[1.9]">
            <InlineHighlight code={before} />
            {phase === "answering" ? (
              <input
                ref={inputRef}
                value={fill}
                onChange={(e) => setFill(e.target.value)}
                onKeyDown={onKeyDown}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                aria-label="Fill in the blank"
                placeholder="___"
                style={{ width: `${width}ch` }}
                className="mx-0.5 rounded-md border border-accent/60 bg-accent-soft px-1.5 py-0.5 font-mono text-[13.5px] text-fg outline-none placeholder:text-subtle focus:border-accent"
              />
            ) : (
              <span
                className={clsx(
                  "mx-0.5 rounded-md border px-1.5 py-0.5",
                  verdict === "correct" ? "border-success/40 bg-success/10 text-success" : "border-danger/40 bg-danger/10 text-danger",
                )}
              >
                {phase === "checking" ? <Spinner className="inline size-3.5" /> : verdict === "revealed" ? "?" : fill}
              </span>
            )}
            <InlineHighlight code={after} />
          </div>
          {item.after && <HighlightedCode code={item.after} />}
        </pre>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border bg-surface/50 px-4 py-2 font-mono text-[12px] text-muted">
          <span className="font-sans text-[11px] tracking-wide text-subtle uppercase">Target</span>
          <span className="text-fg">{item.show}</span>
          <span className="text-subtle">→</span>
          <span className="text-fg">{item.expected}</span>
        </div>
      </div>

      {phase !== "done" && (
        <>
          {hint && item.hint && (
            <div className="animate-fade-in flex gap-2 rounded-lg border border-warning/25 bg-warning/[0.06] px-3 py-2 text-[13px]">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" />
              <InlineMarkdown>{item.hint}</InlineMarkdown>
            </div>
          )}
          {choices && (
            <div className="animate-fade-in grid gap-1.5 sm:grid-cols-2">
              {choices.map((c, i) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => void submit(c)}
                  disabled={phase !== "answering"}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2 text-left font-mono text-[13px] hover:border-border-strong hover:bg-surface-2"
                >
                  <Kbd>{i + 1}</Kbd>
                  <span className="break-all">{c}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={() => void submit(fill)} loading={phase === "checking"} disabled={!fill.trim()}>
              Check <Kbd>↵</Kbd>
            </Button>
            {item.hint && !hint && (
              <Button variant="ghost" icon={<Lightbulb className="size-3.5" />} onClick={() => setHint(true)}>
                Hint <Kbd>Tab</Kbd>
              </Button>
            )}
            {!choices && (
              <Button variant="ghost" icon={<ListChecks className="size-3.5" />} onClick={() => setChoices(choicesFor(item))}>
                Choices <Kbd>⇧Tab</Kbd>
              </Button>
            )}
            <Button variant="ghost" icon={<Eye className="size-3.5" />} onClick={reveal}>
              Show answer <Kbd>Esc</Kbd>
            </Button>
          </div>
        </>
      )}

      {phase === "done" && (
        <div className="animate-fade-in flex flex-col gap-3">
          <div
            className={clsx(
              "rounded-xl border px-4 py-3",
              verdict === "correct" ? "border-success/30 bg-success/[0.07]" : "border-danger/30 bg-danger/[0.07]",
            )}
          >
            <div className="flex flex-wrap items-center gap-2 text-[14px] font-semibold">
              {verdict === "correct" ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-danger" />}
              <span>{verdict === "correct" ? "Correct" : verdict === "revealed" ? "Here's the answer" : "Not quite"}</span>
              <span className="text-xs font-normal text-muted tabular-nums">{(elapsed / 1000).toFixed(1)}s</span>
              {assisted && verdict === "correct" && <span className="text-xs font-normal text-subtle">(with help — it will come back sooner)</span>}
            </div>
            {check?.got != null && (
              <div className="mt-2 font-mono text-[12.5px]">
                <span className="font-sans text-xs text-subtle">Python produced </span>
                <span className={verdict === "correct" ? "text-success" : "text-danger"}>{check.got}</span>
                {verdict !== "correct" && (
                  <>
                    <span className="font-sans text-xs text-subtle"> · target </span>
                    <span className="text-fg">{item.expected}</span>
                  </>
                )}
              </div>
            )}
            {verdict !== "correct" && (
              <div className="mt-2 text-[13px]">
                <span className="text-subtle">Answer: </span>
                <code className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[12.5px] text-fg">{item.answer}</code>
                {item.accept?.length ? <span className="text-xs text-subtle"> (also accepted: {item.accept.join(", ")})</span> : null}
              </div>
            )}
            {verdict === "correct" && fill && fill.replace(/\s/g, "") !== item.answer.replace(/\s/g, "") && (
              <div className="mt-1 text-xs text-muted">
                Reference answer: <code className="font-mono">{item.answer}</code>
              </div>
            )}
          </div>
          {check?.error && <ErrorBox error={check.error} title="Python said" />}
          {check?.stdout && <pre className="rounded-lg border border-border bg-surface-2/50 px-3 py-2 font-mono text-[12px] text-muted">{check.stdout}</pre>}
          <div className="text-[13.5px] leading-relaxed">
            <InlineMarkdown>{item.explain}</InlineMarkdown>
          </div>
          <div className="flex items-center gap-3">
            <Button ref={nextRef} variant="primary" onClick={onNext}>
              Next <Kbd>↵</Kbd>
            </Button>
            {item.method && (
              <Link to={`/drills/topics/${topicId}#${item.method}`} className="text-xs text-muted hover:text-fg">
                Review the {methodName ?? "method"} card →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
