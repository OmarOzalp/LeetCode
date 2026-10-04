---
title: Recursion
group: Algorithm Patterns
summary: How recursive functions work in Python, covering base cases, the call stack, returning values versus shared state, the recursion limit and the bugs that trip people up.
keywords: [recursion, recursive, base case, call stack, stack frame, nonlocal, self.result, helper function, recursionerror, setrecursionlimit, recursion limit, tree recursion, divide and conquer, iteration, explicit stack]
---

A recursive function solves a problem by calling itself on a smaller version of it. Trees, linked lists, divide and conquer, backtracking and top-down DP all build on this, so it's worth getting the mechanics right.

## Anatomy of a recursive function

Every recursive function needs:

1. A **base case**: the smallest input, answered directly without recursing.
2. A **recursive case**: reduce the problem, call yourself, and combine the result.
3. **Progress**: every call must move closer to a base case.

```python
def solve(problem):
    if is_base_case(problem):
        return base_answer
    sub_answer = solve(smaller(problem))   # trust that this returns the right thing
    return combine(problem, sub_answer)
```

Assume the recursive call already works for smaller inputs (the "leap of faith"). Then you only have to check two things: the base case is correct, and one step combines correctly.

```python run
def factorial(n):
    if n <= 1:                     # base case
        return 1
    return n * factorial(n - 1)    # recursive case on a smaller n

def total(nums, i=0):              # pass an index instead of slicing (slices copy → O(n²))
    if i == len(nums):
        return 0
    return nums[i] + total(nums, i + 1)

def reverse(s):
    if len(s) <= 1:
        return s
    return reverse(s[1:]) + s[0]

def power(x, n):                   # halves n each call → O(log n) calls
    if n == 0:
        return 1
    half = power(x, n // 2)
    return half * half if n % 2 == 0 else half * half * x

print(factorial(5))               # 120
print(total([3, 1, 4, 1, 5]))     # 14
print(reverse("recursion"))       # noisrucer
print(power(2, 10))               # 1024
```

## Visualizing the call stack

Each call gets its own **stack frame** holding its own local variables. A frame stays on the stack until that call returns. The trace below indents each line by call depth, so you can watch frames being pushed and popped. Note that `fib(2)` is computed twice, which is the overlap that memoization removes (see Dynamic Programming).

```python run
def fib(n, depth=0):
    indent = "    " * depth
    print(f"{indent}fib({n}) called")
    if n < 2:
        print(f"{indent}fib({n}) returns {n}  (base case)")
        return n
    result = fib(n - 1, depth + 1) + fib(n - 2, depth + 1)
    print(f"{indent}fib({n}) returns {result}")
    return result

fib(4)
```

- The **deepest indentation** is the maximum stack depth, which sets the extra **space**: O(depth).
- The **number of lines** grows with the number of calls, which sets the **time**: here about O(2^n).

## Recursion on trees and linked lists

Trees and linked lists are recursive structures: a node plus smaller structures of the same kind. Most tree solutions follow one shape. Handle `None`, recurse on the children, and combine their results.

```python run
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

class ListNode:
    def __init__(self, val, next=None):
        self.val, self.next = val, next

def max_depth(root):                     # Maximum Depth of Binary Tree
    if root is None:
        return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))

def invert(root):                        # Invert Binary Tree
    if root is None:
        return None
    root.left, root.right = invert(root.right), invert(root.left)
    return root

def preorder(root):
    if root is None:
        return []
    return [root.val] + preorder(root.left) + preorder(root.right)

def reverse_list(head):                  # Reverse Linked List, recursive version
    if head is None or head.next is None:
        return head                      # the last node becomes the new head
    new_head = reverse_list(head.next)
    head.next.next = head                # the node after head now points back to it
    head.next = None
    return new_head

#     3
#    / \
#   9   20
#      /  \
#     15   7
tree = TreeNode(3, TreeNode(9), TreeNode(20, TreeNode(15), TreeNode(7)))
print(max_depth(tree))            # 3
print(preorder(invert(tree)))     # [3, 20, 7, 15, 9]

node = reverse_list(ListNode(1, ListNode(2, ListNode(3))))
out = []
while node:
    out.append(node.val)
    node = node.next
print(out)                        # [3, 2, 1]
```

## Returning values vs mutating shared state

Two ways to get an answer out of a recursion:

1. **Return it.** Each call returns everything its caller needs, as a tuple if necessary. This is pure and easy to test.
2. **Record it on the side.** Each call returns what the *recursion* needs (for example a height), and updates a shared "best so far" variable. This is often simpler when the answer isn't what the parent needs, as in **Diameter of Binary Tree** and **Binary Tree Maximum Path Sum**.

```python run
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def diameter_pure(root):
    def go(node):                       # returns (height, best diameter inside)
        if node is None:
            return 0, 0
        lh, ld = go(node.left)
        rh, rd = go(node.right)
        return 1 + max(lh, rh), max(ld, rd, lh + rh)
    return go(root)[1]

def diameter_nonlocal(root):
    best = 0
    def height(node):
        nonlocal best                   # required: we REASSIGN best below
        if node is None:
            return 0
        lh, rh = height(node.left), height(node.right)
        best = max(best, lh + rh)       # longest path through this node
        return 1 + max(lh, rh)
    height(root)
    return best

class Solution:                         # LeetCode style: keep the answer on self
    def diameterOfBinaryTree(self, root):
        self.best = 0
        def height(node):
            if node is None:
                return 0
            lh, rh = height(node.left), height(node.right)
            self.best = max(self.best, lh + rh)
            return 1 + max(lh, rh)
        height(root)
        return self.best

#       1
#      / \
#     2   3
#    / \
#   4   5
root = TreeNode(1, TreeNode(2, TreeNode(4), TreeNode(5)), TreeNode(3))
print(diameter_pure(root), diameter_nonlocal(root), Solution().diameterOfBinaryTree(root))  # 3 3 3
```

### When you need `nonlocal`

- **Reassigning** an outer variable (`best = ...`, `count += 1`) inside a nested function needs `nonlocal best`. Without it, Python treats `best` as a new local variable and raises `UnboundLocalError`.
- **Mutating** an outer object (`result.append(x)`, `seen.add(x)`, `memo[k] = v`) doesn't need `nonlocal`, because the name itself is never rebound.
- `self.best` avoids the question entirely, but remember to reset it at the start of each call.

## Passing information down with parameters

Parameters carry information **down** the recursion: bounds, depth, the path so far. Return values carry information **up**: heights, sums, booleans. **Validate Binary Search Tree** needs both. Checking only `left.val < node.val < right.val` is a classic bug, because every node in a subtree must respect bounds set by ancestors further up.

```python run
import math

class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def is_valid_bst(root):
    def check(node, low, high):          # every value in this subtree must be in (low, high)
        if node is None:
            return True
        if not (low < node.val < high):
            return False
        return check(node.left, low, node.val) and check(node.right, node.val, high)
    return check(root, -math.inf, math.inf)

good = TreeNode(5, TreeNode(3, TreeNode(1), TreeNode(4)), TreeNode(8))
bad = TreeNode(5, TreeNode(3, TreeNode(1), TreeNode(6)), TreeNode(8))   # 6 sits in 5's LEFT subtree
print(is_valid_bst(good), is_valid_bst(bad))   # True False
```

## Mistake: forgetting to return the recursive result

Calling the function isn't enough: you must `return` what it gives back. Otherwise the result is thrown away, and execution falls off the end of the function, which returns `None`.

```python run
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def bst_contains_buggy(node, target):
    if node is None:
        return False
    if node.val == target:
        return True
    if target < node.val:
        bst_contains_buggy(node.left, target)     # BUG: result discarded
    else:
        bst_contains_buggy(node.right, target)    # BUG: falls through → None

def bst_contains(node, target):
    if node is None:
        return False
    if node.val == target:
        return True
    if target < node.val:
        return bst_contains(node.left, target)
    return bst_contains(node.right, target)

root = TreeNode(8, TreeNode(3, TreeNode(1), TreeNode(6)), TreeNode(10))
print(bst_contains_buggy(root, 6))   # None (wrong!)
print(bst_contains(root, 6))         # True
```

## Mistake: missing or unreachable base case

- **No base case:** the function recurses until it hits `RecursionError`.
- **A base case it can step over:** with `n -= 2` and `if n == 0`, an odd `n` skips straight past 0. Use `<=` so the base case covers every way of running out of input.
- **Not handling `None`:** reading `root.left.val` without checking `root.left` raises `AttributeError` at the leaves. Make `if node is None` the base case.
- **Empty input:** decide what `f([])`, `f("")` and `f(0)` should return before writing the recursive case.

```python run
import sys

def countdown_buggy(n):
    if n == 0:                    # skipped when n is odd: 5, 3, 1, -1, -3, ...
        return "liftoff"
    return countdown_buggy(n - 2)

def countdown(n):
    if n <= 0:                    # covers every way to "run out"
        return "liftoff"
    return countdown(n - 2)

print(countdown(5))               # liftoff

old_limit = sys.getrecursionlimit()
sys.setrecursionlimit(500)        # keep the failing demo small and fast
try:
    countdown_buggy(5)
except RecursionError as err:
    print("RecursionError:", err)
finally:
    sys.setrecursionlimit(old_limit)
```

## Mistake: mutating a shared list without copying

When a recursion builds `path` with `append` and `pop`, there is only **one** list object. Appending `path` to the results stores a reference to that same object, so every stored entry ends up showing its final state, which is usually empty. Store a snapshot instead: `path[:]`, `list(path)` or `path.copy()`.

```python run
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def root_to_leaf_paths(root, copy=True):
    result, path = [], []
    def dfs(node):
        if node is None:
            return
        path.append(node.val)
        if node.left is None and node.right is None:
            result.append(path[:] if copy else path)   # snapshot vs shared reference
        dfs(node.left)
        dfs(node.right)
        path.pop()
    dfs(root)
    return result

root = TreeNode(1, TreeNode(2, TreeNode(4)), TreeNode(3))
print(root_to_leaf_paths(root, copy=False))  # [[], []]: both entries are the same, now empty, list
print(root_to_leaf_paths(root, copy=True))   # [[1, 2, 4], [1, 3]]
```

Related trap: a **mutable default argument** such as `def dfs(node, path=[])` creates one list when the function is defined, and every call shares it. Use `path=None` and create the list inside the function.

## Python's recursion limit

CPython stops runaway recursion at a depth of about **1000** frames by default, raising `RecursionError: maximum recursion depth exceeded`. Inputs that can legitimately recurse deeper, such as a linked list or a skewed tree with 10⁴ to 10⁵ nodes, or top-down DP over `n = 10⁴`, need either:

- `sys.setrecursionlimit(10**5)` at the top of the file. This raises Python's counter only, and very deep recursion can still crash the interpreter when the real C stack runs out.
- An **iterative** rewrite with an explicit stack or bottom-up DP. This is the safer choice.

This app's runner raises the limit for you, so the first line below may show a large number. Plain `python3` and many judges start at 1000.

```python run
import sys

print("current limit:", sys.getrecursionlimit())

def depth(n):
    return 0 if n == 0 else 1 + depth(n - 1)

old = sys.getrecursionlimit()
sys.setrecursionlimit(1000)          # CPython's usual default
try:
    print(depth(500))                # 500: fine
    print(depth(5000))               # too deep for a limit of 1000
except RecursionError:
    print("RecursionError at depth 5000 with limit 1000")

sys.setrecursionlimit(10000)         # raise it for deep inputs
print(depth(5000))                   # 5000
sys.setrecursionlimit(old)           # restore
```

## Recursion vs iteration

| | Recursion | Iteration |
| --- | --- | --- |
| Best fit | trees, divide and conquer, backtracking, top-down DP | linear scans, BFS, bottom-up DP |
| Readability | mirrors the problem's definition | more bookkeeping, more control |
| Space | O(depth) stack frames that you don't see | an explicit stack or queue that you manage |
| Limits | `RecursionError` around depth 1000 by default | only memory |
| Speed in Python | function calls are relatively slow | usually faster |

Any recursion can be rewritten with an explicit stack. Python does **not** optimize tail calls, so writing a recursion in tail-call form doesn't save stack space.

```python run
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def inorder_recursive(root):
    out = []
    def go(node):
        if node:
            go(node.left)
            out.append(node.val)
            go(node.right)
    go(root)
    return out

def inorder_iterative(root):
    out, stack, node = [], [], root
    while stack or node:
        while node:                  # walk as far left as possible, saving the path
            stack.append(node)
            node = node.left
        node = stack.pop()           # the leftmost unvisited node
        out.append(node.val)
        node = node.right
    return out

root = TreeNode(4, TreeNode(2, TreeNode(1), TreeNode(3)), TreeNode(6, TreeNode(5), TreeNode(7)))
print(inorder_recursive(root))   # [1, 2, 3, 4, 5, 6, 7]
print(inorder_iterative(root))   # [1, 2, 3, 4, 5, 6, 7]
```

## Analyzing recursive complexity

- **Time** ≈ (number of calls) × (work done in one call, not counting its recursive calls).
- **Space** ≈ (maximum depth) × (space per frame), plus any copies such as slices or `path + [x]`.

| Shape | Example | Time | Stack space |
| --- | --- | --- | --- |
| one call on n − 1 | factorial, linked-list recursion | O(n) | O(n) |
| one call on n / 2 | binary search, fast power | O(log n) | O(log n) |
| two calls on n / 2, plus O(n) merge | merge sort | O(n log n) | O(log n) |
| visit every node once | tree DFS | O(n) | O(h), where h is the height |
| two calls on n − 1 | naive Fibonacci | O(2^n) | O(n) |
| branching factor b, depth d | backtracking | O(b^d) | O(d) |

```python run
from functools import lru_cache

def count_calls(n, memoize):
    calls = 0
    @lru_cache(maxsize=None)
    def fib_memo(k):
        nonlocal calls
        calls += 1
        return k if k < 2 else fib_memo(k - 1) + fib_memo(k - 2)
    def fib_naive(k):
        nonlocal calls
        calls += 1
        return k if k < 2 else fib_naive(k - 1) + fib_naive(k - 2)
    (fib_memo if memoize else fib_naive)(n)
    return calls

for n in (10, 15, 20):
    print(f"n={n}: naive calls={count_calls(n, False):>6}, memoized calls={count_calls(n, True)}")
```
