---
title: Linked Lists
group: Data Structures
summary: ListNode basics - traversal, dummy nodes, reversal, fast/slow pointers, middle, cycle detection, removing the nth node from the end, merging, and the pointer mistakes to avoid.
keywords: [linked list, listnode, node, next, head, traversal, dummy node, sentinel, reverse linked list, fast slow pointers, tortoise hare, middle, cycle, floyd, remove nth node, merge two sorted lists, reorder list, pointer]
---

A singly linked list is a chain of nodes, each holding a value and a pointer to the next node. There is no indexing: reaching the k-th node costs O(k). Linked-list problems test careful pointer manipulation more than algorithms, so draw the pointers before you code.

## ListNode definition and test helpers

LeetCode defines the node class for you:

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
```

When practising locally, two helpers save a lot of time: one builds a list from a Python list, and one converts it back for printing.

```python run
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def build(values):
    dummy = tail = ListNode()
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next

def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out

head = build([1, 2, 3])
print(to_list(head))                    # [1, 2, 3]
print(head.val, head.next.val, head.next.next.next)   # 1 2 None
```

| Operation | Time |
|---|---|
| Access k-th node | O(k) |
| Insert/delete **after** a known node | O(1) |
| Search by value | O(n) |
| Find length | O(n) |

## Traversal

```python
curr = head
while curr:              # stops after the last node
    # use curr.val
    curr = curr.next
```

- `while curr:` visits **every** node.
- `while curr.next:` stops **at** the last node, which you need when appending or deleting the next node. It crashes if `curr` itself is `None`.
- Use a separate `curr` variable so you don't lose `head`.

```python run
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

head = ListNode(4, ListNode(7, ListNode(1)))
curr, length, total = head, 0, 0
while curr:
    length += 1
    total += curr.val
    curr = curr.next
print(length, total)        # 3 12

curr = head
while curr.next:            # stop AT the last node
    curr = curr.next
print("last:", curr.val)    # 1
```

## Dummy (sentinel) node

Create a fake node in front of the head: `dummy = ListNode(0, head)`. Now every real node, including the head, has a predecessor, so deleting or inserting at the front needs no special case. Return `dummy.next` at the end, because the real head may have changed.

Use it whenever the head might be removed or replaced: removing elements, removing the nth node from the end, merging lists, partitioning, adding two numbers.

```python run
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def build(values):
    dummy = tail = ListNode()
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next

def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out

def remove_elements(head, val):
    dummy = ListNode(0, head)
    curr = dummy
    while curr.next:
        if curr.next.val == val:
            curr.next = curr.next.next     # unlink; don't advance yet
        else:
            curr = curr.next
    return dummy.next                      # head may have been removed

print(to_list(remove_elements(build([7, 7, 1, 7, 2]), 7)))   # [1, 2]
print(to_list(remove_elements(build([7, 7]), 7)))            # []
```

## Reversing a linked list (iterative)

Walk the list once, turning each `next` pointer around. Keep three pointers: `prev`, `curr` and a saved `nxt`. O(n) time, O(1) space.

Order matters. **Save `curr.next` before overwriting it**, or you lose the rest of the list.

```python run
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def build(values):
    dummy = tail = ListNode()
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next

def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out

def reverse(head):
    prev, curr = None, head
    while curr:
        nxt = curr.next      # 1. save the rest of the list
        curr.next = prev     # 2. reverse this pointer
        prev = curr          # 3. move prev forward
        curr = nxt           # 4. move curr forward
    return prev              # prev is the new head

head = build([1, 2, 3, 4, 5])
print(to_list(head))                 # [1, 2, 3, 4, 5]
print(to_list(reverse(head)))        # [5, 4, 3, 2, 1]
print(to_list(reverse(None)))        # []
```

### Recursive version

Elegant, but it uses O(n) stack space and hits Python's recursion limit (about 1000) on long lists:

```python
def reverse(head):
    if not head or not head.next:
        return head
    new_head = reverse(head.next)
    head.next.next = head     # the node after head points back to head
    head.next = None          # head becomes the tail
    return new_head
```

## Fast and slow pointers

Move `slow` one step and `fast` two steps per iteration. When `fast` reaches the end, `slow` is halfway. If there is a cycle, `fast` eventually laps `slow`.

```python
slow = fast = head
while fast and fast.next:     # both checks: fast.next.next must be safe
    slow = slow.next
    fast = fast.next.next
```

`while fast and fast.next` guards against both the odd-length end (`fast` is `None`) and the even-length end (`fast.next` is `None`). Uses: middle node, cycle detection, cycle start, palindrome linked list, splitting a list for merge sort.

## Finding the middle node

With the loop above, `slow` stops at the middle. For even lengths it stops at the **second** middle (LeetCode's Middle of the Linked List). Start `fast = head.next` to get the **first** middle instead, which is what you want when splitting a list into two halves.

```python run
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def build(values):
    dummy = tail = ListNode()
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next

def middle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow

def first_middle(head):
    slow, fast = head, head.next
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow

print(middle(build([1, 2, 3, 4, 5])).val)        # 3
print(middle(build([1, 2, 3, 4, 5, 6])).val)     # 4 (second middle)
print(first_middle(build([1, 2, 3, 4, 5, 6])).val)  # 3 (first middle)
```

## Cycle detection (Floyd's tortoise and hare)

If the list has a cycle, the fast pointer gains one step per iteration on the slow pointer inside the loop, so they must meet. If `fast` hits `None`, there is no cycle. O(n) time, O(1) space (a `seen` set of nodes also works, but needs O(n) space).

**Cycle start (Linked List Cycle II):** after they meet, move one pointer back to `head` and advance both one step at a time; they meet again at the cycle's first node.

Compare nodes with `is` (identity), not their values: different nodes can hold equal values.

```python run
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False

def cycle_start(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            slow = head
            while slow is not fast:
                slow = slow.next
                fast = fast.next
            return slow
    return None

nodes = [ListNode(v) for v in [3, 2, 0, -4]]
for a, b in zip(nodes, nodes[1:]):
    a.next = b
print(has_cycle(nodes[0]))              # False
nodes[-1].next = nodes[1]               # -4 points back to 2
print(has_cycle(nodes[0]))              # True
print(cycle_start(nodes[0]).val)        # 2
```

## Remove the nth node from the end

Use two pointers with a gap: advance `fast` n + 1 steps from a dummy node, then move both until `fast` is `None`. Now `slow` sits **just before** the node to delete. One pass, O(1) space.

The dummy node handles removing the head (n equal to the length).

```python run
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def build(values):
    dummy = tail = ListNode()
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next

def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out

def remove_nth_from_end(head, n):
    dummy = ListNode(0, head)
    slow = fast = dummy
    for _ in range(n + 1):          # gap of n nodes between slow and fast
        fast = fast.next
    while fast:
        slow = slow.next
        fast = fast.next
    slow.next = slow.next.next      # skip the target
    return dummy.next

print(to_list(remove_nth_from_end(build([1, 2, 3, 4, 5]), 2)))   # [1, 2, 3, 5]
print(to_list(remove_nth_from_end(build([1, 2]), 2)))            # [2]  (head removed)
print(to_list(remove_nth_from_end(build([1]), 1)))               # []
```

## Merge two sorted lists

Keep a `tail` pointer starting at a dummy node. Repeatedly attach the smaller head and advance that list. When one list runs out, attach the remainder of the other in O(1). O(n + m) time, O(1) extra space: the nodes are reused, not copied.

```python run
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def build(values):
    dummy = tail = ListNode()
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next

def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out

def merge_two(l1, l2):
    dummy = tail = ListNode()
    while l1 and l2:
        if l1.val <= l2.val:
            tail.next = l1
            l1 = l1.next
        else:
            tail.next = l2
            l2 = l2.next
        tail = tail.next
    tail.next = l1 if l1 else l2     # attach whatever is left
    return dummy.next

print(to_list(merge_two(build([1, 2, 4]), build([1, 3, 4]))))   # [1, 1, 2, 3, 4, 4]
print(to_list(merge_two(build([]), build([0]))))                # [0]
```

For **k** lists, use a heap (see *Heap: merge k sorted lists*) or merge pairs repeatedly (divide and conquer), both O(N log k).

## Combining techniques: Reorder List

Many medium problems chain the basic moves. Reorder List (`L0 → Ln → L1 → Ln-1 → …`) is: **find the middle**, **reverse the second half**, then **interleave** the two halves.

```python run
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def build(values):
    dummy = tail = ListNode()
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next

def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out

def reorder_list(head):
    if not head or not head.next:
        return
    slow, fast = head, head.next          # 1. first middle
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    second = slow.next
    slow.next = None                      # cut: avoid a cycle
    prev = None                           # 2. reverse second half
    while second:
        nxt = second.next
        second.next = prev
        prev = second
        second = nxt
    first, second = head, prev            # 3. interleave
    while second:
        n1, n2 = first.next, second.next
        first.next = second
        second.next = n1
        first, second = n1, n2

head = build([1, 2, 3, 4, 5])
reorder_list(head)
print(to_list(head))        # [1, 5, 2, 4, 3]
head = build([1, 2, 3, 4])
reorder_list(head)
print(to_list(head))        # [1, 4, 2, 3]
```

## Common pitfalls

- **Losing the rest of the list:** save `nxt = curr.next` *before* reassigning `curr.next`.
- **`None` checks:** before `curr.next.val` or `fast.next.next`, make sure `curr.next` / `fast.next` exist. Order the checks so `and` short-circuits: `while fast and fast.next`.
- **Accidental cycles:** when splitting a list, set the last node of the first half to `None` (`slow.next = None`). When building a new list from existing nodes, terminate it with `tail.next = None`.
- **Returning the wrong head:** with a dummy node, return `dummy.next`; after reversing, return `prev`, not `head`.
- **Moving `head` itself:** use a separate `curr` variable, or you lose the start of the list.
- **Comparing values instead of nodes:** use `a is b` for "same node" (cycles, intersections).
- **Deleting while advancing:** after unlinking `curr.next`, do *not* also advance `curr` in the same step, or you skip a node.
- **Edge cases to test:** empty list, single node, two nodes, operations on the head, operations on the tail.
