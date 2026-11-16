import { expect, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

export type Row = [string, string, string, number, string];
export const puzzles: Row[] = JSON.parse(readFileSync("public/data/puzzles.json", "utf8"));

/** Click a square on a chessground board. `orientation` is the colour at the bottom. */
export async function clickSquare(board: Locator, square: string, orientation: "w" | "b" = "w") {
  const box = (await board.boundingBox())!;
  let file = square.charCodeAt(0) - 97;
  let rank = 8 - Number(square[1]);
  if (orientation === "b") {
    file = 7 - file;
    rank = 7 - rank;
  }
  const position = { x: (file + 0.5) * (box.width / 8), y: (rank + 0.5) * (box.height / 8) };
  // On touch devices the board listens for touch events, so tap instead of click.
  if (await board.page().evaluate(() => "ontouchstart" in window)) await board.tap({ position });
  else await board.click({ position });
}

export async function clickMove(page: Page, uci: string, orientation: "w" | "b" = "w") {
  const board = page.locator("cg-board").first();
  await clickSquare(board, uci.slice(0, 2), orientation);
  await clickSquare(board, uci.slice(2, 4), orientation);
}

export async function typeMove(page: Page, text: string) {
  await page.getByLabel("Type your move").fill(text);
  await page.getByRole("button", { name: "Play", exact: true }).click();
}

/** Go through onboarding with fixed answers. `assess` chooses the last step. */
export async function onboard(page: Page, assess = false) {
  await page.goto("/onboarding/");
  await page.getByText("Casual player").click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Where is the rating from?").selectOption("Lichess Rapid");
  await page.getByLabel("Rating", { exact: true }).fill("1150");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Reach 1500").click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("60 minutes").click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("I lose winning endgames").click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("A balanced mixture").click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: assess ? /Take my chess assessment/ : /Start with my existing rating/ }).click();
  await expect(page).toHaveURL(assess ? /assessment/ : /train/);
}

/** No page in the app may scroll sideways. */
export async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}
