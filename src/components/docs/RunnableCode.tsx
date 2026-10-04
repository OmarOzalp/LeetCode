import { useState } from "react";
import { Pencil, Play, RotateCcw } from "lucide-react";
import type { SnippetResponse } from "@shared/api";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { CopyButton, HighlightedCode } from "@/components/ui/CodeBlock";
import { ErrorBox } from "@/components/problem/TestResults";

/** A Python example from the docs that can be edited and executed locally. */
export function RunnableCode({ code: original }: { code: string }) {
  const [code, setCode] = useState(original);
  const [editing, setEditing] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SnippetResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      setResult(await api.snippet(code));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-border bg-code-bg">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-surface/60 px-2 py-1">
        <span className="pl-1 text-xs font-medium text-muted">Python · runnable</span>
        <div className="flex items-center gap-1">
          {code !== original && (
            <button type="button" className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted hover:bg-surface-3 hover:text-fg" onClick={() => setCode(original)}>
              <RotateCcw className="size-3" /> Reset
            </button>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted hover:bg-surface-3 hover:text-fg"
            onClick={() => setEditing((e) => !e)}
            aria-pressed={editing}
          >
            <Pencil className="size-3" /> {editing ? "Done" : "Edit"}
          </button>
          <CopyButton text={code} />
          <Button size="xs" variant="primary" icon={<Play className="size-3" />} loading={running} onClick={run}>
            Run
          </Button>
        </div>
      </div>
      {editing ? (
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void run();
            }
            if (e.key === "Tab") {
              e.preventDefault();
              const t = e.currentTarget;
              const s = t.selectionStart;
              setCode(code.slice(0, s) + "    " + code.slice(t.selectionEnd));
              requestAnimationFrame(() => (t.selectionStart = t.selectionEnd = s + 4));
            }
          }}
          spellCheck={false}
          rows={Math.min(24, code.split("\n").length + 1)}
          aria-label="Edit example code"
          className="block w-full resize-y bg-transparent px-3.5 py-3 font-mono text-[12.5px] leading-[1.65] text-fg focus:outline-none"
        />
      ) : (
        <pre className="overflow-x-auto px-3.5 py-3">
          <HighlightedCode code={code} />
        </pre>
      )}
      {(result || error) && (
        <div className="border-t border-border bg-surface/40 px-3.5 py-2.5">
          <div className="mb-1 text-[11px] font-medium tracking-wide text-subtle uppercase">Output</div>
          {error && <div className="text-[12.5px] text-danger">{error}</div>}
          {result?.stdout && <pre className="max-h-64 overflow-auto font-mono text-[12.5px] whitespace-pre-wrap text-fg">{result.stdout}</pre>}
          {result && !result.stdout && !result.error && <div className="text-xs text-subtle">(no output)</div>}
          {result?.error && <div className="mt-2"><ErrorBox error={result.error} /></div>}
        </div>
      )}
    </div>
  );
}
