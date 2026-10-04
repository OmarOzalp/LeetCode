import { useEffect, useRef, useState } from "react";
import { NotebookPen } from "lucide-react";
import { useAppStore, useProgress } from "@/lib/store";
import { Segmented } from "@/components/ui/Tabs";
import { Markdown } from "@/components/ui/Markdown";

const PLACEHOLDER = `Key idea:
Store prefix minimum before calculating profit.

Mistakes I made:
- forgot the empty-input case

Pattern: Sliding window`;

export function NotesPanel({ slug }: { slug: string }) {
  const progress = useProgress(slug);
  const patch = useAppStore((s) => s.patchProgress);
  const [text, setText] = useState(progress.notes ?? "");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [state, setState] = useState<"saved" | "saving">("saved");
  const timer = useRef<number | null>(null);
  const latest = useRef(text);

  useEffect(() => {
    return () => {
      if (timer.current) {
        window.clearTimeout(timer.current);
        void patch(slug, { notes: latest.current });
      }
    };
  }, [patch, slug]);

  const onChange = (v: string) => {
    setText(v);
    latest.current = v;
    setState("saving");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      timer.current = null;
      await patch(slug, { notes: v });
      setState("saved");
    }, 600);
  };

  return (
    <div className="flex h-full flex-col px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <NotebookPen className="size-4 text-muted" />
          <h2 className="text-[15px] font-semibold">Notes</h2>
          <span className="text-xs text-subtle">{state === "saving" ? "Saving…" : "Saved"}</span>
        </div>
        <Segmented
          value={mode}
          onChange={setMode}
          items={[
            { id: "edit", label: "Write" },
            { id: "preview", label: "Preview" },
          ]}
        />
      </div>
      <p className="mb-3 text-xs text-muted">
        Write down the key idea in your own words, mistakes you made, and what to remember next time. Markdown is supported.
      </p>
      {mode === "edit" ? (
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder={PLACEHOLDER}
          aria-label="Notes"
          className="min-h-[240px] flex-1 resize-none rounded-lg border border-border bg-surface-2/40 p-3 font-mono text-[13px] leading-relaxed placeholder:text-subtle/70 focus:border-accent focus:outline-none"
        />
      ) : (
        <div className="flex-1 rounded-lg border border-border p-3">
          {text.trim() ? <Markdown>{text}</Markdown> : <p className="text-[13px] text-subtle">Nothing written yet.</p>}
        </div>
      )}
    </div>
  );
}
