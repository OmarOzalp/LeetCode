---
title: Built-in Functions
group: Python Essentials
summary: The built-in functions that appear in almost every interview solution, when to reach for each one, and the traps to avoid.
keywords: [len, range, enumerate, zip, sorted, reversed, min, max, sum, abs, any, all, map, filter, divmod, floor division, modulo, ord, chr, infinity, inf, isinstance, int, str, bin, conversion]
---

Built-ins need no import and run in C, so they are shorter *and* faster than hand-written loops. Knowing them cold keeps your solution readable under time pressure.

## len()

Returns the number of items in a list, string, dict, set, tuple or deque. It is **O(1)** for every built-in container: the size is stored, not counted.

- Grab `n = len(nums)` once at the top of array problems and reuse `n`.
- Empty checks: `if not nums:` is the idiomatic form of `if len(nums) == 0:`.
- `len()` does not work on iterators such as the results of `map`, `zip`, `filter` or `reversed`; wrap them in `list()` first.

```python run
nums = [4, 1, 7]
word = "hello"
freq = {"a": 2, "b": 1}
print(len(nums), len(word), len(freq), len(set("banana")))
print("empty" if not [] else "non-empty")
```

## range()

`range(stop)`, `range(start, stop)`, `range(start, stop, step)`. The **stop value is excluded**. A range is lazy, so it uses O(1) memory however large it is.

| Goal | Code | Produces |
|---|---|---|
| Indices of a list | `range(n)` | 0, 1, …, n-1 |
| 1 to n inclusive | `range(1, n + 1)` | 1, 2, …, n |
| Every other index | `range(0, n, 2)` | 0, 2, 4, … |
| Backwards over indices | `range(n - 1, -1, -1)` | n-1, …, 1, 0 |
| Adjacent pairs `i, i + 1` | `range(n - 1)` | stops before the last index |
| All pairs `i < j` | `for i in range(n): for j in range(i + 1, n)` | each pair once |

Pitfalls:
- To reach index 0 going backwards, the stop must be `-1`: `range(n - 1, 0, -1)` stops at 1.
- `range(5, 0)` is empty. Counting down needs a negative step.
- `reversed(range(n))` is an equally clear way to iterate backwards.

```python run
n = 5
print(list(range(n)))
print(list(range(1, n + 1)))
print(list(range(0, 10, 3)))
print(list(range(n - 1, -1, -1)))   # reverse indices
print(list(range(10, 0, -2)))
print(list(range(5, 0)))            # empty: no negative step
```

## enumerate()

Yields `(index, value)` pairs. Use it whenever you need **both** the position and the element. It replaces `for i in range(len(nums)): x = nums[i]`.

- `enumerate(seq, start=1)` starts counting at 1 (handy for 1-indexed output).
- Typical uses: storing `value → index` in a dict (Two Sum), recording where something was last seen (sliding window), returning indices of matches.

```python run
nums = [10, 20, 30]
for i, x in enumerate(nums):
    print(i, x)
for i, ch in enumerate("abc", start=1):
    print(i, ch)
print([i for i, x in enumerate([1, 3, 1, 2, 1]) if x == 1])   # every index of 1
```

## zip()

Walks several iterables in lockstep and yields tuples. It **stops at the shortest** input (no error), which is convenient but can silently hide length mismatches.

Interview uses:
- Compare two sequences position by position: `for a, b in zip(s, t)`.
- Adjacent pairs: `zip(nums, nums[1:])`.
- Transpose a matrix: `zip(*matrix)`; rotate 90° clockwise: `zip(*matrix[::-1])`.
- Build a dict from two lists: `dict(zip(keys, values))`.

```python run
names = ["ann", "bob", "cy"]
scores = [90, 85]
print(list(zip(names, scores)))                    # stops at the shorter one
nums = [1, 3, 6, 10]
print([b - a for a, b in zip(nums, nums[1:])])     # adjacent differences
matrix = [[1, 2, 3], [4, 5, 6]]
print([list(row) for row in zip(*matrix)])          # transpose
print([list(row) for row in zip(*matrix[::-1])])    # rotate clockwise
print(dict(zip("abc", range(3))))
values, letters = zip(*[(1, "x"), (2, "y")])        # "unzip"
print(values, letters)
```

## sorted() and reversed()

- `sorted(iterable)` returns a **new list**, leaving the input untouched. It accepts any iterable (string, set, dict keys) and supports `key=` and `reverse=True`. O(n log n).
- `reversed(seq)` returns a lazy **iterator**, not a list. Wrap it with `list()` to print or index it. O(1) to create, O(n) to consume.

See *Sorting & Lambdas* for `key=` functions and `sort()` vs `sorted()`.

```python run
nums = [3, 1, 2]
print(sorted(nums), nums)          # new list; original unchanged
print(sorted("banana"))            # any iterable -> list of chars
print("".join(sorted("banana")))   # anagram signature
print(sorted(nums, reverse=True))
print(list(reversed(nums)))
for i in reversed(range(3)):
    print(i, end=" ")
print()
```

## min() and max()

Work on an iterable *or* on several arguments. Both are O(n).

- `key=` picks what to compare: `max(words, key=len)`, `max(counts, key=counts.get)`.
- `default=` avoids `ValueError` on an empty iterable: `max(nums, default=0)`.
- The running-best pattern `best = max(best, current)` appears in Kadane, sliding window and DP problems.
- With ties, `max` returns the **first** maximal element.

```python run
nums = [4, -2, 9, 0]
print(max(nums), min(nums))
print(max(3, 7), min(3, 7, 1))              # several arguments
words = ["kiwi", "banana", "fig"]
print(max(words, key=len))                  # longest word
print(min(words, key=lambda w: w[-1]))      # by last letter
print(max([], default=0))                   # no ValueError
counts = {"a": 3, "b": 5, "c": 1}
print(max(counts, key=counts.get))          # key with the largest value
points = [(1, 2), (-3, 1), (0, 1)]
print(min(points, key=lambda p: p[0] ** 2 + p[1] ** 2))   # closest to origin
```

## sum()

Adds up an iterable in O(n). Pass a **generator expression** to avoid building a temporary list.

- Count matches: `sum(1 for x in nums if x > 0)`; booleans count as 1 and 0.
- Missing Number: expected total `n * (n + 1) // 2` minus `sum(nums)`.
- `sum(grid, [])` flattens lists but is O(n²); use a comprehension instead.

```python run
nums = [3, 0, 1]
print(sum(nums))
print(sum(x * x for x in nums))            # generator, no temp list
print(sum(1 for x in nums if x > 0))       # count matches
print(sum([True, False, True]))            # bools are 1 / 0
n = len(nums)
print("missing:", n * (n + 1) // 2 - sum(nums))
```

## abs()

Absolute value. Useful for distances and for comparing magnitudes.

- Distance on a number line: `abs(a - b)`. Manhattan distance: `abs(x1 - x2) + abs(y1 - y2)`.
- Sort by magnitude: `sorted(nums, key=abs)`.
- Diagonal check (N-Queens): `abs(r1 - r2) == abs(c1 - c2)`.

```python run
print(abs(-7), abs(3.5))
p, q = (1, 2), (4, -2)
print(abs(p[0] - q[0]) + abs(p[1] - q[1]))   # Manhattan distance
print(sorted([-4, -1, 0, 3], key=abs))
```

## any() and all()

`any(it)` is True if at least one element is truthy; `all(it)` is True if every element is. Both **short-circuit**, so they stop at the first deciding element.

- Edge cases: `any([])` is `False`, `all([])` is `True`.
- Pair with generator expressions: `all(c == 0 for c in counts)` (anagram check), `any(x in seen for x in group)`.

```python run
nums = [2, 4, 6, 7]
print(any(x % 2 for x in nums))     # is there an odd number?
print(all(x > 0 for x in nums))     # all positive?
print(any([]), all([]))             # False True
words = ["apple", "app", "apricot"]
print(all(w.startswith("ap") for w in words))
```

## map() and filter()

`map(f, it)` applies `f` to each element; `filter(f, it)` keeps elements where `f` is truthy. Both return lazy iterators.

- The most common interview use is parsing: `list(map(int, line.split()))`.
- `"".join(map(str, digits))` turns numbers into one string.
- A list comprehension is usually clearer than `map`/`filter` with a lambda; prefer it in interviews.

```python run
nums = list(map(int, "3 10 7".split()))
print(nums)
print("".join(map(str, [1, 2, 3])))
print(list(filter(lambda x: x % 2 == 0, range(10))))
print([x for x in range(10) if x % 2 == 0])     # same thing, clearer
print(list(filter(None, ["a", "", "b", ""])))   # drop falsy values
```

## divmod(), // and %

`divmod(a, b)` returns `(a // b, a % b)` in one call.

- `//` **floors toward negative infinity**: `-7 // 2 == -4`. To truncate toward zero (C/Java behaviour, needed in Evaluate RPN), use `int(a / b)`.
- `%` takes the sign of the divisor, so `-3 % 2 == 1`. Parity checks work for negatives, and `(i - 1) % n` wraps index 0 to `n - 1` in circular arrays.
- Peel digits: `n, d = divmod(n, 10)`.
- Flat index to grid cell: `row, col = divmod(idx, cols)` (Search a 2D Matrix).
- Ceiling division without floats: `(a + b - 1) // b` or `-(-a // b)`.

```python run
print(divmod(17, 5))          # (3, 2)
print(-7 // 2, -7 % 2)        # -4 1  (floor)
print(int(-7 / 2))            # -3    (truncate toward zero)
print((-1) % 5)               # 4: wraps around
n, digits = 9045, []
while n:
    n, d = divmod(n, 10)
    digits.append(d)
print(digits[::-1])
print(divmod(9, 4))           # flat index 9 in a 4-column grid -> (2, 1)
print((7 + 3 - 1) // 3)       # ceil(7 / 3) = 3
```

## ord() and chr()

`ord(ch)` gives a character's code point; `chr(code)` converts back.

- Map lowercase letters to 0–25: `ord(c) - ord('a')`. This indexes a 26-slot count array.
- Digit value: `ord(c) - ord('0')` (or simply `int(c)`).
- Shift letters with wraparound: `chr((ord(c) - ord('a') + k) % 26 + ord('a'))`.
- Uppercase letters have *smaller* codes than lowercase (`'Z' < 'a'`).

```python run
print(ord("a"), ord("z"), ord("A"), ord("0"))
print(chr(97), chr(ord("a") + 2))
print(ord("e") - ord("a"))                  # 4
print(ord("7") - ord("0"))                  # 7
print("".join(chr((ord(c) - ord("a") + 3) % 26 + ord("a")) for c in "xyz"))
```

## float('inf') and float('-inf')

Infinity compares greater (or smaller) than every number, which makes it the natural starting value for minimums and maximums.

- `best = float('inf')` before a min-search; `best = float('-inf')` before a max-search.
- Distance arrays in Dijkstra / Bellman-Ford start as `[float('inf')] * n`.
- "Not found" sentinel: `return -1 if best == float('inf') else best` (Coin Change).
- `math.inf` is the same value.

Pitfalls: infinity is a **float**, so `int(float('inf'))` raises `OverflowError`, and `inf - inf` is `nan`. Convert before returning an int.

```python run
import math
best = float("inf")
for x in [7, 3, 9]:
    best = min(best, x)
print(best)
print(float("inf") > 10 ** 100, float("-inf") < -10 ** 100)
print(math.inf == float("inf"))
dist = [float("inf")] * 4
dist[0] = 0
print(dist)
print(float("inf") - float("inf"))     # nan
```

## isinstance()

Checks whether a value is of a type (or any type in a tuple of types). Useful when input mixes types, e.g. Flatten Nested List or parsing tokens.

- `isinstance(x, (int, float))` accepts several types.
- Pitfall: `bool` is a subclass of `int`, so `isinstance(True, int)` is `True`.

```python run
def flatten(xs):
    out = []
    for x in xs:
        if isinstance(x, list):
            out.extend(flatten(x))
        else:
            out.append(x)
    return out

print(flatten([1, [2, [3, 4]], 5]))
print(isinstance(3, (int, float)), isinstance("3", int))
print(isinstance(True, int))          # True: bool is an int subclass
```

## int(), str() and bin() conversions

| Code | Result | Use |
|---|---|---|
| `int("42")`, `int(" -7 ")` | 42, -7 | parse input (whitespace allowed) |
| `int(3.99)`, `int(-3.99)` | 3, -3 | truncates toward zero |
| `int("1011", 2)` | 11 | parse binary (any base 2–36) |
| `str(123)[::-1]` | `"321"` | digit manipulation, palindromes |
| `bin(11)` | `"0b1011"` | binary string, strip with `[2:]` |
| `bin(n).count("1")` | popcount | Number of 1 Bits, Counting Bits |
| `format(5, "08b")` | `"00000101"` | zero-padded binary |

Python ints have **arbitrary precision**: they never overflow. Problems that assume 32-bit ints (Reverse Integer, Sum of Two Integers) need explicit checks such as `-2**31 <= x <= 2**31 - 1` or masking with `0xFFFFFFFF`.

Pitfall: `int("3.5")` raises `ValueError`; use `int(float("3.5"))`.

```python run
print(int("42"), int("  -17 "), int("007"))
print(int(3.99), int(-3.99))
print(int("1011", 2), int("ff", 16))
print(bin(11), bin(11)[2:], bin(11).count("1"))
print(int(str(123)[::-1]))
print(format(5, "08b"))
print(2 ** 100)                    # no overflow
x = 2 ** 31
print(-2 ** 31 <= x <= 2 ** 31 - 1)   # outside 32-bit range
```
