/**
 * Skill model.
 *
 * Every skill has a "training score" on the same scale as puzzle difficulty in the Lichess
 * puzzle database (roughly 400-2800). It is an internal measure of performance on this
 * site's own tasks. It is not a FIDE, US Chess, Chess.com or Lichess rating and the app
 * never presents it as one.
 *
 * Scores are updated with the Glicko-1 formulas (Glickman, 1999): each attempt is treated as
 * a game against the exercise, whose difficulty is its rating. Alongside the score we keep a
 * rating deviation (RD). The app shows score ± 2·RD as the plausible range, so a skill
 * with few attempts is visibly uncertain.
 */
export type SkillId =
  | "tactics"
  | "calculation"
  | "openingKnowledge"
  | "openingUnderstanding"
  | "planning"
  | "evaluation"
  | "defense"
  | "endgameKnowledge"
  | "endgameConversion"
  | "visualization"
  | "decisions"
  | "time";

export type SkillDef = { id: SkillId; name: string; short: string; measuredBy: string };

export const SKILLS: SkillDef[] = [
  { id: "tactics", name: "Tactical pattern recognition", short: "Tactics", measuredBy: "First-try results on tactical puzzles, weighted by puzzle difficulty." },
  { id: "calculation", name: "Calculation", short: "Calculation", measuredBy: "Calculation mode: the whole line entered before any piece moves." },
  { id: "openingKnowledge", name: "Opening knowledge", short: "Opening lines", measuredBy: "Recall of your repertoire lines in the opening trainer." },
  { id: "openingUnderstanding", name: "Opening understanding", short: "Opening ideas", measuredBy: "Questions about plans, pawn breaks and piece placement in opening positions." },
  { id: "planning", name: "Strategic planning", short: "Planning", measuredBy: "Find-the-plan exercises in typical middlegame structures." },
  { id: "evaluation", name: "Positional evaluation", short: "Evaluation", measuredBy: "Questions about weak squares, pawn structure, trades and piece activity." },
  { id: "defense", name: "Defensive technique", short: "Defense", measuredBy: "Puzzles where the solution is a defensive or quiet move, and survival positions." },
  { id: "endgameKnowledge", name: "Endgame knowledge", short: "Endgame theory", measuredBy: "Choosing the correct move in theoretical endgame positions." },
  { id: "endgameConversion", name: "Endgame conversion", short: "Conversion", measuredBy: "Playing out won or drawn endgames against the engine." },
  { id: "visualization", name: "Board visualization", short: "Visualization", measuredBy: "Board-vision and blindfold drills answered without moving pieces." },
  { id: "decisions", name: "Practical decision-making", short: "Decisions", measuredBy: "Move quality in your games against the computer, judged by the engine." },
  { id: "time", name: "Time management", short: "Time", measuredBy: "Move quality in clocked games, compared between calm and low-time moves." },
];

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s])) as Record<SkillId, SkillDef>;

export type SkillState = {
  score: number;
  rd: number;
  /** Number of scored attempts. */
  n: number;
  /** Time of the last scored attempt (ms since epoch), or null. */
  last: number | null;
  history: { t: number; score: number; rd: number }[];
};

export const MAX_RD = 350;
export const MIN_RD = 45;
const Q = Math.LN10 / 400;
/** RD grows by this many points per sqrt(day) without practice, so stale scores become uncertain again. */
const C_PER_DAY = 12;
const DAY = 86_400_000;

export function newSkill(prior = 1200): SkillState {
  return { score: prior, rd: MAX_RD, n: 0, last: null, history: [] };
}

/** RD after `now`, allowing for time since the last attempt. */
export function currentRd(s: SkillState, now: number): number {
  if (s.last === null) return s.rd;
  const days = Math.max(0, (now - s.last) / DAY);
  return Math.min(MAX_RD, Math.sqrt(s.rd * s.rd + C_PER_DAY * C_PER_DAY * days));
}

const g = (rd: number) => 1 / Math.sqrt(1 + (3 * Q * Q * rd * rd) / (Math.PI * Math.PI));

/** Probability the model gives of solving an item of this difficulty. */
export function expected(score: number, difficulty: number, itemRd = 0): number {
  return 1 / (1 + Math.pow(10, (-g(itemRd) * (score - difficulty)) / 400));
}

/**
 * One Glicko-1 update.
 * @param result 1 = solved unassisted, 0.5 = solved after a light hint, 0 = failed or needed real help
 * @param itemRd how uncertain the item's difficulty is (authored items: 200; database puzzles: 80)
 */
export function update(s: SkillState, difficulty: number, result: number, now: number, itemRd = 80): SkillState {
  const rd = currentRd(s, now);
  const gi = g(itemRd);
  const e = expected(s.score, difficulty, itemRd);
  const d2 = 1 / (Q * Q * gi * gi * e * (1 - e));
  const denom = 1 / (rd * rd) + 1 / d2;
  const score = s.score + (Q / denom) * gi * (result - e);
  const newRd = Math.max(MIN_RD, Math.sqrt(1 / denom));
  const history = [...s.history, { t: now, score: Math.round(score), rd: Math.round(newRd) }].slice(-200);
  return { score, rd: newRd, n: s.n + 1, last: now, history };
}

export type Confidence = "not measured" | "low" | "medium" | "high";

export function confidence(s: SkillState, now: number): Confidence {
  if (s.n === 0) return "not measured";
  const rd = currentRd(s, now);
  if (rd > 200) return "low";
  if (rd > 110) return "medium";
  return "high";
}

export function range(s: SkillState, now: number): { low: number; high: number } {
  const rd = currentRd(s, now);
  return { low: Math.round(s.score - 2 * rd), high: Math.round(s.score + 2 * rd) };
}

/** Starting guess from what the person says about their experience. Replaced by evidence quickly because RD starts at the maximum. */
export const EXPERIENCE_PRIOR: Record<string, number> = {
  beginner: 600,
  knowsMoves: 800,
  casual: 1000,
  intermediate: 1400,
  tournament: 1700,
  advanced: 2000,
};
