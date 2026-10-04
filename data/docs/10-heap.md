---
title: Heap (Priority Queue)
group: Data Structures
summary: heapq min-heaps - push, pop, heapify, the max-heap negation trick, tuple priorities with tie-breaking, and the top-k, merge-k, scheduling, Dijkstra and running-median patterns.
keywords: [heap, heapq, priority queue, min heap, max heap, heappush, heappop, heapify, heappushpop, heapreplace, nlargest, nsmallest, top k, kth largest, merge k sorted lists, dijkstra, shortest path, median, two heaps, meeting rooms, scheduling, tie breaking]
---

A heap gives you the **smallest item in O(1)** and lets you add or remove items in **O(log n)**. Use one whenever you repeatedly need "the current minimum (or maximum)" while the collection keeps changing.

## heapq basics and complexity

`heapq` turns a plain list into a **binary min-heap**: `heap[0]` is always the smallest element. The rest of the list is *not* sorted; it only satisfies `heap[i] <= heap[2*i + 1]` and `heap[i] <= heap[2*i + 2]`.

| Operation | Code | Time |
|---|---|---|
| Push | `heapq.heappush(heap, x)` | O(log n) |
| Pop smallest | `heapq.heappop(heap)` | O(log n) |
| Peek smallest | `heap[0]` | O(1) |
| Build from a list | `heapq.heapify(nums)` | O(n) |
| Push then pop | `heapq.heappushpop(heap, x)` | O(log n) |
| Pop then push | `heapq.heapreplace(heap, x)` | O(log n) |
| k largest / smallest | `heapq.nlargest(k, it)` / `nsmallest` | O(n log k) |
| Size | `len(heap)` | O(1) |
| Search / remove arbitrary item | `x in heap`, `heap.remove(x)` | O(n) |

```python run
import heapq
heap = []
for x in [5, 1, 8, 3, 2]:
    heapq.heappush(heap, x)
print(heap)                 # heap order, NOT sorted: [1, 2, 8, 5, 3]
print(heap[0])              # 1  peek
print(heapq.heappop(heap))  # 1
print(heapq.heappop(heap))  # 2
print(heap[0], len(heap))   # 3 3
```

## heappush and heappop

- `heappush(heap, x)` adds `x` and restores the heap property.
- `heappop(heap)` removes and returns the smallest item, and raises `IndexError` if the heap is empty.
- Popping everything returns the items in sorted order (heap sort, O(n log n)).

Only modify the list through `heapq` functions. A plain `heap.append(x)` or `heap.sort()` in the middle breaks the invariant, or wastes time.

```python run
import heapq
heap = []
for x in [7, 2, 9, 4]:
    heapq.heappush(heap, x)
out = []
while heap:                  # check emptiness before popping
    out.append(heapq.heappop(heap))
print(out)                   # [2, 4, 7, 9]
```

## heapify

`heapq.heapify(nums)` rearranges an existing list into a heap **in place** in **O(n)**, which is faster than n pushes (O(n log n)). It returns `None`.

Use it when all elements are known up front (Kth Largest with an initial array, Last Stone Weight, initial heap of k list heads).

```python run
import heapq
nums = [9, 4, 7, 1, 8]
heapq.heapify(nums)          # in place, returns None
print(nums[0], nums)
stones = [2, 7, 4, 1, 8, 1]
heap = [-s for s in stones]  # max-heap via negation
heapq.heapify(heap)
while len(heap) > 1:         # Last Stone Weight
    a = -heapq.heappop(heap)
    b = -heapq.heappop(heap)
    if a != b:
        heapq.heappush(heap, -(a - b))
print(-heap[0] if heap else 0)   # 1
```

## Peeking with heap[0]

`heap[0]` is the minimum in O(1) without removing it. Guard against an empty heap (`if heap and heap[0] < x:`).

Common use: in a size-k min-heap of the k largest items seen so far, `heap[0]` is the **k-th largest**.

## Max-heap via negation

`heapq` only provides a min-heap. For a max-heap, **negate on the way in and on the way out**:

```python
heapq.heappush(heap, -x)        # push
largest = -heapq.heappop(heap)  # pop
peek = -heap[0]                 # peek
```

For tuples, negate only the priority: `(-count, item)`. To negate a string priority, use a different trick (a custom class with `__lt__`, or a sort key elsewhere).

```python run
import heapq
max_heap = []
for x in [3, 10, 5]:
    heapq.heappush(max_heap, -x)
print(-max_heap[0])                 # 10  peek max
print(-heapq.heappop(max_heap))     # 10
print(-heapq.heappop(max_heap))     # 5
```

## Tuples (priority, item) and tie-breaking

`heapq` has no `key=` parameter. Push **tuples** instead: they compare by the first field, then the second, and so on.

- `(priority, item)`: ties on priority fall back to comparing `item`.
- If items are not comparable (`ListNode`, `TreeNode`, dicts), a tie raises `TypeError`. Insert a unique **tie-breaker** in the middle: `(priority, counter, item)` where `counter` is an index or `itertools.count()`.
- A tie-breaker that increases over time also makes the heap FIFO among equal priorities.

```python run
import heapq
import itertools
tasks = []
heapq.heappush(tasks, (2, "write"))
heapq.heappush(tasks, (1, "plan"))
heapq.heappush(tasks, (2, "review"))     # tie -> compares "review" vs "write"
print([heapq.heappop(tasks) for _ in range(3)])

class Node:
    def __init__(self, val):
        self.val = val

heap = []
try:
    heapq.heappush(heap, (1, Node("a")))
    heapq.heappush(heap, (1, Node("b")))   # tie -> compares two Nodes
except TypeError as e:
    print("TypeError:", e)

heap = []
counter = itertools.count()
for name in ["a", "b", "c"]:
    heapq.heappush(heap, (1, next(counter), Node(name)))
print([heapq.heappop(heap)[2].val for _ in range(3)])   # ['a', 'b', 'c']
```

## nlargest and nsmallest

`heapq.nlargest(k, iterable, key=None)` and `nsmallest` return the k largest/smallest items as a **sorted list** in O(n log k). Unlike the core heap functions, they **do** accept `key=`.

- Top K Frequent Elements: `heapq.nlargest(k, counts, key=counts.get)`
- K Closest Points: `heapq.nsmallest(k, points, key=lambda p: p[0]**2 + p[1]**2)`
- For k = 1 use `max` / `min`; for k close to n, `sorted(...)[:k]` is just as good.

```python run
import heapq
from collections import Counter
nums = [1, 1, 1, 2, 2, 3]
counts = Counter(nums)
print(heapq.nlargest(2, counts, key=counts.get))           # [1, 2]
points = [[1, 3], [-2, 2], [5, 8], [0, 1]]
print(heapq.nsmallest(2, points, key=lambda p: p[0] ** 2 + p[1] ** 2))
print(heapq.nlargest(3, [4, 1, 7, 3, 9]))                  # [9, 7, 4]
```

## heappushpop and heapreplace

Both do a push and a pop in a single O(log n) step, but in a different order:

| Function | Order | Returns |
|---|---|---|
| `heappushpop(heap, x)` | push x, then pop the smallest | `min(x, old heap[0])`; returns x itself if x is smallest |
| `heapreplace(heap, x)` | pop the smallest, then push x | the old `heap[0]` (even if x is smaller) |

`heappushpop` is ideal for maintaining a size-k heap: `heappushpop(heap, x)` keeps the k largest items.

```python run
import heapq
heap = [1, 5, 8]
print(heapq.heappushpop(heap, 0), heap)   # 0 [1, 5, 8]  (0 popped right back)
heap = [1, 5, 8]
print(heapq.heapreplace(heap, 0), heap)   # 1 [0, 5, 8]
heap = [1, 5, 8]
print(heapq.heappushpop(heap, 6), heap)   # 1 [5, 6, 8]
```

## Pattern: top K / Kth largest

Keep a **min-heap of size k** holding the k largest items seen so far. When it grows past k, pop the smallest. At the end, `heap[0]` is the k-th largest. O(n log k) time and O(k) space, which beats sorting when k is much smaller than n and also works on streams (Kth Largest Element in a Stream).

Counter-intuitive but key: the **k largest** use a **min**-heap (to evict the smallest of them), and the **k smallest** use a **max**-heap.

```python run
import heapq

def kth_largest(nums, k):
    heap = []
    for x in nums:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)        # evict the smallest; keep the k largest
    return heap[0]

def k_closest(points, k):
    heap = []                          # max-heap of size k via negated distance
    for x, y in points:
        d = x * x + y * y
        heapq.heappush(heap, (-d, x, y))
        if len(heap) > k:
            heapq.heappop(heap)        # drop the farthest
    return [[x, y] for _, x, y in heap]

print(kth_largest([3, 2, 1, 5, 6, 4], 2))          # 5
print(kth_largest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4)) # 4
print(sorted(k_closest([[3, 3], [5, -1], [-2, 4]], 2)))
```

## Pattern: merge k sorted lists

Put the head of each list into a heap; repeatedly pop the smallest and push that list's next element. O(N log k) for N total elements across k lists.

Use `(value, list_index, element_index)` so ties never compare un-comparable objects. With `ListNode`s, push `(node.val, i, node)`.

```python run
import heapq

def merge_k_sorted(lists):
    heap = [(lst[0], i, 0) for i, lst in enumerate(lists) if lst]
    heapq.heapify(heap)
    merged = []
    while heap:
        val, i, j = heapq.heappop(heap)
        merged.append(val)
        if j + 1 < len(lists[i]):
            heapq.heappush(heap, (lists[i][j + 1], i, j + 1))
    return merged

print(merge_k_sorted([[1, 4, 5], [1, 3, 4], [2, 6]]))   # [1, 1, 2, 3, 4, 4, 5, 6]
print(merge_k_sorted([[], [0]]))
```

```python
# Linked-list version (Merge k Sorted Lists)
def merge_k_lists(lists):
    heap = [(node.val, i, node) for i, node in enumerate(lists) if node]
    heapq.heapify(heap)
    dummy = tail = ListNode()
    while heap:
        _, i, node = heapq.heappop(heap)
        tail.next = node
        tail = node
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next
```

## Pattern: scheduling (Meeting Rooms II)

Sort meetings by start time and keep a min-heap of **end times** for rooms in use. If the earliest-ending room is free by the time the next meeting starts, reuse it (pop); then push the new end time. The heap size is the number of rooms needed. O(n log n).

The same "heap of current commitments" idea solves Task Scheduler, Car Pooling and IPO-style problems.

```python run
import heapq

def min_meeting_rooms(intervals):
    intervals.sort(key=lambda x: x[0])
    ends = []                          # end times of occupied rooms
    for start, end in intervals:
        if ends and ends[0] <= start:
            heapq.heappop(ends)        # that room is free again
        heapq.heappush(ends, end)
    return len(ends)

print(min_meeting_rooms([[0, 30], [5, 10], [15, 20]]))   # 2
print(min_meeting_rooms([[7, 10], [2, 4]]))              # 1
print(min_meeting_rooms([[1, 5], [2, 6], [3, 7]]))       # 3
```

## Pattern: shortest paths (Dijkstra)

For graphs with **non-negative** edge weights: always expand the unvisited node with the smallest known distance, using a heap of `(distance, node)`. O((V + E) log V).

Instead of a decrease-key operation, push duplicates and **skip stale entries** when popped (`if d > dist[u]: continue`).

```python run
import heapq
from collections import defaultdict

def dijkstra(n, edges, src):
    graph = defaultdict(list)
    for u, v, w in edges:
        graph[u].append((v, w))
    dist = [float("inf")] * n
    dist[src] = 0
    heap = [(0, src)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue                   # stale entry
        for v, w in graph[u]:
            if d + w < dist[v]:
                dist[v] = d + w
                heapq.heappush(heap, (dist[v], v))
    return dist

edges = [(0, 1, 4), (0, 2, 1), (2, 1, 2), (1, 3, 1), (2, 3, 5)]
print(dijkstra(4, edges, 0))           # [0, 3, 1, 4]
```

For **unweighted** graphs, plain BFS with a deque is simpler and O(V + E).

## Pattern: running median (two heaps)

Find Median from Data Stream: keep the smaller half in a **max-heap** (`low`, negated) and the larger half in a **min-heap** (`high`). Keep sizes balanced so `len(low)` equals `len(high)` or is one larger. The median is `-low[0]`, or the average of both tops.

`add` is O(log n); `median` is O(1).

```python run
import heapq

class MedianFinder:
    def __init__(self):
        self.low = []     # max-heap (negated): the smaller half
        self.high = []    # min-heap: the larger half

    def add(self, num):
        heapq.heappush(self.low, -num)
        heapq.heappush(self.high, -heapq.heappop(self.low))  # move low's max to high
        if len(self.high) > len(self.low):
            heapq.heappush(self.low, -heapq.heappop(self.high))

    def median(self):
        if len(self.low) > len(self.high):
            return -self.low[0]
        return (-self.low[0] + self.high[0]) / 2

mf = MedianFinder()
for x in [5, 15, 1, 3]:
    mf.add(x)
    print(x, "->", mf.median())       # 5, 10.0, 5, 4.0
```

## Heap pitfalls

- **It's a min-heap.** Negate for max-heap behaviour, and remember to negate back when reading.
- **The list is not sorted.** Only `heap[0]` is guaranteed; iterating the list does not give sorted order.
- **No `key=`** on `heappush` / `heappop`: wrap items as `(key, tiebreak, item)`.
- **Removing an arbitrary element** is O(n). Use *lazy deletion*: record removed items in a set/Counter and skip them when they reach the top.
- `heapify` and `heappush` return `None`; don't assign their result.
- Empty heap: `heappop` and `heap[0]` raise `IndexError`; check `if heap:` first.
