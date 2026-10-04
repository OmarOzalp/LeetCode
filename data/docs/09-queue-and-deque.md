---
title: Queue & Deque
group: Data Structures
summary: collections.deque as a queue and double-ended queue - O(1) operations at both ends, BFS, bounded deques, and the monotonic deque for sliding window maximum.
keywords: [queue, deque, fifo, popleft, appendleft, append, pop, maxlen, bfs, breadth first search, level order, sliding window maximum, monotonic deque, rotate, list pop 0]
---

A queue is first-in, first-out (FIFO). In Python, use `collections.deque` (pronounced "deck"): it supports O(1) appends and pops at **both** ends, so it serves as a queue, a stack, or a double-ended window.

## deque basics

```python
from collections import deque
queue = deque()            # empty
queue = deque([1, 2, 3])   # from an iterable
```

| Operation | Code | Time |
|---|---|---|
| Add right | `dq.append(x)` | O(1) |
| Add left | `dq.appendleft(x)` | O(1) |
| Remove right | `dq.pop()` | O(1) |
| Remove left | `dq.popleft()` | O(1) |
| Peek ends | `dq[0]`, `dq[-1]` | O(1) |
| Index the middle | `dq[i]` | O(n) |
| Membership | `x in dq` | O(n) |
| Size / empty | `len(dq)`, `if dq:` | O(1) |

As a **queue**: `append` to enqueue, `popleft` to dequeue.

```python run
from collections import deque
queue = deque()
queue.append("a")          # enqueue
queue.append("b")
queue.append("c")
print(queue.popleft())     # a  (first in, first out)
print(queue[0], queue[-1]) # b c  (peek front / back)
print(len(queue), bool(queue))
try:
    deque().popleft()
except IndexError as e:
    print("IndexError:", e)
```

## Why not list.pop(0)?

A list stores items contiguously, so `list.pop(0)` must **shift every remaining element** left: O(n). A BFS that dequeues with `pop(0)` becomes O(n²) in the worst case. `deque.popleft()` is O(1) because a deque is a linked structure of blocks that can grow and shrink at both ends.

| | `list` | `deque` |
|---|---|---|
| Remove from front | `pop(0)`: O(n) | `popleft()`: O(1) |
| Add to front | `insert(0, x)`: O(n) | `appendleft(x)`: O(1) |
| Random access `[i]` | O(1) | O(n) in the middle |
| Slicing | yes | no (convert with `list(dq)`) |

Rule: if you remove from the front, use a deque. If you need fast random access or slicing, use a list.

```python run
from collections import deque
import time

n = 20000
lst = list(range(n))
start = time.perf_counter()
while lst:
    lst.pop(0)                 # O(n) each
list_time = time.perf_counter() - start

dq = deque(range(n))
start = time.perf_counter()
while dq:
    dq.popleft()               # O(1) each
deque_time = time.perf_counter() - start

print(f"list.pop(0):     {list_time * 1000:.1f} ms")
print(f"deque.popleft(): {deque_time * 1000:.1f} ms")
print("deque faster:", deque_time < list_time)
```

## Working at both ends

`appendleft` and `pop` complete the double-ended interface, so one deque can act as a queue, a stack, or both at once.

- Palindrome checks: compare `dq.popleft()` with `dq.pop()`.
- 0-1 BFS: push weight-0 edges to the front, weight-1 edges to the back.
- `extendleft(iterable)` adds items one at a time to the left, so their order **reverses**.

```python run
from collections import deque
dq = deque([2, 3])
dq.appendleft(1)
dq.append(4)
print(dq)                         # deque([1, 2, 3, 4])
print(dq.popleft(), dq.pop())     # 1 4
dq.extend([5, 6])
dq.extendleft([0, -1])            # note the reversed order
print(dq)                         # deque([-1, 0, 2, 3, 5, 6])

def is_palindrome(word):
    d = deque(word)
    while len(d) > 1:
        if d.popleft() != d.pop():
            return False
    return True
print(is_palindrome("level"), is_palindrome("ab"))
```

## Queues for BFS

Breadth-first search explores nodes in order of distance from the start, and a FIFO queue is what enforces that order.

Template:
1. `queue = deque([start])`, `visited = {start}`
2. `node = queue.popleft()`
3. For each unvisited neighbour: **mark visited when enqueuing** (not when dequeuing, which would let the same node enter the queue many times), then `append` it.

To process **level by level** (tree level order, shortest-path distance, rotting oranges minutes), snapshot the queue length at the start of each level: `for _ in range(len(queue)):`.

```python run
from collections import deque
graph = {0: [1, 2], 1: [3], 2: [3, 4], 3: [5], 4: [5], 5: []}
queue = deque([0])
visited = {0}
level = 0
while queue:
    print("level", level, list(queue))
    for _ in range(len(queue)):        # exactly the nodes of this level
        node = queue.popleft()
        for nxt in graph[node]:
            if nxt not in visited:
                visited.add(nxt)       # mark when enqueuing
                queue.append(nxt)
    level += 1
```

See *Trees* and *Graphs* for complete BFS examples.

## deque(maxlen=k)

A bounded deque: once it holds `k` items, appending to one end automatically drops an item from the **other** end. O(1) per operation.

**Use it for:** the last k events (moving average, recent-calls counters, logs), or a fixed-size window you never need to trim by hand.

```python run
from collections import deque
recent = deque(maxlen=3)
for x in range(1, 6):
    recent.append(x)                  # oldest item falls off the left
    print(list(recent), "avg =", sum(recent) / len(recent))
print(recent.maxlen)
```

## Sliding Window Maximum (monotonic deque)

Find the max of every window of size k in O(n) total. Keep a deque of **indices** whose values are **decreasing** from front to back:

1. Before adding index `i`, pop from the **back** every index whose value is `<= nums[i]`. Those values can never be a window maximum again, because `nums[i]` is bigger and stays in the window longer.
2. Pop from the **front** if that index has slid out of the window (`dq[0] <= i - k`).
3. The front of the deque is always the current window's maximum.

Each index enters and leaves the deque at most once, so the whole scan is O(n), compared with O(n·k) for recomputing `max` on every window.

```python run
from collections import deque

def max_sliding_window(nums, k):
    dq = deque()                     # indices; nums[dq[0]] is the max
    result = []
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:
            dq.pop()                 # drop smaller values from the back
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()             # front index left the window
        if i >= k - 1:
            result.append(nums[dq[0]])
    return result

print(max_sliding_window([1, 3, -1, -3, 5, 3, 6, 7], 3))   # [3, 3, 5, 5, 6, 7]
print(max_sliding_window([9, 8, 7, 6], 2))                 # [9, 8, 7]
```

For the sliding window **minimum**, flip the comparison (`>=`).

## rotate() and other helpers

- `dq.rotate(k)` moves the last k items to the front (negative k rotates left). O(k).
- `dq.clear()`, `dq.count(x)`, `dq.remove(x)` exist but are O(n).
- `list(dq)` converts back to a list for slicing or sorting.

```python run
from collections import deque
dq = deque([1, 2, 3, 4, 5])
dq.rotate(2)
print(dq)              # deque([4, 5, 1, 2, 3])
dq.rotate(-2)
print(dq)              # back to deque([1, 2, 3, 4, 5])
print(list(dq)[1:3], 3 in dq)
```

## queue.Queue is not what you want

The `queue` module's `Queue` class is a **thread-safe** queue for concurrent programs. It locks on every operation, which makes it slower, and it has no peeking or iteration. For algorithms, always use `collections.deque`.

| Need | Use |
|---|---|
| FIFO queue / BFS | `deque` with `append` + `popleft` |
| LIFO stack | `list` with `append` + `pop` |
| Priority queue | `heapq` on a list |
| Thread-safe producer/consumer | `queue.Queue` (not an interview topic) |
