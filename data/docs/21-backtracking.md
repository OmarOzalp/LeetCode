---
title: Backtracking
group: Algorithm Patterns
summary: Generate every candidate solution by building it one choice at a time and undoing each choice, with templates for subsets, permutations, combinations and grid searches.
keywords: [backtracking, dfs, choose explore unchoose, subsets, permutations, combinations, combination sum, word search, n-queens, pruning, path copy, start index, duplicates, power set, exhaustive search]
---

Backtracking is DFS over a tree of decisions. Make a choice, recurse to explore everything that follows from it, then undo the choice so the next option starts from a clean state. Use it when the problem asks you to **list every solution**, or to find one in a search space too irregular for DP.

## When to use backtracking

Signals in the problem statement:

- "Return **all** subsets / permutations / combinations / partitions / valid arrangements."
- "Find a path in a grid that spells a word" (**Word Search**), or place pieces under constraints (N-Queens, Sudoku).
- **Small input**, usually n ≤ 20, sometimes n ≤ 10. Exponential output means exponential time no matter what.

If the problem asks only for a **count** or an **optimum**, and the subproblems repeat, DP is usually better. Backtracking is the tool for *enumerating* solutions.

## The template: choose → explore → un-choose

```python
result = []

def backtrack(path, choices):
    if solution_found(path):
        result.append(path[:])          # store a COPY of the current path
        return
    for choice in choices:
        if not valid(choice, path):     # pruning: skip dead branches early
            continue
        path.append(choice)             # choose
        backtrack(path, choices)        # explore
        path.pop()                      # un-choose (restore state for the next choice)
```

- **Choose:** change the shared state (`path`, a `used` array, a visited cell, a set).
- **Explore:** recurse with the new state.
- **Un-choose:** reverse *exactly* what the choose step did, so when the call returns, the state looks as if this branch never happened.

Because the state is restored after every branch, one `path` list serves the whole search. That keeps memory at O(depth) instead of a copy per node.

The trace below shows each step while generating the permutations of `[1, 2, 3]`:

```python run
def permutations_traced(nums):
    result, path = [], []
    def backtrack(depth):
        indent = "  " * depth
        if len(path) == len(nums):
            result.append(path[:])
            print(f"{indent}found {path}")
            return
        for x in nums:
            if x in path:
                continue                    # already chosen on this branch
            path.append(x)
            print(f"{indent}choose {x} → path {path}")
            backtrack(depth + 1)
            path.pop()
            print(f"{indent}undo   {x} → path {path}")
    backtrack(0)
    return result

print(permutations_traced([1, 2, 3]))
```

## Why path[:] matters

`path` is a single list that keeps changing. `result.append(path)` stores a **reference** to it, so every entry in `result` is the same object, and they all show its final state, which is empty after the last `pop()`. `path[:]`, `list(path)` or `path.copy()` stores a snapshot.

```python run
def subsets(nums, copy):
    result, path = [], []
    def backtrack(start):
        result.append(path[:] if copy else path)
        for i in range(start, len(nums)):
            path.append(nums[i])
            backtrack(i + 1)
            path.pop()
    backtrack(0)
    return result

print(subsets([1, 2, 3], copy=False))  # [[], [], [], [], [], [], [], []]
print(subsets([1, 2, 3], copy=True))   # [[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]]
```

Snapshots aren't needed if you pass a **new** list down, as in `backtrack(path + [x])`, or use immutable strings. Those versions cost O(length) per call but have no undo step to forget.

## Subsets (power set)

Two equivalent decision trees:

- **Start-index loop:** every node in the tree is a subset. Loop over the elements after `start`, so each subset is generated in only one order.
- **Include / exclude:** a binary choice per element, and only the leaves (`i == n`) are subsets.

Both produce 2^n subsets and take O(n · 2^n) time once you count the copies.

```python run
def subsets(nums):
    result, path = [], []
    def backtrack(start):
        result.append(path[:])            # every node is a valid subset
        for i in range(start, len(nums)):
            path.append(nums[i])          # choose nums[i]
            backtrack(i + 1)              # explore: only later elements
            path.pop()                    # un-choose
    backtrack(0)
    return result

def subsets_include_exclude(nums):
    result, path = [], []
    def backtrack(i):
        if i == len(nums):
            result.append(path[:])
            return
        path.append(nums[i])              # include nums[i]
        backtrack(i + 1)
        path.pop()
        backtrack(i + 1)                  # exclude nums[i]
    backtrack(0)
    return result

print(subsets([1, 2, 3]))
print(subsets_include_exclude([1, 2, 3]))
print(len(subsets(list(range(10)))))      # 1024 = 2^10
```

## Handling duplicates: sort and skip

With repeated values, as in **Subsets II** and **Combination Sum II**, sort first so equal values sit next to each other. Then, **at the same level of the tree**, skip a value equal to the previous one. Picking either copy would lead to the same subtree.

```python
if i > start and nums[i] == nums[i - 1]:
    continue
```

Write `i > start`, not `i > 0`. The value is skipped only as a *second option at the same level*. It can still be used deeper in the tree, which is how `[1, 2, 2]` gets generated.

```python run
def subsets_with_dup(nums):
    nums.sort()
    result, path = [], []
    def backtrack(start):
        result.append(path[:])
        for i in range(start, len(nums)):
            if i > start and nums[i] == nums[i - 1]:
                continue                  # same value at the same depth → same subtree
            path.append(nums[i])
            backtrack(i + 1)
            path.pop()
    backtrack(0)
    return result

print(subsets_with_dup([1, 2, 2]))   # [[], [1], [1, 2], [1, 2, 2], [2], [2, 2]]
print(subsets_with_dup([0]))         # [[], [0]]
```

## Permutations

Order matters, so every level loops over **all** elements and skips the ones already in the path. A `used` boolean array makes that check O(1). There are n! permutations, and copying each one costs O(n), so O(n · n!) total.

```python run
import itertools

def permutations(nums):
    result, path = [], []
    used = [False] * len(nums)
    def backtrack():
        if len(path) == len(nums):
            result.append(path[:])
            return
        for i in range(len(nums)):
            if used[i]:
                continue
            used[i] = True               # choose
            path.append(nums[i])
            backtrack()                  # explore
            path.pop()                   # un-choose (both pieces of state)
            used[i] = False
    backtrack()
    return result

print(permutations([1, 2, 3]))
print(len(permutations([1, 2, 3, 4, 5])))    # 120 = 5!
print([list(p) for p in itertools.permutations([1, 2, 3])] == permutations([1, 2, 3]))  # True
```

In real code, `itertools.permutations` and `itertools.combinations` do this for you. Interviewers usually want to see the backtracking itself.

## Combinations (choose k of n)

Use a start index so that each set is generated in only one order. **Prune** a branch when not enough numbers remain to fill the path. If `need` more are required, the loop only has to go up to `n - need + 1`.

```python run
def combine(n, k):
    result, path = [], []
    def backtrack(start):
        if len(path) == k:
            result.append(path[:])
            return
        need = k - len(path)
        for x in range(start, n - need + 2):     # prune: leave room for the rest
            path.append(x)
            backtrack(x + 1)
            path.pop()
    backtrack(1)
    return result

print(combine(4, 2))          # [[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]]
print(len(combine(10, 3)))    # 120 = C(10, 3)
```

## Combination Sum: reuse with a start index

**Combination Sum**: each candidate can be used **any number of times**, and order doesn't matter.

- Recurse with `i`, not `i + 1`, so the same candidate can be chosen again.
- The start index still stops `[3, 2, 2]` from appearing after `[2, 2, 3]`.
- Sort first. Then once `candidate > remaining`, every later candidate is too big as well, so `break` instead of `continue`.

| Variant | Recurse with | Extra |
| --- | --- | --- |
| Reuse allowed (Combination Sum) | `backtrack(i, ...)` | sort + `break` |
| Each element once (Combination Sum II) | `backtrack(i + 1, ...)` | sort + skip `i > start` duplicates |
| Order matters (Permutations) | loop from 0 | `used` array |

```python run
def combination_sum(candidates, target):
    candidates.sort()
    result, path = [], []
    def backtrack(start, remaining):
        if remaining == 0:
            result.append(path[:])
            return
        for i in range(start, len(candidates)):
            c = candidates[i]
            if c > remaining:
                break                         # prune: the rest are even bigger
            path.append(c)
            backtrack(i, remaining - c)       # i, not i + 1 → c may be reused
            path.pop()
    backtrack(0, target)
    return result

print(combination_sum([2, 3, 6, 7], 7))   # [[2, 2, 3], [7]]
print(combination_sum([2, 3, 5], 8))      # [[2, 2, 2, 2], [2, 3, 3], [3, 5]]
print(combination_sum([2], 1))            # []
```

## Pruning

Pruning cuts off a branch as soon as it can't lead to a valid answer. It doesn't change the worst-case big-O, but in practice it often makes searches thousands of times faster.

- **Sort, then `break`:** once a candidate is too big, so is everything after it.
- **Feasibility bounds:** stop when the elements left can't fill the remaining slots or reach the remaining sum.
- **O(1) constraint checks:** keep sets of used columns and diagonals instead of rescanning the board.
- **Stop at the first answer** when only existence is asked: return `True` up the stack immediately.

**N-Queens**: place one queen per row, and use sets to reject attacked columns and diagonals in O(1). On a given diagonal `row - col` is constant, and on a given anti-diagonal `row + col` is constant.

```python run
def solve_n_queens(n):
    cols, diag, anti = set(), set(), set()
    board = [["."] * n for _ in range(n)]
    result = []
    def backtrack(row):
        if row == n:
            result.append(["".join(r) for r in board])
            return
        for col in range(n):
            if col in cols or (row - col) in diag or (row + col) in anti:
                continue                       # prune: square is attacked
            cols.add(col)
            diag.add(row - col)
            anti.add(row + col)
            board[row][col] = "Q"
            backtrack(row + 1)
            board[row][col] = "."              # un-choose everything we changed
            cols.remove(col)
            diag.remove(row - col)
            anti.remove(row + col)
    backtrack(0)
    return result

for solution in solve_n_queens(4):
    print("\n".join(solution), end="\n\n")
print("8 queens:", len(solve_n_queens(8)), "solutions")   # 92
```

## Word Search: grid backtracking

**Word Search**: from every cell, run a DFS that matches `word[i]` and moves in four directions. A cell can't be reused within one path. To enforce that:

- **Choose:** overwrite the cell with a marker such as `"#"`. No letter equals `"#"`, so the path can't step on that cell again.
- **Un-choose:** put the original letter back after exploring, whether or not the word was found, so other paths can use the cell.

```python run
def exist(board, word):
    rows, cols = len(board), len(board[0])
    def backtrack(r, c, i):
        if i == len(word):
            return True                                  # matched every letter
        if r < 0 or c < 0 or r >= rows or c >= cols or board[r][c] != word[i]:
            return False                                 # off-grid, mismatch or visited ("#")
        saved = board[r][c]
        board[r][c] = "#"                                # choose: mark visited in place
        found = (backtrack(r + 1, c, i + 1) or backtrack(r - 1, c, i + 1) or
                 backtrack(r, c + 1, i + 1) or backtrack(r, c - 1, i + 1))
        board[r][c] = saved                              # un-choose: restore
        return found
    return any(backtrack(r, c, 0) for r in range(rows) for c in range(cols))

board = [["A", "B", "C", "E"],
         ["S", "F", "C", "S"],
         ["A", "D", "E", "E"]]
print(exist(board, "ABCCED"))   # True
print(exist(board, "SEE"))      # True
print(exist(board, "ABCB"))     # False (B can't be reused)
print(board[0])                 # ['A', 'B', 'C', 'E']: the board is restored
```

Complexity: O(m · n · 3^L) for word length L. There are m · n starting cells, and after the first step each cell has at most 3 unvisited neighbors. Two cheap prunings help: return `False` if the board doesn't contain enough of each letter, and search the reversed word if its last letter is rarer than its first. For many words at once (**Word Search II**), walk a Trie during the DFS instead of matching one word at a time.

## Complexity intuition

The cost is roughly (number of nodes in the decision tree) × (work per node, including copying a solution).

| Problem | Tree size | Time |
| --- | --- | --- |
| Subsets | 2^n leaves | O(n · 2^n) |
| Permutations | n! leaves | O(n · n!) |
| Combinations C(n, k) | C(n, k) leaves | O(k · C(n, k)) |
| Combination Sum (target T, smallest candidate m) | depth up to T / m | O(n^(T/m)) worst case |
| Word Search | 4 · 3^(L-1) paths per start cell | O(m · n · 3^L) |
| N-Queens | about n! placements, heavily pruned | O(n!) |

Sizes to remember: 2^20 ≈ 10⁶ is fine, 10! ≈ 3.6 × 10⁶ is fine, and 12! ≈ 4.8 × 10⁸ is too slow in Python.

## Common backtracking mistakes

- Appending `path` instead of `path[:]`.
- **Incomplete un-choose:** you must undo *every* piece of state you changed (`path`, `used`, the sets, the board cell) on *every* exit path, including early returns.
- **Wrong start index:** `i` means reuse, `i + 1` means each element once, and `0` with a `used` array means permutations.
- **Duplicates:** forgetting to sort before skipping, or writing `i > 0` instead of `i > start`.
- **Returning too early in "find all" problems.** Only short-circuit when a single answer is enough, as in Word Search.
- Restoring the Word Search cell *before* every neighbor has been explored, or not restoring it at all.
