import { useEffect, useState } from "react";
import type { ProblemDetail } from "@shared/api";
import { api } from "@/lib/api";

const cache = new Map<string, ProblemDetail>();
const inflight = new Map<string, Promise<ProblemDetail>>();

export function fetchProblem(slug: string): Promise<ProblemDetail> {
  const hit = cache.get(slug);
  if (hit) return Promise.resolve(hit);
  let p = inflight.get(slug);
  if (!p) {
    p = api.problem(slug).then((d) => {
      cache.set(slug, d);
      inflight.delete(slug);
      return d;
    });
    p.catch(() => inflight.delete(slug));
    inflight.set(slug, p);
  }
  return p;
}

export function useProblemDetail(slug: string | undefined) {
  const [state, setState] = useState<{ data: ProblemDetail | null; error: string | null }>(() => ({
    data: slug ? (cache.get(slug) ?? null) : null,
    error: null,
  }));
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    const hit = cache.get(slug);
    setState({ data: hit ?? null, error: null });
    if (!hit) {
      fetchProblem(slug)
        .then((data) => alive && setState({ data, error: null }))
        .catch((e: Error) => alive && setState({ data: null, error: e.message }));
    }
    return () => {
      alive = false;
    };
  }, [slug]);
  return state;
}
