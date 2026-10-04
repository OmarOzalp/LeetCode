import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";

export type SaveStatus = "saved" | "dirty" | "saving" | "error";

/**
 * Holds the editor contents for one problem and autosaves them to the local
 * server (debounced). Pending changes are flushed on unmount and page unload.
 */
export function useCodeDraft(slug: string, starter: string) {
  const initial = useAppStore.getState().progress[slug]?.code ?? starter;
  const [code, setCodeState] = useState(initial);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const latest = useRef(initial);
  const saved = useRef(initial);
  const timer = useRef<number | null>(null);

  const save = useCallback(
    async (keepalive = false) => {
      if (timer.current) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
      const value = latest.current;
      if (value === saved.current) {
        setStatus("saved");
        return;
      }
      setStatus("saving");
      try {
        const p = await api.patchProgress(slug, { code: value }, keepalive);
        saved.current = value;
        useAppStore.getState().setProgress(slug, p);
        setStatus(latest.current === value ? "saved" : "dirty");
      } catch {
        setStatus("error");
      }
    },
    [slug],
  );

  const setCode = useCallback(
    (value: string) => {
      latest.current = value;
      setCodeState(value);
      setStatus(value === saved.current ? "saved" : "dirty");
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void save(), 800);
    },
    [save],
  );

  /** Called after the server stored the code itself (e.g. during a test run). */
  const markSaved = useCallback((value: string) => {
    saved.current = value;
    if (latest.current === value) setStatus("saved");
  }, []);

  useEffect(() => {
    const onUnload = () => {
      if (latest.current !== saved.current) void save(true);
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      if (latest.current !== saved.current) void save(true);
    };
  }, [save]);

  return { code, setCode, status, flush: save, markSaved };
}
