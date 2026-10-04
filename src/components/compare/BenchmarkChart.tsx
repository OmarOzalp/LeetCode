import { useMemo, useRef, useState } from "react";
import type { BenchRow } from "@shared/api";
import { formatMs } from "@/lib/format";

/**
 * Log-log line chart of runtime vs input size for the user's solution and the
 * optimal one. On log-log axes a straight line's slope is the growth exponent,
 * so linear vs quadratic is visible at a glance. Crosshair tooltip on hover.
 */

const W = 560;
const H = 240;
const M = { top: 14, right: 84, bottom: 34, left: 56 };

type SeriesKey = "user" | "reference";
const SERIES: Array<{ key: SeriesKey; label: string; color: string }> = [
  { key: "user", label: "Yours", color: "var(--series-1)" },
  { key: "reference", label: "Optimal", color: "var(--series-2)" },
];

function ticksLog(min: number, max: number): number[] {
  const out: number[] = [];
  for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++) out.push(10 ** e);
  return out.filter((t) => t >= min / 1.0001 && t <= max * 1.0001);
}

function fmtTick(ms: number): string {
  if (ms >= 1000) return `${ms / 1000}s`;
  if (ms >= 1) return `${ms}ms`;
  return `${Number(ms.toPrecision(1))}ms`;
}

function fmtN(n: number): string {
  if (n >= 1e6) return `${n / 1e6}M`;
  if (n >= 1e3) return `${n / 1e3}k`;
  return String(n);
}

export function BenchmarkChart({ rows, sizeLabel }: { rows: BenchRow[]; sizeLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const data = useMemo(() => {
    const pts = (k: SeriesKey) =>
      rows.filter((r) => r[k].status === "ok" && (r[k].ms ?? 0) > 0).map((r) => ({ n: r.n, ms: Math.max(r[k].ms as number, 0.001) }));
    return { user: pts("user"), reference: pts("reference") };
  }, [rows]);

  const all = [...data.user, ...data.reference];
  if (all.length < 2 || rows.length < 2) return null;

  const nMin = Math.min(...rows.map((r) => r.n));
  const nMax = Math.max(...rows.map((r) => r.n));
  const yMin = 10 ** Math.floor(Math.log10(Math.min(...all.map((p) => p.ms))));
  const yMax = 10 ** Math.ceil(Math.log10(Math.max(...all.map((p) => p.ms))));
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const x = (n: number) => M.left + ((Math.log(n) - Math.log(nMin)) / (Math.log(nMax) - Math.log(nMin) || 1)) * iw;
  const y = (ms: number) => M.top + ih - ((Math.log(ms) - Math.log(yMin)) / (Math.log(yMax) - Math.log(yMin) || 1)) * ih;
  const yTicks = ticksLog(yMin, yMax);
  const xTicks = rows.map((r) => r.n);

  const onMove = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let dist = Infinity;
    rows.forEach((r, i) => {
      const d = Math.abs(x(r.n) - px);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    setHover(best);
  };

  const hovered = hover !== null ? rows[hover] : null;

  return (
    <div className="relative">
      <div className="mb-2 flex items-center gap-4 text-xs text-muted" aria-hidden>
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <svg width="16" height="8">
              <line x1="0" y1="4" x2="16" y2="4" stroke={s.color} strokeWidth="2" strokeLinecap="round" />
            </svg>
            {s.label}
          </span>
        ))}
        <span className="text-subtle">log–log scale · steeper line = faster growth</span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[680px] touch-none"
        role="img"
        aria-label="Runtime versus input size for your solution and the optimal solution"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill="var(--subtle)">
              {fmtTick(t)}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={`x${t}`} x={x(t)} y={H - M.bottom + 16} textAnchor="middle" fontSize={10} fill="var(--subtle)">
            {fmtN(t)}
          </text>
        ))}
        <line x1={M.left} x2={W - M.right} y1={M.top + ih} y2={M.top + ih} stroke="var(--border-strong)" />
        <text x={M.left + iw / 2} y={H - 4} textAnchor="middle" fontSize={10} fill="var(--muted)">
          input size ({sizeLabel})
        </text>

        {hovered && <line x1={x(hovered.n)} x2={x(hovered.n)} y1={M.top} y2={M.top + ih} stroke="var(--muted)" strokeWidth={1} strokeDasharray="3 3" />}

        {SERIES.map((s) => {
          const pts = data[s.key];
          if (!pts.length) return null;
          const d = pts.map((p, i) => `${i ? "L" : "M"}${x(p.n).toFixed(1)},${y(p.ms).toFixed(1)}`).join(" ");
          const last = pts[pts.length - 1];
          return (
            <g key={s.key}>
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {pts.map((p) => (
                <circle key={p.n} cx={x(p.n)} cy={y(p.ms)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
              ))}
              <text x={x(last.n) + 8} y={y(last.ms)} dy="0.32em" fontSize={11} fill="var(--fg)">
                {s.label}
              </text>
            </g>
          );
        })}
      </svg>
      {hovered && (
        <div
          className="pointer-events-none absolute top-8 rounded-lg border border-border bg-surface px-2.5 py-2 text-xs shadow-[var(--shadow-pop)]"
          style={{ left: `min(calc(${(x(hovered.n) / W) * 100}% + 12px), calc(100% - 150px))` }}
        >
          <div className="mb-1 text-muted">
            n = <span className="text-fg">{hovered.n.toLocaleString()}</span>
          </div>
          {SERIES.map((s) => (
            <div key={s.key} className="flex items-center gap-2">
              <svg width="12" height="6" aria-hidden>
                <line x1="0" y1="3" x2="12" y2="3" stroke={s.color} strokeWidth="2" />
              </svg>
              <span className="font-semibold text-fg tabular-nums">
                {hovered[s.key].status === "ok" ? formatMs(hovered[s.key].ms) : hovered[s.key].status === "timeout" ? "timed out" : hovered[s.key].status}
              </span>
              <span className="text-muted">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
