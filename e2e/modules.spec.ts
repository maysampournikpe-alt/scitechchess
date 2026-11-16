import { expect, test, type Page } from "@playwright/test";
import { Chess } from "chess.js";
import { expectNoSidewaysScroll, onboard, typeMove } from "./helpers";

const boardFen = async (page: Page) => (await page.locator(".board-frame").first().getAttribute("data-fen"))!;
const anyLegal = (fen: string) => new Chess(fen).moves()[0];

test("assessment runs start to finish and produces a report from the answers", async ({ page }) => {
  test.setTimeout(240_000);
  await onboard(page, true);
  await page.getByRole("button", { name: "Begin" }).click();
  for (let i = 0; i < 22; i++) {
    await expect(page.getByText(`Task ${i + 1} of 22`)).toBeVisible();
    // The button is disabled again only once the new task has replaced the old one.
    await expect(page.getByRole("button", { name: i === 21 ? "See my results" : "Next task" })).toBeDisabled();
    const line = page.getByLabel("Your line");
    const answers = page.getByRole("group", { name: "Answers" });
    const ready = page.getByRole("button", { name: "I'm ready" });
    if (await line.isVisible()) {
      await line.fill(anyLegal(await boardFen(page)));
      await page.getByRole("button", { name: "Check my line" }).click();
    } else if (await ready.isVisible().catch(() => false)) {
      await ready.click();
      await answers.getByRole("button").first().click();
    } else if (await answers.isVisible().catch(() => false)) {
      await answers.getByRole("button").first().click();
    } else {
      // If the move happens to be right, the puzzle continues: keep playing until it ends.
      const next = page.getByRole("button", { name: i === 21 ? "See my results" : "Next task" });
      for (let k = 0; k < 10 && (await next.isDisabled()); k++) {
        await typeMove(page, anyLegal(await boardFen(page)));
        await page.waitForTimeout(150);
      }
    }
    await page.getByRole("button", { name: i === 21 ? "See my results" : "Next task" }).click();
  }
  await expect(page.getByRole("heading", { name: "Your diagnostic report" })).toBeVisible();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("chessmastery-v1")!).state);
  expect(state.assessmentDoneAt).toBeGreaterThan(0);
  expect(state.attempts.length).toBe(22);
  // Each answer moves exactly one skill; a tactics-section puzzle may count as defence or calculation by its theme.
  expect(Object.values(state.skills as Record<string, { n: number }>).reduce((t, k) => t + k.n, 0)).toBe(22);
  expect(state.skills.tactics.n + state.skills.defense.n + state.skills.calculation.n).toBeGreaterThanOrEqual(8);
  await page.goto("/train/");
  await expect(page.getByText("Your plan is based on your answers so far")).toHaveCount(0);
});

test("opening trainer: guided line plays through, a wrong move from memory is caught and scheduled", async ({ page }) => {
  await onboard(page);
  await page.goto("/openings/?id=italian&tab=memory");
  await typeMove(page, "d4");
  await expect(page.getByText("is not the move in this line. The repertoire move is e4.")).toBeVisible();
  for (const m of ["e4", "Nf3", "Bc4", "c3", "d3", "O-O", "Re1", "Bb3", "h3"]) {
    await typeMove(page, m);
  }
  await expect(page.getByText("Line finished with 1 wrong move.")).toBeVisible();
  const cards = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("chessmastery-v1")!).state.cards));
  expect(cards).toContain("opening-line:italian");
  await page.getByRole("tab", { name: "Check understanding" }).click();
  await page.getByRole("button", { name: /prepares d4/ }).click();
  await expect(page.getByText("Correct.")).toBeVisible();
});

test("endgame: find-the-move question and play-out against the engine", async ({ page }) => {
  await page.goto("/endgames/?id=king-in-front");
  await page.getByRole("tab", { name: "2. Find the move" }).click();
  await typeMove(page, "Kd6");
  await expect(page.getByText("Kd6 is correct.")).toBeVisible();
  await page.getByRole("tab", { name: "3. Play it out" }).click();
  await typeMove(page, "Kd5"); // gives up the win
  await expect(page.getByText(/lets the win slip to a draw/)).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Try another move" }).click();
  await typeMove(page, "Kf6");
  await expect(page.getByText(/The defender replied/)).toBeVisible({ timeout: 20_000 });
});

test("play the computer, resign, and get a review", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/play/");
  await page.getByText("1. First steps").click();
  await page.getByRole("button", { name: "Start game" }).click();
  await typeMove(page, "e4");
  await expect(page.getByText("Your move.")).toBeVisible({ timeout: 15_000 });
  await typeMove(page, anyLegal(await boardFen(page)));
  await expect(page.getByText("Your move.")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Resign" }).click();
  await expect(page.getByText("You resigned.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Game review" })).toBeVisible();
  await expect(page.getByText("Move quality by expected-score loss")).toBeVisible({ timeout: 60_000 });
});

test("analysis shows engine lines and reviews a pasted PGN", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/analysis/");
  await expect(page.locator("ol li").filter({ hasText: /^[+-]\d/ }).first()).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("PGN").fill("1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#");
  await page.getByLabel("I played").selectOption("b");
  await page.getByRole("button", { name: "Review this game" }).click();
  await expect(page.getByText(/(was|were) added to/)).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("PGN").fill("1. e4 e5 2. Ke3");
  await page.getByRole("button", { name: "Review this game" }).click();
  await expect(page.getByText("The PGN could not be read")).toBeVisible();
});

test("other modules load with real content and no page errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  await onboard(page);
  for (const [path, text] of [
    ["/middlegame/?id=carlsbad-minority", "What would you do, and why?"],
    ["/calculation/", "Check my line"],
    ["/vision/", "Without looking at a board"],
    ["/mistakes/", "Nothing to review yet"],
    ["/progress/", "No results yet"],
    ["/coach/", "What should I study today?"],
    ["/videos/", "No curated videos yet"],
    ["/settings/", "Licences and source code"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByText(text).first()).toBeVisible();
    await expectNoSidewaysScroll(page);
  }
  await page.goto("/coach/");
  await page.getByRole("button", { name: "What should I study today?" }).click();
  await expect(page.getByText(/minutes planned today/)).toBeVisible();
  expect(errors).toEqual([]);
});

test("settings: theme switch persists, delete removes everything", async ({ page }) => {
  await onboard(page);
  await page.goto("/settings/");
  await page.getByText("Light", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Delete all my data" }).click();
  await page.getByRole("button", { name: "Yes, delete everything" }).click();
  await page.goto("/train/");
  await expect(page.getByText("Set up your training first")).toBeVisible();
});
