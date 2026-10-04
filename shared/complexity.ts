/**
 * Tiny Big-O expression evaluator used to compare complexities such as
 * "O(n²)", "O(n log n)", "O(m · n)", "O(V + E)" or "O(2^n)".
 *
 * Every variable is treated as the same large size N, so the result is a
 * rough growth score: good enough to say "quadratic is worse than linear",
 * which is all the comparison UI needs.
 */

const N = 64;

type Token = { t: "num"; v: number } | { t: "id"; v: string } | { t: "op"; v: string };

function normalize(expr: string): string | null {
  const m = /O\s*\(([^]*)\)/.exec(expr);
  let s = (m ? m[1] : expr).trim();
  // If there are several O(...) terms ("O(L) insert, O(N · L) startsWith"), keep the first.
  const close = findClosingParen(s);
  if (close >= 0) s = s.slice(0, close);
  s = s
    .replace(/α\s*\([^)]*\)/g, "1") // inverse Ackermann: effectively constant
    .replace(/φ/g, "1.618")
    .replace(/σ|Σ/g, "26") // alphabet size
    .replace(/ⁿ/g, "^n")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/[·×⋅∙]/g, "*")
    .replace(/√\s*\(?([a-zA-Z0-9]+)\)?/g, "sqrt($1)")
    .replace(/log₂|log2|lg/g, "log")
    .replace(/\blog\s+([a-zA-Z0-9]+)/g, "log($1)")
    .replace(/\bln\b/g, "log")
    .replace(/[—–]/g, "-");
  if (!s) return null;
  return s;
}

function findClosingParen(s: string): number {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")") {
      if (depth === 0) return i;
      depth--;
    }
  }
  return -1;
}

function tokenize(s: string): Token[] | null {
  const out: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      out.push({ t: "num", v: parseFloat(s.slice(i, j)) });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-zA-Z_0-9]/.test(s[j])) j++;
      out.push({ t: "id", v: s.slice(i, j) });
      i = j;
      continue;
    }
    if ("+-*/^()!,".includes(c)) {
      out.push({ t: "op", v: c });
      i++;
      continue;
    }
    // unknown character (e.g. "?" or a word in prose) -> give up
    return null;
  }
  return out;
}

/** Recursive-descent parser over log-space values (log of the magnitude). */
class Parser {
  private i = 0;
  constructor(private readonly toks: Token[]) {}

  parse(): number | null {
    const v = this.expr();
    if (v === null || this.i !== this.toks.length) return null;
    return v;
  }

  private peek(): Token | undefined {
    return this.toks[this.i];
  }

  private expr(): number | null {
    let left = this.term();
    if (left === null) return null;
    for (;;) {
      const t = this.peek();
      if (t?.t === "op" && (t.v === "+" || t.v === "-")) {
        this.i++;
        const right = this.term();
        if (right === null) return null;
        // Big-O of a sum is its dominant term; "a - b" is bounded by a.
        left = t.v === "+" ? Math.max(left, right) : left;
      } else return left;
    }
  }

  /** A multiplicative factor; bare numeric constants are dropped (O(2n) = O(n)). */
  private factor(): number | null {
    const t = this.peek();
    const next = this.toks[this.i + 1];
    if (t?.t === "num" && !(next?.t === "op" && (next.v === "^" || next.v === "!"))) {
      this.i++;
      return 0;
    }
    return this.power();
  }

  private term(): number | null {
    let left = this.factor();
    if (left === null) return null;
    for (;;) {
      const t = this.peek();
      if (t?.t === "op" && (t.v === "*" || t.v === "/")) {
        this.i++;
        const right = this.factor();
        if (right === null) return null;
        left = t.v === "*" ? left + right : left - right;
      } else if (t && (t.t === "id" || t.t === "num" || (t.t === "op" && t.v === "("))) {
        // implicit multiplication: "n log n", "2n"
        const right = this.factor();
        if (right === null) return null;
        left = left + right;
      } else return left;
    }
  }

  private power(): number | null {
    let base = this.postfix();
    if (base === null) return null;
    const t = this.peek();
    if (t?.t === "op" && t.v === "^") {
      this.i++;
      const expLog = this.power();
      if (expLog === null) return null;
      base = base * Math.exp(expLog); // log(b^e) = e * log(b)
    }
    return base;
  }

  private postfix(): number | null {
    let v = this.atom();
    if (v === null) return null;
    while (this.peek()?.t === "op" && this.peek()!.v === "!") {
      this.i++;
      const x = Math.exp(v);
      v = logFactorial(x);
    }
    return v;
  }

  private atom(): number | null {
    const t = this.peek();
    if (!t) return null;
    if (t.t === "num") {
      this.i++;
      return Math.log(Math.max(t.v, 1));
    }
    if (t.t === "op" && t.v === "(") {
      this.i++;
      const v = this.expr();
      if (this.peek()?.t !== "op" || this.peek()!.v !== ")") return null;
      this.i++;
      return v;
    }
    if (t.t === "id") {
      this.i++;
      const name = t.v.toLowerCase();
      if (name === "min" || name === "max") {
        if (this.peek()?.t !== "op" || this.peek()!.v !== "(") return null;
        this.i++;
        const args: number[] = [];
        for (;;) {
          const v = this.expr();
          if (v === null) return null;
          args.push(v);
          const t2 = this.peek();
          if (t2?.t === "op" && t2.v === ",") {
            this.i++;
            continue;
          }
          if (t2?.t === "op" && t2.v === ")") {
            this.i++;
            break;
          }
          return null;
        }
        return name === "min" ? Math.min(...args) : Math.max(...args);
      }
      if (name === "log" || name === "sqrt") {
        const next = this.peek();
        let inner: number | null;
        if (next?.t === "op" && next.v === "(") {
          this.i++;
          inner = this.expr();
          if (this.peek()?.t !== "op" || this.peek()!.v !== ")") return null;
          this.i++;
        } else {
          inner = this.atom();
        }
        if (inner === null) return null;
        if (name === "sqrt") return inner / 2;
        return Math.log(Math.max(inner, Math.log(2))); // log of the value = log(inner_log)
      }
      return Math.log(N);
    }
    return null;
  }
}

function logFactorial(x: number): number {
  let s = 0;
  for (let k = 2; k <= Math.min(x, 1000); k++) s += Math.log(k);
  return s;
}

/** Growth score (natural log of the cost at size N); null if the text can't be parsed. */
export function complexityScore(expr: string | null | undefined): number | null {
  if (!expr) return null;
  const s = normalize(expr);
  if (!s) return null;
  const toks = tokenize(s);
  if (!toks || toks.length === 0) return null;
  return new Parser(toks).parse();
}

export type Relation = "better" | "same" | "worse" | "unknown";

/** Compare complexity `a` with reference `b`: is a better, the same, or worse? */
export function compareComplexity(a: string | null | undefined, b: string | null | undefined): Relation {
  const sa = complexityScore(a);
  const sb = complexityScore(b);
  if (sa === null || sb === null) return "unknown";
  const tol = 0.25 + 0.04 * Math.max(Math.abs(sa), Math.abs(sb));
  if (Math.abs(sa - sb) <= tol) return "same";
  return sa < sb ? "better" : "worse";
}

/** Human name for common complexity classes. */
export function complexityName(expr: string): string | null {
  const s = (normalize(expr) ?? "").replace(/\s+/g, "");
  const table: Record<string, string> = {
    "1": "constant",
    "log(n)": "logarithmic",
    n: "linear",
    "n*log(n)": "linearithmic",
    "nlog(n)": "linearithmic",
    "n^2": "quadratic",
    "n^3": "cubic",
    "2^n": "exponential",
    "n!": "factorial",
  };
  return table[s] ?? null;
}
