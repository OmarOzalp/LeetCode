import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";
import clsx from "clsx";
import { BookOpen, Compass, Gauge, Search, X } from "lucide-react";
import type { DocEntry, DocSection } from "@shared/api";
import { api } from "@/lib/api";
import { Markdown, type CodeRenderer } from "@/components/ui/Markdown";
import { EmptyState } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Button";
import { RunnableCode } from "@/components/docs/RunnableCode";
import { PatternGuide } from "@/components/docs/PatternGuide";
import { ComplexitySheet } from "@/components/docs/ComplexitySheet";
import { Highlight } from "@/components/docs/highlight";
import { PATTERN_GUIDE } from "@/data/patternGuide";
import { OPERATION_GROUPS } from "@/data/complexity";

let docsCache: DocSection[] | null = null;

const renderCode: CodeRenderer = ({ code, language, meta }) => {
  if ((language === "python" || language === "py") && meta?.split(/\s+/).includes("run")) return <RunnableCode code={code} />;
  return null;
};

const GROUP_ORDER = ["Python Essentials", "Data Structures", "Algorithm Patterns"];

interface Hit {
  section: DocSection;
  entry: DocEntry;
  score: number;
}

function searchDocs(sections: DocSection[], query: string): Hit[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const hits: Hit[] = [];
  for (const section of sections) {
    const sectionText = `${section.title} ${section.keywords.join(" ")}`.toLowerCase();
    for (const entry of section.entries) {
      const title = entry.title.toLowerCase();
      const body = entry.markdown.toLowerCase();
      let score = 0;
      let all = true;
      for (const t of terms) {
        const inTitle = title.includes(t);
        const inSection = sectionText.includes(t);
        const inBody = body.includes(t);
        if (!inTitle && !inSection && !inBody) {
          all = false;
          break;
        }
        score += (inTitle ? 6 : 0) + (inSection ? 2 : 0) + (inBody ? 1 : 0);
      }
      if (all) hits.push({ section, entry, score });
    }
  }
  return hits.sort((a, b) => b.score - a.score || a.section.order - b.section.order).slice(0, 40);
}

export default function DocsPage() {
  const [sections, setSections] = useState<DocSection[] | null>(docsCache);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>("patterns");
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  useEffect(() => {
    if (docsCache) return;
    api
      .docs()
      .then((d) => {
        docsCache = d;
        setSections(d);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "/" && !/input|textarea/i.test(el.tagName) && !el.isContentEditable) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const groups = useMemo(() => {
    const out = new Map<string, DocSection[]>();
    for (const s of sections ?? []) out.set(s.group, [...(out.get(s.group) ?? []), s]);
    return [...out.entries()].sort((a, b) => GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0]));
  }, [sections]);

  const hits = useMemo(() => (sections ? searchDocs(sections, query) : []), [sections, query]);
  const patternHits = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return PATTERN_GUIDE.filter((p) => {
      const hay = `${p.signal} ${p.pattern} ${p.why}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [query]);
  const complexityHit = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return false;
    const hay = ("complexity big o time space " + OPERATION_GROUPS.flatMap((g) => [g.title, ...g.rows.map((r) => `${r.op} ${r.code ?? ""}`)]).join(" ")).toLowerCase();
    return terms.every((t) => hay.includes(t));
  }, [query]);

  const scrollTo = useCallback((id: string) => {
    setQuery("");
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el && scrollRef.current) scrollRef.current.scrollTo({ top: el.offsetTop - 70, behavior: "smooth" });
      setActive(id.replace(/^doc-/, ""));
    });
  }, []);

  // Deep links: /docs#heap or /docs#heap--heappush
  useEffect(() => {
    if (!sections || !location.hash) return;
    const id = decodeURIComponent(location.hash.slice(1));
    const target = document.getElementById(id) ?? document.getElementById(`doc-${id}`);
    if (target && scrollRef.current) scrollRef.current.scrollTo({ top: target.offsetTop - 70 });
  }, [sections, location.hash]);

  // Highlight the section currently in view.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || query) return;
    const els = [...root.querySelectorAll<HTMLElement>("section[data-doc]")];
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive((visible[0].target as HTMLElement).dataset.doc!);
      },
      { root, rootMargin: "-80px 0px -65% 0px" },
    );
    els.forEach((e) => obs.observe(e));
    return () => obs.disconnect();
  }, [sections, query]);

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden w-60 shrink-0 overflow-y-auto border-r border-border px-3 py-4 md:block">
        <NavItem id="patterns" label="What pattern should I think of?" icon={<Compass className="size-3.5" />} active={active === "patterns"} onClick={() => scrollTo("doc-patterns")} />
        <NavItem id="complexity" label="Complexity cheat sheet" icon={<Gauge className="size-3.5" />} active={active === "complexity"} onClick={() => scrollTo("doc-complexity")} />
        {groups.map(([group, secs]) => (
          <div key={group} className="mt-4">
            <div className="mb-1 px-2 text-[11px] font-semibold tracking-wide text-subtle uppercase">{group}</div>
            {secs.map((s) => (
              <NavItem key={s.slug} id={s.slug} label={s.title} active={active === s.slug} onClick={() => scrollTo(`doc-${s.slug}`)} />
            ))}
          </div>
        ))}
      </aside>

      <div ref={scrollRef} className="relative min-w-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-border bg-bg/85 px-6 py-3 backdrop-blur">
          <div className="relative mx-auto max-w-[920px]">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                scrollRef.current?.scrollTo({ top: 0 });
              }}
              placeholder="Search the docs — e.g. heappush, deque, sliding window, bisect, lru_cache"
              aria-label="Search docs"
              className="h-10 w-full rounded-lg border border-border bg-surface pr-16 pl-9 text-[13.5px] placeholder:text-subtle hover:border-border-strong focus:border-accent focus:outline-none"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-subtle hover:text-fg" aria-label="Clear search">
                <X className="size-4" />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded border border-border px-1.5 font-mono text-[11px] text-subtle">/</kbd>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-[920px] px-6 py-6">
          {error && <div className="text-[13px] text-danger">{error}</div>}
          {!sections && !error && (
            <div className="flex justify-center py-10 text-muted">
              <Spinner />
            </div>
          )}

          {sections && query && (
            <SearchResults query={query} hits={hits} patternHits={patternHits} complexityHit={complexityHit} onDocs={(slug) => scrollTo(`doc-${slug}`)} />
          )}

          {sections && !query && (
            <>
              <header className="mb-8">
                <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                  <BookOpen className="size-5 text-muted" /> Python Interview Docs
                </h1>
                <p className="mt-1 text-[13.5px] text-muted">
                  A practical reference for solving interview problems in Python: which pattern to reach for, what operations cost, and the idioms and templates you
                  need. Examples marked <em>runnable</em> execute locally — edit them and press Run.
                </p>
              </header>

              <section id="doc-patterns" data-doc="patterns" className="mb-12 scroll-mt-20">
                <h2 className="text-lg font-semibold tracking-tight">What pattern should I think of?</h2>
                <p className="mt-1 mb-4 text-[13.5px] text-muted">Read the problem for these signals. Each card links to Blind 75 problems that use the pattern.</p>
                <PatternGuide onDocs={(slug) => scrollTo(`doc-${slug}`)} />
              </section>

              <section id="doc-complexity" data-doc="complexity" className="mb-12 scroll-mt-20">
                <h2 className="text-lg font-semibold tracking-tight">Complexity cheat sheet</h2>
                <p className="mt-1 mb-4 text-[13.5px] text-muted">Costs of common Python operations and how input size bounds the complexity you can afford.</p>
                <ComplexitySheet />
              </section>

              {groups.map(([group, secs]) => (
                <div key={group}>
                  <div className="mb-4 border-t border-border pt-6 text-[11px] font-semibold tracking-wide text-subtle uppercase">{group}</div>
                  {secs.map((s) => (
                    <DocSectionView key={s.slug} section={s} />
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function NavItem({ label, icon, active, onClick }: { id: string; label: string; icon?: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[13px] transition-colors",
        active ? "bg-surface-3 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function DocSectionView({ section }: { section: DocSection }) {
  return (
    <section id={`doc-${section.slug}`} data-doc={section.slug} className="mb-12 scroll-mt-20 [content-visibility:auto] [contain-intrinsic-size:auto_1200px]">
      <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
      {section.summary && <p className="mt-1 text-[13.5px] text-muted">{section.summary}</p>}
      {section.intro && <Markdown className="mt-3" renderCode={renderCode}>{section.intro}</Markdown>}
      <div className="mt-4 flex flex-col gap-3">
        {section.entries.map((e) => (
          <EntryCard key={e.id} entry={e} />
        ))}
      </div>
    </section>
  );
}

function EntryCard({ entry, query = "", sectionTitle }: { entry: DocEntry; query?: string; sectionTitle?: string }) {
  return (
    <article id={entry.id} className="scroll-mt-20 rounded-xl border border-border bg-surface px-5 py-4">
      {sectionTitle && <div className="mb-0.5 text-[11px] font-medium tracking-wide text-subtle uppercase">{sectionTitle}</div>}
      <h3 className="text-[15px] font-semibold">
        <a href={`#${entry.id}`} className="hover:text-accent">
          <Highlight text={entry.title.replace(/`/g, "")} query={query} />
        </a>
      </h3>
      <Markdown className="mt-2" renderCode={renderCode}>
        {entry.markdown}
      </Markdown>
    </article>
  );
}

function SearchResults({
  query,
  hits,
  patternHits,
  complexityHit,
  onDocs,
}: {
  query: string;
  hits: Hit[];
  patternHits: typeof PATTERN_GUIDE;
  complexityHit: boolean;
  onDocs: (slug: string) => void;
}) {
  const total = hits.length + patternHits.length + (complexityHit ? 1 : 0);
  if (!total) {
    return (
      <EmptyState icon={<Search className="size-7" />} title={`No results for “${query}”`}>
        Try a method name (heappush, popleft), a data structure, or a pattern (two pointers, memoization).
      </EmptyState>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        {total} result{total === 1 ? "" : "s"} for “{query}”
      </p>
      {patternHits.length > 0 && (
        <div className="mb-2">
          <div className="mb-2 text-[11px] font-semibold tracking-wide text-subtle uppercase">Pattern guide</div>
          <PatternGuide items={patternHits} query={query} onDocs={onDocs} />
        </div>
      )}
      {complexityHit && (
        <div className="mb-2">
          <div className="mb-2 text-[11px] font-semibold tracking-wide text-subtle uppercase">Complexity cheat sheet</div>
          <ComplexitySheet />
        </div>
      )}
      {hits.map((h) => (
        <EntryCard key={h.entry.id} entry={h.entry} query={query} sectionTitle={h.section.title} />
      ))}
    </div>
  );
}
