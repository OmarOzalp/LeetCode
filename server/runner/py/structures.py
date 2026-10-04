"""Data structures used by LeetCode-style problems, plus helpers to build them
from JSON test inputs and to serialize them back for comparison/display."""

from collections import deque


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

    def __repr__(self):
        vals, node, seen = [], self, set()
        while node is not None and len(vals) < 20:
            if id(node) in seen:
                vals.append("...cycle")
                break
            seen.add(id(node))
            vals.append(repr(node.val))
            node = node.next
        if node is not None and len(vals) >= 20:
            vals.append("...")
        return "ListNode(" + " -> ".join(vals) + ")"


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

    def __repr__(self):
        return "TreeNode({!r})".format(self.val)


class Node:
    """Graph node (used by Clone Graph)."""

    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []

    def __repr__(self):
        return "Node({!r})".format(self.val)


class StructureError(Exception):
    """Raised when a returned structure cannot be serialized (e.g. a cycle)."""


MAX_NODES = 2_000_000


# ---------------------------------------------------------------- linked lists

def build_list(values):
    if values is None:
        return None
    dummy = ListNode()
    tail = dummy
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next


def build_list_with_cycle(values, pos):
    head = build_list(values)
    if head is None or pos is None or pos < 0:
        return head
    nodes = []
    node = head
    while node:
        nodes.append(node)
        node = node.next
    nodes[-1].next = nodes[pos]
    return head


def list_to_array(head):
    out = []
    seen = set()
    node = head
    while node is not None:
        if id(node) in seen:
            raise StructureError(
                "The returned linked list contains a cycle (node {!r} is reached twice).".format(node.val)
            )
        if not hasattr(node, "val"):
            raise StructureError("Expected a ListNode but found {}.".format(type(node).__name__))
        seen.add(id(node))
        out.append(node.val)
        if len(out) > MAX_NODES:
            raise StructureError("The returned linked list is unexpectedly long.")
        node = getattr(node, "next", None)
    return out


# ---------------------------------------------------------------- binary trees

def build_tree(values):
    """Build a tree from LeetCode level-order format, e.g. [3,9,20,null,null,15,7]."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = deque([root])
    i = 1
    n = len(values)
    while queue and i < n:
        node = queue.popleft()
        if i < n and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < n and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return root


def tree_to_array(root):
    """Serialize a tree to LeetCode level-order format (trailing nulls trimmed)."""
    if root is None:
        return []
    out = []
    seen = set()
    queue = deque([root])
    while queue:
        node = queue.popleft()
        if node is None:
            out.append(None)
            continue
        if id(node) in seen:
            raise StructureError("The returned tree contains a cycle or a shared node ({!r}).".format(node.val))
        if not hasattr(node, "val"):
            raise StructureError("Expected a TreeNode but found {}.".format(type(node).__name__))
        seen.add(id(node))
        if len(seen) > MAX_NODES:
            raise StructureError("The returned tree is unexpectedly large.")
        out.append(node.val)
        queue.append(getattr(node, "left", None))
        queue.append(getattr(node, "right", None))
    while out and out[-1] is None:
        out.pop()
    return out


def find_tree_node(root, val):
    stack = [root]
    while stack:
        node = stack.pop()
        if node is None:
            continue
        if node.val == val:
            return node
        stack.append(node.left)
        stack.append(node.right)
    return None


def tree_nodes(root):
    out = []
    stack = [root]
    while stack:
        node = stack.pop()
        if node is None:
            continue
        out.append(node)
        stack.append(node.left)
        stack.append(node.right)
    return out


# ---------------------------------------------------------------- graphs

def build_graph(adj):
    """Build an undirected graph from a 1-indexed adjacency list; returns node 1."""
    if not adj:
        return None
    nodes = [Node(i + 1) for i in range(len(adj))]
    for i, neighbors in enumerate(adj):
        nodes[i].neighbors = [nodes[j - 1] for j in neighbors]
    return nodes[0]


def graph_nodes(start):
    if start is None:
        return []
    seen = {id(start): start}
    queue = deque([start])
    while queue:
        node = queue.popleft()
        for nb in getattr(node, "neighbors", []) or []:
            if id(nb) not in seen:
                seen[id(nb)] = nb
                queue.append(nb)
                if len(seen) > MAX_NODES:
                    raise StructureError("The returned graph is unexpectedly large.")
    return list(seen.values())


def graph_to_adj(start):
    """Serialize a graph reachable from `start` to a 1-indexed adjacency list."""
    nodes = graph_nodes(start)
    if not nodes:
        return []
    by_val = {}
    for node in nodes:
        if node.val in by_val and by_val[node.val] is not node:
            raise StructureError("Two different nodes share the value {!r}.".format(node.val))
        by_val[node.val] = node
    size = max(by_val)
    out = []
    for v in range(1, size + 1):
        node = by_val.get(v)
        out.append([nb.val for nb in node.neighbors] if node else [])
    return out
