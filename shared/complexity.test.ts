import { describe, expect, it } from "vitest";
import { compareComplexity, complexityName, complexityScore } from "./complexity";

describe("complexityScore", () => {
  it("orders the standard growth hierarchy", () => {
    const order = ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)", "O(n^3)", "O(2^n)", "O(n!)"];
    const scores = order.map((x) => complexityScore(x)!);
    for (const s of scores) expect(s).not.toBeNull();
    for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeGreaterThan(scores[i - 1]);
  });

  it("parses products, sums and prose suffixes", () => {
    expect(complexityScore("O(m · n)")).toBeCloseTo(complexityScore("O(n^2)")!, 5);
    expect(complexityScore("O(V + E)")).not.toBeNull();
    expect(complexityScore("O(L) per operation")).toBeCloseTo(complexityScore("O(n)")!, 5);
    expect(complexityScore("O(m * n * 4^L)")).toBeGreaterThan(complexityScore("O(n^3)")!);
    expect(complexityScore("O(k log n)")).toBeCloseTo(complexityScore("O(n log n)")!, 5);
    expect(complexityScore("O(sqrt n)")).toBeLessThan(complexityScore("O(n)")!);
    expect(complexityScore("O(min(m, n))")).toBeCloseTo(complexityScore("O(n)")!, 5);
    expect(complexityScore("O(n · min(n, 26))")).toBeCloseTo(complexityScore("O(n)")!, 5);
    expect(complexityScore("O(φⁿ) ≈ O(1.62ⁿ)")).toBeGreaterThan(complexityScore("O(n^3)")!);
    expect(complexityScore("O(m · n · α(m · n))")).toBeCloseTo(complexityScore("O(m · n)")!, 5);
    expect(complexityScore("O(σ)")).toBeCloseTo(complexityScore("O(1)")!, 5);
    expect(complexityScore("O(1) extra")).toBeCloseTo(0, 5);
  });

  it("returns null for unparseable text", () => {
    expect(complexityScore("depends")).not.toBeNull(); // a single identifier is treated as n
    expect(complexityScore("?")).toBeNull();
    expect(complexityScore("")).toBeNull();
  });
});

describe("compareComplexity", () => {
  it("compares classes", () => {
    expect(compareComplexity("O(n²)", "O(n)")).toBe("worse");
    expect(compareComplexity("O(n)", "O(n log n)")).toBe("better");
    expect(compareComplexity("O(n)", "O(n)")).toBe("same");
    expect(compareComplexity("O(2n)", "O(n)")).toBe("same");
    expect(compareComplexity("O(n + m)", "O(n)")).toBe("same");
    expect(compareComplexity("O(1)", "O(n)")).toBe("better");
    expect(compareComplexity("O(26)", "O(1)")).toBe("same");
    expect(compareComplexity("?", "O(n)")).toBe("unknown");
  });

  it("names common classes", () => {
    expect(complexityName("O(n²)")).toBe("quadratic");
    expect(complexityName("O(n log n)")).toBe("linearithmic");
  });
});
