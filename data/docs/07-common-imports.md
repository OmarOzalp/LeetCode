---
title: Common Imports
group: Python Essentials
summary: The standard-library modules worth knowing for interviews - collections, functools, heapq, math, bisect and itertools - and exactly when each one helps.
keywords: [import, collections, deque, defaultdict, Counter, functools, lru_cache, cache, memoization, heapq, math, gcd, ceil, floor, sqrt, isqrt, comb, bisect, bisect_left, bisect_right, insort, binary search, itertools, combinations, permutations, product, accumulate, prefix sum, typing, recursion limit]
---

LeetCode pre-imports most of these, but in a real interview (or a blank editor) you should write the imports yourself. This page is the quick map from module to use case. Several of them have their own sections with full details.

## Typical import header

```python
from collections import deque, defaultdict, Counter
from functools import lru_cache, cmp_to_key
from typing import List, Optional
import heapq
import math
import bisect
import itertools
```

| Module | Reach for it when you need… |
|---|---|
| `collections.deque` | a queue (BFS) or a sliding-window deque |
| `collections.defaultdict` | adjacency lists, grouping, counting without key checks |
| `collections.Counter` | frequency counts, anagram comparisons, top-k frequent |
| `functools.lru_cache` | memoized recursion (top-down DP) |
| `heapq` | repeated access to the smallest/largest item, top-k, Dijkstra |
| `math` | `inf`, `gcd`, `ceil`, `sqrt`, `isqrt`, `comb` |
| `bisect` | binary search on a sorted list, LIS in O(n log n) |
| `itertools` | brute-force combinations/permutations, prefix sums |

## collections.deque

A double-ended queue with **O(1)** appends and pops at **both** ends.

**Use it when:** you need a FIFO queue (every BFS), a monotonic deque (Sliding Window Maximum), or a fixed-size recent-items buffer (`deque(maxlen=k)`). Never use `list.pop(0)` as a queue, because it is O(n).

```python run
from collections import deque
queue = deque([1, 2])
queue.append(3)          # enqueue right
print(queue.popleft())   # dequeue left: 1
queue.appendleft(0)
print(queue, queue[0], queue[-1])
```

Full details: *Queue & Deque*.

## collections.defaultdict

A dict that creates a default value (`list()`, `int()`, `set()`, …) the first time a missing key is accessed.

**Use it when:** building adjacency lists (`graph[u].append(v)`), grouping (`groups[key].append(item)`), or counting (`count[x] += 1`) without writing `if key not in d` checks.

```python run
from collections import defaultdict
graph = defaultdict(list)
for u, v in [(0, 1), (0, 2), (1, 2)]:
    graph[u].append(v)
    graph[v].append(u)
print(dict(graph))
```

Full details: *defaultdict*.

## collections.Counter

A dict subclass for counting hashable items. Missing keys read as `0`.

**Use it when:** you need frequencies (Top K Frequent Elements, Valid Anagram, Ransom Note), the most common items (`most_common(k)`), or to compare two multisets (`Counter(s) == Counter(t)`).

```python run
from collections import Counter
counts = Counter("mississippi")
print(counts["s"], counts["z"])        # 4 0
print(counts.most_common(2))           # [('i', 4), ('s', 4)]
print(Counter("listen") == Counter("silent"))
```

Full details: *Counter*.

## functools.lru_cache and cache

Decorators that **memoize** a function: results are cached by argument values, so each distinct call is computed once.

**Use it when:** writing top-down DP / recursion with overlapping subproblems (Climbing Stairs, Decode Ways, Word Break, Coin Change, Longest Common Subsequence). It turns exponential recursion into O(number of states × work per state).

- `@lru_cache(maxsize=None)` works on every Python 3 version; `@cache` is the same thing in Python **3.9+**.
- Arguments must be **hashable**: pass indices or tuples, not lists or sets.
- Define the cached function **inside** the solution method so the cache is fresh for each test case.
- Deep recursion can hit Python's default limit of about 1000 frames; see *sys.setrecursionlimit* below.

```python run
from functools import lru_cache

def num_decodings(s):
    @lru_cache(maxsize=None)
    def dp(i):
        if i == len(s):
            return 1
        if s[i] == "0":
            return 0
        ways = dp(i + 1)
        if i + 1 < len(s) and int(s[i:i + 2]) <= 26:
            ways += dp(i + 2)
        return ways
    return dp(0)

def coin_change(coins, amount):
    @lru_cache(maxsize=None)
    def fewest(rem):
        if rem == 0:
            return 0
        if rem < 0:
            return float("inf")
        return 1 + min(fewest(rem - c) for c in coins)
    result = fewest(amount)
    return -1 if result == float("inf") else result

print(num_decodings("226"), num_decodings("06"))    # 3 0
print(coin_change([1, 2, 5], 11), coin_change([2], 3))   # 3 -1
```

## heapq

Functions that treat a plain list as a **min-heap**: push/pop in O(log n), smallest item at `heap[0]`.

**Use it when:** you repeatedly need the smallest (or largest) remaining item: Top K / Kth Largest, Merge K Sorted Lists, Dijkstra, scheduling (Meeting Rooms II), Find Median from Data Stream (two heaps). For a max-heap, push negated values.

```python run
import heapq
heap = []
for x in [5, 1, 8, 3]:
    heapq.heappush(heap, x)
print(heap[0], heapq.heappop(heap), heap[0])   # 1 1 3
print(heapq.nlargest(2, [5, 1, 8, 3]))         # [8, 5]
```

Full details: *Heap*.

## math

| Function | Returns | Interview use |
|---|---|---|
| `math.inf` | float infinity | initial min/max, unreachable distances |
| `math.gcd(a, b)` | greatest common divisor | simplify fractions, GCD of strings, lcm = `a * b // gcd(a, b)` |
| `math.ceil(x)`, `math.floor(x)` | int | Koko Eating Bananas: hours = `ceil(pile / k)` |
| `math.sqrt(x)` | float | distances (or compare squared distances to stay exact) |
| `math.isqrt(n)` | exact int floor sqrt | perfect-square checks, trial division up to √n |
| `math.comb(n, k)` | n choose k | Unique Paths = `comb(m + n - 2, m - 1)` |
| `math.log2(x)` | float | powers of two, tree heights |

Prefer integer arithmetic when exactness matters: `(a + b - 1) // b` is ceiling division without float rounding, and `math.isqrt` avoids float error on big numbers.

```python run
import math
print(math.inf > 10 ** 18)
print(math.gcd(12, 18), 12 * 18 // math.gcd(12, 18))   # gcd, lcm
print(math.ceil(7 / 2), math.floor(7 / 2), (7 + 2 - 1) // 2)
print(math.sqrt(16), math.isqrt(17), math.isqrt(16) ** 2 == 16)
print(math.comb(3 + 7 - 2, 3 - 1))                      # Unique Paths 3x7 -> 28
piles, k = [3, 6, 7, 11], 4
print(sum(math.ceil(p / k) for p in piles))             # hours at speed k
```

## bisect

Binary search on an **already sorted** list, in O(log n).

- `bisect_left(a, x)`: first index `i` with `a[i] >= x` (the leftmost place to insert x).
- `bisect_right(a, x)` (same as `bisect.bisect`): first index `i` with `a[i] > x` (just past any existing copies of x).
- `insort(a, x)`: inserts x keeping `a` sorted. The search is O(log n) but the insert is O(n) because elements shift.

For `a = [1, 3, 3, 3, 7, 9]`:

| Call | Returns | Meaning |
|---|---|---|
| `bisect_left(a, 3)` | 1 | first 3 is at index 1 |
| `bisect_right(a, 3)` | 4 | first element > 3 is at index 4 |
| `bisect_left(a, 5)` | 4 | 5 would be inserted at index 4 |
| `bisect_left(a, 0)` | 0 | smaller than everything |
| `bisect_left(a, 100)` | 6 | `len(a)`: larger than everything |

Recipes:

| Question | Expression |
|---|---|
| How many elements `< x`? | `bisect_left(a, x)` |
| How many elements `<= x`? | `bisect_right(a, x)` |
| Count of x | `bisect_right(a, x) - bisect_left(a, x)` |
| Is x present? | `i = bisect_left(a, x); i < len(a) and a[i] == x` |
| Largest element `< x` | `a[bisect_left(a, x) - 1]` (check index ≥ 0) |
| Smallest element `> x` | `a[bisect_right(a, x)]` (check index < len) |

**Use it when:** you need lower/upper bounds on sorted data, Time Based Key-Value Store, counting elements in a range, or Longest Increasing Subsequence in O(n log n). Python 3.10+ also accepts a `key=` argument.

```python run
import bisect
a = [1, 3, 3, 3, 7, 9]
print(bisect.bisect_left(a, 3), bisect.bisect_right(a, 3))   # 1 4
print(bisect.bisect_left(a, 5))                              # 4
print(bisect.bisect_right(a, 3) - bisect.bisect_left(a, 3))  # three 3s
print(bisect.bisect_left(a, 0), bisect.bisect_left(a, 100))  # 0 6
i = bisect.bisect_left(a, 7)
print(i < len(a) and a[i] == 7)                              # present?
bisect.insort(a, 4)
print(a)

def length_of_lis(nums):
    tails = []    # tails[k] = smallest tail of an increasing subsequence of length k + 1
    for x in nums:
        i = bisect.bisect_left(tails, x)
        if i == len(tails):
            tails.append(x)
        else:
            tails[i] = x
    return len(tails)

print(length_of_lis([10, 9, 2, 5, 3, 7, 101, 18]))           # 4
```

## itertools: combinations, permutations, product

Lazy generators of every combination / ordering / Cartesian-product tuple.

| Function | Yields | Count |
|---|---|---|
| `combinations(items, k)` | k-element subsets, order ignored | C(n, k) |
| `permutations(items, k)` | k-element orderings | n! / (n - k)! |
| `product(a, b)` / `product(items, repeat=k)` | every pairing, like nested loops | len(a) · len(b) / n^k |

**Use them when:** brute-forcing a small search space, generating test cases, or checking your backtracking answer. Interviewers usually want Subsets, Permutations and Combination Sum written as **backtracking** by hand, so ask before relying on itertools. The output sizes are exponential or factorial, so they only work for small n.

```python run
from itertools import combinations, permutations, product
print(list(combinations([1, 2, 3], 2)))     # [(1, 2), (1, 3), (2, 3)]
print(list(permutations([1, 2, 3], 2)))     # 6 ordered pairs
print(len(list(permutations("abcd"))))      # 24
print(list(product([0, 1], repeat=2)))      # all 2-bit patterns
print(["".join(p) for p in product("ab", "xy")])
subsets = [list(c) for k in range(4) for c in combinations([1, 2, 3], k)]
print(subsets)                               # all subsets of [1, 2, 3]
```

## itertools.accumulate

Running totals (or running max / product / any binary function).

**Use it when:** you need a **prefix-sum** array for O(1) range-sum queries (Range Sum Query, Subarray Sum Equals K, Product of Array Except Self variants). `initial=0` (Python 3.8+) prepends a 0 so that `prefix[j] - prefix[i]` equals `sum(nums[i:j])`.

```python run
from itertools import accumulate
import operator
nums = [3, 1, 4, 1, 5]
print(list(accumulate(nums)))               # [3, 4, 8, 9, 14]
prefix = list(accumulate(nums, initial=0))  # [0, 3, 4, 8, 9, 14]
print(prefix[4] - prefix[1])                # sum(nums[1:4]) = 6
print(list(accumulate(nums, max)))          # running max
print(list(accumulate(nums, operator.mul))) # running product
```

## typing: List and Optional

LeetCode method signatures use type hints such as `nums: List[int]` and `root: Optional[TreeNode]`. They are documentation only (Python does not enforce them), but the names must be imported or the code fails to run outside LeetCode.

```python
from typing import List, Optional

class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        ...
```

In Python 3.9+ you can write the built-in forms `list[int]` and `dict[str, int]` instead.

## sys.setrecursionlimit

Python's default recursion limit is about **1000** frames. A recursive DFS on a 10⁴-node linked list, a skewed tree or a large grid can exceed it and raise `RecursionError`.

- Raise the limit: `sys.setrecursionlimit(10**6)` (fine for interviews; extremely deep recursion can still crash the interpreter).
- Better for very deep inputs: rewrite the DFS iteratively with an explicit stack.

```python run
import sys
print(sys.getrecursionlimit())

def depth(n):
    return 0 if n == 0 else 1 + depth(n - 1)

try:
    depth(5000)
except RecursionError:
    print("RecursionError at the default limit")
sys.setrecursionlimit(10000)
print(depth(5000))
```
