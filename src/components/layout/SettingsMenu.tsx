import { Settings } from "lucide-react";
import clsx from "clsx";
import { useAppStore } from "@/lib/store";
import { Popover } from "@/components/ui/Popover";
import { Kbd } from "@/components/ui/Card";
import { MOD } from "@/hooks/useHotkeys";

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-surface-2">
      <span>
        <span className="block text-[13px]">{label}</span>
        <span className="block text-[11px] text-subtle">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={clsx("relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-accent" : "bg-surface-3")}
      >
        <span className={clsx("absolute top-0.5 left-0 size-4 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
      </button>
    </label>
  );
}

const SHORTCUTS: Array<[string[], string]> = [
  [[MOD, "↵"], "Run all tests"],
  [[MOD, "'"], "Run examples only"],
  [[MOD, "S"], "Save code now (autosaves anyway)"],
  [[MOD, "/"], "Toggle line comment (editor)"],
  [["/"], "Focus docs search"],
];

export function SettingsMenu({ collapsed }: { collapsed: boolean }) {
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  return (
    <Popover
      align="left"
      width={300}
      placement="top"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-fg"
          title="Settings & shortcuts"
          aria-label="Settings"
          data-collapsed={collapsed || undefined}
        >
          <Settings className="size-4" />
        </button>
      )}
    >
      {() => (
        <div className="flex flex-col gap-1 p-1">
          <div className="px-2 pt-1 text-[11px] font-semibold tracking-wide text-subtle uppercase">Practice</div>
          <Toggle
            label="Ask before revealing solutions"
            hint="Show a “try another hint?” step first."
            checked={settings.confirmBeforeSolution}
            onChange={(v) => update({ confirmBeforeSolution: v })}
          />
          <Toggle
            label="Auto-mark solved"
            hint="When every test passes, set the status to Solved."
            checked={settings.autoMarkSolved}
            onChange={(v) => update({ autoMarkSolved: v })}
          />
          <div className="mt-2 px-2 text-[11px] font-semibold tracking-wide text-subtle uppercase">Keyboard shortcuts</div>
          <ul className="flex flex-col gap-1 px-2 pb-1">
            {SHORTCUTS.map(([keys, label]) => (
              <li key={label} className="flex items-center justify-between gap-3 text-xs text-muted">
                <span>{label}</span>
                <span className="flex gap-0.5">
                  {keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Popover>
  );
}
