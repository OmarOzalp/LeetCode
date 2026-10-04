import { NavLink } from "react-router";
import clsx from "clsx";
import { BarChart3, BookOpen, ListChecks, Moon, PanelLeftClose, PanelLeftOpen, RotateCcw, Sun, Terminal } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { ProgressBar } from "@/components/ui/ProgressBar";

const NAV = [
  { to: "/", label: "Blind 75", icon: ListChecks, end: true },
  { to: "/review", label: "Review", icon: RotateCcw },
  { to: "/docs", label: "Docs", icon: BookOpen },
  { to: "/progress", label: "Progress", icon: BarChart3 },
];

export function Sidebar() {
  const collapsed = useAppStore((s) => s.settings.sidebarCollapsed);
  const theme = useAppStore((s) => s.settings.theme);
  const update = useAppStore((s) => s.updateSettings);
  const problems = useAppStore((s) => s.problems);
  const progress = useAppStore((s) => s.progress);
  const health = useAppStore((s) => s.health);
  const solved = problems.filter((p) => progress[p.slug]?.status === "solved").length;
  const reviewCount = problems.filter((p) => progress[p.slug]?.status === "review").length;

  return (
    <aside
      className={clsx(
        "flex h-full shrink-0 flex-col border-r border-border bg-surface/60 transition-[width] duration-200",
        collapsed ? "w-[56px]" : "w-[216px]",
      )}
    >
      <div className={clsx("flex h-12 items-center gap-2 border-b border-border", collapsed ? "justify-center px-0" : "px-4")}>
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-fg">
          <Terminal className="size-4" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13px] font-semibold">Blind 75 Studio</div>
            <div className="truncate text-[11px] text-subtle">Python interview practice</div>
          </div>
        )}
      </div>

      <nav className="flex flex-col gap-0.5 p-2" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              clsx(
                "flex h-8 items-center gap-2.5 rounded-md text-[13px] font-medium transition-colors",
                collapsed ? "justify-center px-0" : "px-2.5",
                isActive ? "bg-surface-3 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
              )
            }
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed && <span className="flex-1">{label}</span>}
            {!collapsed && label === "Review" && reviewCount > 0 && (
              <span className="rounded-full bg-review/15 px-1.5 text-[11px] text-review tabular-nums">{reviewCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2 p-2">
        {!collapsed && problems.length > 0 && (
          <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
            <div className="mb-1.5 flex items-baseline justify-between text-xs">
              <span className="text-muted">Solved</span>
              <span className="font-medium tabular-nums">
                {solved}
                <span className="text-subtle"> / {problems.length}</span>
              </span>
            </div>
            <ProgressBar value={solved} max={problems.length} height={4} />
          </div>
        )}
        {!collapsed && health && !health.python.available && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-danger">
            Python 3 not found — tests can't run.
          </div>
        )}
        <div className={clsx("flex items-center gap-1", collapsed ? "flex-col" : "justify-between px-1")}>
          <button
            type="button"
            onClick={() => update({ theme: theme === "dark" ? "light" : "dark" })}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-fg"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          {!collapsed && health?.python.available && (
            <span className="truncate text-[11px] text-subtle" title={`Using ${health.python.command}`}>
              Python {health.python.version}
            </span>
          )}
          <button
            type="button"
            onClick={() => update({ sidebarCollapsed: !collapsed })}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-fg"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle sidebar"
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
