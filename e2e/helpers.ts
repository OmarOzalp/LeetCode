import { expect, type Page } from "@playwright/test";

/** Collects console errors and uncaught exceptions for the lifetime of a page. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

export async function waitForEditor(page: Page) {
  await page.waitForFunction(() => !!(window as unknown as { __b75Editor?: unknown }).__b75Editor, null, { timeout: 30_000 });
}

/** Replace the editor contents exactly (typing would trigger auto-indent). */
export async function setCode(page: Page, code: string) {
  await waitForEditor(page);
  await page.evaluate((c) => (window as unknown as { __b75Editor: { setValue: (v: string) => void } }).__b75Editor.setValue(c), code);
}

export async function getCode(page: Page): Promise<string> {
  await waitForEditor(page);
  return page.evaluate(() => (window as unknown as { __b75Editor: { getValue: () => string } }).__b75Editor.getValue());
}

export async function runAllTests(page: Page) {
  await page.getByRole("button", { name: /^Run Tests/ }).click();
  await expect(page.getByRole("button", { name: /^Run Tests/ })).toBeEnabled({ timeout: 45_000 });
}

export async function noHorizontalOverflow(page: Page) {
  const { scroll, inner } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
  expect(scroll).toBeLessThanOrEqual(inner);
}
