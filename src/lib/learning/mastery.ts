import type { SkillId } from "./skills";

/** One scored attempt at one exercise. This log is the only source of truth for progress. */
export type Attempt = {
  t: number;
  itemId: string;
  module: "puzzle" | "calculation" | "opening" | "endgame" | "plan" | "quiz" | "vision" | "game" | "assessment";
  skill: SkillId;
  /** Concept id, e.g. "theme:fork", "opening:italian-main", "endgame:lucena". */
  concept: string;
  difficulty: number;
  /** solo = every move right first time, no hints. assisted = no wrong move, but hints were used. failed = a wrong move or the solution was shown. */
  outcome: "solo" | "assisted" | "failed";
  hints: number;
  ms: number;
  /** True the first time this person ever saw this item. */
  firstSeen: boolean;
  /** Where the attempt happened, e.g. a journey step id or "checkpoint:to-1200". */
  context?: string;
};

export type MasteryState = "not_started" | "introduced" | "practicing" | "demonstrated" | "retention_verified" | "needs_review";

export const MASTERY_LABEL: Record<MasteryState, string> = {
  not_started: "Not started",
  introduced: "Introduced",
  practicing: "Practicing",
  demonstrated: "Demonstrated",
  retention_verified: "Retention verified",
  needs_review: "Needs review",
};

const DAY = 86_400_000;
/** Evidence rules. Deliberately strict: watching or a few easy successes is never enough. */
export const RULES = {
  /** Unassisted first-time successes on this many different positions... */
  soloOnNewItems: 3,
  /** ...with at least this many of the last five first-time attempts unassisted. */
  recentWindow: 5,
  recentSolo: 4,
  /** A later unassisted success at least this long after demonstration verifies retention. */
  retentionDelayDays: 3,
  /** Two failures in a row, or this long without practice, sends a concept back to review. */
  staleDays: 45,
};

export type Mastery = { state: MasteryState; attempts: number; solo: number; demonstratedAt: number | null; verifiedAt: number | null; lastAttempt: number | null };

/** Derive a concept's mastery state from its attempts (any order) and whether its lesson was opened. */
export function mastery(all: Attempt[], concept: string, introduced: boolean, now: number): Mastery {
  const list = all.filter((a) => a.concept === concept).sort((a, b) => a.t - b.t);
  const base: Mastery = { state: introduced ? "introduced" : "not_started", attempts: list.length, solo: list.filter((a) => a.outcome === "solo").length, demonstratedAt: null, verifiedAt: null, lastAttempt: list.at(-1)?.t ?? null };
  if (list.length === 0) return base;

  let demonstratedAt: number | null = null;
  let verifiedAt: number | null = null;
  const firstTimes: Attempt[] = [];
  const soloNew = new Set<string>();
  for (const a of list) {
    if (a.firstSeen) {
      firstTimes.push(a);
      if (a.outcome === "solo") soloNew.add(a.itemId);
    }
    if (demonstratedAt === null) {
      const recent = firstTimes.slice(-RULES.recentWindow);
      const recentSolo = recent.filter((x) => x.outcome === "solo").length;
      const needed = Math.min(RULES.recentSolo, recent.length);
      if (soloNew.size >= RULES.soloOnNewItems && recentSolo >= needed && recent.length >= RULES.soloOnNewItems) demonstratedAt = a.t;
    } else if (verifiedAt === null && a.outcome === "solo" && a.t - demonstratedAt >= RULES.retentionDelayDays * DAY) {
      verifiedAt = a.t;
    }
  }

  let state: MasteryState = "practicing";
  if (demonstratedAt !== null) state = verifiedAt !== null ? "retention_verified" : "demonstrated";
  if (demonstratedAt !== null) {
    const lastTwo = list.slice(-2);
    const twoFails = lastTwo.length === 2 && lastTwo.every((a) => a.outcome === "failed") && lastTwo[0].t >= demonstratedAt;
    const stale = now - list.at(-1)!.t > RULES.staleDays * DAY;
    if (twoFails || stale) state = "needs_review";
  }
  return { ...base, state, demonstratedAt, verifiedAt };
}

/** Result (0..1) a single attempt contributes to the skill score. */
export function attemptResult(a: Pick<Attempt, "outcome" | "hints">): number {
  if (a.outcome === "solo") return 1;
  if (a.outcome === "assisted" && a.hints <= 1) return 0.5;
  return 0;
}
