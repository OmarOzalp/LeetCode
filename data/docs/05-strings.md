---
title: Strings
group: Python Essentials
summary: String methods, immutability and efficient building with join, character arithmetic with ord/chr, 26-slot counting arrays, slicing and f-strings.
keywords: [string, str, split, join, strip, lower, upper, isdigit, isalpha, isalnum, startswith, endswith, find, index, replace, immutable, ord, chr, reverse, palindrome, slicing, f-string, format, character count, anagram, ascii_lowercase]
---

Strings in Python are **immutable** sequences of characters. Most string problems come down to scanning characters, counting them, or building a new string efficiently.

## Strings are immutable

You cannot change a character in place: `s[0] = "x"` raises `TypeError`. Every "modifying" method (`replace`, `upper`, `strip`, slicing, `+`) returns a **new** string.

When you need to edit characters (swap, overwrite, reverse in place), convert to a list, edit it, then join back:

```python run
s = "hello"
try:
    s[0] = "j"
except TypeError as e:
    print("TypeError:", e)
chars = list(s)
chars[0] = "j"
chars[1], chars[4] = chars[4], chars[1]
print("".join(chars))           # jolle: edits done on the list
print(s.upper(), s)             # s itself never changes
```

## Building strings: list + join, not +=

Because strings are immutable, `result += ch` may copy the whole string every time, so a loop of n appends can cost **O(n²)**. (CPython sometimes optimizes this, but it is not guaranteed and interviewers expect the idiomatic version.)

The standard pattern: collect pieces in a list (O(1) appends), then `"".join(pieces)` once (O(total length)).

```python run
pieces = []
for i in range(5):
    pieces.append(str(i))
print("".join(pieces))                 # 01234
print(", ".join(["a", "b", "c"]))      # a, b, c
print("-".join(map(str, [1, 2, 3])))   # join needs strings
try:
    "".join([1, 2])
except TypeError as e:
    print("TypeError:", e)
```

## split()

- `s.split()` with **no argument** splits on any run of whitespace and drops empty strings. This is what you want for "words in a sentence".
- `s.split(",")` splits on an exact separator and **keeps** empty strings between consecutive separators.
- `s.split(sep, 1)` limits the number of splits.

```python run
print("the sky  is blue".split())        # ['the', 'sky', 'is', 'blue']
print("the sky  is blue".split(" "))     # keeps '' for the double space
print("a,b,,c".split(","))               # ['a', 'b', '', 'c']
print("key=value=x".split("=", 1))       # ['key', 'value=x']
words = "  the sky is   blue ".split()
print(" ".join(reversed(words)))         # Reverse Words in a String
```

## join()

`sep.join(iterable_of_strings)` concatenates with `sep` between items in O(total length). It is the inverse of `split`.

- `"".join(chars)` turns a list of characters back into a string.
- `"".join(sorted(s))` builds a sorted signature (anagram key).
- Every item must already be a string: use `map(str, nums)` for numbers.

```python run
chars = ["c", "a", "t"]
print("".join(chars))
print("".join(sorted("listen")) == "".join(sorted("silent")))
print(" ".join(map(str, [3, 1, 4])))
print("/".join(["usr", "local", "bin"]))
```

## strip(), lstrip() and rstrip()

Remove leading/trailing whitespace (or any characters you list). Useful when parsing input or cleaning tokens.

```python run
print(repr("  hi  ".strip()), repr("  hi  ".lstrip()), repr("  hi  ".rstrip()))
print("xxhixx".strip("x"))          # strip specific characters
print("0012300".lstrip("0"))        # remove leading zeros
print("...end!!".rstrip("!."))      # any of the listed characters
```

`strip("abc")` removes any of those *characters* from the ends, not the substring `"abc"`.

## lower() and upper()

Return a new string in lower/upper case. Normalize case before comparing when the problem says "case-insensitive" (Valid Palindrome).

- `c.islower()`, `c.isupper()` test a character.
- `s.lower() == s.lower()[::-1]` is a case-insensitive palindrome check (for already-clean input).

```python run
s = "Hello World"
print(s.lower(), s.upper(), s.swapcase())
print("a".islower(), "A".isupper(), "aB".islower())
print(sorted(["banana", "Apple", "cherry"], key=str.lower))
```

## isdigit(), isalpha() and isalnum()

Character-class tests that return True only for **non-empty** strings where every character matches.

| Method | True for |
|---|---|
| `c.isdigit()` | `"0"`–`"9"` |
| `c.isalpha()` | letters |
| `c.isalnum()` | letters or digits |
| `c.isspace()` | spaces, tabs, newlines |

Typical uses: skip punctuation in Valid Palindrome, parse numbers in String to Integer (atoi) and Basic Calculator, validate tokens.

Pitfall: `"-7".isdigit()` and `"3.5".isdigit()` are False. Handle the sign yourself, or use `try: int(s)`.

```python run
def is_palindrome(s):
    l, r = 0, len(s) - 1
    while l < r:
        while l < r and not s[l].isalnum():
            l += 1
        while l < r and not s[r].isalnum():
            r -= 1
        if s[l].lower() != s[r].lower():
            return False
        l += 1
        r -= 1
    return True

print(is_palindrome("A man, a plan, a canal: Panama"))   # True
print(is_palindrome("race a car"))                       # False
print("7".isdigit(), "-7".isdigit(), "a1".isalnum(), "ab".isalpha(), "".isalpha())
```

## startswith() and endswith()

Prefix and suffix checks; both accept a tuple of options. Cleaner and safer than slicing (`s[:len(p)] == p`).

```python run
url = "https://example.com/index.html"
print(url.startswith("https"), url.endswith((".html", ".htm")))
print("interview".startswith("view", 5))   # check from index 5
words = ["apple", "apricot", "banana"]
print([w for w in words if w.startswith("ap")])
```

For many prefix queries over a large word list, a **trie** is faster (see *Tries*).

## find(), index(), count() and in

| Expression | Found | Not found |
|---|---|---|
| `sub in s` | `True` | `False` |
| `s.find(sub)` | first index | `-1` |
| `s.index(sub)` | first index | raises `ValueError` |
| `s.rfind(sub)` | last index | `-1` |
| `s.count(sub)` | non-overlapping count | `0` |

All are O(n·m) worst case for an n-length string and m-length pattern (fast in practice). `s.find(sub, start)` searches from `start`, which is handy for parsing formats like Encode and Decode Strings:

```python run
def encode(strs):
    return "".join(f"{len(s)}#{s}" for s in strs)

def decode(data):
    res, i = [], 0
    while i < len(data):
        j = data.find("#", i)          # end of the length prefix
        length = int(data[i:j])
        res.append(data[j + 1:j + 1 + length])
        i = j + 1 + length
    return res

encoded = encode(["lint", "co#de", "", "you"])
print(encoded)
print(decode(encoded))
print("hello".find("l"), "hello".rfind("l"), "hello".find("z"), "ll" in "hello")
```

## replace()

`s.replace(old, new)` returns a new string with **every** occurrence replaced; `s.replace(old, new, count)` limits replacements. O(n).

```python run
print("a-b-c".replace("-", ""))         # remove characters
print("a-b-c".replace("-", "+", 1))     # only the first one
print("1.1.1.1".replace(".", "[.]"))    # Defanging an IP Address
```

## Character arithmetic with ord() and chr()

`ord(c) - ord('a')` maps `'a'..'z'` to `0..25`. That index can address a 26-slot array, encode a bitmask, or shift letters.

- Letter index: `ord(c) - ord('a')`
- Back to a letter: `chr(i + ord('a'))`
- Digit value: `ord(c) - ord('0')`
- Bitmask of letters in a word: `mask |= 1 << (ord(c) - ord('a'))`

```python run
c = "d"
i = ord(c) - ord("a")
print(i, chr(i + ord("a")))
print(chr((ord("y") - ord("a") + 3) % 26 + ord("a")))   # shift with wrap: 'b'
mask = 0
for ch in "abcz":
    mask |= 1 << (ord(ch) - ord("a"))
print(bin(mask))
num = 0
for ch in "407":                    # parse digits manually (atoi)
    num = num * 10 + (ord(ch) - ord("0"))
print(num)
```

## Counting characters with a 26-slot array

When the input is limited to lowercase English letters, a fixed `[0] * 26` array is a fast, O(1)-space alternative to a dict or `Counter`.

- Anagram check: increment for `s`, decrement for `t`, verify all zeros.
- `tuple(count)` is hashable, so it can be a dict key (Group Anagrams in O(n·L)).
- Comparing two 26-arrays is O(26) = O(1), which is ideal for sliding-window anagram problems (Permutation in String).

```python run
def is_anagram(s, t):
    if len(s) != len(t):
        return False
    count = [0] * 26
    for a, b in zip(s, t):
        count[ord(a) - ord("a")] += 1
        count[ord(b) - ord("a")] -= 1
    return all(c == 0 for c in count)

def signature(word):
    count = [0] * 26
    for ch in word:
        count[ord(ch) - ord("a")] += 1
    return tuple(count)

print(is_anagram("anagram", "nagaram"), is_anagram("rat", "car"))
print(signature("eat") == signature("tea"))
```

## Reversing and slicing strings

Slicing works exactly like lists and returns a new string in O(k).

- Reverse: `s[::-1]`
- Palindrome check: `s == s[::-1]` (O(n) time and extra space; two pointers avoid the copy)
- Substring: `s[i:j]` (j excluded); all substrings is O(n²) of them, each O(n) to copy
- Last k characters: `s[-k:]`

```python run
s = "racecar"
print(s[::-1], s == s[::-1])
t = "interview"
print(t[:5], t[5:], t[-4:], t[1:4])
print([t[i:i + 3] for i in range(len(t) - 2)][:4])   # windows of length 3
```

## Iterating over characters

- `for ch in s:` for characters
- `for i, ch in enumerate(s):` when the position matters
- `for a, b in zip(s, t):` to compare two strings position by position
- `for i in range(len(s)):` when you need neighbours (`s[i - 1]`, `s[i + 1]`)

```python run
s, t = "abcd", "abxd"
print([i for i, (a, b) in enumerate(zip(s, t)) if a != b])   # mismatch positions
runs = []
for i, ch in enumerate("aaabccdd"):
    if i == 0 or ch != "aaabccdd"[i - 1]:
        runs.append([ch, 0])
    runs[-1][1] += 1
print(runs)                                                  # run-length groups
```

## f-strings

Formatted string literals: `f"{expr}"` evaluates `expr` inline. Handy for debug prints, building keys and output formatting.

| Format | Example | Output |
|---|---|---|
| value | `f"{x}"` | `42` |
| 2 decimals | `f"{3.14159:.2f}"` | `3.14` |
| zero-pad | `f"{7:03d}"` | `007` |
| binary / hex | `f"{5:b}"`, `f"{255:x}"` | `101`, `ff` |
| align | `f"{'hi':>5}"` | `   hi` |
| debug (3.8+) | `f"{x=}"` | `x=42` |

```python run
name, score = "ann", 92.456
print(f"{name} scored {score:.1f}")
print(f"{7:03d} {5:b} {255:x} {0.25:.0%}")
print(f"[{'left':<6}|{'right':>6}|{'mid':^7}]")
x = 42
print(f"{x=}")
r, c = 2, 3
print(f"{r},{c}")              # string key for a grid cell
```

## Comparing strings

Strings compare **lexicographically** by code point: character by character, with a shorter prefix sorting first.

- `"app" < "apple"`, `"apple" < "banana"`
- Uppercase sorts before lowercase: `"Z" < "a"`; use `key=str.lower` for case-insensitive order.
- `min(s)` / `max(s)` return the smallest / largest character.

```python run
print("apple" < "banana", "app" < "apple", "Z" < "a")
print(sorted(["banana", "Apple", "cherry"]))
print(sorted(["banana", "Apple", "cherry"], key=str.lower))
print(min("hello"), max("hello"))
```

## The string module

Handy constants, mainly to avoid typing the alphabet. Useful for trying every replacement letter (Word Ladder) or validating characters.

```python run
import string
print(string.ascii_lowercase)
print(string.ascii_uppercase)
print(string.digits)
print(string.ascii_letters[:5], string.punctuation[:6])
word = "hit"
neighbors = [word[:i] + c + word[i + 1:] for i in range(len(word))
             for c in string.ascii_lowercase if c != word[i]]
print(len(neighbors), neighbors[:3])
```
