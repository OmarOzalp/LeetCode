---
title: Binary Trees
group: Data Structures
summary: TreeNode basics - the DFS recursion template, preorder/inorder/postorder (recursive and iterative), BFS level order, returning values up the recursion, BST properties, and serialization.
keywords: [tree, binary tree, treenode, dfs, bfs, recursion, preorder, inorder, postorder, level order, traversal, iterative inorder, height, depth, diameter, path sum, maximum path sum, bst, binary search tree, validate bst, lowest common ancestor, kth smallest, serialize, deserialize, invert tree]
---

Tree problems are almost always solved with one of two traversals: **DFS** (recursion, or an explicit stack) or **BFS** (a queue, level by level). The real skill is deciding what each recursive call **returns** and what state it **receives**.

## TreeNode definition and building test trees

LeetCode provides:

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
```

LeetCode writes trees in **level order** with `None` for missing children, e.g. `[3, 9, 20, None, None, 15, 7]`. This helper builds such a tree locally:

```python run
from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(values):
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return root

root = build_tree([3, 9, 20, None, None, 15, 7])
print(root.val, root.left.val, root.right.val, root.right.left.val)   # 3 9 20 15
```

Vocabulary: **depth** counts edges (or nodes) from the root down; **height** counts from a node down to its deepest leaf. A tree with n nodes has height h between log n (balanced) and n (a skewed "linked list" tree).

## DFS recursion template

Almost every recursive tree solution has this shape:

```python
def dfs(node):
    if not node:                # base case: empty subtree
        return BASE_VALUE       # 0, True, None, float('-inf'), ...
    left = dfs(node.left)       # trust the recursion for the subtrees
    right = dfs(node.right)
    return COMBINE(node.val, left, right)
```

Ask two questions:
1. **What should `dfs(None)` return?** (the identity value for the combine step)
2. **Given the answers for the left and right subtrees, how do I compute the answer for this node?**

Time is O(n) (each node is visited once); space is O(h) for the call stack.

```python run
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def max_depth(node):
    if not node:
        return 0
    return 1 + max(max_depth(node.left), max_depth(node.right))

def is_same(p, q):
    if not p and not q:
        return True
    if not p or not q or p.val != q.val:
        return False
    return is_same(p.left, q.left) and is_same(p.right, q.right)

def invert(node):
    if not node:
        return None
    node.left, node.right = invert(node.right), invert(node.left)
    return node

root = TreeNode(4, TreeNode(2, TreeNode(1), TreeNode(3)), TreeNode(7))
copy = TreeNode(4, TreeNode(2, TreeNode(1), TreeNode(3)), TreeNode(7))
print(max_depth(root))             # 3
print(is_same(root, copy))         # True
invert(root)
print(root.left.val, root.right.val, root.right.left.val)   # 7 2 3
```

## Preorder, inorder and postorder

The three DFS orders differ only in **when** the node itself is processed relative to its subtrees:

| Order | Sequence | Use it for |
|---|---|---|
| Preorder | node, left, right | copying/serializing a tree, passing info **down** (paths, depth) |
| Inorder | left, node, right | BSTs: visits values in **sorted** order |
| Postorder | left, right, node | computing from children **up** (height, diameter, deleting a tree) |

This example builds a small BST and prints every traversal:

```
        4
      /   \
     2     6
    / \   / \
   1   3 5   7
```

```python run
from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

root = TreeNode(4,
                TreeNode(2, TreeNode(1), TreeNode(3)),
                TreeNode(6, TreeNode(5), TreeNode(7)))

def preorder(node, out):
    if node:
        out.append(node.val)
        preorder(node.left, out)
        preorder(node.right, out)
    return out

def inorder(node, out):
    if node:
        inorder(node.left, out)
        out.append(node.val)
        inorder(node.right, out)
    return out

def postorder(node, out):
    if node:
        postorder(node.left, out)
        postorder(node.right, out)
        out.append(node.val)
    return out

def level_order(root):
    levels, queue = [], deque([root] if root else [])
    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        levels.append(level)
    return levels

print("preorder: ", preorder(root, []))    # [4, 2, 1, 3, 6, 5, 7]
print("inorder:  ", inorder(root, []))     # [1, 2, 3, 4, 5, 6, 7]  (sorted: BST)
print("postorder:", postorder(root, []))   # [1, 3, 2, 5, 7, 6, 4]
print("level:    ", level_order(root))     # [[4], [2, 6], [1, 3, 5, 7]]
```

## Iterative inorder with a stack

Push the current node and go left as far as possible; when you can't go further, pop a node, visit it, then go right. O(n) time, O(h) space, with no recursion limit.

It is also the basis for Kth Smallest Element in a BST (stop after k pops) and the BST iterator.

```python run
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def inorder_iterative(root):
    out, stack, curr = [], [], root
    while curr or stack:
        while curr:                 # go left as far as possible
            stack.append(curr)
            curr = curr.left
        curr = stack.pop()          # leftmost unvisited node
        out.append(curr.val)
        curr = curr.right           # then its right subtree
    return out

def kth_smallest(root, k):
    stack, curr = [], root
    while curr or stack:
        while curr:
            stack.append(curr)
            curr = curr.left
        curr = stack.pop()
        k -= 1
        if k == 0:
            return curr.val
        curr = curr.right

root = TreeNode(5, TreeNode(3, TreeNode(2, TreeNode(1)), TreeNode(4)), TreeNode(6))
print(inorder_iterative(root))      # [1, 2, 3, 4, 5, 6]
print(kth_smallest(root, 3))        # 3
```

## Iterative preorder and postorder

- **Preorder:** pop a node, visit it, push the **right** child, then the **left** child (so left is processed first).
- **Postorder (easy trick):** do a "node, right, left" preorder and reverse the result.

```python run
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def preorder_iterative(root):
    out, stack = [], [root] if root else []
    while stack:
        node = stack.pop()
        out.append(node.val)
        if node.right:
            stack.append(node.right)
        if node.left:
            stack.append(node.left)
    return out

def postorder_iterative(root):
    out, stack = [], [root] if root else []
    while stack:
        node = stack.pop()
        out.append(node.val)
        if node.left:
            stack.append(node.left)
        if node.right:
            stack.append(node.right)
    return out[::-1]                  # node-right-left reversed = left-right-node

root = TreeNode(1, TreeNode(2, TreeNode(4), TreeNode(5)), TreeNode(3))
print(preorder_iterative(root))       # [1, 2, 4, 5, 3]
print(postorder_iterative(root))      # [4, 5, 2, 3, 1]
```

## BFS level-order traversal

Use a queue: `queue = deque([root])`. To handle one level at a time, read `len(queue)` **before** the inner loop; exactly that many nodes belong to the current level.

```python
queue = deque([root])
while queue:
    for _ in range(len(queue)):     # one full level
        node = queue.popleft()
        ...
        if node.left: queue.append(node.left)
        if node.right: queue.append(node.right)
```

Uses: Binary Tree Level Order Traversal, Right Side View (last node of each level), minimum depth (first leaf reached), zigzag order, averages per level. O(n) time, O(w) space where w is the maximum width.

```python run
from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def right_side_view(root):
    if not root:
        return []
    view, queue = [], deque([root])
    while queue:
        size = len(queue)
        for i in range(size):
            node = queue.popleft()
            if i == size - 1:
                view.append(node.val)          # last node in this level
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
    return view

def min_depth(root):
    if not root:
        return 0
    queue, depth = deque([root]), 1
    while queue:
        for _ in range(len(queue)):
            node = queue.popleft()
            if not node.left and not node.right:
                return depth                   # first leaf found = shallowest
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        depth += 1

root = TreeNode(1, TreeNode(2, None, TreeNode(5)), TreeNode(3, None, TreeNode(4)))
print(right_side_view(root))      # [1, 3, 4]
print(min_depth(root))            # 3
```

## Returning values up the recursion

When the answer for a node depends on its subtrees (height, size, balance, diameter), compute it **postorder** and return it to the parent.

Often the global answer differs from what you return. Example: **Diameter** returns the *height* to the parent, but updates the best `left + right` path through each node in an outer variable (use `nonlocal`). **Balanced Binary Tree** returns the height, or -1 as a "not balanced" signal so the work stays O(n).

```python run
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def diameter(root):
    best = 0
    def height(node):
        nonlocal best
        if not node:
            return 0
        left, right = height(node.left), height(node.right)
        best = max(best, left + right)    # longest path through this node (edges)
        return 1 + max(left, right)       # what the parent needs
    height(root)
    return best

def is_balanced(root):
    def height(node):                     # -1 means "unbalanced"
        if not node:
            return 0
        left, right = height(node.left), height(node.right)
        if left == -1 or right == -1 or abs(left - right) > 1:
            return -1
        return 1 + max(left, right)
    return height(root) != -1

root = TreeNode(1, TreeNode(2, TreeNode(4), TreeNode(5)), TreeNode(3))
print(diameter(root))                     # 3  (4 -> 2 -> 1 -> 3)
print(is_balanced(root))                  # True
print(is_balanced(TreeNode(1, TreeNode(2, TreeNode(3)))))   # False
```

## Binary Tree Maximum Path Sum

The hardest variant of "return one thing, track another". At each node:
- **Return** the best *downward* path starting at this node: `node.val + max(left_gain, right_gain)`. A path can only continue upward through one side.
- **Update** the global best with the path that *bends* here: `node.val + left_gain + right_gain`.
- Clamp negative gains to 0 (dropping a negative branch is always better).

```python run
from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(values):
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue, i = deque([root]), 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return root

def max_path_sum(root):
    best = float("-inf")
    def gain(node):
        nonlocal best
        if not node:
            return 0
        left = max(gain(node.left), 0)
        right = max(gain(node.right), 0)
        best = max(best, node.val + left + right)   # path bending at node
        return node.val + max(left, right)          # path continuing upward
    gain(root)
    return best

print(max_path_sum(build_tree([1, 2, 3])))                       # 6
print(max_path_sum(build_tree([-10, 9, 20, None, None, 15, 7]))) # 42
print(max_path_sum(build_tree([-3])))                            # -3
```

## Passing state down: path sums

When the answer depends on the path **from the root** (running sum, current path, max so far, allowed value range), pass that state **down** as parameters. Check the condition at **leaves** when the problem says root-to-leaf.

For collecting paths, use backtracking: append before recursing, pop after, and save a **copy** (`path[:]`).

```python run
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def has_path_sum(node, target):
    if not node:
        return False
    target -= node.val
    if not node.left and not node.right:       # leaf
        return target == 0
    return has_path_sum(node.left, target) or has_path_sum(node.right, target)

def all_paths(root, target):
    result, path = [], []
    def dfs(node, remaining):
        if not node:
            return
        path.append(node.val)
        remaining -= node.val
        if not node.left and not node.right and remaining == 0:
            result.append(path[:])              # copy!
        dfs(node.left, remaining)
        dfs(node.right, remaining)
        path.pop()                              # backtrack
    dfs(root, target)
    return result

def good_nodes(root):                          # nodes with no larger value above them
    def dfs(node, max_so_far):
        if not node:
            return 0
        good = 1 if node.val >= max_so_far else 0
        m = max(max_so_far, node.val)
        return good + dfs(node.left, m) + dfs(node.right, m)
    return dfs(root, float("-inf"))

root = TreeNode(5, TreeNode(4, TreeNode(11, TreeNode(7), TreeNode(2))),
                TreeNode(8, TreeNode(13), TreeNode(4, TreeNode(5), TreeNode(1))))
print(has_path_sum(root, 22))    # True: 5 -> 4 -> 11 -> 2
print(all_paths(root, 22))       # [[5, 4, 11, 2], [5, 8, 4, 5]]
print(good_nodes(root))          # 4: nodes 5, 11, 8, 13
```

## Binary search tree (BST) properties

In a BST, every value in the left subtree is **less than** the node and every value in the right subtree is **greater**. Consequences:

| Fact | Consequence |
|---|---|
| Inorder traversal is sorted | Kth Smallest, validate by checking inorder is strictly increasing |
| Search goes left *or* right | search / insert / delete in O(h): O(log n) balanced, O(n) skewed |
| Lowest Common Ancestor | the first node whose value lies between p and q |
| Min / max | leftmost / rightmost node |

**Validate BST pitfall:** checking only `node.left.val < node.val < node.right.val` is wrong, because a node deep in the left subtree must also be smaller than every ancestor it sits left of. Pass down a `(low, high)` range instead.

```python run
from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(values):
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue, i = deque([root]), 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return root

def is_valid_bst(node, low=float("-inf"), high=float("inf")):
    if not node:
        return True
    if not (low < node.val < high):
        return False
    return (is_valid_bst(node.left, low, node.val) and
            is_valid_bst(node.right, node.val, high))

def search_bst(node, target):
    while node and node.val != target:
        node = node.left if target < node.val else node.right
    return node

def lca_bst(root, p, q):
    node = root
    while node:
        if p < node.val and q < node.val:
            node = node.left
        elif p > node.val and q > node.val:
            node = node.right
        else:
            return node.val                 # split point

print(is_valid_bst(build_tree([2, 1, 3])))                         # True
print(is_valid_bst(build_tree([5, 1, 4, None, None, 3, 6])))       # False
print(is_valid_bst(build_tree([5, 4, 6, None, None, 3, 7])))       # False: 3 is right of 5
bst = build_tree([6, 2, 8, 0, 4, 7, 9, None, None, 3, 5])
print(search_bst(bst, 4).val, search_bst(bst, 10))                 # 4 None
print(lca_bst(bst, 2, 8), lca_bst(bst, 3, 5))                      # 6 4
```

## Serialize and deserialize

Preorder with a marker for `None` (`"#"`) captures the full structure. Deserialize by consuming tokens in the same preorder sequence; an iterator keeps track of the position. O(n) both ways.

```python run
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def serialize(root):
    out = []
    def dfs(node):
        if not node:
            out.append("#")
            return
        out.append(str(node.val))
        dfs(node.left)
        dfs(node.right)
    dfs(root)
    return ",".join(out)

def deserialize(data):
    tokens = iter(data.split(","))
    def dfs():
        tok = next(tokens)
        if tok == "#":
            return None
        node = TreeNode(int(tok))
        node.left = dfs()
        node.right = dfs()
        return node
    return dfs()

root = TreeNode(1, TreeNode(2), TreeNode(3, TreeNode(4), TreeNode(5)))
data = serialize(root)
print(data)                           # 1,2,#,#,3,4,#,#,5,#,#
print(serialize(deserialize(data)) == data)
```

## Tree pitfalls

- **Base case first:** start every recursive function with `if not node:`. Forgetting it causes `AttributeError: 'NoneType' object has no attribute 'left'`.
- **Leaf vs empty:** "root-to-leaf" conditions must check `not node.left and not node.right`, not just `not node` (Minimum Depth, Path Sum).
- **Recursion depth:** a skewed tree with 10⁴ nodes exceeds Python's default limit of about 1000. Use `sys.setrecursionlimit` or an iterative traversal.
- **Shared state between test cases:** keep accumulators inside the solution method, using `nonlocal` or an instance attribute reset per call, not in module-level globals.
- **Mutable path lists:** append `path[:]`, not `path`, and `pop()` after recursing.
- **Return the right thing:** decide clearly whether the helper returns the value the *parent* needs (height) or the final answer (diameter).
