---
title: Sorting & Lambdas
group: Python Essentials
summary: sort() vs sorted(), custom key functions, multi-field and mixed-direction sorts, stability, cmp_to_key comparators, and lambda syntax.
keywords: [sort, sorted, reverse, key, lambda, custom sort, multiple keys, tuple key, descending, stable, stability, cmp_to_key, comparator, largest number, itemgetter, intervals, timsort]
---

Sorting is often the first step that unlocks a simpler algorithm: two pointers, greedy interval scheduling, grouping, or binary search. Python's sort is fast, stable and fully customizable with `key=`.

## sort() vs sorted()

**`sort()` modifies the list in place; `sorted()` returns a new list.**

| | `nums.sort()` | `sorted(nums)` |
|---|---|---|
| Works on | lists only | any iterable (str, set, dict, tuple) |
| Returns | `None` | a new list |
| Original | changed | unchanged |
| Extra memory | in place (Timsort still uses up to O(n) temporarily) | O(n) for the copy |

- Use `sorted()` when you must keep the original order (e.g. you still need original indices) or the input is not a list.
- Classic bug: `nums = nums.sort()` leaves `nums` as `None`.

```python run
nums = [3, 1, 2]
new = sorted(nums)
print(new, nums)          # [1, 2, 3] [3, 1, 2]
nums.sort()
print(nums)               # [1, 2, 3]
print(sorted("dcba"))     # strings -> sorted list of chars
print(sorted({3, 1, 2}))  # sets too
print([3, 1].sort())      # None
```

## Sorting complexity

Python uses **Timsort**: O(n log n) worst case, O(n) on already-sorted or nearly-sorted data, and stable.

- If an O(n log n) sort is the bottleneck, ask whether counting sort / bucket sort (O(n + k)) or a heap (O(n log k)) fits better.
- Sorting a list of strings costs more because each comparison is O(L).
- Sorting first and then scanning is a very common O(n log n) pattern (3Sum, Merge Intervals, Meeting Rooms).

## reverse=True

Sorts in descending order. It keeps the sort stable (equal elements stay in original order), unlike sorting and then reversing.

```python run
nums = [3, 1, 4, 1, 5]
print(sorted(nums, reverse=True))
words = ["bb", "a", "ccc"]
words.sort(key=len, reverse=True)
print(words)
```

## Custom keys with key=

`key=` takes a function that maps each element to the value to sort by. The function is called **once per element** (O(n) calls), and the elements are then ordered by those keys.

- Intervals by start: `intervals.sort(key=lambda x: x[0])`
- Intervals by end (greedy Non-overlapping Intervals): `key=lambda x: x[1]`
- By length: `key=len`; case-insensitive: `key=str.lower`; by absolute value: `key=abs`
- Dict keys by value: `sorted(d, key=d.get)`

```python run
intervals = [[8, 10], [1, 3], [15, 18], [2, 6]]
intervals.sort(key=lambda x: x[0])
merged = []
for start, end in intervals:                 # Merge Intervals
    if merged and start <= merged[-1][1]:
        merged[-1][1] = max(merged[-1][1], end)
    else:
        merged.append([start, end])
print(merged)                                # [[1, 6], [8, 10], [15, 18]]
print(sorted(["Banana", "apple", "cherry"], key=str.lower))
print(sorted([-4, 1, -2, 3], key=abs))
counts = {"a": 3, "b": 1, "c": 2}
print(sorted(counts, key=counts.get))        # ['b', 'c', 'a']
```

## Default ordering of tuples and lists

Tuples and lists compare **lexicographically**: first elements, then second elements to break ties, and so on. So a list of pairs is already sorted by "first field, then second field" with no key at all.

```python run
pairs = [(2, "b"), (1, "z"), (2, "a"), (1, "a")]
print(sorted(pairs))      # [(1, 'a'), (1, 'z'), (2, 'a'), (2, 'b')]
intervals = [[5, 6], [1, 4], [1, 2]]
intervals.sort()          # by start, then by end
print(intervals)
```

## Sorting by multiple fields

Return a **tuple** from the key function: Python compares the first field, then the second only on ties.

```python
items.sort(key=lambda x: (x[0], x[1]))            # field 0, then field 1
people.sort(key=lambda p: (p["age"], p["name"]))
```

```python run
people = [("bob", 25), ("ann", 30), ("cy", 25), ("dee", 30)]
print(sorted(people, key=lambda p: (p[1], p[0])))   # age, then name
words = ["bb", "a", "ab", "c"]
print(sorted(words, key=lambda w: (len(w), w)))     # length, then alphabetical
```

## Descending on one field, ascending on another

Negate numeric fields inside the key tuple to flip just that field's direction:

```python
items.sort(key=lambda x: (-x[1], x[0]))   # x[1] descending, x[0] ascending
```

Typical case: Top K Frequent Words, where count is descending and the word ascending on ties.

You cannot negate a string. To sort a **string field descending** while another field ascends, either do two stable passes (see *Stability*) or use `cmp_to_key`.

```python run
from collections import Counter
words = ["i", "love", "leetcode", "i", "love", "coding"]
counts = Counter(words)
print(sorted(counts, key=lambda w: (-counts[w], w))[:2])   # ['i', 'love']
scores = [("ann", 90), ("bob", 95), ("cy", 90)]
print(sorted(scores, key=lambda s: (-s[1], s[0])))
```

## Stability

Python's sort is **stable**: elements with equal keys keep their original relative order. Two consequences:

1. Sorting by one key never scrambles ties that were already in a meaningful order.
2. You can sort by several keys with **multiple passes**: sort by the *least* important key first, then by the most important one. Each pass can use its own `reverse=`.

```python run
people = [("ann", 30), ("bob", 25), ("cy", 30), ("dee", 25)]
print(sorted(people, key=lambda p: p[1]))   # ties keep input order: bob, dee / ann, cy

# Name DESCENDING within age ASCENDING (string field reversed)
people.sort(key=lambda p: p[0], reverse=True)   # secondary key first
people.sort(key=lambda p: p[1])                 # primary key last
print(people)   # [('dee', 25), ('bob', 25), ('cy', 30), ('ann', 30)]
```

## Custom comparators with functools.cmp_to_key

When the order depends on comparing **two elements together** rather than on a per-element key, write a comparator and wrap it with `cmp_to_key`.

Comparator contract: `compare(a, b)` returns a **negative** number if `a` should come first, **positive** if `b` should come first, `0` if equal.

Classic example, **Largest Number**: put `a` before `b` if `a + b > b + a` as strings.

```python run
from functools import cmp_to_key

def largest_number(nums):
    strs = [str(x) for x in nums]
    def compare(a, b):
        if a + b > b + a:
            return -1          # a goes first
        if a + b < b + a:
            return 1           # b goes first
        return 0
    strs.sort(key=cmp_to_key(compare))
    result = "".join(strs)
    return "0" if result[0] == "0" else result   # handle [0, 0]

print(largest_number([10, 2]))            # 210
print(largest_number([3, 30, 34, 5, 9]))  # 9534330
print(largest_number([0, 0]))             # 0
```

Prefer a `key=` function whenever one exists. It is simpler and faster, because the comparator is called O(n log n) times instead of the key's n times.

## Lambda syntax

`lambda args: expression` creates a small anonymous function. The body is a **single expression** whose value is returned automatically: no statements, no `return`, no assignments.

```python
square = lambda x: x * x            # same as: def square(x): return x * x
add = lambda a, b: a + b
pick = lambda pair: pair[1]
```

Typical interview uses:

| Use | Example |
|---|---|
| Sort key | `intervals.sort(key=lambda x: x[0])` |
| min/max key | `max(points, key=lambda p: p[0] ** 2 + p[1] ** 2)` |
| defaultdict factory | `defaultdict(lambda: float("inf"))` |
| Conditional value | `key=lambda x: (x is None, x)` (None last) |

`heapq` has **no** `key=` parameter. Instead of a lambda, push tuples `(priority, item)` onto the heap (see *Heap*).

```python run
from collections import defaultdict
points = [(1, 3), (-2, 2), (5, -1)]
print(max(points, key=lambda p: p[0] ** 2 + p[1] ** 2))
dist = defaultdict(lambda: float("inf"))
dist["a"] = 0
print(dist["a"], dist["b"])
vals = [3, None, 1]
print(sorted(vals, key=lambda x: (x is None, x)))   # [1, 3, None]
```

## Lambda pitfall: late binding in loops

A lambda looks up outside variables when it is **called**, not when it is created. Lambdas built in a loop all see the loop variable's final value. Bind the current value with a default argument.

```python run
funcs = [lambda: i for i in range(3)]
print([f() for f in funcs])          # [2, 2, 2]
funcs = [lambda i=i: i for i in range(3)]
print([f() for f in funcs])          # [0, 1, 2]
```

## operator.itemgetter

`itemgetter(i)` is a fast, readable alternative to `lambda x: x[i]`; `itemgetter(i, j)` returns a tuple for multi-field sorts. Works only for ascending fields (you cannot negate inside it).

```python run
from operator import itemgetter
rows = [(1, "b"), (0, "c"), (1, "a")]
print(sorted(rows, key=itemgetter(0)))      # stable: (1, 'b') before (1, 'a')
print(sorted(rows, key=itemgetter(0, 1)))
```

## Sorting characters and strings

- `sorted(s)` returns a **list** of characters; join it back with `"".join(sorted(s))`.
- The sorted string is a canonical anagram key (Group Anagrams, Valid Anagram) at O(L log L) per word.
- Sort a list of strings by length, then alphabetically: `key=lambda w: (len(w), w)`.

```python run
s = "interview"
print(sorted(s))
print("".join(sorted(s)))
print("".join(sorted(s, reverse=True)))
print("".join(sorted("listen")) == "".join(sorted("silent")))
```
