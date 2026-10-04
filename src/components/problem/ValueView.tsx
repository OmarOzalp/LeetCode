import clsx from "clsx";
import { pyRepr } from "@/lib/format";

/**
 * Renders a test value. Trees, linked lists and small grids get a visual
 * representation; everything is also shown as a Python literal.
 */

function baseType(t?: string): string {
  if (!t) return "";
  let s = t.replace(/\s+/g, "").replace(/^ref:/, "");
  const m = /^Optional\[(.*)\]$/.exec(s);
  if (m) s = m[1];
  return s;
}

const GRID_NAMES = /^(matrix|grid|board|heights)$/;

export function ValueView({
  value,
  type,
  name,
  cyclePos,
  compact,
}: {
  value: unknown;
  type?: string;
  name?: string;
  cyclePos?: number;
  compact?: boolean;
}) {
  const t = baseType(type);
  const literal = <Literal value={value} />;
  if (compact) return literal;

  if (t === "TreeNode" && Array.isArray(value) && value.length > 0) {
    const nonNull = value.filter((v) => v !== null).length;
    if (nonNull <= 31) {
      return (
        <div className="flex flex-col gap-2">
          <TreeDiagram values={value} />
          {literal}
        </div>
      );
    }
  }
  if (t === "ListNode" && Array.isArray(value) && value.length <= 16) {
    return (
      <div className="flex flex-col gap-2">
        <LinkedListView values={value} cyclePos={cyclePos} />
        {literal}
      </div>
    );
  }
  if (name && GRID_NAMES.test(name) && isSmallGrid(value)) {
    return (
      <div className="flex flex-col gap-2">
        <GridView rows={value as unknown[][]} />
        {literal}
      </div>
    );
  }
  return literal;
}

export function Literal({ value, className }: { value: unknown; className?: string }) {
  return (
    <code className={clsx("block font-mono text-[12.5px] break-all whitespace-pre-wrap text-fg", className)}>{pyRepr(value)}</code>
  );
}

function isSmallGrid(v: unknown): v is unknown[][] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.length <= 12 &&
    v.every((r) => Array.isArray(r) && r.length <= 14) &&
    (v[0] as unknown[]).length > 0
  );
}

export function GridView({ rows }: { rows: unknown[][] }) {
  return (
    <div className="inline-block overflow-hidden rounded-md border border-border">
      <table className="border-collapse font-mono text-[11.5px]">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => {
                const s = typeof c === "string" ? c : pyRepr(c);
                const highlight = c === "1" || c === 1;
                return (
                  <td
                    key={j}
                    className={clsx(
                      "h-6 min-w-6 border border-border px-1.5 text-center tabular-nums",
                      highlight ? "bg-accent-soft text-fg" : "text-muted",
                    )}
                  >
                    {s}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LinkedListView({ values, cyclePos }: { values: unknown[]; cyclePos?: number }) {
  if (values.length === 0) return <span className="font-mono text-xs text-subtle">(empty list)</span>;
  const hasCycle = cyclePos !== undefined && cyclePos >= 0 && cyclePos < values.length;
  return (
    <div className="flex flex-wrap items-center gap-1 font-mono text-xs">
      {values.map((v, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <span
            className={clsx(
              "inline-flex h-6 min-w-7 items-center justify-center rounded-md border px-1.5",
              hasCycle && i === cyclePos ? "border-warning/60 bg-warning/10 text-fg" : "border-border-strong bg-surface-2 text-fg",
            )}
          >
            {pyRepr(v)}
          </span>
          {i < values.length - 1 && <span className="text-subtle">→</span>}
        </span>
      ))}
      {hasCycle ? (
        <span className="ml-1 text-warning">↩ back to index {cyclePos}</span>
      ) : (
        <span className="text-subtle">→ None</span>
      )}
    </div>
  );
}

interface Laid {
  val: unknown;
  x: number;
  y: number;
  parent: number | null;
}

/** Lay out a level-order tree: x from in-order position, y from depth. */
function layoutTree(values: unknown[]): Laid[] {
  if (!values.length || values[0] === null) return [];
  type N = { val: unknown; left: N | null; right: N | null; depth: number; idx: number; parent: number | null };
  const nodes: N[] = [];
  const root: N = { val: values[0], left: null, right: null, depth: 0, idx: 0, parent: null };
  nodes.push(root);
  const queue: N[] = [root];
  let i = 1;
  while (queue.length && i < values.length) {
    const node = queue.shift()!;
    for (const side of ["left", "right"] as const) {
      if (i < values.length && values[i] !== null && values[i] !== undefined) {
        const child: N = { val: values[i], left: null, right: null, depth: node.depth + 1, idx: nodes.length, parent: node.idx };
        nodes.push(child);
        node[side] = child;
        queue.push(child);
      }
      i++;
    }
  }
  const xs = new Map<number, number>();
  let counter = 0;
  const inorder = (n: N | null) => {
    if (!n) return;
    inorder(n.left);
    xs.set(n.idx, counter++);
    inorder(n.right);
  };
  inorder(root);
  return nodes.map((n) => ({ val: n.val, x: xs.get(n.idx)!, y: n.depth, parent: n.parent }));
}

export function TreeDiagram({ values }: { values: unknown[] }) {
  const laid = layoutTree(values);
  if (!laid.length) return <span className="font-mono text-xs text-subtle">(empty tree)</span>;
  const R = 13;
  const GX = 30;
  const GY = 42;
  const maxX = Math.max(...laid.map((n) => n.x));
  const maxY = Math.max(...laid.map((n) => n.y));
  const width = (maxX + 1) * GX + R;
  const height = (maxY + 1) * GY;
  const px = (n: Laid) => n.x * GX + R + 2;
  const py = (n: Laid) => n.y * GY + R + 2;
  return (
    <svg width={width + 4} height={height} className="max-w-full" role="img" aria-label="Binary tree diagram">
      {laid.map((n, i) =>
        n.parent === null ? null : (
          <line key={`e${i}`} x1={px(laid[n.parent])} y1={py(laid[n.parent])} x2={px(n)} y2={py(n)} stroke="var(--border-strong)" strokeWidth={1.5} />
        ),
      )}
      {laid.map((n, i) => {
        const label = pyRepr(n.val);
        return (
          <g key={`n${i}`}>
            <circle cx={px(n)} cy={py(n)} r={R} fill="var(--surface-2)" stroke="var(--accent)" strokeOpacity={0.55} strokeWidth={1.5} />
            <text
              x={px(n)}
              y={py(n)}
              dy="0.35em"
              textAnchor="middle"
              fontSize={label.length > 3 ? 8.5 : 11}
              fontFamily="var(--font-mono)"
              fill="var(--fg)"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
