/**
 * Runs every ```python run block in data/docs through the same snippet runner
 * the Docs page uses, and checks the front matter of each section.
 *
 *   npm run validate:docs
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { DOCS_DIR, parseDocFile } from "../server/docs/loader.ts";
import { runSnippet } from "../server/runner/judge.ts";

const GROUPS = new Set(["Python Essentials", "Data Structures", "Algorithm Patterns"]);

async function main() {
  const files = readdirSync(DOCS_DIR).filter((f) => f.endsWith(".md")).sort();
  let blocks = 0;
  const failures: string[] = [];
  for (const file of files) {
    const text = readFileSync(path.join(DOCS_DIR, file), "utf8");
    const section = parseDocFile(file, text);
    if (!GROUPS.has(section.group)) failures.push(`${file}: unknown group "${section.group}"`);
    if (!section.entries.length) failures.push(`${file}: no "## " entries`);
    const re = /```python run\n([\s\S]*?)```/g;
    let m: RegExpExecArray | null;
    const jobs: Promise<void>[] = [];
    while ((m = re.exec(text))) {
      const code = m[1];
      const line = text.slice(0, m.index).split("\n").length;
      blocks++;
      jobs.push(
        runSnippet(code).then((res) => {
          if (res.error) failures.push(`${file}:${line}: ${res.error.type}: ${res.error.message}`);
          else if (!res.stdout.trim()) failures.push(`${file}:${line}: printed nothing`);
        }),
      );
    }
    await Promise.all(jobs);
    console.log(`${file}: ${section.entries.length} entries`);
  }
  for (const f of failures) console.log(`✗ ${f}`);
  console.log(`\n${blocks} runnable blocks in ${files.length} files; ${failures.length} problem(s).`);
  process.exit(failures.length ? 1 : 0);
}

void main();
