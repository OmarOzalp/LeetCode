---
title: Two Pointers
group: Algorithm Patterns
summary: Move two indices through an array, string or linked list so pair searches and in-place edits take one linear pass instead of nested loops.
keywords: [two pointers, sorted array, pair sum, two sum ii, 3sum, palindrome, container with most water, fast slow, read write pointer, in-place, dedupe, partition, dutch national flag, linked list cycle]
---

Two pointers replaces an O(n²) "check every pair" loop with an O(n) walk. Each comparison tells you which pointer to move, and that move permanently discards candidates that can't be part of the answer.

## When to reach for two pointers

Signals in the problem statement:

- The input is **sorted** (or you may sort it) and you need a **pair or triplet** with a target sum or difference.
- You compare elements **from both ends**: palindromes, reversing, "area between two lines".
- You must modify an array **in place with O(1) extra space**: remove duplicates, move zeroes, partition.
- A linked list question about the **middle**, a **cycle**, or the **n-th node from the end**.
- You **merge** two sorted sequences.

| Variant | Pointers start | Typical problems |
| --- | --- | --- |
| Opposite direction | `0` and `n - 1`, move inward | Two Sum II, 3Sum, Valid Palindrome, Container With Most Water |
| Same direction (read/write) | both at `0`, `read` always advances | Remove Duplicates from Sorted Array, Move Zeroes |
| Fast / slow | both at head, fast moves 2 steps | Linked List Cycle, middle of list, Reorder List |
| One per sequence | one pointer in each input | Merge Two Sorted Lists, Merge Sorted Array |

Complexity: usually O(n) time and O(1) extra space, plus O(n log n) if you sort first.

## Opposite-direction template

Start at both ends and move inward. On every iteration, at least one pointer must move, otherwise the loop never ends.

```python
left, right = 0, len(nums) - 1
while left < right:                 # < because a pair needs two different indices
    if is_answer(nums[left], nums[right]):
        ...                         # record / return
    if need_bigger:
        left += 1                   # nums[left] can't be in any remaining answer
    else:
        right -= 1                  # nums[right] can't be in any remaining answer
```

Worked example, **Two Sum II** (sorted input, return the indices):

```python run
def two_sum_sorted(nums, target):
    left, right = 0, len(nums) - 1
    while left < right:
        s = nums[left] + nums[right]
        if s == target:
            return [left, right]
        if s < target:
            left += 1        # sum too small → need a bigger left value
        else:
            right -= 1       # sum too big → need a smaller right value
    return []

print(two_sum_sorted([2, 7, 11, 15], 9))        # [0, 1]
print(two_sum_sorted([1, 3, 4, 6, 8, 11], 10))  # [2, 3]
print(two_sum_sorted([1, 2, 3], 100))           # []
```

The original **Two Sum** is unsorted and asks for original indices. Sorting would scramble them, so use a hash map there instead.

## Why it works on sorted input

Picture every pair `(i, j)` as a cell in an n × n grid. With sorted `nums`:

- If `nums[left] + nums[right] < target`, then `nums[left] + nums[k]` is also too small for **every** `k <= right`. `left` can't pair with anything still in range, so discarding it (`left += 1`) throws away a whole row of the grid.
- If the sum is too big, `nums[right]` is too big with every remaining partner, so `right -= 1` throws away a whole column.

Each step removes a row or a column without skipping a valid pair, so the loop finishes in at most n − 1 steps. On **unsorted** input this argument breaks, and the pointers can walk past the answer.

```python run
import random

def two_pointer_has_pair(nums, target):
    steps = 0
    left, right = 0, len(nums) - 1
    while left < right:
        steps += 1
        s = nums[left] + nums[right]
        if s == target:
            return True, steps
        if s < target:
            left += 1
        else:
            right -= 1
    return False, steps

def brute_has_pair(nums, target):
    n = len(nums)
    return any(nums[i] + nums[j] == target for i in range(n) for j in range(i + 1, n))

random.seed(0)
max_steps = 0
for _ in range(2000):
    nums = sorted(random.randint(-20, 20) for _ in range(random.randint(0, 12)))
    target = random.randint(-30, 30)
    found, steps = two_pointer_has_pair(nums, target)
    assert found == brute_has_pair(nums, target)
    max_steps = max(max_steps, steps)
print("2000 random sorted inputs agree with brute force")
print("max loop steps for n <= 12:", max_steps)   # never more than n - 1 = 11
```

## 3Sum: sort, fix one value, two-pointer the rest

Sort, then for each anchor `nums[i]` run the pair search on `nums[i+1:]` for `-nums[i]`. That's O(n²) total, which beats the O(n³) brute force.

### Skipping duplicates

- **Anchor:** `if i > 0 and nums[i] == nums[i - 1]: continue`, because the same anchor would find the same triplets again.
- **After a match:** move both pointers, then advance `left` past copies of the value just used. `right` doesn't need its own skip loop. With a larger `left` and the same `right` value, the sum is too big, so `right` moves on the next iteration.

```python run
def three_sum(nums):
    nums.sort()
    result = []
    for i in range(len(nums) - 2):
        if nums[i] > 0:
            break                              # smallest value is positive → no zero sum
        if i > 0 and nums[i] == nums[i - 1]:
            continue                           # duplicate anchor
        left, right = i + 1, len(nums) - 1
        while left < right:
            s = nums[i] + nums[left] + nums[right]
            if s < 0:
                left += 1
            elif s > 0:
                right -= 1
            else:
                result.append([nums[i], nums[left], nums[right]])
                left += 1
                right -= 1
                while left < right and nums[left] == nums[left - 1]:
                    left += 1                  # duplicate second value
    return result

print(three_sum([-1, 0, 1, 2, -1, -4]))   # [[-1, -1, 2], [-1, 0, 1]]
print(three_sum([0, 0, 0, 0]))            # [[0, 0, 0]]
print(three_sum([1, 2, -2, -1]))          # []
```

Complexity: O(n²) time, O(1) extra space (not counting the sort or the output).

## Palindromes: inward check and expand-around-center

**Valid Palindrome**: walk inward from both ends and skip characters that aren't letters or digits. `cleaned == cleaned[::-1]` also works, but it builds an O(n) copy.

**Longest Palindromic Substring** and **Palindromic Substrings**: walk *outward* from each of the 2n − 1 centers (each character, and each gap between two characters). That's O(n²) time and O(1) space.

```python run
def is_palindrome(s):
    left, right = 0, len(s) - 1
    while left < right:
        if not s[left].isalnum():
            left += 1
        elif not s[right].isalnum():
            right -= 1
        elif s[left].lower() != s[right].lower():
            return False
        else:
            left += 1
            right -= 1
    return True

def longest_palindrome(s):
    best = ""
    for center in range(len(s)):
        for left, right in ((center, center), (center, center + 1)):  # odd, even length
            while left >= 0 and right < len(s) and s[left] == s[right]:
                left -= 1
                right += 1
            if right - left - 1 > len(best):       # loop overshot by one on each side
                best = s[left + 1:right]
    return best

print(is_palindrome("A man, a plan, a canal: Panama"))  # True
print(is_palindrome("race a car"))                      # False
print(longest_palindrome("babad"))                      # bab
print(longest_palindrome("cbbd"))                       # bb
```

## Container With Most Water

Area = `(right - left) * min(height[left], height[right])`. Start with the widest container, then **always move the shorter line**.

Why that's safe: the shorter line limits the height. Any other container that uses the shorter line is narrower, and its height still can't be more than the shorter line. So none of them can beat the current area, and the shorter line can be dropped for good.

```python run
def max_area(height):
    left, right = 0, len(height) - 1
    best = 0
    while left < right:
        best = max(best, (right - left) * min(height[left], height[right]))
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return best

print(max_area([1, 8, 6, 2, 5, 4, 8, 3, 7]))  # 49
print(max_area([1, 1]))                       # 1
print(max_area([4, 3, 2, 1, 4]))              # 16
```

O(n) time, O(1) space.

## Same direction: read/write pointer for in-place edits

`read` scans every element. `write` marks where the next kept element goes. The invariant is that `nums[:write]` is always the finished prefix. Use it for **Remove Duplicates from Sorted Array**, **Remove Element**, **Move Zeroes** and any "filter in place with O(1) extra space" task.

```python run
def remove_duplicates(nums):
    """Sorted nums: keep one copy of each value at the front, return the new length."""
    if not nums:
        return 0
    write = 1
    for read in range(1, len(nums)):
        if nums[read] != nums[write - 1]:   # compare with the last KEPT value
            nums[write] = nums[read]
            write += 1
    return write

def move_zeroes(nums):
    write = 0
    for read in range(len(nums)):
        if nums[read] != 0:
            nums[write], nums[read] = nums[read], nums[write]
            write += 1

a = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4]
k = remove_duplicates(a)
print(k, a[:k])          # 5 [0, 1, 2, 3, 4]

b = [0, 1, 0, 3, 12]
move_zeroes(b)
print(b)                 # [1, 3, 12, 0, 0]
```

## Fast and slow pointers

Two pointers move through a linked list at different speeds or with a fixed gap.

| Goal | Technique |
| --- | --- |
| Middle node | slow moves 1, fast moves 2; when fast reaches the end, slow is at the middle |
| Cycle detection (**Linked List Cycle**) | Floyd: if a cycle exists, fast gains one step per move and eventually lands on slow |
| n-th node from the end (**Remove Nth Node From End of List**) | move fast n + 1 steps ahead of a dummy node, then move both until fast is `None` |
| **Reorder List** | find the middle, reverse the second half, then merge the two halves |

```python run
class ListNode:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next

def build(values):
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head

def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out

def middle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow.val                     # second middle when the length is even

def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False

def remove_nth_from_end(head, n):
    dummy = ListNode(0, head)           # dummy handles removing the head itself
    fast = slow = dummy
    for _ in range(n + 1):              # open a gap of n nodes
        fast = fast.next
    while fast:
        fast = fast.next
        slow = slow.next
    slow.next = slow.next.next          # slow is right before the target
    return dummy.next

print(middle(build([1, 2, 3, 4, 5])))      # 3
print(middle(build([1, 2, 3, 4, 5, 6])))   # 4
looped = build([1, 2, 3, 4])
looped.next.next.next.next = looped.next   # 4 → 2 creates a cycle
print(has_cycle(looped), has_cycle(build([1, 2])))            # True False
print(to_list(remove_nth_from_end(build([1, 2, 3, 4, 5]), 2)))  # [1, 2, 3, 5]
print(to_list(remove_nth_from_end(build([1]), 1)))               # []
```

## Partitioning (Dutch national flag)

Rearrange in place so elements fall into groups. **Sort Colors** uses three pointers with these invariants:

- `nums[:low]` are all 0
- `nums[low:mid]` are all 1
- `nums[high + 1:]` are all 2
- `nums[mid:high + 1]` is still unknown

Don't advance `mid` after swapping with `high`. The value that just arrived from the right hasn't been checked yet.

```python run
def sort_colors(nums):
    low, mid, high = 0, 0, len(nums) - 1
    while mid <= high:
        if nums[mid] == 0:
            nums[low], nums[mid] = nums[mid], nums[low]
            low += 1
            mid += 1
        elif nums[mid] == 1:
            mid += 1
        else:
            nums[mid], nums[high] = nums[high], nums[mid]
            high -= 1                 # mid stays: the swapped-in value is unchecked
    return nums

def partition_evens_first(nums):      # two-way partition with opposite pointers
    left, right = 0, len(nums) - 1
    while left < right:
        if nums[left] % 2 == 0:
            left += 1                 # already in the correct zone
        elif nums[right] % 2 == 1:
            right -= 1
        else:
            nums[left], nums[right] = nums[right], nums[left]
    return nums

print(sort_colors([2, 0, 2, 1, 1, 0]))            # [0, 0, 1, 1, 2, 2]
print(partition_evens_first([3, 1, 2, 4, 7, 6]))  # [6, 4, 2, 1, 7, 3]
```

The same partition step is the core of quicksort and quickselect (Kth Largest Element).

## Common two-pointer mistakes

- **`<=` vs `<`:** with `while left <= right`, a pair search can match an element with itself. Use `<` when the two indices must be different.
- **A branch that moves neither pointer.** Every path through the loop body must move at least one pointer, otherwise the loop never ends.
- **Duplicate results in 3Sum:** skip duplicate anchors with `i > 0 and nums[i] == nums[i - 1]`, and skip duplicate values after a match.
- **Skip loops without a bounds guard:** `while nums[left] == nums[left - 1]` must also check `left < right`, or it can run off the end.
- **Using the sorted-order logic on unsorted data.** Sort first. If the original indices matter, use a hash map instead.
- **Dutch flag:** advancing `mid` after a swap with `high`.
