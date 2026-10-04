---
title: Bit Manipulation
group: Algorithm Patterns
summary: Bitwise operators and the handful of tricks that solve bit problems in interviews, including XOR cancelling, clearing the lowest set bit, masks, and 32-bit handling for unbounded Python integers.
keywords: [bit manipulation, bitwise, and, or, xor, not, shift, mask, 0xffffffff, two's complement, bin, bit_count, popcount, lowest set bit, power of two, single number, missing number, number of 1 bits, counting bits, reverse bits, sum of two integers, bitmask]
---

Bit tricks look like magic until you know the few identities behind them. Write numbers in binary on paper, and most of these problems become a single loop.

## Operators at a glance

| Operator | Meaning | Example (`a = 5 = 0b101`, `b = 3 = 0b011`) | Result |
| --- | --- | --- | --- |
| `a & b` | AND: 1 where **both** bits are 1 | `5 & 3` | `1` (`0b001`) |
| `a \| b` | OR: 1 where **either** bit is 1 | `5 \| 3` | `7` (`0b111`) |
| `a ^ b` | XOR: 1 where the bits **differ** | `5 ^ 3` | `6` (`0b110`) |
| `~a` | NOT: flips every bit, which equals `-a - 1` | `~5` | `-6` |
| `a << k` | shift left by k, which multiplies by 2^k | `5 << 1` | `10` (`0b1010`) |
| `a >> k` | shift right by k, which floor-divides by 2^k | `5 >> 1` | `2` (`0b10`) |

**Precedence:** arithmetic binds tighter than shifts, which bind tighter than `&`, then `^`, then `|`. So `1 << i + 1` means `1 << (i + 1)`. Unlike C, Python's comparisons bind *looser* than bitwise operators, so `x & 1 == 0` already means `(x & 1) == 0`. Add parentheses anyway, so readers don't have to remember that.

```python run
a, b = 5, 3
print(f"a      = {a:04b}")
print(f"b      = {b:04b}")
print(f"a & b  = {a & b:04b}  ({a & b})")
print(f"a | b  = {a | b:04b}  ({a | b})")
print(f"a ^ b  = {a ^ b:04b}  ({a ^ b})")
print(f"a << 1 = {a << 1:04b}  ({a << 1})")
print(f"a >> 1 = {a >> 1:04b}  ({a >> 1})")
print(f"~a     = {~a}  (always -a - 1)")
```

## Reading and printing binary

| Task | Code |
| --- | --- |
| to a binary string | `bin(42)` → `'0b101010'`, `f"{42:b}"` → `'101010'` |
| zero-padded to width w | `format(42, "08b")` or `f"{42:08b}"` → `'00101010'` |
| from a binary string | `int("101010", 2)` → `42` |
| binary literal | `0b101010`, and `0b1010_1010` with underscores also works |
| number of bits needed | `(42).bit_length()` → `6` |

`bin()` of a negative number shows a **sign and magnitude** (`'-0b101'`), not two's complement. To see the bit pattern, mask it first: `format(-5 & 0xFF, "08b")`.

```python run
x = 42
print(bin(x), bin(x)[2:], f"{x:b}")     # 0b101010 101010 101010
print(format(x, "08b"))                 # 00101010
print(int("101010", 2), 0b101010)       # 42 42
print(x.bit_length())                   # 6
print(bin(-5))                          # -0b101 (sign + magnitude)
print(format(-5 & 0xFF, "08b"))         # 11111011 (8-bit two's complement view)
```

## x & 1: odd check and reading bits one at a time

`x & 1` is the lowest bit: 1 for odd numbers, 0 for even. Pair it with `x >>= 1` to visit every bit from lowest to highest. For bit `i` alone, use `(x >> i) & 1`.

**Number of 1 Bits**, shifting version:

```python run
def hamming_weight(n):           # n must be non-negative (see the 32-bit entry)
    count = 0
    while n:
        count += n & 1           # look at the lowest bit
        n >>= 1                  # drop it
    return count

print([x for x in range(10) if x & 1])     # [1, 3, 5, 7, 9]: the odd numbers
print(hamming_weight(11))                  # 3   (0b1011)
print(hamming_weight(128))                 # 1   (0b10000000)
print(hamming_weight(4294967293))          # 31  (0b11111111111111111111111111111101)

n = 0b1101
print([(n >> i) & 1 for i in range(4)])    # [1, 0, 1, 1]: bits from lowest to highest
```

## XOR cancels pairs

XOR is like addition without carries. The identities that matter:

- `x ^ x == 0`: a value cancels itself.
- `x ^ 0 == x`.
- XOR is commutative and associative, so the order you combine values in doesn't matter.
- `x ^ y` has a 1 exactly where `x` and `y` differ, so the Hamming distance is the number of 1 bits in `x ^ y`.

XOR everything together, and every value that appears an even number of times disappears.

- **Single Number:** every value appears twice except one. XOR them all, and only the single value is left.
- **Missing Number:** XOR every index `0..n` with every value. Each present number cancels its matching index, leaving the missing one. The sum formula `n * (n + 1) // 2 - sum(nums)` also works, and Python has no overflow to worry about.

```python run
from functools import reduce
from operator import xor

def single_number(nums):
    result = 0
    for x in nums:
        result ^= x
    return result

def missing_number(nums):            # nums contains 0..n with one value missing
    result = len(nums)               # start with index n, which has no slot in the loop
    for i, x in enumerate(nums):
        result ^= i ^ x
    return result

print(single_number([4, 1, 2, 1, 2]))                 # 4
print(missing_number([3, 0, 1]))                      # 2
print(missing_number([9, 6, 4, 2, 3, 5, 7, 0, 1]))    # 8
print(reduce(xor, [7, 3, 7]))                         # 3
print(bin(0b1011 ^ 0b0110).count("1"))                # 3: Hamming distance
```

## x & (x - 1): clear the lowest set bit

Subtracting 1 flips the lowest 1 bit to 0 and every 0 below it to 1. ANDing with the original value then clears exactly that lowest 1 bit.

```
x         = 1011 0100
x - 1     = 1011 0011
x & (x-1) = 1011 0000
```

Uses:

- **Count set bits** (Brian Kernighan's method): repeat `x &= x - 1` until `x == 0`. The loop runs once per 1 bit, not once per bit position.
- **Power of two:** `x > 0 and (x & (x - 1)) == 0`, because a power of two has exactly one 1 bit.

```python run
def count_bits_kernighan(n):
    count = 0
    while n:
        n &= n - 1              # clear the lowest set bit
        count += 1
    return count

def is_power_of_two(n):
    return n > 0 and (n & (n - 1)) == 0

x = 0b10110100
print(f"{x:08b} → {x & (x - 1):08b}")                     # 10110100 → 10110000
print(count_bits_kernighan(x))                            # 4
print([n for n in range(1, 70) if is_power_of_two(n)])    # [1, 2, 4, 8, 16, 32, 64]
```

## x & -x: isolate the lowest set bit

In two's complement, `-x == ~x + 1`, which flips every bit **above** the lowest 1 bit. ANDing with `x` keeps only that lowest 1 bit.

```
x       = 0101 1000
-x      = 1010 1000
x & -x  = 0000 1000
```

Uses: finding the lowest set bit's value or position, Fenwick trees (`i += i & -i`), and splitting numbers into two groups by a bit where two values differ, as in **Single Number III** below.

```python run
x = 0b01011000
low = x & -x
print(f"{x:08b} → {low:08b} (value {low}, index {low.bit_length() - 1})")   # index 3

def single_number_iii(nums):        # two values appear once, every other value twice
    both = 0
    for x in nums:
        both ^= x                   # = a ^ b, which is nonzero because a != b
    diff = both & -both             # a bit that is set in exactly one of a, b
    a = 0
    for x in nums:
        if x & diff:                # split into two groups by that bit
            a ^= x                  # pairs cancel → only a is left
    return sorted([a, both ^ a])

print(single_number_iii([1, 2, 1, 3, 2, 5]))   # [3, 5]
```

## Set, clear, toggle and test bit i

| Operation | Code |
| --- | --- |
| test bit i | `(x >> i) & 1`, or `(x & (1 << i)) != 0` |
| set bit i | `x \| (1 << i)` |
| clear bit i | `x & ~(1 << i)` |
| toggle bit i | `x ^ (1 << i)` |
| mask of the lowest k bits | `(1 << k) - 1` |
| keep only the lowest k bits | `x & ((1 << k) - 1)` |
| clear the lowest set bit | `x & (x - 1)` |
| isolate the lowest set bit | `x & -x` |

```python run
x = 0b1010
i = 2
print(f"start          {x:04b}")
print(f"test bit {i}     {(x >> i) & 1}")              # 0: bit 2 is off
print(f"set bit {i}      {x | (1 << i):04b}")          # 1110
print(f"clear bit 1    {x & ~(1 << 1):04b}")         # 1000
print(f"toggle bit 0   {x ^ (1 << 0):04b}")          # 1011
print(f"low 3 bits     {x & ((1 << 3) - 1):03b}")    # 010

seen = 0                                            # a set of letters stored in one int
for ch in "hello":
    seen |= 1 << (ord(ch) - ord("a"))
print("has 'l':", bool(seen & (1 << (ord("l") - ord("a")))), "| distinct letters:", bin(seen).count("1"))
```

## Counting bits: popcount and Counting Bits

- `bin(x).count("1")` works on every Python 3 version.
- `x.bit_count()` is faster, but only exists on Python **3.10+**. Many judges support it, but check first.

**Counting Bits** asks for the popcount of every number from 0 to n in O(n), using DP over bits:

- `bits[i] = bits[i >> 1] + (i & 1)`: `i` has the bits of `i // 2` plus its own lowest bit.
- `bits[i] = bits[i & (i - 1)] + 1`: `i` has one more bit than `i` with its lowest bit cleared.

```python run
import sys

x = 0b1011_0110
print(bin(x).count("1"))                      # 5
if sys.version_info >= (3, 10):
    print(x.bit_count())                      # 5 (Python 3.10+ only)

def count_bits(n):
    bits = [0] * (n + 1)
    for i in range(1, n + 1):
        bits[i] = bits[i >> 1] + (i & 1)
    return bits

def count_bits_v2(n):
    bits = [0] * (n + 1)
    for i in range(1, n + 1):
        bits[i] = bits[i & (i - 1)] + 1
    return bits

print(count_bits(5))       # [0, 1, 1, 2, 1, 2]
print(count_bits_v2(8))    # [0, 1, 1, 2, 1, 2, 2, 3, 1]
```

## Bitmasks as sets: enumerating subsets

An `n`-bit integer can represent a subset of `n` items, with bit `i` meaning "item `i` is included". Counting from `0` to `2^n - 1` visits every subset. This is an iterative alternative to backtracking for **Subsets**. It also underlies bitmask DP, where the DP state is a set of visited items, which works for `n ≤ ~20`.

```python run
items = ["a", "b", "c"]
n = len(items)
for mask in range(1 << n):                                  # 0 .. 2^n - 1
    subset = [items[i] for i in range(n) if (mask >> i) & 1]
    print(f"{mask:03b}", subset)
```

## Python integers and 32-bit problems

Python integers are **unbounded**. A negative number behaves as if it had an **infinite** run of leading 1 bits (infinite two's complement). This has three consequences:

- `bin(-5)` is `'-0b101'`, which is not a 32-bit pattern.
- `n >> 1` on a negative `n` never reaches 0 (`-1 >> 1 == -1`), so `while n: n >>= 1` loops forever.
- Additions never overflow, so "wrap-around" never happens on its own.

When a problem assumes **32-bit integers** (Number of 1 Bits with negative input, Reverse Bits, Sum of Two Integers), work with the low 32 bits and convert back at the end:

```python
MASK = 0xFFFFFFFF            # 32 one-bits
x &= MASK                    # the 32-bit pattern, as a non-negative int
signed = x if x <= 0x7FFFFFFF else x - (1 << 32)   # or: ~(x ^ MASK)
```

```python run
MASK = 0xFFFFFFFF
MAX_INT = 0x7FFFFFFF

def to_signed32(x):
    x &= MASK
    return x if x <= MAX_INT else x - (1 << 32)

print(-1 & MASK, hex(-1 & MASK))       # 4294967295 0xffffffff: the bit pattern of -1
print(to_signed32(0xFFFFFFFF))         # -1
print(to_signed32(MAX_INT + 1))        # -2147483648: overflow wraps, like in C
print(bin(-5 & MASK).count("1"))       # 31: number of 1 bits in 32-bit -5

n = -1
for _ in range(3):
    n >>= 1
    print("-1 >> 1 =", n)              # stays -1: the loop would never end
print((-8 & MASK) >> 1)                # 2147483644: logical shift on the 32-bit pattern
```

## Reverse Bits

Repeat 32 times: shift `result` left to make room, copy `n`'s lowest bit into it, then shift `n` right. String slicing on a zero-padded binary string also works.

```python run
def reverse_bits(n):
    result = 0
    for _ in range(32):
        result = (result << 1) | (n & 1)    # append n's lowest bit to result
        n >>= 1
    return result

print(reverse_bits(0b00000010100101000001111010011100))   # 964176192
print(reverse_bits(4294967293))                           # 3221225471
print(int(f"{43261596:032b}"[::-1], 2))                   # 964176192 (string version)
```

## Sum of Two Integers (add without + or -)

`a ^ b` is the sum ignoring carries, and `(a & b) << 1` is the carries. Repeat until there are no carries left. In Python you must **mask to 32 bits** on every step. Otherwise a negative operand produces an endless carry that never dies out, and the loop never ends. Convert the result back to a signed value at the end.

```python run
def get_sum(a, b):
    MASK, MAX_INT = 0xFFFFFFFF, 0x7FFFFFFF
    a, b = a & MASK, b & MASK
    while b:
        carry = ((a & b) << 1) & MASK    # where both bits are 1, carry to the left
        a = (a ^ b) & MASK               # sum without the carries
        b = carry
    return a if a <= MAX_INT else ~(a ^ MASK)   # back to a signed Python int

print(get_sum(1, 2))      # 3
print(get_sum(-2, 3))     # 1
print(get_sum(-5, -7))    # -12
print(get_sum(0, -1))     # -1
```

## Interview applications and common mistakes

| Problem | Key trick |
| --- | --- |
| Number of 1 Bits | `n & 1` with `n >>= 1`, or `n &= n - 1` |
| Counting Bits | `bits[i] = bits[i >> 1] + (i & 1)` |
| Reverse Bits | shift the result left, OR in `n & 1`, 32 times |
| Missing Number | XOR indices with values, or the sum formula |
| Sum of Two Integers | XOR + carries, masked to 32 bits |
| Single Number | XOR everything |
| Subsets / bitmask DP | mask `0 .. 2^n - 1`, test with `(mask >> i) & 1` |

Mistakes to avoid:

- Expecting `~x` to flip "32 bits". In Python it gives `-x - 1`. For a 32-bit NOT, use `x ^ 0xFFFFFFFF`.
- Shifting negative numbers right in a `while n:` loop, which never ends. Mask with `0xFFFFFFFF` first.
- Precedence: `1 << i + 1` is `1 << (i + 1)`, and `a + b >> 1` is `(a + b) >> 1`.
- `^` is XOR, not exponentiation. Use `**` for powers.
- Using `int.bit_count()` on a judge older than Python 3.10.
- Forgetting to convert a masked result back to signed.
