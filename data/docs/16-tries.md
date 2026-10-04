---
title: Tries
group: Data Structures
summary: Prefix trees - node structure with a children dict and end flag, insert/search/startsWith in O(L), wildcard search, Word Search II, and when a trie beats a set.
keywords: [trie, prefix tree, trienode, children, is_end, insert, search, startswith, prefix, autocomplete, word dictionary, wildcard, add and search word, word search ii, board, dfs, backtracking]
---

A trie (prefix tree) stores strings character by character along paths from the root. Every word that shares a prefix shares the same path, so "does any word start with `pre`?" costs O(len(prefix)), however many words are stored.

## When to use a trie

Reach for a trie when the problem is about **prefixes**, or when you match **many words at once** against a structure:

- **Prefix queries:** `startsWith`, autocomplete, "how many words have this prefix", Longest Common Prefix of many strings.
- **Searching a board for many words** (Word Search II): one DFS walks the trie and the board together, pruning dead prefixes immediately instead of searching once per word.
- **Wildcard matching** of fixed patterns (Design Add and Search Words Data Structure, `.` matches any letter).
- **Replace words by shortest root**, word-break style dictionary scans character by character.

When a trie is overkill: exact-match lookups only, where a `set` of words gives O(L) hashing with far less code.

## TrieNode: children dict and end flag

Each node has:
- `children`: a dict mapping a character to the child node
- `is_end`: True if a complete word ends **at this node**

The `is_end` flag is what distinguishes the **word** `"app"` from a mere **prefix** of `"apple"`.

```python
class TrieNode:
    def __init__(self):
        self.children = {}      # char -> TrieNode
        self.is_end = False     # does a word end here?
```

The root is an empty node that represents the empty prefix.

## Insert, search and startsWith

All three walk down from the root one character at a time:

- **insert(word):** create missing children along the way, then set `is_end = True` on the last node.
- **search(word):** follow the path; fail on a missing child; at the end, return `node.is_end`.
- **startsWith(prefix):** same walk, but return True as soon as the path exists, whether or not a word ends there.

```python run
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.is_end = True

    def _walk(self, s):
        node = self.root
        for ch in s:
            if ch not in node.children:
                return None
            node = node.children[ch]
        return node

    def search(self, word):
        node = self._walk(word)
        return node is not None and node.is_end

    def starts_with(self, prefix):
        return self._walk(prefix) is not None

trie = Trie()
trie.insert("apple")
print(trie.search("apple"))      # True
print(trie.search("app"))        # False: only a prefix so far
print(trie.starts_with("app"))   # True
trie.insert("app")
print(trie.search("app"))        # True
print(trie.starts_with("b"))     # False
```

## Complexity

Let L be the length of the word or prefix.

| Operation | Time | Space |
|---|---|---|
| `insert(word)` | O(L) | O(L) new nodes at most |
| `search(word)` | O(L) | O(1) |
| `startsWith(prefix)` | O(L) | O(1) |
| Build from words | O(total characters) | O(total characters) worst case |

Compare with a `set` of words: exact lookup is also O(L) (to hash), but a prefix query over a set means scanning every word: O(n · L).

## Compact trie with nested dicts

In an interview you can skip the node class: each node is a plain dict, and a special key such as `"$"` marks the end of a word (choose a key that can't be a real character). `setdefault` makes insertion one line per character.

Storing the **whole word** at the end node (`node["$"] = word`) is handy when you need to report the words you find (Word Search II).

```python run
def build_trie(words):
    root = {}
    for word in words:
        node = root
        for ch in word:
            node = node.setdefault(ch, {})
        node["$"] = word                   # end marker (stores the word)
    return root

def search(root, word):
    node = root
    for ch in word:
        if ch not in node:
            return False
        node = node[ch]
    return "$" in node

def words_with_prefix(root, prefix):       # autocomplete
    node = root
    for ch in prefix:
        if ch not in node:
            return []
        node = node[ch]
    found, stack = [], [node]
    while stack:
        cur = stack.pop()
        for key, child in cur.items():
            if key == "$":
                found.append(child)
            else:
                stack.append(child)
    return sorted(found)

root = build_trie(["car", "card", "care", "cat", "dog"])
print(search(root, "car"), search(root, "ca"))    # True False
print(words_with_prefix(root, "car"))             # ['car', 'card', 'care']
print(words_with_prefix(root, "z"))               # []
```

## Children as a 26-slot array vs a dict

| Children | Pros | Cons |
|---|---|---|
| `dict` | only stores existing children; any alphabet; simple code | slightly more overhead per lookup |
| `[None] * 26` | direct indexing with `ord(c) - ord('a')`; fixed order, so traversal is alphabetical | 26 slots per node even if mostly empty; lowercase only |

In Python, the dict version is usually just as fast and much shorter. Use the array when you need children in sorted order without sorting.

```python
class TrieNode:
    def __init__(self):
        self.children = [None] * 26
        self.is_end = False

idx = ord(ch) - ord("a")
if node.children[idx] is None:
    node.children[idx] = TrieNode()
node = node.children[idx]
```

## Wildcard search (Add and Search Words)

When a query may contain `.` (any letter), a single path is no longer enough. At a `.`, **try every child** recursively. Other characters follow the normal path.

Worst case is O(26^k · L) for k wildcards, but in practice the trie prunes most branches.

```python run
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class WordDictionary:
    def __init__(self):
        self.root = TrieNode()

    def add_word(self, word):
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
        node.is_end = True

    def search(self, word):
        def dfs(node, i):
            if i == len(word):
                return node.is_end
            ch = word[i]
            if ch == ".":
                return any(dfs(child, i + 1) for child in node.children.values())
            child = node.children.get(ch)
            return child is not None and dfs(child, i + 1)
        return dfs(self.root, 0)

wd = WordDictionary()
for w in ["bad", "dad", "mad"]:
    wd.add_word(w)
print(wd.search("pad"))    # False
print(wd.search("bad"))    # True
print(wd.search(".ad"))    # True
print(wd.search("b.."))    # True
print(wd.search("b."))     # False: no 2-letter word
```

## Word Search II (trie + board DFS)

Find every dictionary word that can be traced on a grid of letters. Searching the board separately for each word repeats work. Instead, build a trie of all words and run **one DFS per starting cell**, moving through the board and the trie **together**: stop as soon as the current path is not a prefix of any word.

Key tricks:
- Store the full word at its end node, so a match can be reported without rebuilding the string.
- **Remove the word after finding it** (`node.pop("$")`) to avoid duplicates.
- **Prune** empty trie branches after exploring them, so later searches skip them.
- Mark the cell visited (`"#"`) during the DFS and restore it afterwards (backtracking).

```python run
def find_words(board, words):
    root = {}
    for w in words:
        node = root
        for ch in w:
            node = node.setdefault(ch, {})
        node["$"] = w

    rows, cols = len(board), len(board[0])
    found = []

    def dfs(r, c, parent):
        ch = board[r][c]
        node = parent[ch]
        if "$" in node:
            found.append(node.pop("$"))    # report once
        board[r][c] = "#"                  # mark visited
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and board[nr][nc] in node:
                dfs(nr, nc, node)
        board[r][c] = ch                   # restore
        if not node:
            parent.pop(ch)                 # prune exhausted branch

    for r in range(rows):
        for c in range(cols):
            if board[r][c] in root:
                dfs(r, c, root)
    return found

board = [["o", "a", "a", "n"],
         ["e", "t", "a", "e"],
         ["i", "h", "k", "r"],
         ["i", "f", "l", "v"]]
print(sorted(find_words(board, ["oath", "pea", "eat", "rain"])))   # ['eat', 'oath']
print(find_words([["a", "b"], ["c", "d"]], ["abdc", "abcd"]))      # ['abdc']
```

## Trie pitfalls

- **Forgetting the end flag:** without `is_end` (or `"$"`), `search("app")` wrongly succeeds after inserting `"apple"`.
- **Confusing `search` and `startsWith`:** they share the walk; only `search` checks the end flag.
- **Mutable default arguments:** `def __init__(self, children={})` shares one dict across all nodes. Create `{}` inside `__init__`.
- **End-marker collisions:** with nested dicts, choose a marker key such as `"$"` that cannot appear as a real character.
- **Duplicates in Word Search II:** remove or clear the word at its end node once it has been found.
- **Memory:** tries can use a lot of memory for many long, dissimilar words; mention this trade-off if asked.
