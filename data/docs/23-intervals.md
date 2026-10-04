---
title: Intervals
group: Algorithm Patterns
summary: Sort-then-scan techniques for interval problems, covering overlap checks, merging, inserting, meeting rooms with a heap or sweep line, and the earliest-end greedy.
keywords: [intervals, merge intervals, insert interval, overlap, overlapping, meeting rooms, min heap, sweep line, non-overlapping intervals, sort by start, sort by end, scheduling, calendar, intersection]
---

Most interval problems become easy after one sort. Sorted by start, intervals that overlap sit next to each other, so a single left-to-right scan is enough. Write intervals as `[start, end]`, and decide early whether intervals that only touch at an endpoint count as overlapping.

## When to use interval techniques

Signals in the problem statement:

- The input is a list of `[start, end]` pairs: meetings, bookings, ranges, balloons.
- "**Merge** overlapping ...", "**insert** a new interval", "do any **overlap**?", "**minimum rooms** / platforms / arrows", "remove the **fewest** intervals so the rest don't overlap".

| Problem | Sort by | Technique | Time |
| --- | --- | --- | --- |
| Merge Intervals | start | extend the last merged interval | O(n log n) |
| Insert Interval | already sorted | three phases: before, overlap, after | O(n) |
| Meeting Rooms | start | compare adjacent pairs | O(n log n) |
| Meeting Rooms II | start | min-heap of end times, or a sweep line | O(n log n) |
| Non-overlapping Intervals | **end** | greedy: keep the earliest-ending interval | O(n log n) |
| Interval List Intersections | already sorted | two pointers | O(m + n) |

## Sorting intervals

```python
intervals.sort(key=lambda x: x[0])          # by start: merging, rooms, overlap checks
intervals.sort(key=lambda x: x[1])          # by end: greedy "keep the most intervals"
intervals.sort()                            # lists compare by start, then end
intervals.sort(key=lambda x: (x[0], -x[1])) # start ascending, longer interval first on ties
```

`sort()` sorts in place and returns `None`, so don't write `intervals = intervals.sort()`. Use `sorted(intervals, key=...)` if you need to keep the original order.

## Overlap detection

Two intervals **don't** overlap exactly when one ends before the other starts. Negate that and you get the overlap test:

```python
overlap = a_start < b_end and b_start < a_end     # touching endpoints do NOT overlap
overlap = a_start <= b_end and b_start <= a_end   # touching endpoints DO overlap
```

Their intersection is `[max(starts), min(ends)]`, and it's non-empty when `max(starts) < min(ends)`, or `<=` if touching counts. Once the list is **sorted by start**, you only need to compare each interval's start with the previous end.

Check whether touching endpoints count for the problem in front of you:

| Problem | Are `[1, 2]` and `[2, 3]` in conflict? |
| --- | --- |
| Merge Intervals / Insert Interval | yes, they merge into `[1, 3]` |
| Meeting Rooms / Meeting Rooms II | no, one meeting ends as the next begins |
| Non-overlapping Intervals | no |

```python run
def overlaps(a, b):                 # touching does NOT count
    return a[0] < b[1] and b[0] < a[1]

def overlaps_closed(a, b):          # touching DOES count
    return a[0] <= b[1] and b[0] <= a[1]

def intersection(a, b):             # closed intervals: a shared endpoint gives [x, x]
    start, end = max(a[0], b[0]), min(a[1], b[1])
    return [start, end] if start <= end else None

pairs = [([1, 3], [2, 4]), ([1, 3], [3, 5]), ([1, 2], [4, 5]), ([1, 10], [3, 4])]
for a, b in pairs:
    print(a, b, "| overlap:", overlaps(a, b), "| touching counts:", overlaps_closed(a, b),
          "| intersection:", intersection(a, b))
```

## Merge Intervals

Sort by start. For each interval, if it starts at or before the end of the last merged interval, **extend** that interval, otherwise **append** it as a new one. Use `max` when extending, because the new interval might be entirely inside the last one.

```python run
def merge(intervals):
    intervals.sort(key=lambda x: x[0])
    merged = []
    for start, end in intervals:
        if merged and start <= merged[-1][1]:          # overlaps or touches the last one
            merged[-1][1] = max(merged[-1][1], end)    # max handles containment
        else:
            merged.append([start, end])                # a new list, so the input isn't aliased
    return merged

print(merge([[1, 3], [2, 6], [8, 10], [15, 18]]))  # [[1, 6], [8, 10], [15, 18]]
print(merge([[1, 4], [4, 5]]))                     # [[1, 5]]
print(merge([[1, 10], [2, 3], [4, 5]]))            # [[1, 10]]
print(merge([[5, 6], [1, 2]]))                     # [[1, 2], [5, 6]]
```

O(n log n) for the sort, then O(n) for the scan.

## Insert Interval

The input is already sorted and doesn't overlap, so you don't need to sort again. Make one pass in three phases:

1. Copy the intervals that end **before** the new one starts.
2. **Absorb** every interval that overlaps the new one, widening it to `[min start, max end]`.
3. Copy the rest.

```python run
def insert(intervals, new_interval):
    result = []
    i, n = 0, len(intervals)
    start, end = new_interval
    while i < n and intervals[i][1] < start:          # 1. entirely before
        result.append(intervals[i])
        i += 1
    while i < n and intervals[i][0] <= end:           # 2. overlapping → absorb
        start = min(start, intervals[i][0])
        end = max(end, intervals[i][1])
        i += 1
    result.append([start, end])
    result.extend(intervals[i:])                      # 3. entirely after
    return result

print(insert([[1, 3], [6, 9]], [2, 5]))                             # [[1, 5], [6, 9]]
print(insert([[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], [4, 8]))  # [[1, 2], [3, 10], [12, 16]]
print(insert([], [5, 7]))                                          # [[5, 7]]
print(insert([[1, 5]], [6, 8]))                                    # [[1, 5], [6, 8]]
```

O(n) time. Appending the new interval and calling `merge` also works, but costs O(n log n).

## Meeting Rooms: can one person attend everything?

Sort by start. If any meeting starts **before** the previous one ends, there's a conflict. After sorting, you only need to check neighbors: if a meeting doesn't overlap the one right before it, it can't overlap any earlier one either.

```python run
def can_attend_meetings(intervals):
    intervals.sort(key=lambda x: x[0])
    for i in range(1, len(intervals)):
        if intervals[i][0] < intervals[i - 1][1]:     # starts before the previous one ends
            return False
    return True

print(can_attend_meetings([[0, 30], [5, 10], [15, 20]]))  # False
print(can_attend_meetings([[7, 10], [2, 4]]))             # True
print(can_attend_meetings([[1, 5], [5, 8]]))              # True (back-to-back is fine)
```

## Meeting Rooms II: min-heap of end times

The minimum number of rooms equals the maximum number of meetings running at the same time. Process meetings in order of start time, and keep a **min-heap of the end times** of rooms in use:

- If the earliest-ending room is free by the time this meeting starts (`heap[0] <= start`), reuse it: pop that end time and push the new one.
- Otherwise open a new room by pushing the new end time.

The heap's final size is the number of rooms.

```python run
import heapq

def min_meeting_rooms(intervals):
    intervals.sort(key=lambda x: x[0])
    ends = []                                  # end times of rooms in use (min-heap)
    for start, end in intervals:
        if ends and ends[0] <= start:          # the earliest-ending room is free
            heapq.heapreplace(ends, end)       # pop + push in one step: reuse the room
        else:
            heapq.heappush(ends, end)          # every room is busy → open a new one
    return len(ends)

print(min_meeting_rooms([[0, 30], [5, 10], [15, 20]]))      # 2
print(min_meeting_rooms([[7, 10], [2, 4]]))                 # 1
print(min_meeting_rooms([[1, 5], [2, 6], [3, 7], [5, 8]]))  # 3
```

O(n log n) time, O(n) space.

## Meeting Rooms II: sweep line

Another way: separate the start times from the end times and sort each list. Walk through the starts in order. If the next start comes before the earliest unused end, every room is busy, so add one. Otherwise a meeting has finished, so move to the next end and reuse its room.

The **event** form records `+1` at each start and `-1` at each end, sorts the events, and tracks the running total. Sorting the tuple `(time, -1)` before `(time, +1)` frees a room before the next meeting at that same time takes it.

```python run
def min_rooms_two_lists(intervals):
    starts = sorted(s for s, _ in intervals)
    ends = sorted(e for _, e in intervals)
    rooms = e = 0
    for s in starts:
        if s < ends[e]:
            rooms += 1        # every room in use → open another
        else:
            e += 1            # a meeting ended by time s → reuse its room
    return rooms

def min_rooms_events(intervals):
    events = []
    for s, e in intervals:
        events.append((s, 1))
        events.append((e, -1))     # (t, -1) sorts before (t, 1): free the room first
    rooms = best = 0
    for _, delta in sorted(events):
        rooms += delta
        best = max(best, rooms)
    return best

for meetings in ([[0, 30], [5, 10], [15, 20]], [[1, 5], [2, 6], [3, 7], [5, 8]], [[1, 2], [2, 3]]):
    print(meetings, min_rooms_two_lists(meetings), min_rooms_events(meetings))   # 2 2 / 3 3 / 1 1
```

The event version also answers "how busy is it at each moment?" questions, such as **My Calendar** or **Car Pooling**.

## Non-overlapping Intervals: greedy by end

**Non-overlapping Intervals**: remove the fewest intervals so the rest don't overlap. Equivalently, **keep the most** non-overlapping intervals and remove the others.

Greedy: sort by **end** and always keep the interval that finishes first. It leaves the most room for the intervals after it. If an optimal solution picked some other first interval, you could swap in the earliest-ending one without creating an overlap, so the greedy choice is never worse (an exchange argument).

Sorting by **start** doesn't give this guarantee, as the counterexample below shows.

```python run
def erase_overlap_intervals(intervals):
    intervals = sorted(intervals, key=lambda x: x[1])   # earliest end first
    kept, prev_end = 0, float("-inf")
    for start, end in intervals:
        if start >= prev_end:            # compatible (touching is fine)
            kept += 1
            prev_end = end
    return len(intervals) - kept

def erase_by_start_wrong(intervals):     # naive: sort by start, keep the first of each overlap
    intervals = sorted(intervals)
    kept, prev_end = 0, float("-inf")
    for start, end in intervals:
        if start >= prev_end:
            kept += 1
            prev_end = end
    return len(intervals) - kept

print(erase_overlap_intervals([[1, 2], [2, 3], [3, 4], [1, 3]]))  # 1
print(erase_overlap_intervals([[1, 2], [1, 2], [1, 2]]))          # 2
print(erase_overlap_intervals([[1, 2], [2, 3]]))                  # 0
tricky = [[1, 100], [2, 3], [4, 5]]
print("by end:", erase_overlap_intervals(tricky), "| naive by start:", erase_by_start_wrong(tricky))  # 1 vs 2
```

A sort-by-start version can be fixed: when two intervals overlap, keep the one with the **smaller end** (`prev_end = min(prev_end, end)`). **Minimum Number of Arrows to Burst Balloons** uses the same greedy, except that touching balloons count as overlapping.

## Interval list intersections (two pointers)

You have two lists, each sorted and non-overlapping. Look at the current interval from each list. Their intersection is `[max(starts), min(ends)]` when it isn't empty. Then move past whichever interval **ends first**, because it can't overlap anything later in the other list.

```python run
def interval_intersection(first, second):
    i = j = 0
    result = []
    while i < len(first) and j < len(second):
        start = max(first[i][0], second[j][0])
        end = min(first[i][1], second[j][1])
        if start <= end:
            result.append([start, end])
        if first[i][1] < second[j][1]:     # drop the interval that ends first
            i += 1
        else:
            j += 1
    return result

print(interval_intersection([[0, 2], [5, 10], [13, 23], [24, 25]],
                            [[1, 5], [8, 12], [15, 24], [25, 26]]))
# [[1, 2], [5, 5], [8, 10], [15, 23], [24, 24], [25, 25]]
```

## Common interval mistakes

- **Forgetting to sort**, or sorting by start when the greedy needs end.
- Merging with `merged[-1][1] = end` instead of `max(merged[-1][1], end)`, which breaks when one interval contains the next.
- Getting **touching endpoints** wrong (`<` vs `<=`). Check the problem's examples.
- In Meeting Rooms II, comparing against the **most recently added** room instead of the earliest-ending one (`heap[0]`).
- Writing into the input's inner lists when the caller still uses them. Append new lists such as `[start, end]`.
- Re-sorting in Insert Interval when the input is already sorted, which makes an O(n) problem O(n log n).
