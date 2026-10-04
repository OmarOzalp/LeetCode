---
title: Dictionaries
group: Python Essentials
summary: Hash maps in Python - O(1) average lookups, safe access with get(), iteration, and the frequency, index, grouping and memoization patterns.
keywords: [dict, hash map, hashmap, get, keys, values, items, in, setdefault, pop, del, dict comprehension, insertion order, tuple keys, frequency map, two sum, group anagrams, memoization, memo]
---

The dictionary is the single most useful data structure in interviews. Whenever a brute-force solution re-scans the input to "find" something, a dict usually turns that O(n) search into an O(1) lookup.

## Dictionary operation complexity

| Operation | Average | Notes |
|---|---|---|
| `d[key]`, `d[key] = value` | O(1) | |
| `key in d` | O(1) | checks **keys** only |
| `d.get(key, default)` | O(1) | |
| `del d[key]`, `d.pop(key)` | O(1) | |
| `len(d)` | O(1) | |
| Iterate `keys()` / `values()` / `items()` | O(n) | |
| `value in d.values()` | O(n) | linear scan |
| `d.copy()`, `dict(d)` | O(n) | shallow copy |

The worst case is O(n) per operation under pathological hash collisions. In interviews, state "O(1) average".

## Creating dictionaries

```python run
empty = {}                                 # {} is an empty DICT, not a set
ages = {"ann": 31, "bob": 27}
also = dict(ann=31, bob=27)                # keyword form (string keys only)
pairs = dict([("a", 1), ("b", 2)])         # from (key, value) pairs
zipped = dict(zip("xyz", [1, 2, 3]))       # from two parallel lists
seen = dict.fromkeys("abc", 0)             # same default for each key
print(empty, ages == also, pairs, zipped, seen)
```

Pitfall: `dict.fromkeys(keys, [])` shares **one** list between all keys. Use a comprehension or `defaultdict(list)` for mutable defaults.

## Access with [] vs get()

- `d[key]` raises `KeyError` if the key is missing. Use it when the key must exist.
- `d.get(key)` returns `None` when missing; `d.get(key, default)` returns `default`.
- `d.get(key, 0) + 1` is the core of the frequency-map pattern.
- Pitfall: `if d.get(key):` is also False when the *value* is `0`, `""` or `[]`. Use `if key in d:` to test existence.

```python run
d = {"a": 1, "z": 0}
print(d["a"])
print(d.get("b"), d.get("b", 99))
try:
    d["b"]
except KeyError as e:
    print("KeyError:", e)
print(bool(d.get("z")), "z" in d)    # False True: value 0 is falsy!
```

## Membership with in

`key in d` is O(1) average and checks **keys**, never values. `value in d.values()` works but is O(n), so if you need fast value lookups, keep a second dict mapping the other way.

```python run
index_of = {"apple": 0, "kiwi": 1}
print("apple" in index_of)          # True  (key)
print(0 in index_of)                # False (0 is a value)
print(0 in index_of.values())       # True, but O(n)
print("fig" not in index_of)
```

## keys(), values() and items()

These return live **views** that reflect later changes to the dict.

- `for k in d:` iterates keys (same as `d.keys()`).
- `for k, v in d.items():` is the standard way to walk entries.
- `sum(d.values())`, `max(d.values())` for aggregate stats.
- Wrap in `list()` to index or to freeze a snapshot.

```python run
freq = {"a": 3, "b": 1, "c": 2}
for key, count in freq.items():
    print(key, count)
print(list(freq.keys()), list(freq.values()))
print(sum(freq.values()), max(freq.values()))
print([k for k, v in freq.items() if v >= 2])
```

## Adding, updating and deleting

- `d[key] = value` inserts or overwrites.
- `del d[key]` removes (raises `KeyError` if missing).
- `d.pop(key, default)` removes **and returns** the value; with a default it never raises.
- `d.update(other)` merges in another dict. `{**a, **b}` builds a merged copy (and `a | b` works in Python 3.9+).
- Sliding-window counts: when a count drops to 0, `del window[ch]` so that `len(window)` equals the number of distinct characters.

```python run
window = {"a": 2, "b": 1}
window["c"] = 1
window["b"] -= 1
if window["b"] == 0:
    del window["b"]                 # keep only non-zero counts
print(window, len(window))
print(window.pop("a"), window.pop("missing", None), window)
merged = {**{"x": 1}, **{"x": 2, "y": 3}}   # later keys win
print(merged)
```

## setdefault()

`d.setdefault(key, default)` returns `d[key]` if present; otherwise it inserts `default` and returns it. It is a one-line way to group into lists without `defaultdict`.

Pitfall: the default expression is evaluated on **every** call, even when the key exists (`d.setdefault(k, [])` builds a throwaway list each time). That is harmless for small defaults; prefer `defaultdict(list)` in hot loops.

```python run
groups = {}
for word in ["apple", "avocado", "banana", "blueberry", "cherry"]:
    groups.setdefault(word[0], []).append(word)
print(groups)
```

## Iteration order

Since Python 3.7, dicts preserve **insertion order**. Updating an existing key keeps its position; deleting and re-inserting moves it to the end.

- Order is useful for "first unique character" style scans, but if the problem needs sorted order, call `sorted(d)` explicitly.
- Changing the dict's **size** while iterating raises `RuntimeError`. Iterate over `list(d)` when you need to delete keys.

```python run
d = {}
d["b"] = 1
d["a"] = 2
d["c"] = 3
print(list(d))              # ['b', 'a', 'c']
d["b"] = 10                 # update: position kept
print(list(d.items()))

counts = {"x": 0, "y": 2, "z": 0}
try:
    for k in counts:
        if counts[k] == 0:
            del counts[k]
except RuntimeError as e:
    print("RuntimeError:", e)

counts = {"x": 0, "y": 2, "z": 0}
for k in list(counts):      # iterate over a snapshot of the keys
    if counts[k] == 0:
        del counts[k]
print(counts)
```

## Dict comprehensions

`{key_expr: value_expr for x in iterable if condition}` builds a dict in one line.

```python run
words = ["apple", "kiwi", "fig"]
lengths = {w: len(w) for w in words}
print(lengths)
print({v: k for k, v in {"a": 1, "b": 2}.items()})   # invert a mapping
print({x: i for i, x in enumerate("abc")})           # value -> index
print({k: v for k, v in lengths.items() if v > 3})   # filter entries
```

Inverting a mapping assumes unique values: duplicates keep the **last** key seen.

## Tuple keys (hashable keys only)

Keys must be **hashable** (immutable): ints, strings, tuples of hashables, frozensets. Lists, sets and dicts cannot be keys.

- Grid cells: `seen[(r, c)]`, written equally well as `seen[r, c]`.
- Multi-argument memoization: `memo[(i, j)]`.
- Convert a list to a key with `tuple(...)`: `tuple(sorted(word))`, or a tuple of 26 letter counts for Group Anagrams.

```python run
cost = {}
cost[(0, 1)] = 5
cost[2, 3] = 7                     # parentheses optional
print(cost[(2, 3)], (0, 1) in cost)
try:
    bad = {[1, 2]: "x"}
except TypeError as e:
    print("TypeError:", e)
print({tuple(sorted([3, 1, 2])): "ok"})
```

## Pattern: frequency map

Count occurrences in one pass, O(n) time and O(k) space for k distinct values.

```python
freq[x] = freq.get(x, 0) + 1
```

Use it for Valid Anagram, Top K Frequent Elements, First Unique Character, majority element and many sliding-window problems. `collections.Counter` does the same in one line (see *Counter*).

```python run
nums = [1, 1, 2, 3, 3, 3]
freq = {}
for x in nums:
    freq[x] = freq.get(x, 0) + 1
print(freq)                                   # {1: 2, 2: 1, 3: 3}
print(max(freq, key=freq.get))                # most frequent value: 3
print([x for x, c in freq.items() if c == 1]) # values seen once

s = "leetcode"
counts = {}
for ch in s:
    counts[ch] = counts.get(ch, 0) + 1
print(next((i for i, ch in enumerate(s) if counts[ch] == 1), -1))  # first unique
```

## Pattern: value → index map (Two Sum)

Store each value's index as you scan. For every new element, check whether its complement was already seen. This turns the O(n²) pair search into O(n).

Check **before** inserting the current element so an element is never paired with itself.

```python run
def two_sum(nums, target):
    index_of = {}                      # value -> index
    for i, x in enumerate(nums):
        need = target - x
        if need in index_of:
            return [index_of[need], i]
        index_of[x] = i
    return []

print(two_sum([2, 7, 11, 15], 9))      # [0, 1]
print(two_sum([3, 3], 6))              # [0, 1]
print(two_sum([3, 2, 4], 6))           # [1, 2]
```

The same idea, "remember what you've seen and where", powers Longest Substring Without Repeating Characters (`last_seen[ch] = i`) and Contains Duplicate II.

## Pattern: grouping (Group Anagrams)

Map a **canonical key** to a list of members. Every member of a group produces the same key.

| Key choice | Cost per word of length L |
|---|---|
| `"".join(sorted(w))` | O(L log L) |
| `tuple` of 26 letter counts | O(L) |

```python run
def group_anagrams(words):
    groups = {}
    for w in words:
        count = [0] * 26
        for ch in w:
            count[ord(ch) - ord("a")] += 1
        groups.setdefault(tuple(count), []).append(w)
    return list(groups.values())

print(group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))
```

## Pattern: memoization with a dict

Cache the result of each subproblem so recursion computes it only once. This turns exponential recursion into polynomial DP (Climbing Stairs, House Robber, Word Break, Unique Paths).

- Use the function's arguments as the key; for several arguments use a tuple `(i, j)`.
- Create the memo **inside** the outer function (or reset it). A module-level dict or a mutable default argument `memo={}` leaks state between test cases.
- `functools.lru_cache` does this automatically (see *Common Imports*).

```python run
def climb_stairs(n):
    memo = {}
    def ways(i):
        if i <= 1:
            return 1
        if i not in memo:
            memo[i] = ways(i - 1) + ways(i - 2)
        return memo[i]
    return ways(n)

def unique_paths(m, n):
    memo = {}
    def paths(r, c):
        if r == 0 or c == 0:
            return 1
        if (r, c) not in memo:
            memo[(r, c)] = paths(r - 1, c) + paths(r, c - 1)
        return memo[(r, c)]
    return paths(m - 1, n - 1)

print(climb_stairs(5), climb_stairs(40))
print(unique_paths(3, 7))      # 28
```

## Sorting a dict by key or value

Dicts are not sorted, but `sorted()` works on their keys or items.

```python run
scores = {"ann": 82, "bob": 95, "cy": 82}
print(sorted(scores))                                            # keys
print(sorted(scores.items(), key=lambda kv: kv[1]))              # by value
print(sorted(scores.items(), key=lambda kv: (-kv[1], kv[0])))    # value desc, key asc
print(sorted(scores, key=scores.get, reverse=True)[:2])          # top-2 keys
```
