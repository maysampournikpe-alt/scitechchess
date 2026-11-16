import { describe, expect, it } from "vitest";
import { confidence, expected, MAX_RD, newSkill, range, SKILLS, update, type SkillId, type SkillState } from "@/lib/learning/skills";
import { dueCards, newCard, review } from "@/lib/learning/srs";
import { attemptResult, mastery, type Attempt } from "@/lib/learning/mastery";
import { dailyPlan, priorities, weeklyPlan, type PlanInput, type Profile } from "@/lib/learning/plan";
import { buildReport, recurringMisses } from "@/lib/learning/report";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 5);
const att = (o: Partial<Attempt>): Attempt => ({ t: T0, itemId: "x", module: "puzzle", skill: "tactics", concept: "theme:fork", difficulty: 1200, outcome: "solo", hints: 0, ms: 1000, firstSeen: true, ...o });

describe("skill score (Glicko-1)", () => {
  it("moves up on success, down on failure, and uncertainty shrinks with evidence", () => {
    const s0 = newSkill(1200);
    const up = update(s0, 1200, 1, T0);
    const down = update(s0, 1200, 0, T0);
    expect(up.score).toBeGreaterThan(1200);
    expect(down.score).toBeLessThan(1200);
    expect(up.rd).toBeLessThan(MAX_RD);
    expect(up.n).toBe(1);
    expect(confidence(s0, T0)).toBe("not measured");
  });
  it("converges on the difficulty a learner solves half the time", () => {
    let s = newSkill(800);
    // Deterministic learner whose true level is 1500: solves anything easier, fails anything harder.
    for (let i = 0; i < 60; i++) {
      const d = Math.round(s.score / 50) * 50 + (i % 2 ? 60 : -60);
      s = update(s, d, d < 1500 ? 1 : 0, T0 + i * 1000);
    }
    expect(Math.abs(s.score - 1500)).toBeLessThan(120);
    expect(confidence(s, T0 + 60_000)).toBe("high");
    const r = range(s, T0 + 60_000);
    expect(r.low).toBeLessThan(1500);
    expect(r.high).toBeGreaterThan(1500);
  });
  it("gives a half result less movement than a win, and uncertainty grows back over time", () => {
    const s0 = update(newSkill(1200), 1200, 1, T0);
    expect(update(s0, 1300, 0.5, T0).score).toBeLessThan(update(s0, 1300, 1, T0).score);
    expect(range(s0, T0 + 400 * DAY).high - range(s0, T0 + 400 * DAY).low).toBeGreaterThan(range(s0, T0).high - range(s0, T0).low);
    expect(expected(1200, 1200)).toBeCloseTo(0.5);
  });
});

describe("spaced repetition", () => {
  const c0 = newCard({ id: "p1", kind: "puzzle", concept: "theme:fork", label: "Fork", href: "/puzzles/?id=p1" }, T0);
  it("spaces successful reviews further apart each time", () => {
    const a = review(c0, "good", T0 + DAY);
    const b = review(a, "good", a.due);
    const c = review(b, "good", b.due);
    expect([a.interval, b.interval]).toEqual([1, 3]);
    expect(c.interval).toBeGreaterThan(b.interval);
  });
  it("brings a failed card back the next day and makes it harder to space out", () => {
    const good = review(review(review(c0, "good", T0), "good", T0), "good", T0);
    const failed = review(good, "fail", T0 + 30 * DAY);
    expect(failed.interval).toBe(1);
    expect(failed.lapses).toBe(1);
    expect(failed.ease).toBeLessThan(good.ease);
    expect(failed.due).toBe(T0 + 31 * DAY);
  });
  it("lists due cards with the most-forgotten first", () => {
    const lapsed = { ...review(c0, "fail", T0), id: "p2" };
    expect(dueCards([c0, lapsed], T0 + 2 * DAY).map((c) => c.id)).toEqual(["p2", "p1"]);
    expect(dueCards([c0], T0)).toEqual([]);
  });
});

describe("mastery needs repeated evidence on new positions and a delayed check", () => {
  it("starts as not started, becomes introduced when the lesson is opened", () => {
    expect(mastery([], "theme:fork", false, T0).state).toBe("not_started");
    expect(mastery([], "theme:fork", true, T0).state).toBe("introduced");
  });
  it("is only 'practicing' after a couple of easy successes or after hinted solves", () => {
    expect(mastery([att({ itemId: "a" }), att({ itemId: "b" })], "theme:fork", true, T0).state).toBe("practicing");
    const hinted = ["a", "b", "c", "d"].map((id) => att({ itemId: id, outcome: "assisted", hints: 2 }));
    expect(mastery(hinted, "theme:fork", true, T0).state).toBe("practicing");
  });
  it("does not count repeats of the same position as new evidence", () => {
    const repeats = [att({ itemId: "a" }), att({ itemId: "a", firstSeen: false }), att({ itemId: "a", firstSeen: false })];
    expect(mastery(repeats, "theme:fork", true, T0).state).toBe("practicing");
  });
  it("is 'demonstrated' after three unassisted first-time solves, 'retention verified' only after a delayed success", () => {
    const three = ["a", "b", "c"].map((id, i) => att({ itemId: id, t: T0 + i }));
    expect(mastery(three, "theme:fork", true, T0 + 10).state).toBe("demonstrated");
    const soon = [...three, att({ itemId: "d", t: T0 + DAY })];
    expect(mastery(soon, "theme:fork", true, T0 + DAY).state).toBe("demonstrated");
    const later = [...three, att({ itemId: "d", t: T0 + 4 * DAY })];
    expect(mastery(later, "theme:fork", true, T0 + 4 * DAY).state).toBe("retention_verified");
  });
  it("drops to 'needs review' after two failures in a row or a long gap", () => {
    const three = ["a", "b", "c"].map((id, i) => att({ itemId: id, t: T0 + i }));
    const fails = [...three, att({ itemId: "d", t: T0 + DAY, outcome: "failed" }), att({ itemId: "e", t: T0 + 2 * DAY, outcome: "failed" })];
    expect(mastery(fails, "theme:fork", true, T0 + 2 * DAY).state).toBe("needs_review");
    expect(mastery(three, "theme:fork", true, T0 + 60 * DAY).state).toBe("needs_review");
  });
  it("scores hinted solves below unassisted ones", () => {
    expect(attemptResult({ outcome: "solo", hints: 0 })).toBe(1);
    expect(attemptResult({ outcome: "assisted", hints: 1 })).toBe(0.5);
    expect(attemptResult({ outcome: "assisted", hints: 3 })).toBe(0);
    expect(attemptResult({ outcome: "failed", hints: 0 })).toBe(0);
  });
});

const profile: Profile = { experience: "casual", rating: null, ratingSource: "unrated", goal: "reach1200", goalRating: 1200, minutesPerDay: 60, weaknesses: [], preference: "mix", createdAt: T0 };
function skillsWith(over: Partial<Record<SkillId, SkillState>>): Record<SkillId, SkillState> {
  const base = Object.fromEntries(SKILLS.map((s) => [s.id, { score: 1200, rd: 90, n: 20, last: T0, history: [] }])) as unknown as Record<SkillId, SkillState>;
  return { ...base, ...over };
}
const input = (o: Partial<PlanInput> = {}): PlanInput => ({ profile, skills: skillsWith({}), dueReviews: 0, recurring: [], now: T0, ...o });

describe("training plan", () => {
  it("uses exactly the minutes the learner has", () => {
    for (const minutes of [10, 20, 30, 45, 60, 90, 120]) {
      const plan = dailyPlan(input({ profile: { ...profile, minutesPerDay: minutes }, dueReviews: 6 }));
      expect(plan.totalMinutes).toBe(minutes);
      expect(plan.blocks.every((b) => b.minutes > 0 && b.why.length > 20)).toBe(true);
    }
  });
  it("gives two learners with different weaknesses different plans", () => {
    const weakEndgames = dailyPlan(input({ skills: skillsWith({ endgameKnowledge: { score: 800, rd: 90, n: 20, last: T0, history: [] } }) }));
    const weakCalc = dailyPlan(input({ skills: skillsWith({ calculation: { score: 800, rd: 90, n: 20, last: T0, history: [] } }) }));
    expect(weakEndgames.focus[0]).toBe("endgameKnowledge");
    expect(weakCalc.focus[0]).toBe("calculation");
    expect(weakEndgames.blocks.find((b) => b.skill === "endgameKnowledge")!.why).toContain("below your average");
  });
  it("schedules due reviews and names recurring misses with their counts", () => {
    const plan = dailyPlan(input({ dueReviews: 4, recurring: [{ label: "fork puzzles", href: "/puzzles/?theme=fork", skill: "tactics", misses: 4, of: 6 }] }));
    expect(plan.blocks[0].id).toBe("review");
    expect(plan.blocks[1].why).toBe("You missed 4 of your last 6 fork puzzles exercises, the most of any pattern.");
  });
  it("puts unmeasured and self-reported weaknesses ahead of well-measured average skills", () => {
    const p = priorities(input({ profile: { ...profile, weaknesses: ["endgames"] }, skills: skillsWith({ visualization: { score: 1200, rd: 350, n: 0, last: null, history: [] } }) }));
    expect(p.slice(0, 3).map((x) => x.skill)).toEqual(expect.arrayContaining(["visualization", "endgameKnowledge"]));
  });
  it("builds a seven-day week with measurable objectives", () => {
    const w = weeklyPlan(input());
    expect(w.days.map((d) => d.day)).toEqual(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
    expect(w.objectives).toHaveLength(3);
    expect(w.objectives[0].criterion).toContain("4 of your last 5");
  });
});

describe("diagnostic report", () => {
  it("refuses to diagnose without data", () => {
    const empty = Object.fromEntries(SKILLS.map((s) => [s.id, newSkill()])) as Record<SkillId, SkillState>;
    const r = buildReport(empty, [], T0);
    expect(r.enoughData).toBe(false);
    expect(r.strongest).toBeNull();
  });
  it("names strongest and weakest from scores and cites real counts", () => {
    const empty = Object.fromEntries(SKILLS.map((s) => [s.id, newSkill()])) as Record<SkillId, SkillState>;
    const skills = { ...empty, tactics: { score: 1500, rd: 80, n: 12, last: T0, history: [] }, endgameKnowledge: { score: 1000, rd: 80, n: 8, last: T0, history: [] } };
    const attempts = [
      ...["a", "b", "c", "d", "e"].map((id) => att({ itemId: id })),
      ...["f", "g", "h", "i"].map((id, i) => att({ itemId: id, concept: "theme:defensiveMove", skill: "defense", outcome: i === 0 ? "solo" : "failed" })),
    ];
    const r = buildReport(skills, attempts, T0);
    expect(r.strongest).toBe("tactics");
    expect(r.weakest).toBe("endgameKnowledge");
    expect(r.sentences.join(" ")).toContain("5 of 5 first-time attempts");
    expect(r.sentences.join(" ")).toContain("3 of 4 first-time attempts went wrong");
    expect(recurringMisses(attempts, T0)[0].concept).toBe("theme:defensiveMove");
  });
});

import { weekStart, weeklyStats } from "@/lib/learning/stats";
describe("weekly stats", () => {
  it("buckets by week, counts empty weeks, and measures accuracy on first-time attempts only", () => {
    const now = new Date(2026, 0, 14, 12).getTime(); // a Wednesday
    const mon = weekStart(now);
    expect(new Date(mon).getDay()).toBe(1);
    const list = [att({ t: mon + 1000 }), att({ t: mon + 2000, outcome: "failed" }), att({ t: mon + 3000, firstSeen: false }), att({ t: mon - 3 * DAY })];
    const w = weeklyStats(list, now, 4);
    expect(w).toHaveLength(4);
    expect(w[3]).toMatchObject({ attempts: 3, firstTime: 2, firstTimeSolo: 1 });
    expect(w[2].attempts).toBe(1);
    expect(w[0].attempts).toBe(0);
  });
});

import { weaknessDna } from "@/lib/learning/report";
describe("weakness DNA", () => {
  it("lists only patterns with enough evidence and a real miss rate, worst first", () => {
    const list = [
      ...["a", "b", "c", "d"].map((id, i) => att({ itemId: id, concept: "theme:pin", outcome: i < 3 ? "failed" : "solo" })),
      ...["e", "f", "g", "h"].map((id) => att({ itemId: id, concept: "theme:fork", outcome: "solo" })),
      ...["i", "j"].map((id) => att({ itemId: id, concept: "theme:skewer", outcome: "failed" })),
      att({ itemId: "a", concept: "theme:pin", outcome: "failed", firstSeen: false }),
    ];
    const dna = weaknessDna(list);
    expect(dna.map((d) => d.concept)).toEqual(["theme:pin"]);
    expect(dna[0]).toMatchObject({ misses: 3, attempts: 4, label: "pin puzzles" });
  });
});
