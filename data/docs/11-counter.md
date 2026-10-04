---
title: Counter
group: Data Structures
summary: collections.Counter for frequency counting - creation, zero-default lookups, most_common, counter arithmetic, anagram comparisons, and when a plain dict or 26-slot array is better.
keywords: [Counter, collections, frequency, count, most_common, top k frequent, anagram, multiset, counter arithmetic, subtract, update, elements, ransom note, sliding window, permutation in string]
---

`Counter` is a dict subclass built for counting. It turns the frequency-map pattern into one line and adds helpers for "most common" queries and multiset math.

## Creating a Counter

```python
from collections import Counter
counts = Counter(nums)
```

Building a Counter from n items is O(n). You can pass any iterable (list, string, generator), a mapping, or keyword arguments.

```python run
from collections import Counter
nums = [1, 1, 2, 3, 3, 3]
counts = Counter(nums)
print(counts)                      # Counter({3: 3, 1: 2, 2: 1})
print(Counter("banana"))           # characters of a string
print(Counter({"a": 2, "b": 1}))   # from a mapping
print(Counter(w.lower() for w in ["A", "a", "B"]))
print(counts[3], len(counts))      # count of 3; number of distinct values
```

## Missing keys return 0

Looking up a missing key returns `0` instead of raising `KeyError`, and it does **not** insert the key (unlike `defaultdict`). So `counts[x] += 1` works without any setup.

```python run
from collections import Counter
counts = Counter("aab")
print(counts["z"])          # 0, no KeyError
print("z" in counts)        # False: reading did not insert it
counts["z"] += 1            # works without initialization
print(counts)
```

## Updating counts

- `counts[x] += 1` / `counts[x] -= 1` for single changes.
- `counts.update(iterable)` **adds** counts from an iterable or mapping.
- `counts.subtract(iterable)` subtracts in place and **keeps** zero and negative counts.
- Decrementing to 0 leaves the key present. In sliding windows, `del counts[x]` when it reaches 0 so that `len(counts)` is the number of distinct items.

```python run
from collections import Counter
c = Counter("abc")
c.update("aab")
print(c)                        # Counter({'a': 3, 'b': 2, 'c': 1})
c.subtract("cccc")
print(c["c"])                   # -3: subtract keeps negatives
window = Counter("aab")
window["b"] -= 1
print(len(window), dict(window))   # 2 {'a': 2, 'b': 0}  <- key still there
if window["b"] == 0:
    del window["b"]
print(len(window))                 # 1 distinct char
```

## most_common(k)

Returns a list of `(item, count)` pairs, highest count first. Ties keep the order in which items were first inserted.

| Call | Time | Returns |
|---|---|---|
| `c.most_common(k)` | O(n log k) (uses a heap) | top k pairs |
| `c.most_common()` | O(n log n) | all pairs, sorted by count |
| `c.most_common()[-1]` | O(n log n) | least common pair |

```python run
from collections import Counter
nums = [1, 1, 1, 2, 2, 3]
counts = Counter(nums)
print(counts.most_common(2))                   # [(1, 3), (2, 2)]
print([x for x, _ in counts.most_common(2)])   # Top K Frequent Elements: [1, 2]
print(counts.most_common(1)[0][0])             # the mode: 1
print(counts.most_common()[-1])                # least common: (3, 1)
```

Top K Frequent Elements can also be solved in O(n) with bucket sort (index = frequency), which is a common follow-up question.

## Comparing Counters (anagrams)

Two strings are anagrams if they have the same character counts: `Counter(s) == Counter(t)`. O(n + m) time.

Version note: since Python 3.10, missing keys and zero counts compare as equal (`Counter(a=1) == Counter(a=1, b=0)`). On older versions they do not, so when you decrement counts in a loop, delete keys that hit 0 before comparing.

```python run
from collections import Counter
print(Counter("listen") == Counter("silent"))   # True
print(Counter("rat") == Counter("car"))         # False

a = Counter("ab")
a["b"] -= 1
b = Counter("a")
print(a == b)               # True on 3.10+, False on older versions
a = +a                      # unary + drops zero / negative counts
print(a == b)               # True on every version
```

## Counter arithmetic

| Expression | Result | Keeps |
|---|---|---|
| `a + b` | add counts | positive counts only |
| `a - b` | subtract counts | positive counts only |
| `a & b` | min of each count (intersection) | positive |
| `a \| b` | max of each count (union) | positive |
| `+a` | drop zero/negative counts | positive |

Uses: Ransom Note (`not Counter(note) - Counter(magazine)`), common characters across words (`&`), combining counts from several sources (`+`).

```python run
from collections import Counter
a = Counter("aabbbc")
b = Counter("abd")
print(a + b)    # Counter({'b': 4, 'a': 3, 'c': 1, 'd': 1})
print(a - b)    # Counter({'b': 2, 'a': 1, 'c': 1})  ('d' dropped)
print(a & b)    # Counter({'a': 1, 'b': 1})
print(a | b)    # Counter({'b': 3, 'a': 2, 'c': 1, 'd': 1})

def can_construct(note, magazine):          # Ransom Note
    return not (Counter(note) - Counter(magazine))
print(can_construct("aa", "aab"), can_construct("aa", "ab"))

words = ["bella", "label", "roller"]
common = Counter(words[0])
for w in words[1:]:
    common &= Counter(w)
print(sorted(common.elements()))            # Find Common Characters
```

## Pattern: Counter in a sliding window

For "find all anagrams of p in s" or Permutation in String, slide a fixed-size window over `s` and keep a Counter of the window. Add the entering character, remove the leaving one (deleting zero counts), and compare with the target Counter. Each comparison costs O(alphabet size), so the scan is O(n · 26) = O(n).

```python run
from collections import Counter

def find_anagrams(s, p):
    need = Counter(p)
    window = Counter()
    k = len(p)
    result = []
    for i, ch in enumerate(s):
        window[ch] += 1
        if i >= k:
            left = s[i - k]
            window[left] -= 1
            if window[left] == 0:
                del window[left]     # keep the comparison exact on any version
        if window == need:
            result.append(i - k + 1)
    return result

print(find_anagrams("cbaebabacd", "abc"))   # [0, 6]
print(find_anagrams("abab", "ab"))          # [0, 1, 2]
```

## Other useful methods

- `c.elements()`: iterator repeating each item `count` times.
- `sum(c.values())`: total number of items (`c.total()` in Python 3.10+).
- `len(c)`: number of **distinct** items.
- `c.keys()`, `c.values()`, `c.items()` work like a dict.
- Sort by frequency with a tiebreak: `sorted(c, key=lambda x: (-c[x], x))`.

```python run
from collections import Counter
c = Counter("mississippi")
print(len(c), sum(c.values()))                # 4 distinct, 11 total
print("".join(sorted(c.elements())))          # iiiimppssss
print(sorted(c, key=lambda ch: (-c[ch], ch))) # by frequency, then letter
print("".join(ch * n for ch, n in c.most_common()))   # Sort Characters By Frequency
```

## Counter vs dict vs 26-slot array

| Tool | Best when | Notes |
|---|---|---|
| `Counter(items)` | counting any hashable items; need `most_common` or multiset math | clearest; missing keys read as 0 |
| `dict` with `d.get(x, 0) + 1` | the interviewer wants to see the hash map built by hand, or you store more than counts | explicit, no import |
| `defaultdict(int)` | counting inside a larger loop while building other structures | reading missing keys **inserts** them |
| `[0] * 26` | only lowercase letters (or a small fixed alphabet) | fastest, O(1) space; `tuple(arr)` is a hashable key; compare in O(26) |

Rule of thumb: start with `Counter` for readability. Switch to a 26-slot array when the alphabet is tiny and you compare counts many times (sliding windows) or need a hashable signature.
