import { memo, type ReactElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import clsx from "clsx";
import { CodeBlock } from "./CodeBlock";

export type CodeRenderer = (args: { code: string; language?: string; meta?: string }) => ReactNode;

interface HastNode {
  children?: Array<{ data?: { meta?: string }; properties?: { className?: string[] } }>;
}

function MarkdownImpl({ children, className, renderCode }: { children: string; className?: string; renderCode?: CodeRenderer }) {
  const components: Components = {
    pre: ({ children: kids, node }) => {
      const child = kids as ReactElement<{ className?: string; children?: ReactNode }>;
      const codeNode = (node as unknown as HastNode)?.children?.[0];
      const language = /language-([\w+-]+)/.exec(child?.props?.className ?? "")?.[1];
      const code = String(child?.props?.children ?? "").replace(/\n$/, "");
      const meta = codeNode?.data?.meta;
      if (renderCode) {
        const custom = renderCode({ code, language, meta });
        if (custom) return <>{custom}</>;
      }
      return <CodeBlock code={code} language={language ?? "text"} className="my-3" title={language === "python" || !language ? "Python" : language} />;
    },
    a: ({ href, children: kids }) => (
      <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
        {kids}
      </a>
    ),
  };
  return (
    <div className={clsx("prose-app", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

export const Markdown = memo(MarkdownImpl);

/** Inline markdown (single line, e.g. constraints) without block wrappers. */
export function InlineMarkdown({ children }: { children: string }) {
  return (
    <span className="prose-app [&>p]:inline">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ p: ({ children: kids }) => <>{kids}</> }}>
        {children}
      </ReactMarkdown>
    </span>
  );
}
