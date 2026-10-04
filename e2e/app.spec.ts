import { expect, test } from "@playwright/test";
import { getCode, noHorizontalOverflow, runAllTests, setCode, trackErrors, waitForEditor } from "./helpers";

test.describe.configure({ mode: "serial" });

const CORRECT_ANAGRAM = `class Solution:
    def isAnagram(self, s: str, t: str) -> bool:
        return sorted(s) == sorted(t)
`;

test("navigation: every section of the app loads", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Blind 75", exact: true })).toBeVisible();
  for (const [link, heading] of [
    ["Review", "Review"],
    ["Docs", "Python Interview Docs"],
    ["Progress", "Progress"],
    ["Blind 75", "Blind 75"],
  ] as const) {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: link }).click();
    await expect(page.getByRole("heading", { name: heading, exact: true }).first()).toBeVisible();
  }
  await page.goto("/does-not-exist");
  await expect(page.getByText("Page not found")).toBeVisible();
  expect(errors).toEqual([]);
});

test("dashboard lists all 75 problems; filters and search work", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(75);
  await expect(page.getByText("/ 75").first()).toBeVisible();

  await page.getByLabel("Filter by topic").selectOption("trees");
  await expect(rows).toHaveCount(11);
  await page.getByLabel("Filter by difficulty").selectOption("Hard");
  await expect(rows).toHaveCount(2);
  await expect(page.locator("tbody").getByRole("link", { name: "Binary Tree Maximum Path Sum" })).toBeVisible();
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(rows).toHaveCount(75);

  await page.getByLabel("Search problems").fill("linked list");
  const table = page.locator("tbody");
  await expect(table.getByRole("link", { name: "Reverse Linked List" })).toBeVisible();
  await expect(table.getByRole("link", { name: "Two Sum", exact: true })).toHaveCount(0);
  await page.getByLabel("Search problems").fill("");

  const status = page.getByRole("group", { name: "Status filter" });
  await status.getByRole("button", { name: /^Solved/ }).click();
  await expect(page.getByText("No problems match these filters")).toBeVisible();
  await status.getByRole("button", { name: /^All/ }).click();
  await expect(rows).toHaveCount(75);

  // Clicking a topic in "Progress by topic" filters the table too.
  await page.getByTitle("Filter by Intervals").click();
  await expect(rows).toHaveCount(5);
  // So does clicking a pattern tag.
  await page.getByTitle("Filter by Intervals").click();
  await page.locator("tbody").getByRole("button", { name: "Sliding Window", exact: true }).first().click();
  await expect(page).toHaveURL(/pattern=Sliding/);
  expect(errors).toEqual([]);
});

test("every problem page loads with description, examples and starter code", async ({ page, request }) => {
  test.setTimeout(240_000);
  const errors = trackErrors(page);
  const res = await request.get("/api/problems");
  const { problems } = (await res.json()) as { problems: Array<{ slug: string; title: string }> };
  expect(problems).toHaveLength(75);
  for (const p of problems) {
    await page.goto(`/problems/${p.slug}`);
    await expect(page.locator("header h1")).toHaveText(p.title);
    await expect(page.getByText("Example 1", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Constraints", { exact: true })).toBeVisible();
    await waitForEditor(page);
    expect((await getCode(page)).length).toBeGreaterThan(20);
  }
  expect(errors).toEqual([]);
});

test("hints reveal one at a time, in order, and persist", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/problems/two-sum");
  await page.getByRole("tab", { name: /Hints/ }).click();
  await expect(page.getByRole("button", { name: "Reveal Hint 1" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reveal Hint 2" })).toHaveCount(0);
  await page.getByRole("button", { name: "Reveal Hint 1" }).click();
  await expect(page.getByText(/previously visited|already visited/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Reveal Hint 2" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reveal Hint 3" })).toHaveCount(0);
  await page.reload();
  await page.getByRole("tab", { name: /Hints/ }).click();
  await expect(page.getByRole("button", { name: "Reveal Hint 2" })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Hints/ })).toContainText("1/3");
  expect(errors).toEqual([]);
});

test("test runner: wrong answers, syntax errors, timeouts, then a pass that marks solved", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/problems/valid-anagram");

  // Wrong answer: comparing sets ignores letter counts.
  await setCode(page, "class Solution:\n    def isAnagram(self, s, t):\n        return set(s) == set(t)\n");
  await runAllTests(page);
  await expect(page.getByText(/test(s)? failed/)).toBeVisible();
  await expect(page.getByText("Wrong answer").first()).toBeVisible();
  await expect(page.getByText("Your output")).toBeVisible();

  // Syntax error with a line number.
  await setCode(page, "class Solution:\n    def isAnagram(self, s, t)\n        return True\n");
  await runAllTests(page);
  await expect(page.getByText("✗ Syntax error")).toBeVisible();
  await expect(page.getByRole("button", { name: "Line 2" })).toBeVisible();

  // Runtime error with a friendly hint.
  await setCode(page, "class Solution:\n    def isAnagram(self, s, t):\n        counts = {}\n        return counts[s[0]] > 0\n");
  await runAllTests(page);
  await expect(page.getByText("KeyError").first()).toBeVisible();
  await expect(page.getByText(/dictionary lookup used a key/)).toBeVisible();

  // Infinite loop is stopped.
  await setCode(page, "class Solution:\n    def isAnagram(self, s, t):\n        while True:\n            pass\n");
  await runAllTests(page);
  await expect(page.getByText("Time limit exceeded").first()).toBeVisible();

  // Correct solution: all pass, auto-marked solved, confidence can be set.
  await setCode(page, CORRECT_ANAGRAM);
  await runAllTests(page);
  await expect(page.getByText("All tests passed").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Problem status" })).toContainText("Solved");
  await page.getByRole("radio", { name: /4/ }).first().click();

  // Code persists across a reload.
  await page.reload();
  expect((await getCode(page)).trim()).toBe(CORRECT_ANAGRAM.trim());
  expect(errors).toEqual([]);
});

test("custom tests show your output next to the optimal solution's", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/problems/valid-anagram");
  await waitForEditor(page);
  await page.getByRole("tab", { name: /Custom/ }).click();
  await page.getByLabel("Custom value for s").fill('"listen"');
  await page.getByLabel("Custom value for t").fill('"silent"');
  await page.getByRole("button", { name: "Run custom test" }).click();
  await expect(page.getByText("Expected (from optimal solution)")).toBeVisible();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved tests")).toBeVisible();
  expect(errors).toEqual([]);
});

test("solution reveal gate, solution panel, compare view and benchmark", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = trackErrors(page);
  await page.goto("/problems/two-sum");
  await page.getByRole("tab", { name: /Solution/ }).click();
  await expect(page.getByText("Reveal the optimal solution?")).toBeVisible();
  await page.getByRole("button", { name: "Reveal solution" }).click();
  await expect(page.getByText("Preferred interview solution")).toBeVisible();
  await expect(page.getByText("Why this complexity?")).toBeVisible();
  await page.getByRole("button", { name: /Brute force/ }).click();
  await expect(page.getByText("Tradeoff:")).toBeVisible();

  await setCode(page, "class Solution:\n    def twoSum(self, nums, target):\n        for i in range(len(nums)):\n            for j in range(i + 1, len(nums)):\n                if nums[i] + nums[j] == target:\n                    return [i, j]\n");
  await page.getByRole("button", { name: "Compare" }).click();
  await expect(page.getByText("Less memory, but more work as the input grows")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Brute force (check every pair)" })).toBeVisible();
  await page.getByRole("button", { name: /Diff/ }).click();
  await expect(page.locator(".monaco-diff-editor")).toBeVisible();

  await page.getByRole("button", { name: "Run benchmark" }).click();
  await expect(page.getByRole("button", { name: "Run again" })).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText(/appears to scale approximately quadratically/)).toBeVisible();
  await expect(page.getByText(/empirical wall-clock measurements/)).toBeVisible();
  expect(errors).toEqual([]);
});

test("docs: search finds entries and runnable examples execute", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/docs");
  await expect(page.getByText("What pattern should I think of?").first()).toBeVisible();
  await page.getByLabel("Search docs").fill("popleft");
  await expect(page.getByText(/results? for “popleft”/)).toBeVisible();
  const runButton = page.getByRole("button", { name: "Run", exact: true }).first();
  await runButton.click();
  await expect(page.getByText("Output", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Search docs").fill("zzzzqqq");
  await expect(page.getByText(/No results for/)).toBeVisible();
  expect(errors).toEqual([]);
});

test("review and progress pages reflect recorded activity", async ({ page, request }) => {
  const errors = trackErrors(page);
  // Record a failed run so the test doesn't depend on earlier tests.
  const run = await request.post("/api/run", {
    data: { slug: "valid-anagram", mode: "all", code: "class Solution:\n    def isAnagram(self, s, t):\n        return False\n" },
  });
  expect(run.ok()).toBe(true);
  await page.goto("/review");
  await expect(page.getByText("Today's review")).toBeVisible();
  await expect(page.getByText("Most failed attempts")).toBeVisible();
  await expect(page.locator("text=Valid Anagram").first()).toBeVisible();
  await page.goto("/progress");
  await expect(page.getByText("Test runs", { exact: true })).toBeVisible();
  await expect(page.getByText("Recent runs")).toBeVisible();
  await expect(page.getByRole("link", { name: "Valid Anagram" }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("layout fits common laptop widths without horizontal scrolling", async ({ page }) => {
  const errors = trackErrors(page);
  for (const size of [
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
  ]) {
    await page.setViewportSize(size);
    for (const path of ["/", "/problems/lowest-common-ancestor-of-a-binary-search-tree", "/review", "/docs", "/progress"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await noHorizontalOverflow(page);
    }
  }
  expect(errors).toEqual([]);
});

test("light theme toggle persists", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
