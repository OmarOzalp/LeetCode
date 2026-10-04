---
title: Sets
group: Python Essentials
summary: Hash sets for O(1) average membership checks, deduplication and set algebra, plus the seen-set pattern and hashable element rules.
keywords: [set, hash set, add, remove, discard, in, membership, seen, visited, union, intersection, difference, symmetric difference, subset, set comprehension, frozenset, deduplicate, unique]
---

A set stores unique, hashable values with no order. Reach for one whenever the question is "have I seen this before?" or "is this value present?"

## Why set membership is O(1)

A set is a **hash table**. `x in s` computes `hash(x)`, jumps straight to the matching slot and compares only the few values stored there. A list has to compare `x` against every element.

| Operation | set | list |
|---|---|---|
| `x in s` | O(1) average | O(n) |
| `s.add(x)` / `append` | O(1) average | O(1) amortized |
| `s.remove(x)` / `discard` | O(1) average | O(n) |
| Build from n items | O(n) | O(n) |
| `len(s)` | O(1) | O(1) |

Trade-offs: sets use more memory, have no order or indexing, and only accept **hashable** elements. The worst case degrades to O(n) under heavy hash collisions, which you can ignore in interviews: say "O(1) average".

## Creating sets

```python run
empty = set()                 # NOT {} - that is an empty dict
primes = {2, 3, 5, 7}
unique = set([3, 1, 3, 2, 1]) # deduplicate a list
letters = set("hello")        # set of characters
print(type({}), empty, primes, unique, letters)
print(len(set([1, 1, 2])) != len([1, 1, 2]))   # quick duplicate check
```

- `set(nums)` removes duplicates in O(n), but loses order (use `sorted(set(nums))` if you need it sorted).
- `len(set(nums)) < len(nums)` answers Contains Duplicate in one line.

## add(), remove(), discard() and pop()

| Method | Missing element | Use |
|---|---|---|
| `s.add(x)` | inserts it (no-op if already present) | record a visit |
| `s.remove(x)` | raises `KeyError` | when x must be present |
| `s.discard(x)` | silently does nothing | safe removal (sliding window) |
| `s.pop()` | `KeyError` on an empty set | remove an arbitrary element |
| `s.clear()` | | empty the set |

```python run
s = {1, 2}
s.add(3)
s.add(3)             # duplicate ignored
print(s)
s.discard(10)        # no error
try:
    s.remove(10)
except KeyError as e:
    print("KeyError:", e)
s.remove(1)
print(s)
```

## Membership: the seen-set pattern

The most common set idiom: keep a `seen` set while scanning and check membership before (or after) adding.

```python
seen = set()
for x in nums:
    if x in seen:
        return True      # duplicate found
    seen.add(x)
```

Uses: Contains Duplicate, detecting cycles in sequences (Happy Number), `visited` in BFS/DFS, the characters inside a sliding window (Longest Substring Without Repeating Characters).

```python run
def contains_duplicate(nums):
    seen = set()
    for x in nums:
        if x in seen:
            return True
        seen.add(x)
    return False

def is_happy(n):
    seen = set()
    while n != 1 and n not in seen:     # a repeat means we're in a cycle
        seen.add(n)
        n = sum(int(d) ** 2 for d in str(n))
    return n == 1

print(contains_duplicate([1, 2, 3, 1]), contains_duplicate([1, 2, 3]))
print(is_happy(19), is_happy(2))
```

## Pattern: Longest Consecutive Sequence

A set makes "does x + 1 exist?" an O(1) question, which gives an O(n) solution without sorting. Only start counting from numbers that begin a run (`x - 1` not in the set), so each number is visited a constant number of times.

```python run
def longest_consecutive(nums):
    num_set = set(nums)
    best = 0
    for x in num_set:
        if x - 1 not in num_set:          # x starts a run
            length = 1
            while x + length in num_set:
                length += 1
            best = max(best, length)
    return best

print(longest_consecutive([100, 4, 200, 1, 3, 2]))       # 4
print(longest_consecutive([0, 3, 7, 2, 5, 8, 4, 6, 0, 1]))  # 9
```

## Union, intersection and difference

| Operation | Operator | Method | Time |
|---|---|---|---|
| Union | `a \| b` | `a.union(b)` | O(len(a) + len(b)) |
| Intersection | `a & b` | `a.intersection(b)` | O(min(len(a), len(b))) |
| Difference | `a - b` | `a.difference(b)` | O(len(a)) |
| Symmetric difference | `a ^ b` | `a.symmetric_difference(b)` | O(len(a) + len(b)) |

- Methods accept any iterable (`a.union([1, 2])`); operators need two sets.
- In-place versions: `a |= b`, `a &= b`, `a -= b`.
- Uses: Intersection of Two Arrays, common characters, "which items are missing".

```python run
a = {1, 2, 3, 4}
b = {3, 4, 5}
print(a | b)        # {1, 2, 3, 4, 5}
print(a & b)        # {3, 4}
print(a - b)        # {1, 2}
print(a ^ b)        # {1, 2, 5}
print(set(range(6)) - {0, 2, 3})   # missing numbers
```

## Subset and superset checks

- `a <= b` (or `a.issubset(b)`): every element of `a` is in `b`.
- `a < b`: proper subset.
- `a.isdisjoint(b)`: no common elements, faster than `not (a & b)` because it stops early.

```python run
needed = set("abc")
print(needed <= set("cabbage"))     # True
print({1, 2} < {1, 2})              # False: not a proper subset
print({1, 2}.isdisjoint({3, 4}))    # True
```

## Set comprehensions

`{expr for x in iterable if condition}` builds a set (curly braces, no colon).

```python run
words = ["Apple", "apple", "Banana"]
print({w.lower() for w in words})               # case-insensitive unique
print({x % 3 for x in range(10)})               # {0, 1, 2}
grid = ["#.", ".#"]
walls = {(r, c) for r in range(2) for c in range(2) if grid[r][c] == "#"}
print(walls)
```

## Hashable elements: tuples and frozenset

Set elements (and dict keys) must be immutable. Lists, sets and dicts are **not** hashable.

- Grid cells: store tuples `(r, c)`, e.g. `visited.add((r, c))`.
- A sequence as an element: convert with `tuple(path)`.
- An *unordered* group as an element: `frozenset(group)`; `frozenset({1, 2}) == frozenset({2, 1})`.
- Undirected edges: `frozenset((u, v))` or `(min(u, v), max(u, v))`.

```python run
visited = set()
visited.add((0, 1))
print((0, 1) in visited, (1, 0) in visited)
try:
    {[1, 2]}
except TypeError as e:
    print("TypeError:", e)
triplets = {tuple(sorted(t)) for t in [(1, -1, 0), (0, 1, -1), (2, -2, 0)]}
print(triplets)                     # dedupe triplets (3Sum)
edges = {frozenset((1, 2)), frozenset((2, 1))}
print(len(edges))                   # 1: same undirected edge
```

## Deduplicate while keeping order

`set()` loses order. To keep the first occurrence of each value in its original position:

```python run
nums = [3, 1, 3, 2, 1]
print(list(dict.fromkeys(nums)))        # [3, 1, 2]  (dicts keep insertion order)
seen, out = set(), []
for x in nums:
    if x not in seen:
        seen.add(x)
        out.append(x)
print(out)
```

## Pitfalls

- `{}` is an empty **dict**; use `set()`.
- Sets have no order and no indexing: `s[0]` is a `TypeError`. Use `sorted(s)` or `next(iter(s))` to get an element.
- Iteration order of a set is arbitrary. Never rely on it for output that must be sorted.
- Changing a set while iterating over it raises `RuntimeError`; iterate over `list(s)` instead.
- `set("abc")` splits into characters; `{"abc"}` is a set with one string.

```python run
s = {"b", "a", "c"}
print(sorted(s))
print(set("abc"), {"abc"})
try:
    s[0]
except TypeError as e:
    print("TypeError:", e)
```
