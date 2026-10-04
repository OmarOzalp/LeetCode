---
title: Stack
group: Data Structures
summary: Using a Python list as a LIFO stack, with parentheses matching, iterative DFS, monotonic stacks, RPN evaluation, expression parsing and min-stack patterns.
keywords: [stack, lifo, append, pop, peek, push, valid parentheses, brackets, monotonic stack, next greater element, daily temperatures, histogram, reverse polish notation, rpn, calculator, expression, min stack, dfs]
---

A stack is last-in, first-out (LIFO). In Python, a plain `list` is the stack: push with `append`, pop with `pop`. Think "stack" whenever you must match things with the **most recent** unmatched item, or undo/backtrack in reverse order.

## Python list as a stack

| Operation | Code | Time |
|---|---|---|
| Push | `stack.append(x)` | O(1) amortized |
| Pop | `x = stack.pop()` | O(1) |
| Peek (top) | `stack[-1]` | O(1) |
| Empty? | `if not stack:` | O(1) |
| Size | `len(stack)` | O(1) |

```python run
stack = []
stack.append(1)
stack.append(2)
stack.append(3)
print(stack[-1])        # 3  peek
print(stack.pop())      # 3
print(stack.pop())      # 2
print(len(stack), bool(stack))
stack.pop()
print("empty" if not stack else "not empty")
```

`collections.deque` also works as a stack (`append` / `pop`), but a list is the standard choice.

## Empty checks and safe peeking

`stack.pop()` and `stack[-1]` both raise `IndexError` on an empty stack. Always guard them, and put the emptiness check **first** so `and` short-circuits:

```python
if stack and stack[-1] == "(":
    stack.pop()

while stack and nums[stack[-1]] < x:   # monotonic stack loop
    stack.pop()
```

At the end of a matching problem, `return not stack` checks that nothing is left unmatched.

## Valid Parentheses

Push opening brackets; on a closing bracket, the top of the stack must be its matching opener. Map **closer → opener** in a dict. O(n) time, O(n) space.

Two failure cases people forget: a closer arriving when the stack is empty, and openers left over at the end.

```python run
def is_valid(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in pairs:                            # closing bracket
            if not stack or stack[-1] != pairs[ch]:
                return False
            stack.pop()
        else:
            stack.append(ch)
    return not stack                               # leftovers are unmatched

for s in ["()[]{}", "([)]", "{[]}", "((", "]"]:
    print(s, is_valid(s))
```

## Iterative DFS with a stack

Recursion uses the call stack implicitly; an explicit stack does the same thing without hitting Python's recursion limit (about 1000 frames). Pop a node, process it, push its neighbours.

- Push neighbours in **reverse** if you want to visit them in their listed order.
- Either mark nodes visited when popped (check and `continue`) or when pushed; be consistent.

```python run
graph = {"A": ["B", "C"], "B": ["D"], "C": ["E"], "D": [], "E": ["A"]}
stack, visited, order = ["A"], set(), []
while stack:
    node = stack.pop()
    if node in visited:
        continue
    visited.add(node)
    order.append(node)
    for nxt in reversed(graph[node]):    # so "B" is explored before "C"
        if nxt not in visited:
            stack.append(nxt)
print(order)                              # ['A', 'B', 'D', 'C', 'E']
```

## Monotonic stack: next greater element

A **monotonic stack** keeps its elements in sorted order (for example, decreasing from bottom to top). When a new element breaks the order, everything it pops has just found its **next greater element**: the new one.

- Store **indices**, not values, so you can write answers into a result array and compute distances.
- Each index is pushed and popped once, so the whole scan is **O(n)** even with the inner `while`.

```python run
def next_greater(nums):
    result = [-1] * len(nums)
    stack = []                         # indices whose answer is still unknown
    for i, x in enumerate(nums):
        while stack and nums[stack[-1]] < x:
            result[stack.pop()] = x    # x is the next greater for that index
        stack.append(i)
    return result

def daily_temperatures(temps):
    answer = [0] * len(temps)
    stack = []
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop()
            answer[j] = i - j          # days waited
        stack.append(i)
    return answer

print(next_greater([2, 1, 2, 4, 3]))                          # [4, 2, 4, -1, -1]
print(daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73]))   # [1, 1, 4, 2, 1, 1, 0, 0]
```

### Choosing the variant

| Want | Pop while top is… | Stack order (bottom → top) |
|---|---|---|
| Next greater | `< x` | decreasing |
| Next greater or equal | `<= x` | strictly decreasing |
| Next smaller | `> x` | increasing |
| Previous greater | pop `<= x`; the answer is `stack[-1]` after popping | decreasing |

For a **circular** array (Next Greater Element II), loop `i` over `range(2 * n)` and use `nums[i % n]`.

## Monotonic stack: largest rectangle in a histogram

An **increasing** stack finds, for each bar, how far it can extend left and right before hitting a shorter bar. When a shorter bar arrives, popped bars cannot extend further right, so compute their areas then. O(n).

```python run
def largest_rectangle(heights):
    stack = []                    # (start index, height), heights increasing
    best = 0
    for i, h in enumerate(heights):
        start = i
        while stack and stack[-1][1] > h:
            idx, height = stack.pop()
            best = max(best, height * (i - idx))
            start = idx           # the new bar can extend back to here
        stack.append((start, h))
    for idx, height in stack:     # bars that reach the right edge
        best = max(best, height * (len(heights) - idx))
    return best

print(largest_rectangle([2, 1, 5, 6, 2, 3]))   # 10
print(largest_rectangle([2, 4]))               # 4
```

## Evaluate Reverse Polish Notation

In RPN (postfix), operands come first and the operator applies to the two most recent values. Push numbers; on an operator, pop **right operand first**, then left.

Pitfalls:
- `b = stack.pop()` then `a = stack.pop()`; compute `a - b` and `a / b`, not the reverse.
- Division must **truncate toward zero**: use `int(a / b)`, not `a // b` (which floors: `-7 // 2 == -4`).
- A token like `"-11"` is a number, not the `-` operator. Compare against the operator set instead of checking the first character.

```python run
def eval_rpn(tokens):
    stack = []
    for tok in tokens:
        if tok in {"+", "-", "*", "/"}:
            b = stack.pop()
            a = stack.pop()
            if tok == "+":
                stack.append(a + b)
            elif tok == "-":
                stack.append(a - b)
            elif tok == "*":
                stack.append(a * b)
            else:
                stack.append(int(a / b))     # truncate toward zero
        else:
            stack.append(int(tok))
    return stack[0]

print(eval_rpn(["2", "1", "+", "3", "*"]))     # (2 + 1) * 3 = 9
print(eval_rpn(["4", "13", "5", "/", "+"]))    # 4 + 13 / 5 = 6
print(eval_rpn(["10", "6", "9", "3", "+", "-11", "*", "/", "*", "17", "+", "5", "+"]))  # 22
```

## Expression parsing (Basic Calculator)

For infix expressions with `+ - * /` and no parentheses (Basic Calculator II), keep a stack of **terms** to be summed at the end:

- `+num` → push `num`; `-num` → push `-num`
- `*` or `/` → pop the previous term, combine it with `num`, push the result (this gives `*` and `/` higher precedence)

Process an operator when you reach the **next** operator or the end of the string, because only then is the number complete. Multi-digit numbers are built with `num = num * 10 + int(ch)`.

```python run
def calculate(s):
    stack, num, op = [], 0, "+"
    for i, ch in enumerate(s):
        if ch.isdigit():
            num = num * 10 + int(ch)
        if ch in "+-*/" or i == len(s) - 1:
            if op == "+":
                stack.append(num)
            elif op == "-":
                stack.append(-num)
            elif op == "*":
                stack.append(stack.pop() * num)
            else:
                stack.append(int(stack.pop() / num))   # truncate toward zero
            op, num = ch, 0
    return sum(stack)

print(calculate("3+2*2"))      # 7
print(calculate(" 3/2 "))      # 1
print(calculate("14-3/2"))     # 13
```

With **parentheses** (Basic Calculator I), push the running result and sign onto a stack at `(` and pop them back at `)`.

## Min Stack

Support `push`, `pop`, `top` and `get_min` all in O(1): store each value together with the minimum **at the time it was pushed**. When you pop, the previous minimum is automatically restored.

```python run
class MinStack:
    def __init__(self):
        self.stack = []                 # (value, min so far)

    def push(self, val):
        current_min = min(val, self.stack[-1][1]) if self.stack else val
        self.stack.append((val, current_min))

    def pop(self):
        self.stack.pop()

    def top(self):
        return self.stack[-1][0]

    def get_min(self):
        return self.stack[-1][1]

s = MinStack()
for v in [5, 3, 7, 2]:
    s.push(v)
print(s.get_min())          # 2
s.pop()
print(s.get_min(), s.top()) # 3 7
```

## When to think "stack"

- **Matching / nesting:** brackets, tags, nested structures (Decode String `3[a2[c]]`).
- **Most recent first:** undo, backspace processing (Backspace String Compare), simplifying file paths (`..` pops a directory).
- **Next greater / smaller, spans, histogram areas:** monotonic stack.
- **Postfix / infix evaluation:** RPN, calculators.
- **DFS without recursion**, including iterative tree traversals.

```python run
def simplify_path(path):
    stack = []
    for part in path.split("/"):
        if part == "..":
            if stack:
                stack.pop()
        elif part and part != ".":
            stack.append(part)
    return "/" + "/".join(stack)

print(simplify_path("/a/./b/../../c/"))   # /c
print(simplify_path("/home//foo/"))       # /home/foo
```
