import { expect, test } from "@playwright/test";
import { trackErrors } from "./helpers";

test.describe.configure({ mode: "serial" });

test("drills home shows topics, modes and the daily review", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/drills");
  await expect(page.getByRole("heading", { name: "Drills", exact: true })).toBeVisible();
  await expect(page.getByText("Daily review")).toBeVisible();
  for (const t of ["collections", "heapq (Heaps)", "bisect (Binary Search)"]) await expect(page.getByRole("heading", { name: t })).toBeVisible();
  await expect(page.getByText("Speed round", { exact: true })).toBeVisible();
  await expect(page.getByText("Pattern recognition", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("complete-the-line: correct, wrong (requeued), choices and reveal", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/drills/session?mode=method&method=heapq-heapify");
  const input = page.getByLabel("Fill in the blank");

  // Correct answer, checked by real Python.
  await input.fill("heapq.heapify(nums)");
  await input.press("Enter");
  await expect(page.getByText("Correct", { exact: true })).toBeVisible();
  await expect(page.getByText("[1, 2, 8, 3, 5]").first()).toBeVisible();
  await page.keyboard.press("Enter");

  // Next card (quiz or done) — go to a topic session for the wrong-answer path.
  await page.goto("/drills/session?mode=method&method=heapq-push-pop");
  const counter = page.locator("header").getByText(/^\d+ \/ \d+$/);
  const before = await counter.textContent();
  await page.getByLabel("Fill in the blank").fill("heap.append(2)");
  await page.getByLabel("Fill in the blank").press("Enter");
  await expect(page.getByText("Not quite")).toBeVisible();
  await expect(page.getByText("Python produced")).toBeVisible();
  await expect(page.getByText("Answer:")).toBeVisible();
  const total = Number(before!.split("/")[1]);
  await expect(counter).toHaveText(new RegExp(`/ ${total + 1}$`)); // missed card comes back later
  await page.keyboard.press("Enter");

  // Choices with Shift+Tab, picked with a number key.
  const next = page.getByLabel("Fill in the blank");
  if (await next.isVisible()) {
    await next.press("Shift+Tab");
    await expect(page.getByRole("button", { name: /^1/ }).first()).toBeVisible();
    await next.press("1");
    await expect(page.getByText(/Correct|Not quite/).first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("give up with Escape shows the answer and counts as a miss", async ({ page }) => {
  await page.goto("/drills/session?mode=method&method=bisect-left-right");
  const input = page.getByLabel("Fill in the blank");
  await input.press("Escape");
  await expect(page.getByText("Here's the answer")).toBeVisible();
  await expect(page.getByLabel("1 missed")).toBeVisible();
});

test("pattern recognition hides the title until answered", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/drills/session?mode=patterns");
  await expect(page.getByText("Which technique fits this problem?")).toBeVisible();
  await expect(page.getByText("This was")).toHaveCount(0);
  await page.keyboard.press("1");
  await expect(page.getByText("This was")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Which technique fits this problem?")).toBeVisible();
  expect(errors).toEqual([]);
});

test("speed round runs on a clock", async ({ page }) => {
  await page.goto("/drills/session?mode=sprint");
  await expect(page.getByRole("heading", { name: "Speed round" })).toBeVisible();
  await expect(page.locator("header").getByText(/^\d+s$/)).toBeVisible();
});

test("progress persists: missed cards are due, the sidebar shows a badge", async ({ page }) => {
  await page.goto("/drills");
  await page.reload();
  await expect(page.getByRole("link", { name: /Drills/ }).locator("span[title$='drill cards due']")).toBeVisible();
  await expect(page.getByRole("button", { name: /Weak spots|Drill/ }).first()).toBeVisible();
});

test("topic page shows method cards with runnable examples", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/drills/topics/heapq");
  await expect(page.getByRole("heading", { name: "heapq (Heaps)" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "heapify(list) and heap[0]" })).toBeVisible();
  await page.getByRole("button", { name: "Run", exact: true }).first().click();
  await expect(page.getByText("Output", { exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("solutions link the Python they use to drills", async ({ page }) => {
  await page.goto("/problems/top-k-frequent-elements");
  await page.getByRole("tab", { name: /Solution/ }).click();
  const reveal = page.getByRole("button", { name: "Reveal solution" });
  if (await reveal.isVisible()) await reveal.click();
  await expect(page.getByText("Python used in this solution")).toBeVisible();
  await page.getByRole("link", { name: "Counter" }).click();
  await expect(page).toHaveURL(/mode=method&method=collections-counter/);
  await expect(page.getByLabel("Fill in the blank").or(page.getByText(/Quiz/).first())).toBeVisible();
});
