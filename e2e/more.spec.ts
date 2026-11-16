import { expect, test } from "@playwright/test";
import { Chess } from "chess.js";
import { expectNoSidewaysScroll, onboard, typeMove } from "./helpers";

test("blunder check grades a move with the engine", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/blunder-check/");
  await page.getByRole("button", { name: "Show me the blunder check" }).click();
  await expect(page.getByText(/If you passed, your opponent could play/)).toBeVisible();
  const fen = (await page.locator(".board-frame").first().getAttribute("data-fen"))!;
  await typeMove(page, new Chess(fen).moves()[0]);
  await expect(page.getByRole("button", { name: "Next position" })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(/is safe|is a (mistake|blunder|inaccuracy)|actually played/)).toBeVisible();
});

test("model game: replay with notes, then guess the first move", async ({ page }) => {
  await page.goto("/games/?id=opera");
  await page.getByRole("button", { name: "Forward" }).click();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("[aria-current=true]")).toHaveText("e5");
  await page.getByRole("tab", { name: "Guess the move" }).click();
  await typeMove(page, "e4");
  await expect(page.getByText("e4: the move played.")).toBeVisible();
  await expect(page.getByText("Matched 1 of 1")).toBeVisible();
});

test("conversion trainer starts a won position with the learner to move", async ({ page }) => {
  await page.goto("/conversion/");
  await expect(page.getByText(/Keep the win for 12 moves/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel("Type your move")).toBeVisible({ timeout: 20_000 });
});

test("tournament prep, settings board colours, and new pages have no errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await onboard(page);
  await page.goto("/tournament/");
  const inFive = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel("When is your event?").fill(inFive);
  await expect(page.getByText(/Final week/)).toBeVisible();
  await expectNoSidewaysScroll(page);
  await page.goto("/settings/");
  await page.getByText("Wood", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-board", "wood");
  await page.goto("/progress/");
  await expect(page.getByText("No results yet")).toBeVisible();
  expect(errors).toEqual([]);
});

test("the board can be played with the keyboard alone", async ({ page }) => {
  await page.goto("/");
  await page.locator(".board-frame").first().focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowLeft"); // e1 -> a1
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Picked up the rook on a1/)).toBeAttached();
  for (let i = 0; i < 7; i++) await page.keyboard.press("ArrowUp"); // a1 -> a8
  await page.keyboard.press("Enter");
  await expect(page.getByText("Ra8# is checkmate")).toBeVisible();
});
