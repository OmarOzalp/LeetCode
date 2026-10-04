---
title: Binary Search
group: Algorithm Patterns
summary: Reliable binary search templates for exact matches, lower bounds, searching an answer space and rotated arrays, plus the bisect module.
keywords: [binary search, bisect, bisect_left, bisect_right, lower bound, upper bound, first true, sorted, log n, rotated sorted array, answer space, koko, capacity, off by one, infinite loop]
---

Binary search halves the search range on every step, so it takes O(log n) comparisons. It works on any range where a yes/no test (a predicate) flips **once**, from false to true. A sorted array is the most common case, but not the only one.

## When to use binary search

Signals in the problem statement:

- The input is **sorted**, or sorted and then **rotated**.
- The required complexity is **O(log n)**, or O(n log n) when n is huge.
- "Find the **minimum / maximum** value of x such that ..." where checking one x is easy. This is binary search on the answer.
- A **monotonic** condition: once it becomes true, it stays true as x grows.
- "First / last position of ...", "insert position", "count of elements ≤ x".

| Template | Use for |
| --- | --- |
| Exact match (`left <= right`) | Is the target present, and at which index? |
| First true / lower bound (`left < right`) | first index ≥ target, first bad version, minimum feasible value |
| Last true (upper mid) | last index ≤ target, maximize the minimum |
| `bisect` module | quick lower and upper bounds on a sorted list |

## Classic exact-match template

```python
def binary_search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1
```

**Invariant:** if the target exists, it lies in `nums[left..right]`, both ends included. The loop stops when that range is empty (`left == right + 1`). After a failed search, `left` is the index where the target would be inserted.

```python run
def binary_search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

nums = [-1, 0, 3, 5, 9, 12]
print(binary_search(nums, 9))   # 4
print(binary_search(nums, 2))   # -1
print(binary_search([], 1))     # -1
print(binary_search([5], 5))    # 0
```

## Lower bound / first-true template

The most reusable form. Given a predicate that looks like `F F F T T T`, find the **first T**.

```python
left, right = lo, hi            # the answer is somewhere in [lo, hi]
while left < right:             # stop when one candidate remains
    mid = (left + right) // 2
    if is_true(mid):
        right = mid             # mid might be the answer: keep it
    else:
        left = mid + 1          # mid is definitely not the answer
return left                     # left == right == first true
```

For arrays, use `right = len(nums)`, one past the last index, so that "no element qualifies" has a valid answer: `len(nums)`.

```python run
def lower_bound(nums, target):          # first index with nums[i] >= target
    left, right = 0, len(nums)
    while left < right:
        mid = (left + right) // 2
        if nums[mid] >= target:
            right = mid
        else:
            left = mid + 1
    return left

def upper_bound(nums, target):          # first index with nums[i] > target
    left, right = 0, len(nums)
    while left < right:
        mid = (left + right) // 2
        if nums[mid] > target:
            right = mid
        else:
            left = mid + 1
    return left

nums = [1, 2, 2, 2, 5, 7]
print(lower_bound(nums, 2), upper_bound(nums, 2))  # 1 4  → 2 appears 4 - 1 = 3 times
print(lower_bound(nums, 6))                        # 5  (insert position)
print(lower_bound(nums, 9))                        # 6 == len(nums): everything is smaller
i = lower_bound(nums, 2)
print("found" if i < len(nums) and nums[i] == 2 else "missing")   # found
```

**First and Last Position of Element in Sorted Array** is just `[lower_bound(t), upper_bound(t) - 1]`, after checking the target is present.

## Avoiding infinite loops and off-by-one errors

| Template | Loop | Initial range | Updates | When it ends |
| --- | --- | --- | --- | --- |
| Exact match | `left <= right` | `0, n - 1` | `left = mid + 1` / `right = mid - 1` | `left > right`; `left` is the insert point |
| First true | `left < right` | `0, n` | `right = mid` / `left = mid + 1` | `left == right` is the answer |
| Last true | `left < right` | `0, n - 1` | `left = mid` / `right = mid - 1`, with **upper mid** | `left == right` is the answer |

Rules that prevent bugs:

1. **Every branch must shrink the range.** `left = mid` combined with lower mid `(left + right) // 2` stalls when `right == left + 1`. If you write `left = mid`, use `mid = (left + right + 1) // 2`.
2. Choose inclusive or half-open bounds, and match the loop condition to that choice.
3. Write the predicate so it really is `F...F T...T` (monotonic).
4. Test with lengths 0, 1 and 2, and with targets below the smallest and above the largest element.
5. Python integers don't overflow, so `left + (right - left) // 2` is only needed in other languages.

The run below shows the stall and the fix:

```python run
def last_true_buggy(nums, limit, max_iters=20):
    left, right = 0, len(nums) - 1
    iters = 0
    while left < right and iters < max_iters:   # guard so the demo terminates
        iters += 1
        mid = (left + right) // 2               # lower mid + "left = mid" → can stall
        if nums[mid] <= limit:
            left = mid
        else:
            right = mid - 1
    return left, iters

def last_true(nums, limit):                     # last index with nums[i] <= limit
    left, right = 0, len(nums) - 1              # assumes nums[0] <= limit
    while left < right:
        mid = (left + right + 1) // 2           # upper mid guarantees progress
        if nums[mid] <= limit:
            left = mid
        else:
            right = mid - 1
    return left

nums = [1, 3, 5, 7]
print("buggy:", last_true_buggy(nums, 6))   # (2, 20): stuck until the guard stops it
print("fixed:", last_true(nums, 6))         # 2  (nums[2] = 5 is the last value <= 6)
```

## Binary search on the answer

You aren't always searching an array. Sometimes you search the **range of possible answers**. Ask: "if I guess x, can I check quickly whether x works?" If feasibility is monotonic (whenever x works, every larger x works too), binary search for the **smallest x such that `feasible(x)`**.

```python
def smallest_feasible(lo, hi, feasible):   # feasible(hi) must be True
    while lo < hi:
        mid = (lo + hi) // 2
        if feasible(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo
```

Worked example, **Koko Eating Bananas**: find the minimum eating speed that finishes all piles within `h` hours. A faster speed never takes longer, so feasibility is monotonic.

```python run
def min_eating_speed(piles, h):
    def feasible(speed):
        hours = sum((p + speed - 1) // speed for p in piles)   # integer ceil(p / speed)
        return hours <= h

    lo, hi = 1, max(piles)          # speed max(piles) always works (1 hour per pile)
    while lo < hi:
        mid = (lo + hi) // 2
        if feasible(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo

print(min_eating_speed([3, 6, 7, 11], 8))         # 4
print(min_eating_speed([30, 11, 23, 4, 20], 5))   # 30
print(min_eating_speed([30, 11, 23, 4, 20], 6))   # 23
```

Complexity: O(n · log(max pile)). Each feasibility check costs O(n), and there are O(log range) checks.

## Designing feasible(x): minimum ship capacity

**Capacity To Ship Packages Within D Days** follows the same recipe:

1. **Bounds:** `lo` = smallest value that could work (the heaviest package must fit), `hi` = a value that surely works (everything shipped in one day).
2. **Feasibility check:** a greedy simulation that counts the days needed with capacity x.
3. **Monotonic:** a bigger ship never needs more days.

For "**maximize** the minimum" problems (Magnetic Force Between Two Balls, Aggressive Cows), search for the **last** feasible x instead, using the upper-mid template.

```python run
def ship_within_days(weights, days):
    def days_needed(capacity):
        needed, load = 1, 0
        for w in weights:
            if load + w > capacity:    # doesn't fit → start a new day
                needed += 1
                load = 0
            load += w
        return needed

    lo, hi = max(weights), sum(weights)
    while lo < hi:
        mid = (lo + hi) // 2
        if days_needed(mid) <= days:
            hi = mid
        else:
            lo = mid + 1
    return lo

print(ship_within_days([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5))  # 15
print(ship_within_days([3, 2, 2, 4, 1, 4], 3))              # 6
print(ship_within_days([1, 2, 3, 1, 1], 4))                 # 3
```

## Rotated sorted array: find the minimum

**Find Minimum in Rotated Sorted Array**: compare `nums[mid]` with `nums[right]`.

- `nums[mid] > nums[right]`: the drop, and so the minimum, is strictly to the **right** of `mid`.
- Otherwise `nums[mid..right]` is sorted, so the minimum is at `mid` or to its left.

This is a first-true search on the predicate `nums[i] <= nums[-1]`. Comparing with `right` instead of `left` also handles arrays that aren't rotated at all.

```python run
def find_min(nums):
    left, right = 0, len(nums) - 1
    while left < right:
        mid = (left + right) // 2
        if nums[mid] > nums[right]:
            left = mid + 1           # min is strictly right of mid
        else:
            right = mid              # mid could be the min
    return nums[left]

print(find_min([3, 4, 5, 1, 2]))        # 1
print(find_min([4, 5, 6, 7, 0, 1, 2]))  # 0
print(find_min([11, 13, 15, 17]))       # 11 (not rotated)
print(find_min([2, 1]))                 # 1
```

## Rotated sorted array: search for a target

**Search in Rotated Sorted Array**: at any `mid`, **at least one half is sorted**. Check whether the target falls inside the sorted half's range. If it does, search there. Otherwise search the other half.

```python run
def search_rotated(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        if nums[left] <= nums[mid]:                  # left half nums[left..mid] is sorted
            if nums[left] <= target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        else:                                        # right half nums[mid..right] is sorted
            if nums[mid] < target <= nums[right]:
                left = mid + 1
            else:
                right = mid - 1
    return -1

nums = [4, 5, 6, 7, 0, 1, 2]
print(search_rotated(nums, 0))     # 4
print(search_rotated(nums, 3))     # -1
print(search_rotated([1], 0))      # -1
print(search_rotated([3, 1], 1))   # 1
```

- Use `<=` in `nums[left] <= nums[mid]`. When `left == mid` (two elements left), the "left half" is the single element at `mid`, and it counts as sorted.
- **With duplicates** (Search in Rotated Sorted Array II), `nums[left] == nums[mid] == nums[right]` hides which half is sorted. Shrink both ends by one in that case, which makes the worst case O(n).

## The bisect module

`bisect` gives you lower and upper bound on a **sorted** list in O(log n) without writing the loop yourself.

| Call | Returns |
| --- | --- |
| `bisect_left(a, x)` | first index with `a[i] >= x`, which is also the count of elements `< x` |
| `bisect_right(a, x)` | first index with `a[i] > x`, which is also the count of elements `<= x` |
| `insort(a, x)` | inserts `x` and keeps `a` sorted. The search is O(log n), but the insert shifts elements, so O(n) overall |
| `bisect_left(a, x, lo, hi)` | the same, restricted to `a[lo:hi]` |

```python run
from bisect import bisect_left, bisect_right, insort

nums = [1, 2, 2, 2, 5, 7]
print(bisect_left(nums, 2))                          # 1
print(bisect_right(nums, 2))                         # 4
print(bisect_right(nums, 2) - bisect_left(nums, 2))  # 3 copies of 2

def contains(a, x):
    i = bisect_left(a, x)
    return i < len(a) and a[i] == x

print(contains(nums, 5), contains(nums, 6))          # True False

x = 4                                                # floor and ceiling of x
i = bisect_right(nums, x)
print("floor:", nums[i - 1] if i > 0 else None)      # 2  (largest value <= 4)
j = bisect_left(nums, x)
print("ceil:", nums[j] if j < len(nums) else None)   # 5  (smallest value >= 4)

insort(nums, 3)
print(nums)                                          # [1, 2, 2, 2, 3, 5, 7]
```

On Python 3.10+, `bisect` accepts `key=`, so it can search an answer space directly: `bisect_left(range(lo, hi + 1), True, key=feasible) + lo`. On older versions, write the loop yourself.

## Searching a sorted 2-D matrix

**Search a 2D Matrix**: each row is sorted, and each row starts after the previous row ends. Treat the grid as one flat sorted array of length `rows * cols`, and map a flat index back with `divmod`.

```python run
def search_matrix(matrix, target):
    rows, cols = len(matrix), len(matrix[0])
    left, right = 0, rows * cols - 1
    while left <= right:
        mid = (left + right) // 2
        r, c = divmod(mid, cols)           # flat index → (row, col)
        value = matrix[r][c]
        if value == target:
            return True
        if value < target:
            left = mid + 1
        else:
            right = mid - 1
    return False

m = [[1, 3, 5, 7],
     [10, 11, 16, 20],
     [23, 30, 34, 60]]
print(search_matrix(m, 3), search_matrix(m, 13), search_matrix(m, 60))   # True False True
```

If only the rows and the columns are sorted separately (Search a 2D Matrix II), start at the top-right corner. Step left when the value is too big and down when it's too small, for O(m + n).

## Common binary search mistakes

- Mixing templates, for example `while left < right` together with `right = mid - 1`. Choose one template from the table and use it as written.
- **Lower mid with `left = mid`**, which loops forever on two elements. Use upper mid.
- Forgetting to check the result of a lower bound: `i < len(nums) and nums[i] == target`.
- A **non-monotonic predicate**. Binary search silently returns garbage.
- Wrong answer-space bounds, for example `lo = 0` when a speed of 0 would divide by zero, or a `hi` that isn't actually feasible.
- Using float division to compute a ceiling. Use `(a + b - 1) // b` or `-(-a // b)`.
- Rotated arrays: using `<` instead of `<=` in `nums[left] <= nums[mid]`.
