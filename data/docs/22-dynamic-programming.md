---
title: Dynamic Programming
group: Algorithm Patterns
summary: Recognize DP problems, define states and transitions, and implement them top-down with memoization or bottom-up with tables, including space optimization and knapsack patterns.
keywords: [dynamic programming, dp, memoization, memo, lru_cache, cache, tabulation, bottom-up, top-down, state, transition, base case, climbing stairs, house robber, coin change, unique paths, longest common subsequence, knapsack, space optimization]
---

Dynamic programming is recursion plus remembering. When a brute-force recursion solves the same subproblem many times, store each subproblem's answer and reuse it. Exponential time drops to (number of distinct states) × (work per state).

## Recognizing a DP problem

Signals in the problem statement:

- The question asks for an **optimum** ("minimum cost", "maximum profit", "longest", "fewest"), a **count** ("how many ways"), or **feasibility** ("can you reach", "is it possible").
- You make a **sequence of choices** (take or skip, which coin, which step size), and later options depend on earlier ones only through a small summary such as an index or a remaining amount.
- Drawing the brute-force recursion tree shows **overlapping branches**: the same arguments appear again and again.
- **Optimal substructure:** the best answer for the whole problem is built from best answers to subproblems.

| If the question is... | Reach for |
| --- | --- |
| "List **all** solutions" | Backtracking. The output itself is exponential. |
| Min / max / count / feasibility, with overlapping subproblems | DP |
| One locally obvious choice is provably always safe | Greedy, which is cheaper. Check it against DP. |
| Shortest path in an unweighted graph or grid | BFS |

## State, transition, base case, answer

Answer four questions before writing any code:

1. **State:** what does `dp(i)` or `dp[i][j]` *mean*? Write it as a sentence, such as "the number of ways to reach step i". The state must include everything that affects the future.
2. **Transition:** how is a state computed from smaller states? Usually a `max`, `min`, sum or `or` over the available choices.
3. **Base cases:** the smallest states, answered directly (empty prefix, amount 0, first row). Impossible states get `inf`, `-inf` or `False`.
4. **Answer location:** which state is the final answer? `dp[n]`, `dp[0]`, `max(dp)` or `dp[m][n]`.

| Problem | State | Transition | Answer |
| --- | --- | --- | --- |
| Climbing Stairs | `dp[i]` = ways to reach step i | `dp[i-1] + dp[i-2]` | `dp[n]` |
| House Robber | `dp[i]` = best loot from houses `i..` | `max(dp[i+1], nums[i] + dp[i+2])` | `dp[0]` |
| House Robber II | circular street: run House Robber on `nums[1:]` and on `nums[:-1]` | same | max of the two |
| Coin Change | `dp[a]` = fewest coins that make amount a | `min(dp[a-c] + 1)` over coins c | `dp[amount]` |
| Decode Ways | `dp[i]` = ways to decode `s[:i]` | `dp[i-1]` if `s[i-1]` is not `"0"`, plus `dp[i-2]` if `s[i-2:i]` is 10–26 | `dp[n]` |
| Word Break | `dp[i]` = `s[:i]` can be segmented | any `dp[j] and s[j:i] in words` | `dp[n]` |
| Longest Increasing Subsequence | `dp[i]` = longest increasing subsequence ending at i | `1 + max(dp[j])` over j < i with `nums[j] < nums[i]` | `max(dp)` |
| Maximum Product Subarray | max and min product ending at i | `max/min(x, x*hi, x*lo)` | best seen |
| Unique Paths | `dp[r][c]` = paths to cell (r, c) | `dp[r-1][c] + dp[r][c-1]` | `dp[m-1][n-1]` |
| Longest Common Subsequence | `dp[i][j]` = LCS of `a[:i]` and `b[:j]` | on a match `dp[i-1][j-1] + 1`, otherwise `max(dp[i-1][j], dp[i][j-1])` | `dp[m][n]` |
| Longest Palindromic Substring | `dp[i][j]` = `s[i..j]` is a palindrome | `s[i] == s[j] and dp[i+1][j-1]` | longest true range |

## Top-down memoization with a dict

Write the brute-force recursion first, then add a cache in front of it:

```python
memo = {}
def dp(i):
    if i in memo:
        return memo[i]
    if base_case(i):
        return base_value
    memo[i] = combine(dp(smaller(i)), ...)
    return memo[i]
```

- The memo key must contain **every argument that changes**. For two arguments use `memo[(i, j)]`.
- Create the memo **inside** the outer function, not at module level or as a default argument. Otherwise test cases share stale answers.
- Top-down only computes the states that are actually reachable, and it's the quickest version to write correctly.

```python run
def climb_stairs(n):
    memo = {}
    def dp(i):                       # number of ways to reach step i
        if i <= 1:
            return 1                 # step 0 (start) and step 1: one way each
        if i in memo:
            return memo[i]
        memo[i] = dp(i - 1) + dp(i - 2)   # last move was 1 step or 2 steps
        return memo[i]
    return dp(n)

print([climb_stairs(n) for n in range(1, 8)])   # [1, 2, 3, 5, 8, 13, 21]
print(climb_stairs(50))                         # 20365011074
```

## Top-down with lru_cache

`functools.lru_cache` memoizes a function for you. Use `@lru_cache(None)` or `@lru_cache(maxsize=None)` for an unbounded cache. On Python 3.9+, `@cache` does the same thing.

```python
from functools import lru_cache

@lru_cache(None)
def dp(i, j):
    ...
```

- **Arguments must be hashable.** Pass indices, ints, strings or tuples, never lists or sets.
- Define the decorated function **inside** the method, so each call to the method starts with a fresh cache. Otherwise call `dp.cache_clear()` between runs.
- Each cached call still adds a stack frame. With `n ≈ 10⁴` or more, top-down can hit the recursion limit, so prefer bottom-up there.

```python run
from functools import lru_cache

def climb_stairs(n):
    @lru_cache(maxsize=None)
    def dp(i):
        if i <= 1:
            return 1
        return dp(i - 1) + dp(i - 2)
    return dp(n)

def unique_paths(m, n):
    @lru_cache(None)
    def dp(r, c):                    # paths from (0, 0) to (r, c)
        if r == 0 or c == 0:
            return 1                 # first row / first column: only one way
        return dp(r - 1, c) + dp(r, c - 1)
    result = dp(m - 1, n - 1)
    print("  cache:", dp.cache_info())
    return result

print(climb_stairs(10))      # 89
print(unique_paths(3, 7))    # 28
```

## Bottom-up tabulation

Fill a table from the base cases upward. Visit states in an order where every state a cell depends on is already filled. There's no recursion, so there's no stack limit, and it usually runs faster in Python.

Steps:

1. Allocate the table, often of size `n + 1` so that `dp[0]` can be the "empty" base case.
2. Fill in the base cases.
3. Loop in dependency order and apply the transition.
4. Return the answer cell.

Top-down and bottom-up compute the same values:

```python run
from functools import lru_cache

def climb_top_down(n):
    @lru_cache(None)
    def dp(i):
        return 1 if i <= 1 else dp(i - 1) + dp(i - 2)
    return dp(n)

def climb_bottom_up(n):
    dp = [0] * (n + 1)
    dp[0] = 1                        # base cases
    if n >= 1:
        dp[1] = 1
    for i in range(2, n + 1):        # dependency order: smaller i first
        dp[i] = dp[i - 1] + dp[i - 2]
    return dp[n]

top = [climb_top_down(n) for n in range(1, 16)]
bottom = [climb_bottom_up(n) for n in range(1, 16)]
print(top)
print("same answers:", top == bottom)    # True
```

## Space optimization: rolling variables and one row

If `dp[i]` depends only on the previous **k** entries, keep k variables instead of the whole array. If row `r` of a 2-D table depends only on row `r - 1`, keep **one row** and update it in place.

| Recurrence depends on | Store | Space |
| --- | --- | --- |
| `dp[i-1]`, `dp[i-2]` | two variables | O(1) |
| previous row only | one row | O(columns) |
| previous row and the diagonal (LCS) | one row plus a saved `prev_diag` | O(columns) |

```python run
def climb_stairs_o1(n):
    prev, curr = 1, 1                # dp[i - 2], dp[i - 1]
    for _ in range(2, n + 1):
        prev, curr = curr, prev + curr
    return curr

def unique_paths_one_row(m, n):
    row = [1] * n                    # the first row: one way to reach each cell
    for _ in range(1, m):
        for c in range(1, n):
            row[c] += row[c - 1]     # old row[c] = from above, row[c - 1] = from the left
    return row[-1]

print(climb_stairs_o1(10), unique_paths_one_row(3, 7))   # 89 28
```

Only optimize space **after** the full-table version works. The interview answer can be "O(n) table, and it reduces to O(1) because each state only looks back two steps."

## 1-D example: House Robber

You can't rob two adjacent houses. At house `i`, either **skip** it (`dp(i + 1)`) or **rob** it and skip its neighbor (`nums[i] + dp(i + 2)`).

```python run
from functools import lru_cache

def rob_top_down(nums):
    @lru_cache(None)
    def dp(i):                           # best loot from houses i, i+1, ...
        if i >= len(nums):
            return 0
        return max(dp(i + 1), nums[i] + dp(i + 2))
    return dp(0)

def rob_bottom_up(nums):
    n = len(nums)
    dp = [0] * (n + 2)                   # dp[n] = dp[n + 1] = 0: no houses left
    for i in range(n - 1, -1, -1):       # dp[i] depends on larger i → go backwards
        dp[i] = max(dp[i + 1], nums[i] + dp[i + 2])
    return dp[0]

def rob_o1(nums):
    prev2, prev1 = 0, 0                  # best up to house i-2, best up to house i-1
    for x in nums:
        prev2, prev1 = prev1, max(prev1, prev2 + x)
    return prev1

def rob_circular(nums):                  # House Robber II: first and last are adjacent
    if len(nums) == 1:
        return nums[0]
    return max(rob_o1(nums[1:]), rob_o1(nums[:-1]))

for houses in ([1, 2, 3, 1], [2, 7, 9, 3, 1], [2, 1, 1, 2], []):
    print(houses, rob_top_down(houses), rob_bottom_up(houses), rob_o1(houses))
print(rob_circular([2, 3, 2]), rob_circular([1, 2, 3, 1]))   # 3 4
```

## 2-D example: Unique Paths

A robot moves only right or down on an `m × n` grid. The number of ways to reach a cell is the ways to reach the cell **above** it plus the ways to reach the cell to its **left**. The first row and the first column are all 1.

For **Unique Paths II**, which adds obstacles, set any obstacle cell to 0 and use the same recurrence.

```python run
def unique_paths(m, n):
    dp = [[1] * n for _ in range(m)]    # NOT [[1] * n] * m: that aliases every row
    for r in range(1, m):
        for c in range(1, n):
            dp[r][c] = dp[r - 1][c] + dp[r][c - 1]
    for row in dp:
        print("  ", " ".join(f"{v:>3}" for v in row))
    return dp[m - 1][n - 1]

print(unique_paths(3, 7))   # 28
```

O(m · n) time. The space is O(m · n), or O(n) with one row.

## 2-D example: Longest Common Subsequence

Compare the next characters of `a` and `b`. If they **match**, both belong in the LCS, so take 1 plus the answer for the rest of both strings. Otherwise, drop one character from either string and take the better result.

```python run
from functools import lru_cache

def lcs_top_down(a, b):
    @lru_cache(None)
    def dp(i, j):                          # LCS of a[i:] and b[j:]
        if i == len(a) or j == len(b):
            return 0
        if a[i] == b[j]:
            return 1 + dp(i + 1, j + 1)
        return max(dp(i + 1, j), dp(i, j + 1))
    return dp(0, 0)

def lcs_bottom_up(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]   # dp[i][j] = LCS of a[:i] and b[:j]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]

for a, b in [("abcde", "ace"), ("abc", "abc"), ("abc", "def"), ("bsbininm", "jmjkbkjkv")]:
    print(a, b, lcs_top_down(a, b), lcs_bottom_up(a, b))
```

The extra row and column of zeros in the table (the `+ 1` sizes) are the "empty prefix" base cases, so you don't need special handling for `i == 0` or `j == 0`.

## Knapsack-style example: Coin Change

**Coin Change**: find the fewest coins that sum to `amount`, with unlimited coins of each value. The state is the remaining amount. The transition tries every coin as the last coin used.

```python run
from functools import lru_cache

def coin_change_top_down(coins, amount):
    @lru_cache(None)
    def dp(a):                                   # fewest coins to make amount a
        if a == 0:
            return 0
        if a < 0:
            return float("inf")                  # impossible
        return 1 + min(dp(a - c) for c in coins)
    best = dp(amount)
    return -1 if best == float("inf") else best

def coin_change_bottom_up(coins, amount):
    INF = amount + 1                             # more coins than could ever be needed
    dp = [0] + [INF] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                dp[a] = min(dp[a], dp[a - c] + 1)
    return -1 if dp[amount] == INF else dp[amount]

for coins, amount in [([1, 2, 5], 11), ([2], 3), ([1], 0), ([1, 3, 4], 6)]:
    print(coins, amount, coin_change_top_down(coins, amount), coin_change_bottom_up(coins, amount))
# 3, -1, 0, 2
```

O(amount × number of coins) time, O(amount) space. The top-down version can recurse `amount` levels deep (with a coin of 1), so the bottom-up version is the safer submission. Greedy "largest coin first" is **wrong** here: for `[1, 3, 4]` and 6, greedy picks 4 + 1 + 1 but 3 + 3 is better. See the Greedy page.

## Knapsack loop order: reuse, once, combinations, permutations

For 1-D knapsack tables, the loop order decides what gets counted:

| Goal | Outer loop | Inner loop |
| --- | --- | --- |
| Unbounded (reuse items), count **combinations**: Coin Change II | items | amounts **increasing** |
| Unbounded, count **ordered sequences**: Combination Sum IV | amounts | items |
| 0/1 (each item at most once): Partition Equal Subset Sum | items | amounts **decreasing** |

Iterating amounts downward in the 0/1 case means `dp[s - x]` still holds the value from *before* item `x` was considered, so each item is used at most once.

```python run
def count_combinations(coins, amount):     # Coin Change II: order doesn't matter
    dp = [1] + [0] * amount
    for c in coins:                        # items outer → each multiset counted once
        for a in range(c, amount + 1):
            dp[a] += dp[a - c]
    return dp[amount]

def count_sequences(nums, target):         # Combination Sum IV: order matters
    dp = [1] + [0] * target
    for a in range(1, target + 1):         # amounts outer → every ordering counted
        for x in nums:
            if x <= a:
                dp[a] += dp[a - x]
    return dp[target]

def can_partition(nums):                   # 0/1 knapsack: each number used at most once
    total = sum(nums)
    if total % 2:
        return False
    target = total // 2
    dp = [True] + [False] * target         # dp[s]: some subset sums to s
    for x in nums:
        for s in range(target, x - 1, -1): # DOWNWARD so x isn't reused
            dp[s] = dp[s] or dp[s - x]
    return dp[target]

print(count_combinations([1, 2, 5], 5))    # 4  (5, 2+2+1, 2+1+1+1, 1*5)
print(count_sequences([1, 2, 3], 4))       # 7
print(can_partition([1, 5, 11, 5]), can_partition([1, 2, 3, 5]))   # True False
```

## DP checklist

Work through these in order when you're stuck:

1. **Brute force first:** what choice do I make at each step? Write the recursion with no caching.
2. **State:** the fewest parameters that fully determine the rest of the problem (index, remaining amount, previous choice, a flag). Write down what `dp(state)` means in words.
3. **Transition:** combine the choices with `min`, `max`, `+` or `or`.
4. **Base cases:** empty input, zero amount, out-of-bounds index. Use `inf`, `-inf` or `False` for impossible states.
5. **Answer:** which state? `dp(0)`, `dp[n]`, `max(dp)`, `dp[m][n]`.
6. **Memoize** with `@lru_cache(None)` or a dict, **or tabulate** bottom-up in dependency order.
7. **Complexity** = number of states × work per state.
8. **Optimize space** if each state only looks back a fixed distance.
9. **Test tiny cases** (n = 0, 1, 2), impossible inputs, and the sample cases.

Common pitfalls:

- Building a 2-D table with `[[0] * n] * m`, which makes every row the same list. Use `[[0] * n for _ in range(m)]`.
- A module-level memo shared between test cases.
- Passing a `list` to an `lru_cache` function, which raises `TypeError: unhashable type`.
- Table size off by one: you need `n + 1` slots when `dp[0]` means "empty".
- Returning `inf` where the problem wants `-1`.
- Top-down recursion that is too deep for large `n`.
