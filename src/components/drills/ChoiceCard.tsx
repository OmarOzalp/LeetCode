import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import clsx from "clsx";
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Card";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { InlineMarkdown, Markdown } from "@/components/ui/Markdown";
import type { CardResult } from "./CodeDrillCard";

/**
 * Multiple choice, answered with the mouse or number keys 1-n. Used for quiz
 * questions and for pattern recognition (the problem title stays hidden until
 * you answer).
 */
export function ChoiceCard({
  kicker,
  question,
  body,
  code,
  options,
  answer,
  explanation,
  reveal,
  onAnswered,
  onNext,
  autoAdvance,
}: {
  kicker: string;
  question: ReactNode;
  body?: ReactNode;
  code?: string;
  options: string[];
  answer: number;
  explanation: ReactNode;
  /** Extra details shown after answering (e.g. the hidden problem title). */
  reveal?: ReactNode;
  onAnswered: (r: CardResult) => void;
  onNext: () => void;
  autoAdvance?: boolean;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [ms, setMs] = useState(0);
  const started = useRef(performance.now());
  const nextRef = useRef<HTMLButtonElement>(null);
  const correct = picked === answer;

  const pick = (i: number) => {
    if (picked !== null) return;
    const elapsed = performance.now() - started.current;
    setPicked(i);
    setMs(elapsed);
    onAnswered({ correct: i === answer, ms: elapsed, assisted: false });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (picked === null && /^[1-9]$/.test(e.key)) {
        const i = Number(e.key) - 1;
        if (i < options.length) {
          e.preventDefault();
          pick(i);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (picked === null) return;
    nextRef.current?.focus();
    if (autoAdvance && correct) {
      const t = window.setTimeout(onNext, 600);
      return () => window.clearTimeout(t);
    }
  }, [picked, autoAdvance, correct, onNext]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-[11px] font-medium tracking-wide text-subtle uppercase">{kicker}</div>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">{question}</h2>
      </div>
      {body}
      {code && <CodeBlock code={code} copy={false} />}
      <div className="grid gap-2">
        {options.map((o, i) => {
          const state = picked === null ? "idle" : i === answer ? "right" : i === picked ? "wrong" : "dim";
          return (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              disabled={picked !== null}
              className={clsx(
                "flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left text-[14px] transition-colors",
                state === "idle" && "border-border bg-surface hover:border-border-strong hover:bg-surface-2",
                state === "right" && "border-success/50 bg-success/10",
                state === "wrong" && "border-danger/50 bg-danger/10",
                state === "dim" && "border-border bg-surface opacity-60",
              )}
            >
              <Kbd>{i + 1}</Kbd>
              <span className="min-w-0 flex-1">
                <InlineMarkdown>{o}</InlineMarkdown>
              </span>
              {state === "right" && <CheckCircle2 className="size-4 shrink-0 text-success" />}
              {state === "wrong" && <XCircle className="size-4 shrink-0 text-danger" />}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="animate-fade-in flex flex-col gap-3">
          <div className={clsx("rounded-xl border px-4 py-3", correct ? "border-success/30 bg-success/[0.07]" : "border-danger/30 bg-danger/[0.07]")}>
            <div className="flex items-center gap-2 text-[14px] font-semibold">
              {correct ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-danger" />}
              <span>{correct ? "Correct" : "Not quite"}</span>
              <span className="text-xs font-normal text-muted tabular-nums">{(ms / 1000).toFixed(1)}s</span>
            </div>
            <div className="mt-1.5 text-[13.5px] leading-relaxed">{explanation}</div>
          </div>
          {reveal}
          <div>
            <Button ref={nextRef} variant="primary" onClick={onNext}>
              Next <Kbd>↵</Kbd>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PatternPrompt({ markdown }: { markdown: string }) {
  return (
    <div className="max-h-[340px] overflow-y-auto rounded-xl border border-border bg-surface px-4 py-3">
      <Markdown className="text-[13.5px]">{markdown}</Markdown>
    </div>
  );
}

export function PatternReveal({ slug, title, difficulty, approach, also }: { slug: string; title: string; difficulty: string; approach: string; also: string[] }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/50 px-3.5 py-2.5 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-subtle">This was</span>
        <Link to={`/problems/${slug}`} className="inline-flex items-center gap-1 font-semibold hover:text-accent">
          {title} <ExternalLink className="size-3" />
        </Link>
        <span className="text-xs text-subtle">({difficulty})</span>
      </div>
      <div className="mt-1 text-muted">
        Reference approach: <span className="text-fg">{approach}</span>
        {also.length > 0 && <span> · also works: {also.join(", ")}</span>}
      </div>
    </div>
  );
}
