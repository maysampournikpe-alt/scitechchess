import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { onboard } from "./helpers";

// WCAG 2.x A and AA rules, checked by axe-core on each main page after it has loaded.
const PAGES = ["/", "/onboarding/", "/train/", "/journey/", "/journey/?step=f-mates-l", "/journey/?test=to-1200", "/puzzles/", "/openings/", "/openings/?id=italian", "/middlegame/?id=carlsbad-minority", "/endgames/", "/endgames/?id=lucena", "/calculation/", "/vision/", "/blunder-check/", "/play/", "/analysis/", "/games/?id=opera", "/progress/", "/mistakes/", "/coach/", "/videos/", "/tournament/", "/settings/"];

for (const theme of ["dark", "light"] as const) {
  test(`no WCAG A/AA violations (${theme} theme)`, async ({ page }) => {
    test.setTimeout(180_000);
    await onboard(page);
    await page.evaluate((t) => localStorage.setItem("cm-theme", t), theme);
    const failures: string[] = [];
    for (const path of PAGES) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(300);
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      for (const v of r.violations) failures.push(`${path} [${v.impact}] ${v.id}: ${v.nodes.length}x ${v.nodes[0]?.target.join(" ")} - ${v.help}`);
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });
}
