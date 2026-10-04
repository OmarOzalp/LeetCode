import type {
  AnalyzeResponse,
  AppSettings,
  AppState,
  BenchmarkResponse,
  CustomTestInput,
  DocSection,
  HealthResponse,
  ProblemDetail,
  ProblemProgress,
  ProblemsResponse,
  ProgressPatch,
  RunMode,
  RunResponse,
  SnippetResponse,
} from "@shared/api";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  let res: Response;
  try {
    res = await fetch(path, {
      ...rest,
      headers: json !== undefined ? { "Content-Type": "application/json", ...(rest.headers ?? {}) } : rest.headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiError("Cannot reach the local server. Is `npm run dev` running?", 0, "offline");
  }
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    let code: string | undefined;
    try {
      const body = await res.json();
      message = body.error ?? message;
      code = body.code;
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status, code);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => request<HealthResponse>("/api/health"),
  problems: () => request<ProblemsResponse>("/api/problems"),
  problem: (slug: string) => request<ProblemDetail>(`/api/problems/${encodeURIComponent(slug)}`),
  state: () => request<AppState>("/api/state"),
  patchProgress: (slug: string, patch: ProgressPatch, keepalive = false) =>
    request<ProblemProgress>(`/api/progress/${encodeURIComponent(slug)}`, { method: "PATCH", json: patch, keepalive }),
  resetProgress: (slug: string) => request<ProblemProgress>(`/api/progress/${encodeURIComponent(slug)}/reset`, { method: "POST" }),
  patchSettings: (patch: Partial<AppSettings>) => request<AppSettings>("/api/settings", { method: "PATCH", json: patch }),
  importState: (state: AppState) => request<AppState>("/api/state/import", { method: "POST", json: state }),
  run: (slug: string, code: string, mode: RunMode, custom?: CustomTestInput[]) =>
    request<RunResponse>("/api/run", { method: "POST", json: { slug, code, mode, custom } }),
  benchmark: (slug: string, code: string) => request<BenchmarkResponse>("/api/benchmark", { method: "POST", json: { slug, code } }),
  analyze: (slug: string, code: string) => request<AnalyzeResponse>("/api/analyze", { method: "POST", json: { slug, code } }),
  snippet: (code: string) => request<SnippetResponse>("/api/snippet", { method: "POST", json: { code } }),
  docs: () => request<DocSection[]>("/api/docs"),
};
