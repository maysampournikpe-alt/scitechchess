import { expect, test } from "@playwright/test";
import { onboard } from "./helpers";
import type { Page } from "@playwright/test";

/** The lesson has one board per move question: type into the n-th move box. */
async function answer(page: Page, n: number, move: string) {
  await page.getByLabel("Type your move").nth(n).fill(move);
  await page.getByRole("button", { name: "Play", exact: true }).nth(n).click();
}

test("journey: placed by results, a lesson is completed by answering it, and the next step opens", async ({ page }) => {
  await onboard(page); // casual player aiming for 1500
  await page.goto("/journey/");
  await expect(page.getByRole("heading", { name: "Your journey to 1500" })).toBeVisible();
  await expect(page.getByText("You are here")).toBeVisible();
  await expect(page.getByRole("heading", { name: /How to get past/ })).toBeVisible();

  // The first step of Foundations (placement from a casual player's starting estimate) is open.
  await page.goto("/journey/?step=f-mates-l");
  await expect(page.getByRole("heading", { name: "Checkmate patterns you must know" })).toBeVisible();
  await answer(page, 0, "Qa1");
  await expect(page.getByText("Qa1+ is not it. Try again.")).toBeVisible();
  await answer(page, 0, "Qh8#");
  await expect(page.getByText("Qh8# is right.")).toBeVisible();
  await answer(page, 0, "Rh8#");
  await expect(page.getByText("Rh8# is right.")).toBeVisible();
  await page.getByRole("button", { name: /Its own pawns block/ }).click();
  await expect(page.getByText(/Done: 3 of 3 questions right/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Next step:/ })).toBeVisible();

  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("chessmastery-v1")!).state);
  expect(state.attempts.filter((a: { context?: string }) => a.context === "f-mates-l").length).toBe(4);
});

test("journey: the level test serves strict puzzles near the level and records them", async ({ page }) => {
  await onboard(page);
  await page.goto("/journey/?test=to-1000");
  await expect(page.getByRole("heading", { name: "Level test: Road to 1000" })).toBeVisible();
  await expect(page.getByText(/to move/).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Get a hint" })).toHaveCount(0);
  const difficulty = Number((await page.getByText(/Difficulty \d+/).textContent())!.replace(/\D/g, ""));
  expect(Math.abs(difficulty - 1000)).toBeLessThanOrEqual(150);
});
