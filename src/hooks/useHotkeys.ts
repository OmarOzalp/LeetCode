import { useEffect, useRef } from "react";

export const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
export const MOD = isMac ? "⌘" : "Ctrl";

type Handler = (e: KeyboardEvent) => void;

/**
 * Register global shortcuts like "mod+enter" or "mod+s". `mod` is Cmd on macOS
 * and Ctrl elsewhere. Handlers always see the latest closure.
 */
export function useHotkeys(map: Record<string, Handler>, enabled = true) {
  const ref = useRef(map);
  ref.current = map;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const mod = isMac ? e.metaKey : e.ctrlKey;
      const key = e.key.toLowerCase();
      for (const combo of Object.keys(ref.current)) {
        const parts = combo.toLowerCase().split("+");
        const wantMod = parts.includes("mod");
        const wantShift = parts.includes("shift");
        const k = parts[parts.length - 1];
        if (wantMod !== mod || wantShift !== e.shiftKey) continue;
        const target = e.target as HTMLElement;
        if (!wantMod && (/input|textarea|select/i.test(target?.tagName ?? "") || target?.isContentEditable)) continue;
        if (k === key || (k === "enter" && key === "enter") || (k === "'" && key === "'")) {
          // Let Monaco handle its own bindings when the editor has focus.
          if ((e.target as HTMLElement)?.closest?.(".monaco-editor")) return;
          e.preventDefault();
          ref.current[combo](e);
          return;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
