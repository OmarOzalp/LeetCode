import { useState, type ReactNode } from "react";
import { Highlight, type PrismTheme } from "prism-react-renderer";
import { Check, Copy } from "lucide-react";
import clsx from "clsx";

export const prismTheme: PrismTheme = {
  plain: { color: "var(--fg)", backgroundColor: "transparent" },
  styles: [
    { types: ["comment", "prolog", "doctype", "cdata"], style: { color: "var(--syn-comment)", fontStyle: "italic" } },
    { types: ["keyword", "boolean", "important", "atrule"], style: { color: "var(--syn-keyword)" } },
    { types: ["string", "char", "attr-value", "triple-quoted-string", "string-interpolation"], style: { color: "var(--syn-string)" } },
    { types: ["number", "constant"], style: { color: "var(--syn-number)" } },
    { types: ["function"], style: { color: "var(--syn-function)" } },
    { types: ["builtin"], style: { color: "var(--syn-builtin)" } },
    { types: ["class-name", "decorator", "annotation"], style: { color: "var(--syn-class)" } },
    { types: ["punctuation", "operator"], style: { color: "var(--syn-punct)" } },
  ],
};

export function HighlightedCode({ code, language = "python", lineNumbers = false }: { code: string; language?: string; lineNumbers?: boolean }) {
  return (
    <Highlight theme={prismTheme} code={code} language={language === "py" ? "python" : language}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <code className="block font-mono text-[12.5px] leading-[1.65]">
          {tokens.map((line, i) => {
            const { key: _k, ...lineProps } = getLineProps({ line, key: i }) as Record<string, unknown> & { key?: unknown };
            void _k;
            return (
              <div key={i} {...(lineProps as object)} className="table-row">
                {lineNumbers && <span className="table-cell pr-4 text-right text-subtle/60 select-none">{i + 1}</span>}
                <span className="table-cell whitespace-pre">
                  {line.map((token, j) => {
                    const { key: _tk, ...tokenProps } = getTokenProps({ token, key: j }) as Record<string, unknown> & { key?: unknown };
                    void _tk;
                    return <span key={j} {...(tokenProps as object)} />;
                  })}
                </span>
              </div>
            );
          })}
        </code>
      )}
    </Highlight>
  );
}

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        });
      }}
      className={clsx("inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted hover:bg-surface-3 hover:text-fg", className)}
      aria-label="Copy code"
    >
      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function CodeBlock({
  code,
  language = "python",
  title,
  actions,
  lineNumbers,
  className,
  copy = true,
}: {
  code: string;
  language?: string;
  title?: ReactNode;
  actions?: ReactNode;
  lineNumbers?: boolean;
  className?: string;
  copy?: boolean;
}) {
  return (
    <div className={clsx("group overflow-hidden rounded-lg border border-border bg-code-bg", className)}>
      {(title || actions || copy) && (
        <div className="flex items-center justify-between gap-2 border-b border-border bg-surface/60 px-3 py-1">
          <span className="truncate text-xs font-medium text-muted">{title ?? language}</span>
          <div className="flex items-center gap-1">
            {actions}
            {copy && <CopyButton text={code} />}
          </div>
        </div>
      )}
      <pre className="overflow-x-auto px-3.5 py-3">
        <HighlightedCode code={code} language={language} lineNumbers={lineNumbers} />
      </pre>
    </div>
  );
}
