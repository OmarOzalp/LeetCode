/**
 * Topic metadata shared by the server (validation) and the UI (labels, colors).
 * The canonical problem ordering lives in data/blind75.yaml.
 */
export const CATEGORIES = [
  { id: "arrays-hashing", name: "Arrays & Hashing", color: "#60a5fa" },
  { id: "two-pointers", name: "Two Pointers", color: "#34d399" },
  { id: "sliding-window", name: "Sliding Window", color: "#2dd4bf" },
  { id: "stack", name: "Stack", color: "#a3e635" },
  { id: "binary-search", name: "Binary Search", color: "#facc15" },
  { id: "linked-list", name: "Linked List", color: "#fb923c" },
  { id: "trees", name: "Trees", color: "#4ade80" },
  { id: "tries", name: "Tries", color: "#22d3ee" },
  { id: "heap", name: "Heap / Priority Queue", color: "#f472b6" },
  { id: "backtracking", name: "Backtracking", color: "#c084fc" },
  { id: "graphs", name: "Graphs", color: "#818cf8" },
  { id: "advanced-graphs", name: "Advanced Graphs", color: "#a78bfa" },
  { id: "dp-1d", name: "1-D Dynamic Programming", color: "#f87171" },
  { id: "dp-2d", name: "2-D Dynamic Programming", color: "#fb7185" },
  { id: "greedy", name: "Greedy", color: "#fbbf24" },
  { id: "intervals", name: "Intervals", color: "#38bdf8" },
  { id: "math-geometry", name: "Math & Geometry", color: "#94a3b8" },
  { id: "bit-manipulation", name: "Bit Manipulation", color: "#e879f9" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as unknown as readonly [CategoryId, ...CategoryId[]];

const byId = new Map<string, (typeof CATEGORIES)[number]>(CATEGORIES.map((c) => [c.id, c]));

export function categoryName(id: string): string {
  return byId.get(id)?.name ?? id;
}

export function categoryColor(id: string): string {
  return byId.get(id)?.color ?? "#94a3b8";
}

export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
