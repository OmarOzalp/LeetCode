---
title: defaultdict
group: Data Structures
summary: collections.defaultdict for adjacency lists, grouping and counting without key checks - factories, nested defaults, and the missing-key insertion pitfall.
keywords: [defaultdict, collections, default factory, adjacency list, graph, grouping, group anagrams, defaultdict list, defaultdict int, defaultdict set, counting, missing key, setdefault, nested]
---

`defaultdict` is a dict that calls a **factory function** to create a value the first time a missing key is accessed. It removes the "if key not in d: d[key] = []" boilerplate from graph and grouping code.

## How defaultdict works

```python
from collections import defaultdict
graph = defaultdict(list)    # missing key -> list()  i.e. []
count = defaultdict(int)     # missing key -> int()   i.e. 0
groups = defaultdict(set)    # missing key -> set()
```

Pass the factory itself (`list`, `int`, `set`, or a lambda), **not** a call such as `list()`. Everything else behaves like a normal dict, with the same O(1) average operations.

```python run
from collections import defaultdict
d = defaultdict(list)
d["fruits"].append("apple")     # key created automatically with []
d["fruits"].append("kiwi")
d["veg"].append("leek")
print(d)
print(dict(d))                  # convert for clean printing / returning
print(d["missing"])             # [] and now "missing" is a key
```

## defaultdict(int) for counting

`int()` returns `0`, so `count[x] += 1` works on the first occurrence.

```python run
from collections import defaultdict
count = defaultdict(int)
for ch in "hello world":
    if ch != " ":
        count[ch] += 1
print(dict(count))
print(max(count, key=count.get))     # most frequent character: 'l'
```

`Counter` is usually even simpler for pure counting; `defaultdict(int)` is handy when counting is one part of a bigger loop (for example, the indegree map in topological sort).

## defaultdict(list) for grouping

Map a key to the list of items that share it. Classic uses: Group Anagrams, grouping by length or first letter, bucketing by frequency, grouping indices by value.

```python run
from collections import defaultdict

def group_anagrams(words):
    groups = defaultdict(list)
    for w in words:
        groups["".join(sorted(w))].append(w)
    return list(groups.values())

print(group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))

positions = defaultdict(list)
for i, x in enumerate([3, 1, 3, 2, 1]):
    positions[x].append(i)           # value -> all indices
print(dict(positions))
```

## Building adjacency lists

The standard way to turn an edge list into a graph:

```python
graph = defaultdict(list)
for a, b in edges:
    graph[a].append(b)
    graph[b].append(a)      # undirected: add both directions
```

For directed graphs, add only `graph[a].append(b)`. For weighted graphs, append tuples: `graph[a].append((b, weight))`.

Pitfall: nodes with **no edges** never appear as keys. Loop over `range(n)` (not over `graph`) when every node matters, e.g. counting connected components.

```python run
from collections import defaultdict
n = 5
edges = [[0, 1], [1, 2], [3, 1]]
graph = defaultdict(list)
for a, b in edges:
    graph[a].append(b)
    graph[b].append(a)
print(dict(graph))                     # node 4 is missing: it has no edges
print([graph[i] for i in range(n)])    # covers every node (inserts 4 -> [])

flights = [("SFO", "JFK", 300), ("SFO", "LAX", 80)]
weighted = defaultdict(list)
for src, dst, cost in flights:
    weighted[src].append((dst, cost))
print(dict(weighted))
```

## defaultdict(set)

Like `defaultdict(list)` but automatically **deduplicates** neighbours and gives O(1) membership checks (`b in graph[a]`).

Use it when the input may contain duplicate edges or you need fast "is there an edge?" checks, e.g. Alien Dictionary (the same ordering constraint can appear many times) or finding mutual friends.

```python run
from collections import defaultdict
pairs = [("a", "b"), ("a", "b"), ("a", "c"), ("b", "c")]
graph = defaultdict(set)
for u, v in pairs:
    graph[u].add(v)
print({k: sorted(v) for k, v in graph.items()})   # duplicate a->b stored once
print("c" in graph["a"], "a" in graph["c"])
```

## Custom and nested factories

Any zero-argument callable works as a factory:

| Factory | Default value | Use |
|---|---|---|
| `int` | `0` | counting |
| `list` | `[]` | grouping, adjacency lists |
| `set` | `set()` | unique neighbours |
| `lambda: float("inf")` | `inf` | shortest distances |
| `lambda: [0, 0]` | a fresh `[0, 0]` | per-key pairs of counters |
| `lambda: defaultdict(int)` | nested counter | 2-D sparse tables |

A recursive factory gives an auto-vivifying **trie** in two lines.

```python run
from collections import defaultdict
dist = defaultdict(lambda: float("inf"))
dist["A"] = 0
print(dist["A"], dist["Z"])

table = defaultdict(lambda: defaultdict(int))    # table[row][col] counts
table["r1"]["c1"] += 2
print(table["r1"]["c1"], table["r2"]["c9"])

def Trie():
    return defaultdict(Trie)
root = Trie()
for word in ["cat", "car", "dog"]:
    node = root
    for ch in word:
        node = node[ch]                # creates child nodes as needed
    node["$"] = True                   # end-of-word marker
print(sorted(root["c"]["a"].keys()))   # ['r', 't']
```

## Pitfall: reading a missing key inserts it

`d[key]` on a missing key **creates** that key with the default value, even if you only meant to look. This can:

- grow the dict with junk keys (later `len(d)` or iteration is wrong),
- raise `RuntimeError: dictionary changed size during iteration` if you look up a missing key while iterating over the same dict (very common in graph DFS where you loop over `graph` and read `graph[neighbor]`).

Use `key in d` or `d.get(key)` to check without inserting.

```python run
from collections import defaultdict
graph = defaultdict(list)
graph[1].append(2)
print(len(graph))              # 1
if graph[99]:                  # just READING creates graph[99] = []
    pass
print(len(graph), dict(graph)) # 2 {1: [2], 99: []}
print(5 in graph)              # False: 'in' does not insert
print(graph.get(7))            # None: get() does not insert either
print(len(graph))              # still 2

graph = defaultdict(list)
graph[1].append(2)             # 2 is a neighbour but not yet a key
try:
    for node in graph:
        for nxt in graph[node]:
            graph[nxt]         # inserts key 2 while iterating
except RuntimeError as e:
    print("RuntimeError:", e)
```

Fix: iterate over `list(graph)`, or over `range(n)`, or check with `in` first.

## defaultdict vs get() vs setdefault() vs Counter

| Approach | Example | Inserts on read? | Best for |
|---|---|---|---|
| `dict.get` | `d[x] = d.get(x, 0) + 1` | no | simple counts with a plain dict |
| `dict.setdefault` | `d.setdefault(k, []).append(v)` | yes (on that call) | occasional grouping, no import |
| `defaultdict` | `d[k].append(v)` | **yes** (any `d[k]`) | adjacency lists, heavy grouping |
| `Counter` | `Counter(items)` | no (returns 0) | counting, `most_common`, multiset math |

Returning results: LeetCode accepts a `defaultdict` where a dict is expected, but `dict(d)` or `list(d.values())` makes printed output cleaner.
