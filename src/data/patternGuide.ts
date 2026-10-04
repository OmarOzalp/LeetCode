/**
 * "What pattern should I think of?" — signals in a problem statement mapped to
 * the technique they usually call for, with Blind 75 problems to practice it.
 */
export interface PatternHint {
  signal: string;
  pattern: string;
  why: string;
  problems: string[];
  /** Docs section slug with the template. */
  docs?: string;
}

export const PATTERN_GUIDE: PatternHint[] = [
  {
    signal: "Need fast lookup? “Have I seen this before?”",
    pattern: "Hash Map / Set",
    why: "O(1) average membership and lookups replace an inner loop. Store what you've seen (or value → index) as you scan.",
    problems: ["two-sum", "contains-duplicate", "longest-consecutive-sequence", "valid-anagram"],
    docs: "dictionaries",
  },
  {
    signal: "Sorted array, or you can afford to sort?",
    pattern: "Binary Search / Two Pointers",
    why: "Order lets you discard half the search space (binary search) or move two pointers inward based on a comparison.",
    problems: ["3sum", "container-with-most-water", "search-in-rotated-sorted-array", "find-minimum-in-rotated-sorted-array"],
    docs: "two-pointers",
  },
  {
    signal: "Contiguous subarray or substring with a constraint?",
    pattern: "Sliding Window",
    why: "Expand the right edge, shrink the left edge while the window is invalid. Each index enters and leaves once → O(n).",
    problems: ["longest-substring-without-repeating-characters", "longest-repeating-character-replacement", "minimum-window-substring", "best-time-to-buy-and-sell-stock"],
    docs: "sliding-window",
  },
  {
    signal: "Level-by-level traversal or shortest path in an unweighted graph?",
    pattern: "BFS (queue)",
    why: "A queue processes nodes in order of distance from the start, so the first time you reach a node is via a shortest path.",
    problems: ["binary-tree-level-order-traversal", "pacific-atlantic-water-flow", "number-of-islands"],
    docs: "graphs",
  },
  {
    signal: "Explore every path, combination or arrangement?",
    pattern: "DFS / Backtracking",
    why: "Build a candidate step by step, recurse, then undo the choice. Prune branches that can't lead to a valid answer.",
    problems: ["combination-sum", "word-search", "word-search-ii"],
    docs: "backtracking",
  },
  {
    signal: "Repeated decisions with overlapping subproblems? “Count the ways”, “min/max cost”?",
    pattern: "Dynamic Programming",
    why: "Define a state, write the recurrence, and cache each state's answer so it's computed once.",
    problems: ["climbing-stairs", "house-robber", "coin-change", "longest-common-subsequence", "word-break"],
    docs: "dynamic-programming",
  },
  {
    signal: "Need the smallest/largest element repeatedly, or the top K?",
    pattern: "Heap / Priority Queue",
    why: "push/pop in O(log n) and peek in O(1). A size-k heap keeps the best k items seen so far.",
    problems: ["top-k-frequent-elements", "merge-k-sorted-lists", "find-median-from-data-stream", "meeting-rooms-ii"],
    docs: "heap",
  },
  {
    signal: "Overlapping ranges, schedules or meetings?",
    pattern: "Intervals (sort by start)",
    why: "After sorting, overlaps can only happen between neighbours, so one linear pass merges or counts them.",
    problems: ["merge-intervals", "insert-interval", "non-overlapping-intervals", "meeting-rooms"],
    docs: "intervals",
  },
  {
    signal: "Dependencies, prerequisites, “X must come before Y”?",
    pattern: "Graph + Indegree (Topological Sort)",
    why: "Repeatedly take nodes with indegree 0 (Kahn's algorithm). If some nodes never reach 0 there's a cycle.",
    problems: ["course-schedule", "alien-dictionary"],
    docs: "graphs",
  },
  {
    signal: "Matching brackets, “most recent unmatched”, undo?",
    pattern: "Stack",
    why: "Last-in, first-out matches nesting: the most recent opener must be closed first.",
    problems: ["valid-parentheses"],
    docs: "stack",
  },
  {
    signal: "Linked list cycle, middle node, or k-th from the end?",
    pattern: "Fast & Slow Pointers",
    why: "Two pointers moving at different speeds (or with a fixed gap) find positions in one pass with O(1) space.",
    problems: ["linked-list-cycle", "reorder-list", "remove-nth-node-from-end-of-list"],
    docs: "linked-lists",
  },
  {
    signal: "Many queries about prefixes of words?",
    pattern: "Trie",
    why: "Words sharing a prefix share nodes, so prefix queries cost O(length of the prefix).",
    problems: ["implement-trie-prefix-tree", "design-add-and-search-words-data-structure", "word-search-ii"],
    docs: "tries",
  },
  {
    signal: "Connectivity / grouping as edges are added?",
    pattern: "Union-Find (or DFS)",
    why: "Union-find merges groups in near-constant time and detects when an edge connects two nodes already in the same group (a cycle).",
    problems: ["number-of-connected-components-in-an-undirected-graph", "graph-valid-tree"],
    docs: "graphs",
  },
  {
    signal: "Maximum sum/product of a contiguous subarray?",
    pattern: "Kadane's Algorithm",
    why: "At each index, either extend the best subarray ending at the previous index or start fresh.",
    problems: ["maximum-subarray", "maximum-product-subarray"],
    docs: "greedy",
  },
  {
    signal: "Tree question about a path, height or validity?",
    pattern: "Recursive DFS returning values",
    why: "Let each call return what its parent needs (height, max path, bounds) and combine children's answers.",
    problems: ["maximum-depth-of-binary-tree", "binary-tree-maximum-path-sum", "validate-binary-search-tree", "invert-binary-tree"],
    docs: "trees",
  },
  {
    signal: "Grid of cells: islands, regions, flood fill?",
    pattern: "DFS/BFS on a grid",
    why: "Treat each cell as a node with up to 4 neighbours; mark visited cells so each is processed once.",
    problems: ["number-of-islands", "pacific-atlantic-water-flow", "word-search"],
    docs: "graphs",
  },
  {
    signal: "“Each element appears twice except one”, powers of two, no + operator?",
    pattern: "Bit Manipulation",
    why: "XOR cancels pairs, n & (n − 1) drops the lowest set bit, and shifts/masks emulate arithmetic.",
    problems: ["missing-number", "number-of-1-bits", "counting-bits", "sum-of-two-integers", "reverse-bits"],
    docs: "bit-manipulation",
  },
  {
    signal: "Smallest value that satisfies a monotonic condition?",
    pattern: "Binary Search on the Answer",
    why: "If feasible(x) is false…false, true…true, binary search the boundary instead of trying every x.",
    problems: ["find-minimum-in-rotated-sorted-array", "longest-increasing-subsequence"],
    docs: "binary-search",
  },
  {
    signal: "Matrix rotation, spiral order, in-place marking?",
    pattern: "Matrix simulation / index math",
    why: "Work out the index mapping (e.g. (r, c) → (c, n − 1 − r)) and walk layer by layer, keeping explicit boundaries.",
    problems: ["rotate-image", "spiral-matrix", "set-matrix-zeroes"],
  },
];
