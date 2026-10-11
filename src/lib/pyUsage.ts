/**
 * Detects which Python methods/idioms a solution uses, so problem pages can
 * link straight to the matching drill cards ("Python used in this solution").
 */
interface UsageRule {
  method: string;
  label: string;
  test: RegExp;
}

const RULES: UsageRule[] = [
  { method: "collections-counter", label: "Counter", test: /\bCounter\(/ },
  { method: "collections-defaultdict-list", label: "defaultdict", test: /\bdefaultdict\(/ },
  { method: "collections-deque-ends", label: "deque", test: /\bdeque\(/ },
  { method: "collections-deque-bfs", label: "BFS with deque.popleft()", test: /\.popleft\(\)/ },
  { method: "heapq-push-pop", label: "heappush / heappop", test: /heappush\(|heappop\(/ },
  { method: "heapq-heapify", label: "heapify", test: /heapify\(/ },
  { method: "heapq-max-heap", label: "max-heap by negation", test: /heappush\([^,]+,\s*\(?-/ },
  { method: "heapq-tuples", label: "heap of tuples", test: /heappush\([^,]+,\s*\(/ },
  { method: "heapq-nlargest", label: "nlargest / nsmallest", test: /nlargest\(|nsmallest\(/ },
  { method: "bisect-left-right", label: "bisect_left / bisect_right", test: /bisect_left\(|bisect_right\(|bisect\.bisect/ },
  { method: "bisect-insort", label: "insort", test: /insort\(/ },
  { method: "lists-sort-sorted", label: "sort / sorted", test: /\.sort\(|\bsorted\(/ },
  { method: "lists-sort-multikey", label: "sort with key=lambda", test: /key\s*=\s*lambda/ },
  { method: "lists-slicing", label: "slicing", test: /\[[^\]\n]*:[^\]\n]*\]/ },
  { method: "lists-2d-grid", label: "list of lists", test: /\[\[[^\]]*\]\s*\*|for _ in range\([^)]*\)\]/ },
  { method: "lists-stack", label: "list as a stack", test: /stack\.append\(|stack\.pop\(\)/ },
  { method: "builtins-enumerate", label: "enumerate", test: /\benumerate\(/ },
  { method: "builtins-zip", label: "zip", test: /\bzip\(/ },
  { method: "builtins-any-all", label: "any / all", test: /\b(any|all)\(/ },
  { method: "builtins-inf-binary", label: "float('inf')", test: /float\(["']-?inf["']\)/ },
  { method: "dicts-basics", label: "dict as a hash map", test: /=\s*\{\}|=\s*dict\(\)/ },
  { method: "dicts-get", label: "dict.get", test: /\.get\(/ },
  { method: "dicts-setdefault", label: "setdefault", test: /\.setdefault\(/ },
  { method: "dicts-iterate", label: "dict.items()", test: /\.items\(\)/ },
  { method: "dicts-tuple-keys", label: "tuple keys", test: /\[\(\s*\w+\s*,\s*\w+\s*\)\]/ },
  { method: "sets-visited", label: "visited set", test: /visited\s*=\s*set\(|seen\s*=\s*set\(/ },
  { method: "sets-membership", label: "set membership", test: /\bset\(/ },
  { method: "strings-join", label: "str.join", test: /["']\s*["']\.join\(|\.join\(/ },
  { method: "strings-split", label: "str.split", test: /\.split\(/ },
  { method: "strings-case-checks", label: "isalnum / lower", test: /\.isalnum\(\)|\.isalpha\(\)|\.isdigit\(\)|\.lower\(\)/ },
  { method: "strings-ord-chr", label: "ord / chr", test: /\bord\(|\bchr\(/ },
  { method: "functools-lru-cache", label: "lru_cache", test: /lru_cache/ },
  { method: "functools-cache", label: "@cache", test: /@cache\b/ },
  { method: "numbers-bitwise", label: "bitwise operators", test: /[^&]&[^&]|\^|<<|>>/ },
  { method: "numbers-bit-tricks", label: "n & (n - 1)", test: /&\s*\(\s*\w+\s*-\s*1\s*\)/ },
  { method: "numbers-mask32", label: "32-bit mask", test: /0xFFFFFFFF|0xffffffff/ },
  { method: "itertools-accumulate", label: "accumulate", test: /\baccumulate\(/ },
  { method: "gotchas-nonlocal", label: "nonlocal", test: /\bnonlocal\b/ },
  { method: "gotchas-class", label: "self.helper()", test: /def \w+\(self[^)]*\):[\s\S]*def \w+\(self/ },
  // Very common idioms go last so specific ones win when the list is capped.
  { method: "builtins-min-max", label: "min / max", test: /\b(min|max)\(/ },
  { method: "builtins-range", label: "range", test: /\brange\(/ },
  { method: "numbers-floordiv-mod", label: "// and %", test: /\/\/|%/ },
];

export interface PyUsage {
  method: string;
  label: string;
}

/** Methods used by `code`, limited to ids that exist in the drill content. */
export function detectPythonUsage(code: string, knownMethods?: Set<string>, max = 8): PyUsage[] {
  const out: PyUsage[] = [];
  const seen = new Set<string>();
  for (const r of RULES) {
    if (seen.has(r.method) || !r.test.test(code)) continue;
    if (knownMethods && !knownMethods.has(r.method)) continue;
    seen.add(r.method);
    out.push({ method: r.method, label: r.label });
    if (out.length >= max) break;
  }
  return out;
}
