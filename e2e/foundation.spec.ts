import { expect, test } from "@playwright/test";
import { clickMove, expectNoSidewaysScroll, onboard, puzzles, typeMove } from "./helpers";

test("landing page: headline, and the hero board accepts only the mating move", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your personal chess coach. Completely free.");
  await expect(page.locator("cg-board piece")).toHaveCount(9);
  await clickMove(page, "a1a7");
  await expect(page.getByText("is legal, but it is not checkmate")).toBeVisible();
  await clickMove(page, "a1a8");
  await expect(page.getByText("Ra8# is checkmate")).toBeVisible();
  await expectNoSidewaysScroll(page);
  expect(errors).toEqual([]);
});

test("onboarding validates input, saves the profile, and the dashboard explains its plan", async ({ page }) => {
  await page.goto("/onboarding/");
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  await page.getByText("Casual player").click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Where is the rating from?").selectOption("FIDE");
  await page.getByLabel("Rating", { exact: true }).fill("9");
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  await onboard(page);
  await expect(page.getByText("1150 (Lichess Rapid, self-reported)")).toBeVisible();
  await expect(page.getByText("60 minutes planned")).toBeVisible();
  await expect(page.getByText("You also named it as a weakness").first()).toBeVisible();
  await expect(page.getByText("There is not enough data for a diagnosis yet")).toBeVisible();
  await expectNoSidewaysScroll(page);
  // Progress survives a reload.
  await page.reload();
  await expect(page.getByText("60 minutes planned")).toBeVisible();
});

test("puzzle: wrong move is rejected with an explanation, the solution is accepted, and a review is scheduled", async ({ page }) => {
  await onboard(page);
  const [id, , moves, rating] = puzzles.find((p) => p[2].split(" ").length === 4 && !p[4].includes("mate"))!;
  const [, m1, , m2] = moves.split(" ");
  await page.goto(`/puzzles/?id=${id}&r=${rating}`);
  await expect(page.getByRole("heading", { name: /to move/ })).toBeVisible();
  const orientation = (await page.getByRole("heading", { name: /to move/ }).textContent())!.startsWith("White") ? "w" : "b";

  await page.getByRole("button", { name: "Get a hint" }).click();
  await expect(page.getByText(/Hint 1: look at the/)).toBeVisible();
  await typeMove(page, "Zz9");
  await expect(page.getByText("is not a legal move here")).toBeVisible();
  await typeMove(page, m1);
  await expect(page.getByText(/is right\./)).toBeVisible();
  await clickMove(page, m2, orientation);
  await expect(page.getByText("Solved with 1 hint.")).toBeVisible();
  await expect(page.getByText("Scheduled for spaced review.")).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("chessmastery-v1")!).state);
  expect(saved.attempts).toHaveLength(1);
  expect(saved.attempts[0]).toMatchObject({ outcome: "assisted", hints: 1, itemId: `puzzle:${id}` });
  expect(Object.keys(saved.cards)).toEqual([`puzzle:${id}`]);
  await expectNoSidewaysScroll(page);
});
