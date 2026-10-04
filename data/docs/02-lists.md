---
title: Lists
group: Python Essentials
summary: Python's dynamic array - core methods, slicing, copying, comprehensions, 2-D grids, and the cost of each operation.
keywords: [list, array, append, pop, insert, remove, sort, reverse, index, count, slicing, copy, list comprehension, 2d list, grid, matrix, in, extend, unpacking, swap]
---

A Python list is a dynamic array: fast at the end, slow at the front. Most array problems on LeetCode hand you a list, so knowing which operations are O(1) and which are O(n) is the difference between an accepted solution and a timeout.

## List operation complexity

| Operation | Time | Notes |
|---|---|---|
| `nums[i]`, `nums[i] = x` | O(1) | random access |
| `len(nums)` | O(1) | |
| `nums.append(x)` | O(1) amortized | occasional resize |
| `nums.pop()` | O(1) | removes the last item |
| `nums.pop(0)` | O(n) | shifts every element left |
| `nums.insert(0, x)` | O(n) | shifts every element right |
| `nums.insert(i, x)`, `nums.pop(i)` | O(n - i) | |
| `nums.remove(x)` | O(n) | search + shift |
| `x in nums` | O(n) | linear scan |
| `nums.index(x)`, `nums.count(x)` | O(n) | |
| `nums.sort()`, `sorted(nums)` | O(n log n) | |
| `nums.reverse()` | O(n) | |
| `nums[a:b]` | O(k) | k = b - a; makes a copy |
| `nums.extend(other)` | O(k) | k = len(other) |
| `min`, `max`, `sum` | O(n) | |

Rule of thumb: work at the **end** of a list. If you need the front too, use `collections.deque`; if you need fast membership, use a `set`.

## Creating lists

```python run
empty = []
zeros = [0] * 5                  # fixed-size array (safe: ints are immutable)
evens = list(range(0, 10, 2))
chars = list("abc")              # string -> list of characters
prefix = [0] * (len(evens) + 1)  # prefix-sum array with a leading 0
print(empty, zeros, evens, chars, prefix)
```

- `[0] * n` and `[False] * n` are the standard way to make DP arrays, count arrays and visited arrays.
- `list(s)` turns an immutable string into a mutable list of characters.
- Never use `[[]] * n` or `[[0] * m] * n` for nested lists (see *2-D lists*).

## append() and pop()

`append(x)` adds to the end in O(1) amortized time; `pop()` removes and returns the last element in O(1). Together they make a list a **stack**.

- `nums[-1]` peeks at the last element without removing it.
- `pop()` on an empty list raises `IndexError`, so guard with `if stack:`.
- Building results with `res.append(...)` in a loop is O(n) overall.

```python run
stack = []
stack.append(1)
stack.append(2)
stack.append(3)
print(stack)          # [1, 2, 3]
print(stack.pop())    # 3
print(stack[-1])      # 2 (peek)
print(stack)          # [1, 2]
try:
    [].pop()
except IndexError as e:
    print("IndexError:", e)
```

## insert() and pop(0)

`insert(i, x)` puts `x` before index `i`; `pop(i)` removes index `i`. Both shift every later element, so at the **front** they cost **O(n)**.

- `pop(0)` inside a loop turns an O(n) algorithm into O(n²). A BFS written with `queue.pop(0)` is the classic example: use `deque.popleft()` instead.
- `insert(0, x)` in a loop is also O(n²). Either use `deque.appendleft`, or `append` everything and `reverse()` once at the end.
- An index beyond the end simply appends.

```python run
nums = [1, 2, 4]
nums.insert(2, 3)       # before index 2
print(nums)             # [1, 2, 3, 4]
nums.insert(0, 0)       # front: O(n)
print(nums)
nums.insert(100, 5)     # past the end -> append
print(nums)
print(nums.pop(0), nums)   # O(n)
print(nums.pop(1), nums)   # remove by index
```

## remove() and del

- `nums.remove(x)` deletes the **first occurrence** of a value, O(n). It raises `ValueError` if `x` is missing.
- `del nums[i]` deletes by index; `del nums[i:j]` deletes a slice.
- To remove *all* occurrences, build a new list with a comprehension. That is O(n), while repeated `remove` calls are O(n²).

```python run
nums = [3, 1, 3, 2]
nums.remove(3)            # first 3 only
print(nums)               # [1, 3, 2]
if 7 in nums:             # guard against ValueError
    nums.remove(7)
del nums[0]
print(nums)               # [3, 2]
print([x for x in [3, 1, 3, 2] if x != 3])   # remove all 3s
```

## index() and count()

Both scan the list in O(n).

- `nums.index(x)` returns the first index of `x` and raises `ValueError` if it is missing. `nums.index(x, start)` begins the search at `start`.
- `nums.count(x)` counts occurrences.
- Pitfall: calling `index()` or `count()` inside a loop gives O(n²). Precompute a `value → index` dict or a `Counter` instead.

```python run
nums = [5, 7, 5, 9]
print(nums.index(5))        # 0
print(nums.index(5, 1))     # 2: search from index 1
print(nums.count(5))        # 2
print(nums.index(9) if 9 in nums else -1)
try:
    nums.index(42)
except ValueError:
    print("index() raises ValueError when missing")
```

## Membership with in

`x in nums` scans the whole list: **O(n)**. One check is fine. Checking inside a loop gives O(n²), so convert to a set first (O(n) once, then O(1) per lookup).

```python run
nums = list(range(100000))
targets = [5, 99999, -1]
print([t in nums for t in targets])      # each check is O(n)
lookup = set(nums)                        # O(n) once
print([t in lookup for t in targets])    # O(1) each
```

## sort() and reverse()

Both modify the list **in place** and **return `None`**.

- `nums.sort()` is O(n log n), stable, and accepts `key=` and `reverse=True`.
- `nums.reverse()` is O(n). `nums[::-1]` makes a reversed *copy* instead.
- Classic bug: `nums = nums.sort()` sets `nums` to `None`.

```python run
nums = [3, 1, 2]
result = nums.sort()
print(result, nums)          # None [1, 2, 3]
nums.sort(reverse=True)
print(nums)                  # [3, 2, 1]
nums.reverse()
print(nums)                  # [1, 2, 3]
words = ["bb", "a", "ccc"]
words.sort(key=len)
print(words)
```

## Negative indexing and slicing

`nums[start:stop:step]` returns a **new list**; stop is excluded, and any part can be omitted. Negative indices count from the end. Slicing costs O(k) time and memory for k copied elements.

| Expression | Meaning |
|---|---|
| `nums[-1]`, `nums[-2]` | last, second-to-last |
| `nums[:k]` | first k elements |
| `nums[k:]` | everything from index k on |
| `nums[-k:]` | last k elements |
| `nums[::-1]` | reversed copy |
| `nums[::2]` | every other element |

- Slices never raise `IndexError`; out-of-range bounds are clipped.
- Slicing inside recursion (`helper(nums[1:])`) copies on every call; pass indices (`helper(i + 1)`) to stay O(n).

```python run
nums = [0, 1, 2, 3, 4, 5]
print(nums[-1], nums[-2])
print(nums[1:4])              # [1, 2, 3]
print(nums[:3], nums[3:])
print(nums[-2:])              # [4, 5]
print(nums[::2])              # [0, 2, 4]
print(nums[::-1])
print(nums[4:100])            # clipped, no error
nums[1:3] = [9, 9, 9]         # slice assignment can change length
print(nums)
```

## Copying lists (and in-place updates)

Assignment never copies: `b = a` makes two names for **one** list.

| Copy | Code | Depth |
|---|---|---|
| Shallow | `a[:]`, `list(a)`, `a.copy()` | new outer list, same inner objects |
| 2-D grid | `[row[:] for row in grid]` | copies each row |
| Deep | `copy.deepcopy(a)` | copies everything (slow) |

Two interview-critical cases:
- **Backtracking:** append `path[:]` (a snapshot), not `path`. Otherwise every saved result is the same list, which ends up empty after all the pops.
- **"Modify nums in place":** write `nums[:] = new_values`. Plain `nums = new_values` only rebinds the local name, and the caller's list is unchanged.

```python run
a = [1, 2, 3]
b = a                  # same list
b.append(4)
print(a)               # [1, 2, 3, 4]
c = a[:]               # real (shallow) copy
c.append(5)
print(a, c)

def subsets(nums, snapshot):
    res, path = [], []
    def backtrack(i):
        if i == len(nums):
            res.append(path[:] if snapshot else path)
            return
        path.append(nums[i])
        backtrack(i + 1)
        path.pop()
        backtrack(i + 1)
    backtrack(0)
    return res

print(subsets([1, 2], snapshot=False))   # [[], [], [], []]  <- bug
print(subsets([1, 2], snapshot=True))    # [[1, 2], [1], [2], []]

def rotate(nums, k):
    k %= len(nums)
    nums[:] = nums[-k:] + nums[:-k]      # mutates the caller's list
arr = [1, 2, 3, 4, 5]
rotate(arr, 2)
print(arr)                               # [4, 5, 1, 2, 3]
```

## List comprehensions

`[expr for x in iterable if condition]` builds a list in one readable, fast line.

- Filter: `[x for x in nums if x > 0]`
- Transform with a conditional expression: `["even" if x % 2 == 0 else "odd" for x in nums]` (the `if/else` goes **before** `for`)
- Nested loops read left to right, outer loop first: `[x for row in grid for x in row]`
- Use a generator expression `(...)` when feeding `sum`, `any`, `all`, `max`, so no list is built.
- Don't use a comprehension just for side effects; write a normal loop.

```python run
nums = [1, 2, 3, 4, 5]
print([x * x for x in nums])
print([x for x in nums if x % 2 == 1])
print(["even" if x % 2 == 0 else "odd" for x in nums])
grid = [[1, 2], [3, 4], [5, 6]]
print([x for row in grid for x in row])                     # flatten
print([(i, j) for i in range(3) for j in range(i + 1, 3)])  # pairs i < j
print(sum(x * x for x in nums))                             # generator
```

## 2-D lists: the [[0] * n] * m pitfall

`[[0] * cols] * rows` creates **one** row object referenced `rows` times, so changing one cell changes that column in every row. Always build grids with a comprehension:

```python
grid = [[0] * cols for _ in range(rows)]   # correct: independent rows
```

`[0] * cols` is fine for the inner row because ints are immutable. The bug only appears when the repeated element is itself a list (or another mutable object).

```python run
rows, cols = 3, 4
bad = [[0] * cols] * rows
bad[0][0] = 1
print(bad)            # every row changed!
good = [[0] * cols for _ in range(rows)]
good[0][0] = 1
print(good)           # only row 0 changed
dp = [[0] * (cols + 1) for _ in range(rows + 1)]   # padded DP table
visited = [[False] * cols for _ in range(rows)]
print(len(dp), len(dp[0]), visited[2][3])
```

Grid access: `grid[r][c]` with `rows = len(grid)` and `cols = len(grid[0])`.

## Modifying a list while iterating

Removing items from a list while looping over it skips elements, because the indices shift under the loop. Safe alternatives:

- Build a new list: `nums = [x for x in nums if keep(x)]` (usually best).
- Loop over a copy: `for x in nums[:]:`.
- Loop over indices backwards: `for i in range(len(nums) - 1, -1, -1)`.
- For "remove in place and return the new length" problems, use a write pointer (two pointers).

```python run
nums = [1, 2, 2, 3]
for x in nums:
    if x == 2:
        nums.remove(x)
print(nums)                       # [1, 2, 3]  <- one 2 was skipped

nums = [1, 2, 2, 3]
print([x for x in nums if x != 2])

write = 0                         # two-pointer in-place removal
for x in nums:
    if x != 2:
        nums[write] = x
        write += 1
print(write, nums[:write])
```

## Unpacking and swapping

- Swap without a temp variable: `a, b = b, a` and `nums[i], nums[j] = nums[j], nums[i]`.
- Unpack pairs directly in loops: `for start, end in intervals:`.
- Star-unpacking: `first, *rest = nums`.

```python run
a, b = 1, 2
a, b = b, a
print(a, b)
nums = [5, 6, 7]
nums[0], nums[2] = nums[2], nums[0]
print(nums)
first, *rest = [1, 2, 3, 4]
*init, last = [1, 2, 3, 4]
print(first, rest, init, last)
for start, end in [[1, 3], [5, 8]]:
    print(start, end)
```

## extend() and concatenation

- `a.extend(b)` (or `a += b`) appends every element of `b` in place: O(len(b)).
- `a + b` builds a **new** list: O(len(a) + len(b)). Inside a loop this is quadratic.
- `a.append(b)` adds `b` as a **single** element, which creates a nested list.

```python run
a = [1, 2]
a.extend([3, 4])
print(a)                    # [1, 2, 3, 4]
a.append([5, 6])
print(a)                    # [1, 2, 3, 4, [5, 6]]
print([1, 2] + [3], [1, 2] * 2)
```
