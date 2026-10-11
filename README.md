# Blind 75 Studio

A local practice environment for the Blind 75 interview problems in Python:
browse and filter problems, solve them in a real editor, run tests (including
hidden edge cases), get progressive hints, study optimal solutions, compare your
approach against the optimal one, benchmark both, and track what to review.
Everything runs on your machine; no accounts or external APIs.

## Quick start

Requirements: **Node.js 20+** and **Python 3.8+** (`python3` on your PATH).

```bash
npm install
npm run dev
```

Open http://localhost:5173. `npm run dev` starts the API server (port 3001) and
the web UI (port 5173) together.

Other ways to run it:

| Command | What it does |
| --- | --- |
| `npm run build && npm start` | Production build served by one process at http://localhost:3001 |
| `docker compose up --build` | Same, in a container (Node + Python included) at http://localhost:3001; progress is stored in `./.data` |

If Python isn't found, set `PYTHON=/path/to/python3` (on Windows, `py -3` is
detected automatically).

## What's inside

**Blind 75 dashboard** — progress (solved / remaining / %), difficulty and topic
breakdowns, today's practice set, *Continue* and *Random unsolved*, and a table
with status, difficulty, topic, last attempt and attempts. Filter by status
(All / Unsolved / Attempted / Solved / Review), topic, difficulty and pattern
tag, or search. Filters are kept in the URL.

**Problem workspace** — resizable panes with:

- *Description*: the problem, visual examples (tree diagrams, linked-list
  chains, grids), constraints and signature.
- *Editor*: Monaco (bundled locally) with Python highlighting, autosave per
  problem, reset-to-starter (with confirmation), font size, and Python
  completions and snippets.
- *Run Examples* / *Run Tests*: tests run in a Python subprocess with a time
  limit per test. Results show passed and failed cases, input, expected vs
  your output, printed output, and runtime per test. Syntax errors, runtime
  errors and timeouts are explained in plain language, with a clickable line
  number and a hint for common mistakes.
- *Custom tests*: enter Python or JSON literals. The optimal solution runs on
  the same input so you can compare, and you can save tests per problem.
- *Hints*: 2–4 per problem, revealed one at a time.
- *Solution*: behind a "Reveal solution? Try another hint first?" gate. Shows
  the approach, key insight, explanation, code, the reasoning behind the time
  and space complexity, and alternative approaches with their tradeoffs.
- *Notes* (Markdown), an optional interview timer, status (Not Started /
  Attempted / Solved / Review) and a 1–5 confidence rating.
- When every test passes, the problem is marked solved and you're asked how
  confident you feel.

**Compare** — your code and the optimal solution (or any alternative) side by
side or as a diff, plus a deterministic analysis. It compares time and space
complexity, data structures, passes over the input and approach. It recognises
known approaches (for example "Brute force (check every pair)"), flags hidden
costs such as `list.pop(0)` or `in` on a list inside a loop, and explains the
tradeoff. **Benchmark** times both on increasingly large generated inputs,
shows a table and a log-log chart, and estimates the growth rate. These timings
are labelled as measurements; the Big-O figures come from the algorithm.

**Drills** — fast, spaced-repetition reps for the things you need at your fingertips, sharing CodeToGo's Python content:

- *Complete the line*: a tiny task, a few lines of setup and one blank. Type the missing piece (or press `Shift+Tab` for multiple choice). Real Python checks it, so any correct answer counts. A wrong answer shows what Python actually produced, the right answer and why.
- *Python topics* (imported from your CodeToGo app): collections, heapq, bisect, lists, dicts, sets, strings, built-ins, itertools, functools, math & bits, gotchas. Each topic has method cards with runnable examples.
- *Interview templates*: 21 templates (binary search, sliding window, prefix sums, monotonic stack, BFS/DFS, backtracking, DP, topological sort, union-find, Dijkstra, top-k, trie, ...) with 53 drills. Each drill blanks the line people get wrong under pressure.
- *Big-O*: 60 quick-fire questions on the cost of operations and code, plus lesson cards.
- *Pattern recognition*: read a Blind 75 problem with the title hidden and name the technique.
- *Spaced repetition*: unaided correct answers come back after 1, 3, 7, 14, 30 and then 60 days, and misses come back the same day. Using a hint or the choices counts as help, so the card returns sooner. Each day's **Daily review** mixes due cards with a few new ones.
- *Other modes*: **Speed round** (60 seconds), **Weak spots** (cards you miss or answer slowly), and per-topic or per-method drills.
- *Links to problems*: a solution's *Solution* tab lists the Python it uses (e.g. `Counter`, `heappush`, `bisect_left`), and each item opens drills for it. Docs sections link to the matching drills.

**Review** — today's review set, weakest topics, and lists for needs review,
longest time since solved, most failed attempts, lowest confidence, solution
revealed, and recently failed.

**Progress** — totals, a daily activity heatmap, topic and difficulty
breakdowns, the confidence distribution and recent runs. Export or import your
progress as JSON.

**Docs** — a searchable Python interview reference made of 25 sections. It
covers built-ins, lists, dicts, sets, strings, sorting and lambdas, common
imports, stacks, deques, heaps, `Counter`, `defaultdict`, linked lists, trees,
graphs, tries, two pointers, sliding window, binary search, recursion,
backtracking, DP, intervals, bit manipulation and greedy. It also has a "What
pattern should I think of?" guide that links to problems, and a complexity
cheat sheet. 254 examples can be edited and run in place.

### Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `Cmd/Ctrl + Enter` | Run all tests |
| `Cmd/Ctrl + '` | Run examples only |
| `Cmd/Ctrl + S` | Save now (code also autosaves) |
| `/` | Focus docs search |
| `Enter` | Drills: check the answer / next card (on the Drills page: start the daily review) |
| `Tab` / `Shift+Tab` | Drills: show a hint / show multiple choice |
| `Esc` | Drills: show the answer |
| `1`–`4` | Drills: pick a choice |

Settings (gear icon, bottom left) let you turn off the reveal confirmation or
automatic marking of problems as solved.

## Your data

Progress, code, notes and custom tests are stored in `.data/state.json` in the
project folder. Override the location with `BLIND75_DATA_DIR`. Writes are
atomic, and a dated backup is kept in `.data/backups/` for each of the last 7
days the app was started. Use *Progress → Export* for a portable copy.

## Architecture

```
Browser (React + Vite)  ──/api──▶  Node server (Express, server/)
                                     ├─ data/problems/*.yaml   problem dataset (validated with zod)
                                     ├─ data/docs/*.md         docs content
                                     ├─ .data/state.json       your progress
                                     └─ spawns ▶ python3 server/runner/py/main.py
                                                   test · benchmark · analyze · snippet
```

- **Frontend** (`src/`): React 19, TypeScript, Tailwind v4, Monaco,
  react-router, zustand. Pages are in `src/pages`, reusable UI in
  `src/components`, and pure logic in `src/lib` (filters, review scoring,
  comparison, growth estimation), which has unit tests.
- **Shared types** (`shared/`): the problem schema, API types and the Big-O
  expression evaluator used to compare complexities.
- **Python runner** (`server/runner/py/`): uses only the standard library. Your
  code runs in a fresh subprocess, in a worker thread with a large stack and a
  raised recursion limit. Each test has a time limit, enforced by injecting an
  exception into the worker; if that fails, Node kills the process. Results
  stream back one line at a time, so an infinite loop costs one test, not the
  whole run. `ListNode`, `TreeNode`, `Node` and the usual imports (`List`,
  `deque`, `heapq`, ...) are preloaded the way LeetCode does it.
- **Static analysis** (`analyze.py`): an AST pass that extracts loop nesting,
  passes, data structures, recursion and memoization, and hidden linear-time
  operations. The UI compares these features with those of the optimal
  solution and each alternative to recognise which approach you used.

This runs code you write on your own machine. The time and memory limits
protect you from accidental infinite loops, not from malicious code. The server
listens on `127.0.0.1` only.

### Project layout

```
data/blind75.yaml        canonical list and order of the 75 problems
data/problems/           one YAML file per problem
data/docs/               docs sections (Markdown with front matter)
server/                  API server, dataset loader, state store, Python runner
shared/                  types and logic shared by server and UI
src/                     React app (pages, components, hooks, lib, data)
scripts/                 dataset and docs validators
e2e/                     Playwright end-to-end tests
docs/AUTHORING.md        how to add or edit problems and docs
```

## Quality checks

```bash
npm run check          # typecheck + unit tests + dataset validation + docs validation
npm run validate       # every problem: optimal + alternatives pass all tests,
                       # starter code fails, benchmarks run (add -- --no-bench to skip)
npm run validate:docs  # runs every runnable docs example
npm run validate:drills # every drill answer passes, every decoy fails, card examples print what they claim
npm run e2e            # Playwright end-to-end suite (first: npx playwright install chromium)
```

The dataset validator, the harness tests and the end-to-end suite all use the
real Python runner. The full dataset passes on Python 3.8 and 3.11.

## Drill content

Drill topics live in `data/drills/<topic>.yaml` in the same format as CodeToGo's Python content
(method cards, quiz questions and "complete the line" drills). Refresh the 12 Python topics from a
local CodeToGo checkout with:

```bash
npx tsx scripts/import-codetogo.ts ../codetogo
```

That rewrites only the imported topics; `templates.yaml`, `complexity.yaml` and `patterns.yaml`
are authored here. Run `npm run validate:drills` after editing.

## Adding or editing problems

See [docs/AUTHORING.md](docs/AUTHORING.md) for the YAML format, runner types
(function, design classes, encode/decode round trips, in-place mutation,
linked-list cycles, tree node references, custom checkers) and the docs format.
The server reloads data files automatically while it's running.
