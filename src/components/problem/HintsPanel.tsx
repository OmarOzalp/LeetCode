import { Lightbulb, Lock } from "lucide-react";
import clsx from "clsx";
import type { ProblemDetail } from "@shared/api";
import { Button } from "@/components/ui/Button";
import { Markdown } from "@/components/ui/Markdown";

export function HintsPanel({
  problem,
  revealed,
  onReveal,
  onShowSolution,
}: {
  problem: ProblemDetail;
  revealed: number;
  onReveal: (n: number) => void;
  onShowSolution: () => void;
}) {
  const total = problem.hints.length;
  return (
    <div className="px-5 py-4">
      <div className="mb-1 flex items-center gap-2">
        <Lightbulb className="size-4 text-warning" />
        <h2 className="text-[15px] font-semibold">Hints</h2>
        <span className="text-xs text-subtle tabular-nums">
          {Math.min(revealed, total)} / {total} revealed
        </span>
      </div>
      <p className="mb-4 text-[13px] text-muted">
        Hints go from a gentle nudge to nearly the full approach. Reveal one, think for a few minutes, then reveal the next only if you're still stuck.
      </p>
      <ol className="flex flex-col gap-2.5">
        {problem.hints.map((hint, i) => {
          const isRevealed = i < revealed;
          const isNext = i === revealed;
          return (
            <li
              key={i}
              className={clsx(
                "rounded-lg border px-4 py-3",
                isRevealed ? "animate-fade-in border-warning/25 bg-warning/[0.06]" : "border-border border-dashed bg-transparent",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={clsx("text-xs font-semibold", isRevealed ? "text-warning" : "text-subtle")}>Hint {i + 1}</span>
                {!isRevealed && !isNext && <Lock className="size-3.5 text-subtle" />}
              </div>
              {isRevealed ? (
                <Markdown className="mt-1.5 text-[13.5px]">{hint}</Markdown>
              ) : isNext ? (
                <Button size="sm" className="mt-2" icon={<Lightbulb className="size-3.5" />} onClick={() => onReveal(i + 1)}>
                  Reveal Hint {i + 1}
                </Button>
              ) : (
                <p className="mt-1 text-xs text-subtle">Reveal hint {i} first.</p>
              )}
            </li>
          );
        })}
      </ol>
      {revealed >= total && (
        <div className="mt-4 rounded-lg border border-border bg-surface-2/60 px-4 py-3 text-[13px] text-muted">
          That's every hint. Still stuck? It's completely fine to{" "}
          <button className="font-medium text-accent hover:underline" onClick={onShowSolution}>
            study the solution
          </button>{" "}
          — then close it and re-implement it from memory.
        </div>
      )}
    </div>
  );
}
