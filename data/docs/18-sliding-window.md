---
title: Sliding Window
group: Algorithm Patterns
summary: Keep a contiguous window over an array or string and update its state as elements enter and leave, so subarray and substring questions run in linear time.
keywords: [sliding window, window, substring, subarray, contiguous, two pointers, fixed window, variable window, longest, shortest, counter, frequency, at most k, minimum window substring, character replacement, anagram]
---

A sliding window is a pair of same-direction pointers that bound a contiguous range `nums[left:right + 1]`. Elements are added on the right and removed on the left, and the window state is updated as they move instead of being recomputed from scratch. That turns O(n²) "check every subarray" solutions into O(n).

## When to use a sliding window

Signals in the problem statement:

- "**contiguous** subarray" or "**substring**", not a subsequence.
- Find the **longest / shortest / number of** windows that satisfy a condition.
- Phrases like "at most k distinct", "without repeating characters", "contains every character of t", "window of size k", "at most k replacements".

The condition must be **monotonic**: if a window is invalid, every larger window that contains it is invalid too. Then shrinking from the left is the only fix, and the left pointer never has to move back.

Sums with **negative numbers** break this, because adding an element can lower the sum. For those, use prefix sums with a hash map (Subarray Sum Equals K).

| Variant | Window size | Loop shape | Examples |
| --- | --- | --- | --- |
| Fixed | always `k` | add `nums[right]`, remove `nums[right - k]` | Maximum Average Subarray, Find All Anagrams |
| Variable, longest valid | grows and shrinks | `while invalid: shrink`, then record | Longest Substring Without Repeating Characters, Longest Repeating Character Replacement |
| Variable, shortest valid | grows and shrinks | `while valid: record, shrink` | Minimum Window Substring, Minimum Size Subarray Sum |
| Counting | grows and shrinks | add `right - left + 1` per step | Subarrays with K Different Integers |

## Fixed-size window template

The window always holds exactly `k` elements. Each step adds the new right element and removes the element that just fell off the left (`nums[right - k]`).

```python
state = build(nums[:k])                  # first full window
best = evaluate(state)
for right in range(k, len(nums)):
    add(state, nums[right])              # enters
    remove(state, nums[right - k])       # leaves
    best = better(best, evaluate(state))
```

```python run
def max_sum_k(nums, k):
    window = sum(nums[:k])
    best = window
    for right in range(k, len(nums)):
        window += nums[right] - nums[right - k]   # slide by one: O(1) update
        best = max(best, window)
    return best

def max_average(nums, k):
    return max_sum_k(nums, k) / k

print(max_sum_k([2, 1, 5, 1, 3, 2], 3))     # 9  (5 + 1 + 3)
print(max_sum_k([-1, -2, -3], 2))           # -3
print(max_average([1, 12, -5, -6, 50, 3], 4))  # 12.75
```

O(n) time, O(1) space, compared with O(n · k) for summing every window from scratch.

## Fixed window with counts: Find All Anagrams

When the window state is a frequency count, keep two count arrays. For lowercase letters a 26-slot list is fastest, and `have == need` is an O(26) = O(1) comparison. **Permutation in String** is the same check, returning `True` on the first match.

```python run
def find_anagrams(s, p):
    k = len(p)
    if k > len(s):
        return []
    need, have = [0] * 26, [0] * 26
    for ch in p:
        need[ord(ch) - ord("a")] += 1
    result = []
    for right, ch in enumerate(s):
        have[ord(ch) - ord("a")] += 1
        if right >= k:
            have[ord(s[right - k]) - ord("a")] -= 1   # char leaving the window
        if right >= k - 1 and have == need:           # first full window at right = k - 1
            result.append(right - k + 1)
    return result

print(find_anagrams("cbaebabacd", "abc"))  # [0, 6]
print(find_anagrams("abab", "ab"))         # [0, 1, 2]
print(find_anagrams("a", "ab"))            # []
```

## Variable-size window template (longest valid)

This is the workhorse template. Expand on the right every step, shrink on the left only while the window is invalid, then record the answer.

```python
left = 0
best = 0
for right in range(len(nums)):
    add(nums[right])                     # 1. expand: include the new element
    while window_is_invalid():           # 2. shrink until valid again
        remove(nums[left])
        left += 1
    best = max(best, right - left + 1)   # 3. window is valid here → record it
```

Worked example, **Longest Substring Without Repeating Characters**. The window is invalid when the newest character appears twice. A second version stores each character's last index and jumps `left` past the earlier copy in one step.

```python run
from collections import Counter

def length_of_longest_substring(s):
    count = Counter()
    left = best = 0
    for right, ch in enumerate(s):
        count[ch] += 1
        while count[ch] > 1:              # invalid: ch is repeated
            count[s[left]] -= 1
            left += 1
        best = max(best, right - left + 1)
    return best

def length_of_longest_substring_jump(s):
    last = {}                             # char → last index seen
    left = best = 0
    for right, ch in enumerate(s):
        if ch in last and last[ch] >= left:   # only if the copy is INSIDE the window
            left = last[ch] + 1
        last[ch] = right
        best = max(best, right - left + 1)
    return best

for s in ["abcabcbb", "bbbbb", "pwwkew", "", "abba"]:
    print(repr(s), length_of_longest_substring(s), length_of_longest_substring_jump(s))
# 3, 1, 3, 0, 2 for both versions
```

The `last[ch] >= left` check matters. In `"abba"`, without it, `left` would jump *backwards* when the second `a` arrives.

## Shortest valid window variant

To find the **minimum** length, flip the inner loop. Shrink *while the window is still valid*, and record the answer **inside** the loop, before removing an element.

```python
left = 0
best = float("inf")
for right in range(len(nums)):
    add(nums[right])
    while window_is_valid():
        best = min(best, right - left + 1)   # record BEFORE shrinking
        remove(nums[left])
        left += 1
return 0 if best == float("inf") else best
```

| | Longest valid | Shortest valid |
| --- | --- | --- |
| Inner loop | `while invalid:` shrink | `while valid:` record, then shrink |
| Record answer | after the inner loop | inside the inner loop |
| Examples | Longest Substring Without Repeating Characters, Longest Repeating Character Replacement | Minimum Window Substring, Minimum Size Subarray Sum |

```python run
def min_subarray_len(target, nums):      # all nums positive
    left = window = 0
    best = float("inf")
    for right, x in enumerate(nums):
        window += x
        while window >= target:          # valid → try to shrink
            best = min(best, right - left + 1)
            window -= nums[left]
            left += 1
    return 0 if best == float("inf") else best

print(min_subarray_len(7, [2, 3, 1, 2, 4, 3]))  # 2  ([4, 3])
print(min_subarray_len(4, [1, 4, 4]))           # 1
print(min_subarray_len(11, [1, 1, 1, 1]))       # 0  (no valid window)
```

## Tracking window state

Pick the cheapest structure that answers "is the window valid?" in O(1) or O(alphabet size).

| State | Good for | Add / remove |
| --- | --- | --- |
| `Counter()` / `defaultdict(int)` | arbitrary values, distinct counts | `c[x] += 1` / `c[x] -= 1`, and `del c[x]` when it hits 0 |
| `[0] * 26` | lowercase letters only | `cnt[ord(ch) - ord("a")] += 1` |
| `set()` | "all unique" checks | `add` / `remove` |
| running `int` | sums, number of zeros, number of "bad" elements | `+=` / `-=` |
| `dict` of last index | jump `left` straight past a duplicate | `last[x] = right` |
| monotonic `deque` | max/min of the window (Sliding Window Maximum) | pop smaller values from the back, expired indices from the front |

If you use `len(counter)` as the number of distinct values, **delete keys whose count drops to 0**. Otherwise they still count.

```python run
from collections import Counter

def longest_at_most_k_distinct(s, k):
    count = Counter()
    left = best = 0
    for right, ch in enumerate(s):
        count[ch] += 1
        while len(count) > k:
            out = s[left]
            count[out] -= 1
            if count[out] == 0:
                del count[out]           # keep len(count) == number of distinct chars
            left += 1
        best = max(best, right - left + 1)
    return best

print(longest_at_most_k_distinct("eceba", 2))    # 3  ("ece")
print(longest_at_most_k_distinct("aabbcc", 2))   # 4  ("aabb")
print(longest_at_most_k_distinct("aaabbcc", 1))  # 3  ("aaa")
```

## Longest Repeating Character Replacement: (length − max_freq) ≤ k

You may replace up to `k` characters. To make a window all one letter, keep its most frequent letter and replace everything else. So:

```python
window_is_valid = (right - left + 1) - max_freq <= k
```

The trick: `max_freq` is **never decreased** when the window shrinks. A stale, too-large `max_freq` can only stop the window from shrinking enough, which keeps its size the same. It never reports a length that wasn't valid at some earlier point. `best` only grows when a new character pushes `max_freq` higher, and that new value is accurate. Recomputing `max(count.values())` each step is also fine: it costs O(26) per step, so O(n) overall.

```python run
def character_replacement(s, k):
    count = {}
    left = max_freq = best = 0
    for right, ch in enumerate(s):
        count[ch] = count.get(ch, 0) + 1
        max_freq = max(max_freq, count[ch])
        while (right - left + 1) - max_freq > k:    # needs more than k replacements
            count[s[left]] -= 1
            left += 1
        best = max(best, right - left + 1)
    return best

print(character_replacement("ABAB", 2))      # 4
print(character_replacement("AABABBA", 1))   # 4  ("AABA" or "ABBB")
print(character_replacement("AAAA", 0))      # 4
print(character_replacement("ABCDE", 1))     # 2
```

## Minimum Window Substring: have/need counting

Find the shortest substring of `s` that contains every character of `t`, duplicates included.

Comparing two whole count maps on every step would be slow. Instead, track:

- `need`: the required count for each character, as `Counter(t)`.
- `have`: how many **distinct** characters currently meet their required count.
- The window is valid when `have == len(need)`.

`have` changes only on exact transitions. Increment it when `window[ch]` rises to exactly `need[ch]`. Decrement it when `window[ch]` drops below `need[ch]`.

```python run
from collections import Counter

def min_window(s, t):
    if not s or not t:
        return ""
    need = Counter(t)
    window = {}
    have, required = 0, len(need)
    best_len, best_start = float("inf"), 0
    left = 0
    for right, ch in enumerate(s):
        window[ch] = window.get(ch, 0) + 1
        if ch in need and window[ch] == need[ch]:
            have += 1                          # ch just became satisfied
        while have == required:                # valid → record, then shrink
            if right - left + 1 < best_len:
                best_len, best_start = right - left + 1, left
            out = s[left]
            window[out] -= 1
            if out in need and window[out] < need[out]:
                have -= 1                      # out is no longer satisfied
            left += 1
    return "" if best_len == float("inf") else s[best_start:best_start + best_len]

print(min_window("ADOBECODEBANC", "ABC"))  # BANC
print(min_window("a", "a"))                # a
print(repr(min_window("a", "aa")))         # '' (t needs two a's)
```

Complexity: O(|s| + |t|) time, O(alphabet) space.

## Counting subarrays: the "at most K" trick

To **count** valid windows, notice that every subarray ending at `right` and starting anywhere in `[left, right]` is also valid. So each step adds `right - left + 1`.

"**Exactly** K" doesn't shrink monotonically, but it can be written as two "at most" counts:

```python
exactly(k) = at_most(k) - at_most(k - 1)
```

```python run
from collections import Counter

def count_at_most_k_distinct(nums, k):
    if k < 0:
        return 0
    count = Counter()
    left = total = 0
    for right, x in enumerate(nums):
        count[x] += 1
        while len(count) > k:
            count[nums[left]] -= 1
            if count[nums[left]] == 0:
                del count[nums[left]]
            left += 1
        total += right - left + 1          # all valid windows that end at right
    return total

def count_exactly_k_distinct(nums, k):
    return count_at_most_k_distinct(nums, k) - count_at_most_k_distinct(nums, k - 1)

print(count_exactly_k_distinct([1, 2, 1, 2, 3], 2))  # 7
print(count_exactly_k_distinct([1, 2, 1, 3, 4], 3))  # 3
```

## Best Time to Buy and Sell Stock as a window

`buy` is the left edge, the cheapest day seen so far, and `sell` is the right edge. When a cheaper price appears, no later sale does better by buying at the old `buy`, so the window restarts there.

```python run
def max_profit(prices):
    buy = 0                          # left edge
    best = 0
    for sell in range(1, len(prices)):
        if prices[sell] < prices[buy]:
            buy = sell               # new minimum → move the left edge
        else:
            best = max(best, prices[sell] - prices[buy])
    return best

print(max_profit([7, 1, 5, 3, 6, 4]))  # 5  (buy at 1, sell at 6)
print(max_profit([7, 6, 4, 3, 1]))     # 0  (never profitable)
```

## Why a sliding window is O(n) amortized

The `while` loop sits inside the `for` loop, but it is **not** O(n²):

- `right` moves forward n times.
- `left` only moves forward and never passes `right`, so across the **whole run** it moves at most n times.
- Every element is added once and removed at most once, so the total work is O(2n) = O(n).

Space is O(1) for sums, O(alphabet) for count arrays, and O(window) for sets and dicts. The run below counts the total number of inner-loop steps on a 100,000-character string.

```python run
import random

def longest_unique_with_stats(s):
    count = {}
    left = best = inner_steps = 0
    for right, ch in enumerate(s):
        count[ch] = count.get(ch, 0) + 1
        while count[ch] > 1:
            inner_steps += 1
            count[s[left]] -= 1
            left += 1
        best = max(best, right - left + 1)
    return best, inner_steps

random.seed(1)
s = "".join(random.choice("abcde") for _ in range(100000))
best, inner = longest_unique_with_stats(s)
print("n =", len(s), "| answer =", best, "| total inner-loop steps =", inner)
print("inner steps <= n:", inner <= len(s))
```

## Common sliding window mistakes

- **Window length** is `right - left + 1`, not `right - left`.
- **Recording the answer in the wrong place.** For longest, record after the shrink loop. For shortest, record inside it.
- **Stale keys:** using `len(counter)` without deleting zero-count entries.
- **`if` instead of `while` for shrinking.** One removal may not restore validity. The character-replacement problem is the exception, because its window never needs to shrink by more than one.
- **Negative numbers with a sum condition.** The window is no longer monotonic, so use prefix sums with a hash map.
- **Off-by-one in fixed windows.** The first full window ends at `right == k - 1`.
- **Moving `left` backwards** in the jump-to-last-index version. Only jump when `last[ch] >= left`.
