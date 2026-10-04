import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { PATTERN_GUIDE, type PatternHint } from "@/data/patternGuide";
import { Highlight } from "./highlight";

export function PatternGuide({ items = PATTERN_GUIDE, query = "", onDocs }: { items?: PatternHint[]; query?: string; onDocs: (slug: string) => void }) {
  const bySlug = useAppStore((s) => s.bySlug);
  return (
    <div className="grid gap-2.5 md:grid-cols-2">
      {items.map((p) => (
        <div key={p.pattern + p.signal} className="flex flex-col rounded-lg border border-border bg-surface px-4 py-3">
          <div className="text-[13px] text-muted">
            <Highlight text={p.signal} query={query} />
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[14.5px] font-semibold">
            <ArrowRight className="size-4 text-accent" />
            <Highlight text={p.pattern} query={query} />
          </div>
          <p className="mt-1.5 text-[13px] text-muted">{p.why}</p>
          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2.5">
            {p.problems
              .filter((s) => bySlug[s])
              .map((s) => (
                <Link key={s} to={`/problems/${s}`} className="rounded-md border border-border px-1.5 py-0.5 text-[11.5px] text-muted hover:border-border-strong hover:text-fg">
                  {bySlug[s].title}
                </Link>
              ))}
            {p.docs && (
              <button type="button" onClick={() => onDocs(p.docs!)} className="ml-auto text-[11.5px] text-accent hover:underline">
                Template →
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
