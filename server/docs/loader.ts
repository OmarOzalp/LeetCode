import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import type { DocEntry, DocSection } from "../../shared/api.ts";
import { DATA_DIR } from "../problems/loader.ts";

export const DOCS_DIR = path.join(DATA_DIR, "docs");

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Parse one docs Markdown file: YAML front matter, intro, and "## " entries. */
export function parseDocFile(fileName: string, text: string): DocSection {
  const base = fileName.replace(/\.md$/, "");
  const m = /^(\d+)-(.*)$/.exec(base);
  const order = m ? Number(m[1]) : 999;
  const slug = m ? m[2] : base;

  let meta: Record<string, unknown> = {};
  let body = text.replace(/\r\n/g, "\n");
  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(body);
  if (fm) {
    meta = (parseYaml(fm[1]) as Record<string, unknown>) ?? {};
    body = body.slice(fm[0].length);
  }

  const intro: string[] = [];
  const entries: DocEntry[] = [];
  let current: { title: string; lines: string[] } | null = null;
  let inFence = false;
  for (const line of body.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const heading = !inFence && /^## (.+)$/.exec(line);
    if (heading) {
      if (current) entries.push(finish(slug, current, entries));
      current = { title: heading[1].trim(), lines: [] };
    } else if (current) current.lines.push(line);
    else if (!/^# /.test(line)) intro.push(line);
  }
  if (current) entries.push(finish(slug, current, entries));

  return {
    slug,
    title: String(meta.title ?? slug),
    group: String(meta.group ?? "Reference"),
    summary: String(meta.summary ?? ""),
    keywords: Array.isArray(meta.keywords) ? meta.keywords.map(String) : [],
    intro: intro.join("\n").trim(),
    order,
    entries,
  };
}

function finish(section: string, cur: { title: string; lines: string[] }, existing: DocEntry[]): DocEntry {
  let id = `${section}--${slugify(cur.title) || "entry"}`;
  let n = 2;
  while (existing.some((e) => e.id === id)) id = `${section}--${slugify(cur.title)}-${n++}`;
  return { id, title: cur.title, markdown: cur.lines.join("\n").trim() };
}

export function loadDocs(): DocSection[] {
  if (!existsSync(DOCS_DIR)) return [];
  return readdirSync(DOCS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parseDocFile(f, readFileSync(path.join(DOCS_DIR, f), "utf8")))
    .sort((a, b) => a.order - b.order);
}
