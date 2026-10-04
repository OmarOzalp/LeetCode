---
title: Greedy
group: Algorithm Patterns
summary: When a locally optimal choice is provably safe, how to justify it, the classic greedy algorithms (Kadane, Jump Game, earliest-end scheduling), and how to spot when greedy fails and DP is needed.
keywords: [greedy, locally optimal, exchange argument, invariant, kadane, maximum subarray, maximum product subarray, jump game, farthest reachable, interval scheduling, earliest end, arrows, coin change counterexample, greedy vs dp, stress test]
---

A greedy algorithm makes the choice that looks best right now and never goes back on it. When that is correct, it's usually the simplest and fastest solution: often O(n), or O(n log n) with a sort. The hard part is knowing *when* it's correct.

## What makes a problem greedy

A greedy solution is correct when two things hold:

- **Greedy-choice property:** some locally optimal choice is always part of *some* optimal solution, so making it never closes off the best answer.
- **Optimal substructure:** after that choice, what's left is a smaller instance of the same problem.

Signals in the problem statement:

- "Maximum number of **non-overlapping** ...", "**minimum** number of arrows / jumps / platforms".
- "Can you **reach** the end?", or a running best that can be **reset** (Maximum Subarray).
- A natural ordering exists: sort by deadline, end time, ratio or size, then scan once.
- n is up to 10⁵ or more, which rules out O(n²) DP and suggests an O(n) or O(n log n) idea.

If you can't explain *why* the local choice is safe, treat greedy as a guess and check it, either against DP or brute force (see the next entry).

## Justifying a greedy choice

Three standard ways to argue that a greedy choice is correct:

- **Exchange argument:** take any optimal solution that differs from greedy's first choice. Swap greedy's choice in, and show the result is still valid and no worse. Repeat for each later choice.
- **Greedy stays ahead:** show that after every step, greedy's partial solution is at least as good as any other solution's after the same number of steps (for example, "greedy's k-th interval ends no later").
- **Invariant:** state a property that holds after every iteration, such as "`farthest` is the furthest index reachable from `nums[0..i]`", and show that it implies the answer.

In an interview, back the argument up with a **stress test**: compare greedy against brute force on many small random inputs. The run below does this for "maximum non-overlapping intervals, keeping the earliest end first".

```python run
import itertools
import random

def greedy_max_non_overlapping(intervals):
    count, prev_end = 0, float("-inf")
    for start, end in sorted(intervals, key=lambda x: x[1]):    # earliest end first
        if start >= prev_end:
            count += 1
            prev_end = end
    return count

def brute_max_non_overlapping(intervals):
    for k in range(len(intervals), 0, -1):                       # try the largest sets first
        for combo in itertools.combinations(intervals, k):
            ordered = sorted(combo)
            if all(ordered[i][1] <= ordered[i + 1][0] for i in range(k - 1)):
                return k
    return 0

random.seed(7)
for _ in range(300):
    intervals = []
    for _ in range(random.randint(0, 7)):
        s = random.randint(0, 10)
        intervals.append((s, s + random.randint(1, 5)))
    assert greedy_max_non_overlapping(intervals) == brute_max_non_overlapping(intervals), intervals
print("greedy matched brute force on 300 random cases")
```

## Kadane's algorithm (Maximum Subarray)

**Maximum Subarray**: find the largest sum of a contiguous subarray. Scan left to right with a running sum that ends at the current element. If that running sum is negative, it can only lower whatever comes next, so **drop it and start fresh** at the current element.

- `current = max(x, current + x)`: either extend the current subarray or start a new one at `x`.
- Initialize with `nums[0]`, not `0`. Otherwise an all-negative array wrongly returns 0.
- This is also a DP whose state is "best sum ending here", reduced to O(1) space.

```python run
def max_subarray(nums):
    best = current = nums[0]
    for x in nums[1:]:
        current = max(x, current + x)    # extend, or restart at x
        best = max(best, current)
    return best

def max_subarray_with_range(nums):
    best, best_range = nums[0], (0, 0)
    current, start = nums[0], 0
    for i in range(1, len(nums)):
        if current < 0:                  # a negative prefix only hurts → drop it
            current, start = nums[i], i
        else:
            current += nums[i]
        if current > best:
            best, best_range = current, (start, i)
    return best, best_range

print(max_subarray([-2, 1, -3, 4, -1, 2, 1, -5, 4]))              # 6  ([4, -1, 2, 1])
print(max_subarray([-3, -1, -2]))                                 # -1 (all negative)
print(max_subarray_with_range([-2, 1, -3, 4, -1, 2, 1, -5, 4]))   # (6, (3, 6))
```

O(n) time, O(1) space.

## Kadane variant: Maximum Product Subarray

With products, a negative number turns the **smallest** product into the **largest**. So track both the maximum and the minimum product ending at each position. At each element, the new values come from three candidates: start fresh at `x`, `x * max`, or `x * min`.

```python run
def max_product(nums):
    hi = lo = best = nums[0]
    for x in nums[1:]:
        candidates = (x, x * hi, x * lo)   # a negative x swaps the roles of hi and lo
        hi, lo = max(candidates), min(candidates)
        best = max(best, hi)
    return best

print(max_product([2, 3, -2, 4]))    # 6
print(max_product([-2, 0, -1]))      # 0
print(max_product([-2, 3, -4]))      # 24
```

## Jump Game: farthest reachable

**Jump Game**: `nums[i]` is the maximum jump length from index `i`. Can you reach the last index?

The invariant: `farthest` is the furthest index reachable using only the positions seen so far. If the scan arrives at an `i` beyond `farthest`, that `i` can't be reached, and neither can anything after it. There's no need to try individual jump sequences, which is what the O(n²) DP or the exponential backtracking would do.

Another way: walk **backwards** and move a "goal" index left whenever position `i` can reach it.

```python run
def can_jump(nums):
    farthest = 0
    for i, jump in enumerate(nums):
        if i > farthest:
            return False                  # stuck: i is unreachable
        farthest = max(farthest, i + jump)
        if farthest >= len(nums) - 1:
            return True
    return True

def can_jump_backward(nums):
    goal = len(nums) - 1
    for i in range(len(nums) - 2, -1, -1):
        if i + nums[i] >= goal:
            goal = i                      # reaching i is now enough
    return goal == 0

for nums in ([2, 3, 1, 1, 4], [3, 2, 1, 0, 4], [0], [2, 0, 0]):
    print(nums, can_jump(nums), can_jump_backward(nums))
# True True / False False / True True / True True
```

## Jump Game II: fewest jumps

Think of it as BFS by levels without building a queue. Everything reachable with `jumps` jumps forms a window ending at `current_end`. While scanning that window, track the `farthest` index the next jump could reach. When the scan reaches `current_end`, you must jump, and the next window ends at `farthest`.

```python run
def min_jumps(nums):
    jumps = 0
    current_end = farthest = 0
    for i in range(len(nums) - 1):        # no jump is needed from the last index
        farthest = max(farthest, i + nums[i])
        if i == current_end:              # end of this jump's range → must jump
            jumps += 1
            current_end = farthest
    return jumps

print(min_jumps([2, 3, 1, 1, 4]))   # 2  (0 → 1 → 4)
print(min_jumps([2, 3, 0, 1, 4]))   # 2
print(min_jumps([0]))               # 0
```

O(n) time, O(1) space.

## Interval scheduling: earliest end first

To keep the **most** non-overlapping intervals, sort by **end** and keep every interval that starts after the last kept one ends. Choosing the interval that ends first leaves the most room for everything after it. Swapping it into any optimal solution keeps that solution valid, which is the exchange argument.

This one greedy solves several problems:

- **Non-overlapping Intervals:** answer = total − kept.
- **Minimum Number of Arrows to Burst Balloons:** one arrow at each kept interval's end. Here touching balloons share an arrow, so the test is `start > arrow_x`.
- **Maximum meetings in one room.**

```python run
def find_min_arrows(points):
    points = sorted(points, key=lambda p: p[1])   # earliest end first
    arrows, arrow_x = 0, float("-inf")
    for start, end in points:
        if start > arrow_x:                       # the current arrow misses this balloon
            arrows += 1
            arrow_x = end                         # shoot at its end: hits the most balloons
    return arrows

def erase_overlap_intervals(intervals):
    intervals = sorted(intervals, key=lambda x: x[1])
    kept, prev_end = 0, float("-inf")
    for start, end in intervals:
        if start >= prev_end:                     # touching intervals are fine here
            kept += 1
            prev_end = end
    return len(intervals) - kept

print(find_min_arrows([[10, 16], [2, 8], [1, 6], [7, 12]]))       # 2
print(find_min_arrows([[1, 2], [3, 4], [5, 6], [7, 8]]))          # 4
print(find_min_arrows([[1, 2], [2, 3], [3, 4], [4, 5]]))          # 2
print(erase_overlap_intervals([[1, 2], [2, 3], [3, 4], [1, 3]]))  # 1
```

The Intervals page covers this in more depth, including why sorting by start fails.

## When greedy fails: the coin change counterexample

"Always take the largest coin that fits" is optimal for US coins (1, 5, 10, 25). It is **not** optimal for arbitrary coin sets:

- Coins `[1, 3, 4]`, amount 6: greedy takes 4 + 1 + 1 = **3 coins**, but 3 + 3 = **2 coins**.
- Coins `[2, 5]`, amount 6: greedy takes 5 and gets stuck with 1 left over, but 2 + 2 + 2 works.

Taking the large coin early hurts later, so the local choice isn't safe. That's the sign you need **DP**, which tries every coin for every amount. This is why **Coin Change** is a DP problem.

```python run
def greedy_coins(coins, amount):
    count = 0
    for c in sorted(coins, reverse=True):      # largest coin first
        take = amount // c
        count += take
        amount -= take * c
    return count if amount == 0 else -1

def dp_coins(coins, amount):
    INF = float("inf")
    dp = [0] + [INF] * amount                  # dp[a] = fewest coins for amount a
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1
    return dp[amount] if dp[amount] != INF else -1

for coins, amount in [([1, 5, 10, 25], 63), ([1, 3, 4], 6), ([2, 5], 6)]:
    print(coins, amount, "| greedy:", greedy_coins(coins, amount), "| dp:", dp_coins(coins, amount))
# US coins: both 6. [1, 3, 4]: greedy 3 vs dp 2. [2, 5]: greedy -1 (fails) vs dp 3.
```

Other well-known traps include 0/1 knapsack by best value-to-weight ratio, where greedy is only right for the *fractional* knapsack, and longest path in a graph.

## Greedy vs DP: choosing quickly

| Question | Greedy | DP |
| --- | --- | --- |
| Can one local choice be proven safe? | yes, by exchange argument or invariant | no, or you aren't sure |
| Do later decisions depend on more than a single number? | no, one running value is enough | yes, you need a state table |
| Typical time | O(n) or O(n log n) | O(n · states) |
| Blind 75 examples | Maximum Subarray, Jump Game, Non-overlapping Intervals, Best Time to Buy and Sell Stock | Coin Change, House Robber, Longest Increasing Subsequence, Word Break |

Interview strategy: if you aren't sure greedy works, start with the DP (it's always correct), then mention the greedy shortcut and explain why it's safe. Interviewers value the reasoning as much as the speed.

## Common greedy mistakes

- Coding a greedy without a justification or a quick counterexample search.
- **Sorting by the wrong key**, such as start instead of end for interval scheduling.
- Kadane initialized with `0`, which is wrong when every number is negative.
- Jump Game: updating `farthest` *before* checking whether `i` is reachable.
- Ignoring **ties**, such as touching intervals, equal values or `>` vs `>=`. Check them against the examples.
- Assuming the greedy for one coin system (US coins) works for every coin system.
