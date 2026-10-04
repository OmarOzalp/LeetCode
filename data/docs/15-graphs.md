---
title: Graphs
group: Data Structures
summary: Graph representations, DFS and BFS templates, connected components, cycle detection, BFS shortest paths, grids as graphs, topological sort and union-find.
keywords: [graph, adjacency list, edge list, dfs, bfs, depth first search, breadth first search, visited, connected components, number of islands, grid, matrix, directions, neighbors, cycle detection, course schedule, topological sort, kahn, indegree, union find, disjoint set, dsu, path compression, union by rank, shortest path, multi-source bfs, clone graph]
---

A graph is a set of nodes connected by edges. Trees, grids, word ladders, course prerequisites and friend networks are all graphs in disguise. Most graph problems reduce to: **build an adjacency list, then run DFS or BFS with a `visited` set.**

## Representations: building an adjacency list

Inputs usually arrive as an **edge list** (`[[0, 1], [1, 2]]`). Convert it to an **adjacency list** mapping each node to its neighbours, so you can iterate a node's neighbours in O(degree).

```python
from collections import defaultdict
graph = defaultdict(list)
for a, b in edges:
    graph[a].append(b)
    graph[b].append(a)      # undirected: add BOTH directions
```

| Representation | Space | Edge check | Iterate neighbours | Use when |
|---|---|---|---|---|
| Adjacency list | O(V + E) | O(degree) | O(degree) | almost always |
| Adjacency matrix | O(V²) | O(1) | O(V) | dense graphs, small V |
| Edge list | O(E) | O(E) | O(E) | union-find, Kruskal, Bellman-Ford |
| Implicit (grid) | none extra | computed | 4 or 8 neighbours | grid problems |

```python run
from collections import defaultdict
n = 5
edges = [[0, 1], [0, 2], [1, 3], [3, 4]]

graph = defaultdict(list)                 # undirected
for a, b in edges:
    graph[a].append(b)
    graph[b].append(a)
print(dict(graph))

directed = [[] for _ in range(n)]         # list of lists works when nodes are 0..n-1
for a, b in edges:
    directed[a].append(b)
print(directed)

weighted = defaultdict(list)
for a, b, w in [(0, 1, 5), (1, 2, 3)]:
    weighted[a].append((b, w))
    weighted[b].append((a, w))
print(dict(weighted))
```

## DFS (recursive) with a visited set

Visit a node, mark it, recurse into each unvisited neighbour. The `visited` set is essential: without it, any cycle (and every undirected edge, which is a 2-cycle) causes infinite recursion. O(V + E) time, O(V) space.

```python run
from collections import defaultdict

edges = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]]
graph = defaultdict(list)
for a, b in edges:
    graph[a].append(b)
    graph[b].append(a)

visited = set()
order = []

def dfs(node):
    visited.add(node)
    order.append(node)
    for nxt in graph[node]:
        if nxt not in visited:
            dfs(nxt)

dfs(0)
print(order)                  # [0, 1, 3, 2, 4]
print(4 in visited)           # is 4 reachable from 0?
```

Deep graphs (10⁴+ nodes in a chain) can exceed Python's recursion limit of about 1000; use the iterative version or `sys.setrecursionlimit`.

## DFS (iterative) with a stack

Same traversal with an explicit stack, so there is no recursion limit. The order differs slightly from the recursive version, which rarely matters.

```python run
from collections import defaultdict

edges = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]]
graph = defaultdict(list)
for a, b in edges:
    graph[a].append(b)
    graph[b].append(a)

def dfs_iterative(start):
    visited = {start}
    stack = [start]
    order = []
    while stack:
        node = stack.pop()
        order.append(node)
        for nxt in graph[node]:
            if nxt not in visited:
                visited.add(nxt)       # mark on push: each node pushed once
                stack.append(nxt)
    return order

print(dfs_iterative(0))
```

## BFS with a queue

BFS explores in **rings of increasing distance** from the start. Use `deque` for O(1) `popleft`.

```python
queue = deque([start])
visited = {start}
while queue:
    node = queue.popleft()
    for nxt in graph[node]:
        if nxt not in visited:
            visited.add(nxt)        # mark when ENQUEUING
            queue.append(nxt)
```

Mark nodes visited when you **enqueue** them, not when you dequeue. Otherwise the same node can be added to the queue many times, which blows up time and memory. O(V + E).

```python run
from collections import defaultdict, deque

edges = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]]
graph = defaultdict(list)
for a, b in edges:
    graph[a].append(b)
    graph[b].append(a)

def bfs(start):
    queue = deque([start])
    visited = {start}
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for nxt in graph[node]:
            if nxt not in visited:
                visited.add(nxt)
                queue.append(nxt)
    return order

print(bfs(0))     # [0, 1, 2, 3, 4]: nearer nodes first
```

## Shortest path in an unweighted graph (BFS)

In an unweighted graph, the first time BFS reaches a node is along a **shortest path**. Store distances in a dict (which doubles as the visited set), or process level by level and count the levels.

Uses: Word Ladder, Shortest Path in Binary Matrix, minimum knight moves, minimum steps/moves problems. For **weighted** edges use Dijkstra (see *Heap*).

```python run
from collections import defaultdict, deque

def shortest_distances(n, edges, src):
    graph = defaultdict(list)
    for a, b in edges:
        graph[a].append(b)
        graph[b].append(a)
    dist = {src: 0}                      # also serves as "visited"
    queue = deque([src])
    while queue:
        node = queue.popleft()
        for nxt in graph[node]:
            if nxt not in dist:
                dist[nxt] = dist[node] + 1
                queue.append(nxt)
    return [dist.get(i, -1) for i in range(n)]   # -1 = unreachable

edges = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]]
print(shortest_distances(6, edges, 0))   # [0, 1, 1, 2, 3, -1]

def path_to(parent, target):             # reconstruct a path via parent pointers
    path = []
    while target is not None:
        path.append(target)
        target = parent[target]
    return path[::-1]

parent = {0: None, 1: 0, 2: 0, 3: 1, 4: 3}
print(path_to(parent, 4))                # [0, 1, 3, 4]
```

To reconstruct the actual path, record `parent[nxt] = node` when you first discover `nxt`, then walk back from the target.

## Connected components

Run a DFS/BFS from every node that is still unvisited; each launch discovers exactly one component. **Loop over all nodes `range(n)`**, not over the adjacency list's keys, or isolated nodes with no edges are missed. O(V + E).

```python run
from collections import defaultdict

def count_components(n, edges):
    graph = defaultdict(list)
    for a, b in edges:
        graph[a].append(b)
        graph[b].append(a)
    visited = set()
    def dfs(node):
        stack = [node]
        visited.add(node)
        while stack:
            u = stack.pop()
            for v in graph[u]:
                if v not in visited:
                    visited.add(v)
                    stack.append(v)
    components = 0
    for node in range(n):                # includes isolated nodes
        if node not in visited:
            dfs(node)
            components += 1
    return components

print(count_components(5, [[0, 1], [1, 2], [3, 4]]))   # 2
print(count_components(6, [[0, 1], [1, 2], [3, 4]]))   # 3 (node 5 is alone)
```

## Grids as graphs

Each cell `(r, c)` is a node whose neighbours are the 4 adjacent cells (8 with diagonals). There is no need to build an adjacency list; generate neighbours on the fly with a direction list and a **bounds check**.

```python
DIRS = [(1, 0), (-1, 0), (0, 1), (0, -1)]
for dr, dc in DIRS:
    nr, nc = r + dr, c + dc
    if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == "1":
        ...
```

- Mark visited with a set of `(r, c)` tuples, or by overwriting the cell (e.g. `"1"` → `"0"`) if mutating the input is allowed.
- Complexity: O(rows × cols).
- Check bounds **before** indexing. Negative indices don't raise in Python; they silently wrap to the other side of the grid.

Uses: Number of Islands, Max Area of Island, Flood Fill, Surrounded Regions, Pacific Atlantic Water Flow, Word Search.

```python run
def num_islands(grid):
    rows, cols = len(grid), len(grid[0])
    dirs = [(1, 0), (-1, 0), (0, 1), (0, -1)]
    def sink(r, c):
        stack = [(r, c)]
        grid[r][c] = "0"
        while stack:
            cr, cc = stack.pop()
            for dr, dc in dirs:
                nr, nc = cr + dr, cc + dc
                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == "1":
                    grid[nr][nc] = "0"          # mark visited
                    stack.append((nr, nc))
    islands = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1":
                sink(r, c)
                islands += 1
    return islands

grid = [list(row) for row in ["11000",
                              "11000",
                              "00100",
                              "00011"]]
print(num_islands(grid))    # 3
```

## Multi-source BFS

Start BFS from **all** source cells at once by putting them all in the initial queue. Each cell's level is then its distance to the **nearest** source. One pass, O(rows × cols).

Uses: Rotting Oranges, Walls and Gates, 01 Matrix. The related "reverse search" idea starts from the targets instead of from every cell; Pacific Atlantic Water Flow searches inward from the ocean borders.

```python run
from collections import deque

def oranges_rotting(grid):
    rows, cols = len(grid), len(grid[0])
    queue = deque()
    fresh = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 2:
                queue.append((r, c))      # every rotten orange is a source
            elif grid[r][c] == 1:
                fresh += 1
    minutes = 0
    while queue and fresh:
        for _ in range(len(queue)):       # one minute = one BFS level
            r, c = queue.popleft()
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                    grid[nr][nc] = 2
                    fresh -= 1
                    queue.append((nr, nc))
        minutes += 1
    return minutes if fresh == 0 else -1

print(oranges_rotting([[2, 1, 1], [1, 1, 0], [0, 1, 1]]))   # 4
print(oranges_rotting([[2, 1, 1], [0, 1, 1], [1, 0, 1]]))   # -1
```

## Cycle detection in an undirected graph

**DFS with parent tracking:** while exploring from `u`, reaching an already-visited neighbour that is *not* the node you came from means there is a cycle. (The parent is excluded because every undirected edge appears in both directions.)

**Union-find alternative:** process edges one by one; if both endpoints already have the same root, this edge closes a cycle (Redundant Connection). See *Union-find* below.

**Graph Valid Tree** = exactly `n - 1` edges **and** connected (equivalently, no cycle and connected).

```python run
from collections import defaultdict

def has_cycle_undirected(n, edges):
    graph = defaultdict(list)
    for a, b in edges:
        graph[a].append(b)
        graph[b].append(a)
    visited = set()
    def dfs(u, parent):
        visited.add(u)
        for v in graph[u]:
            if v == parent:
                continue                  # don't walk straight back
            if v in visited or dfs(v, u):
                return True
        return False
    return any(u not in visited and dfs(u, -1) for u in range(n))

def valid_tree(n, edges):
    return len(edges) == n - 1 and not has_cycle_undirected(n, edges)

print(has_cycle_undirected(4, [[0, 1], [1, 2], [2, 3]]))           # False
print(has_cycle_undirected(4, [[0, 1], [1, 2], [2, 0], [2, 3]]))   # True
print(valid_tree(5, [[0, 1], [0, 2], [0, 3], [1, 4]]))             # True
print(valid_tree(5, [[0, 1], [1, 2], [2, 3], [1, 3], [1, 4]]))     # False
```

The parent check assumes no duplicate (parallel) edges. If the input can contain them, use union-find.

## Cycle detection in a directed graph (three colors)

In a directed graph, reaching a visited node is **not** necessarily a cycle (it may belong to a branch that was already finished). Track three states:

| State | Meaning |
|---|---|
| 0 = unvisited (white) | not seen yet |
| 1 = visiting (gray) | on the current DFS path |
| 2 = done (black) | fully explored, known to be cycle-free |

An edge to a **visiting** node is a back edge, which means a cycle. Course Schedule asks exactly this question. O(V + E).

```python run
from collections import defaultdict

def can_finish(num_courses, prerequisites):
    graph = defaultdict(list)
    for course, pre in prerequisites:
        graph[pre].append(course)            # pre -> course
    UNVISITED, VISITING, DONE = 0, 1, 2
    state = [UNVISITED] * num_courses

    def has_cycle(u):
        state[u] = VISITING
        for v in graph[u]:
            if state[v] == VISITING:
                return True                  # back edge
            if state[v] == UNVISITED and has_cycle(v):
                return True
        state[u] = DONE
        return False

    return not any(state[u] == UNVISITED and has_cycle(u)
                   for u in range(num_courses))

print(can_finish(2, [[1, 0]]))               # True
print(can_finish(2, [[1, 0], [0, 1]]))       # False
print(can_finish(4, [[1, 0], [2, 0], [3, 1], [3, 2]]))   # True (diamond, no cycle)
```

## Topological sort (Kahn's algorithm)

A topological order lists the nodes of a **DAG** so that every edge `u → v` has `u` before `v`: an order to take courses, build packages or run tasks.

Kahn's algorithm (BFS):
1. Count the **indegree** (incoming edges) of every node.
2. Queue every node with indegree 0.
3. Pop a node, append it to the order, decrement each neighbour's indegree; enqueue neighbours that reach 0.
4. If the order contains fewer than n nodes, the remaining nodes are on a **cycle** (no valid order).

O(V + E). Uses: Course Schedule I/II, Alien Dictionary, build order, parallel task scheduling (each BFS level = one round).

```python run
from collections import defaultdict, deque

def topo_sort(n, edges):
    graph = defaultdict(list)
    indegree = [0] * n
    for u, v in edges:                     # u must come before v
        graph[u].append(v)
        indegree[v] += 1
    queue = deque(i for i in range(n) if indegree[i] == 0)
    order = []
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in graph[u]:
            indegree[v] -= 1
            if indegree[v] == 0:
                queue.append(v)
    return order if len(order) == n else []   # [] means there is a cycle

print(topo_sort(4, [[0, 1], [0, 2], [1, 3], [2, 3]]))   # [0, 1, 2, 3]
print(topo_sort(3, [[0, 1], [1, 2], [2, 0]]))           # [] (cycle)

def find_order(num_courses, prerequisites):              # Course Schedule II
    return topo_sort(num_courses, [[pre, course] for course, pre in prerequisites])
print(find_order(4, [[1, 0], [2, 0], [3, 1], [3, 2]]))   # [0, 1, 2, 3]
```

Watch the edge direction: in Course Schedule `[a, b]` means "take b **before** a", so the edge is `b → a`.

## Union-find (disjoint set union)

Union-find maintains groups of nodes under two operations:
- `find(x)`: the representative (root) of x's group
- `union(a, b)`: merge the two groups; it returns False if they were already the same group

With **path compression** (point nodes directly at the root during `find`) and **union by rank** (attach the shorter tree under the taller), each operation is effectively O(1): amortized O(α(n)), where α is the inverse Ackermann function.

Use it when edges arrive one at a time and you need connectivity: number of components, Redundant Connection (the first edge whose union fails), Graph Valid Tree, Number of Provinces, Accounts Merge, Kruskal's MST.

```python run
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.components = n

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])   # path compression
        return self.parent[x]

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False                 # already connected: this edge forms a cycle
        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra              # union by rank: ra is the taller tree
        self.parent[rb] = ra
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1
        self.components -= 1
        return True

uf = UnionFind(5)
for a, b in [[0, 1], [1, 2], [3, 4]]:
    uf.union(a, b)
print(uf.components)                     # 2
print(uf.find(0) == uf.find(2), uf.find(0) == uf.find(3))   # True False

def redundant_connection(edges):
    uf = UnionFind(len(edges) + 1)       # nodes are 1..n
    for a, b in edges:
        if not uf.union(a, b):
            return [a, b]

print(redundant_connection([[1, 2], [1, 3], [2, 3]]))           # [2, 3]
print(redundant_connection([[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]]))   # [1, 4]
```

## Cloning a graph (old → new map)

To deep-copy a graph (Clone Graph), keep a dict from each original node to its copy. The dict doubles as the visited set and handles cycles: create the copy **before** recursing into neighbours.

```python
def clone_graph(node):
    copies = {}                         # original -> clone
    def dfs(u):
        if u in copies:
            return copies[u]
        clone = Node(u.val)
        copies[u] = clone               # register before recursing (cycles!)
        clone.neighbors = [dfs(v) for v in u.neighbors]
        return clone
    return dfs(node) if node else None
```

The same old → new mapping pattern solves Copy List with Random Pointer.

## Graph complexity and pitfalls

| Algorithm | Time | Space |
|---|---|---|
| DFS / BFS (adjacency list) | O(V + E) | O(V) |
| Grid DFS / BFS | O(R × C) | O(R × C) |
| Topological sort (Kahn) | O(V + E) | O(V) |
| Union-find, m operations | O(m · α(n)), about O(m) | O(n) |
| Dijkstra (heap) | O((V + E) log V) | O(V) |

- **Forgetting `visited`:** leads to infinite loops on cycles and exponential blowup.
- **BFS marked at dequeue:** duplicates in the queue; mark when enqueuing.
- **Missing isolated nodes:** iterate `range(n)`, not `graph`.
- **Undirected edges added one way only:** add `graph[a]` *and* `graph[b]`.
- **Wrong edge direction** in prerequisite problems: read `[a, b]` carefully.
- **Grid bounds:** check `0 <= nr < rows and 0 <= nc < cols` before indexing; negative indices wrap silently.
- **Recursion limit** on large graphs/grids: use iterative DFS or BFS.
- **Mutating the input grid** to mark visited is usually fine, but say so out loud or ask first.
