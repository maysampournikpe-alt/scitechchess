import { confidence, currentRd, SKILL_BY_ID, type SkillId, type SkillState } from "./skills";

/**
 * Rule-based, explainable training plans. Every block carries the reason it was chosen,
 * built from the learner's own numbers, so the plan can always answer "why this?".
 */
export type Profile = {
  experience: string;
  rating: number | null;
  ratingSource: string;
  goal: string;
  goalRating: number | null;
  minutesPerDay: number;
  weaknesses: string[];
  preference: "exercises" | "short" | "videos" | "lessons" | "mix";
  createdAt: number;
};

export type PlanBlock = { id: string; minutes: number; title: string; href: string; skill?: SkillId; why: string };
export type DayPlan = { date: string; focus: SkillId[]; blocks: PlanBlock[]; totalMinutes: number };

/** Where each skill is trained. Skills without a module yet are not scheduled. */
export const SKILL_MODULE: Record<SkillId, { href: string; title: string } | null> = {
  tactics: { href: "/puzzles/", title: "Adaptive tactics" },
  calculation: { href: "/calculation/", title: "Calculation without moving the pieces" },
  openingKnowledge: { href: "/openings/", title: "Opening repertoire practice" },
  openingUnderstanding: { href: "/openings/", title: "Opening ideas and plans" },
  planning: { href: "/middlegame/", title: "Find the plan" },
  evaluation: { href: "/middlegame/", title: "Positional judgement" },
  defense: { href: "/puzzles/?theme=defensiveMove", title: "Defensive tactics" },
  endgameKnowledge: { href: "/endgames/", title: "Endgame theory" },
  endgameConversion: { href: "/endgames/", title: "Endgame practice against the engine" },
  visualization: { href: "/vision/", title: "Board vision drills" },
  decisions: { href: "/play/", title: "Training game and review" },
  time: { href: "/play/?clock=1", title: "Clocked training game" },
};

/** What a learner says in onboarding, mapped to the skills it points at. */
export const WEAKNESS_SKILLS: Record<string, SkillId[]> = {
  blunders: ["decisions", "defense"],
  tactics: ["tactics"],
  openings: ["openingUnderstanding", "openingKnowledge"],
  positional: ["evaluation", "planning"],
  middlegame: ["planning"],
  endgames: ["endgameKnowledge", "endgameConversion"],
  calculation: ["calculation", "visualization"],
  time: ["time"],
  specificOpenings: ["openingKnowledge"],
};

export type PlanInput = {
  profile: Profile;
  skills: Record<SkillId, SkillState>;
  dueReviews: number;
  /** Concepts with recent failures, most-missed first, e.g. { label: "knight forks", href, misses: 4, of: 6 }. */
  recurring: { label: string; href: string; skill: SkillId; misses: number; of: number }[];
  now: number;
};

export type Priority = { skill: SkillId; value: number; why: string };

/** Rank trainable skills by need. Higher = more urgent. */
export function priorities(input: PlanInput): Priority[] {
  const { skills, profile, now } = input;
  const ids = (Object.keys(skills) as SkillId[]).filter((id) => SKILL_MODULE[id]);
  const measured = ids.filter((id) => skills[id].n >= 3);
  const mean = measured.length ? measured.reduce((s, id) => s + skills[id].score, 0) / measured.length : null;
  const stated = new Set(profile.weaknesses.flatMap((w) => WEAKNESS_SKILLS[w] ?? []));

  return ids
    .map((id) => {
      const s = skills[id];
      const name = SKILL_BY_ID[id].name.toLowerCase();
      const rd = Math.round(currentRd(s, now));
      const deficit = mean !== null && s.n >= 3 ? (mean - s.score) / 100 : 0;
      const uncertainty = currentRd(s, now) / 175; // 0.26 .. 2
      const said = stated.has(id) ? 1 : 0;
      const value = Math.max(0, deficit) * 1.5 + uncertainty + said;
      let why: string;
      if (s.n >= 3 && mean !== null && deficit >= 0.5)
        why = `Your ${name} score is ${Math.round(s.score)} (±${2 * rd}), ${Math.round(mean - s.score)} below your average of ${Math.round(mean)} across measured skills.`;
      else if (s.n < 3)
        why = `Your ${name} has ${s.n === 0 ? "not been measured yet" : `only ${s.n} scored attempt${s.n === 1 ? "" : "s"}`}, so this session also gathers evidence.`;
      else if (said) why = `You told us this is a weak area, and your ${name} score is ${Math.round(s.score)} (±${2 * rd}, ${confidence(s, now)} confidence).`;
      else why = `Keeps your ${name} (${Math.round(s.score)} ±${2 * rd}) from going stale.`;
      if (said && s.n < 3) why += " You also named it as a weakness.";
      return { skill: id, value, why };
    })
    .sort((a, b) => b.value - a.value);
}

const isoDate = (t: number) => new Date(t).toISOString().slice(0, 10);

export function dailyPlan(input: PlanInput, focusFirst?: SkillId): DayPlan {
  const total = Math.max(5, Math.round(input.profile.minutesPerDay));
  const blocks: PlanBlock[] = [];
  let left = total;

  if (input.dueReviews > 0) {
    const m = Math.max(3, Math.min(Math.round(total * 0.3), Math.ceil(input.dueReviews * 1.5)));
    blocks.push({ id: "review", minutes: m, title: "Review due positions", href: "/mistakes/?due=1", why: `${input.dueReviews} position${input.dueReviews === 1 ? " is" : "s are"} due for spaced review today. Reviewing at the scheduled time is what turns a solved exercise into something you keep.` });
    left -= m;
  }

  const top = input.recurring[0];
  if (top && left >= 10) {
    const m = Math.max(5, Math.round(total * 0.15));
    blocks.push({ id: "recurring", minutes: m, title: `Targeted practice: ${top.label}`, href: top.href, skill: top.skill, why: `You missed ${top.misses} of your last ${top.of} ${top.label} exercises, the most of any pattern.` });
    left -= m;
  } else if (left >= 10) {
    const m = Math.max(3, Math.round(total * 0.15));
    blocks.push({ id: "warmup", minutes: m, title: "Tactical warm-up", href: "/puzzles/?mode=warmup", skill: "tactics", why: "A short set of easier puzzles to practise retrieving patterns before the main work." });
    left -= m;
  }

  let ranked = priorities(input);
  if (focusFirst) ranked = [...ranked.filter((p) => p.skill === focusFirst), ...ranked.filter((p) => p.skill !== focusFirst)];
  // Two skills that share a module (e.g. planning and evaluation) should not both take a slot.
  const seen = new Set<string>();
  const distinct = ranked.filter((p) => {
    const href = SKILL_MODULE[p.skill]!.href;
    if (seen.has(href)) return false;
    seen.add(href);
    return true;
  });
  const count = left >= 40 ? 3 : left >= 18 ? 2 : 1;
  const chosen = distinct.slice(0, count);
  const sum = chosen.reduce((s, p) => s + Math.max(p.value, 0.2), 0);
  let assigned = 0;
  chosen.forEach((p, i) => {
    const share = Math.max(p.value, 0.2) / sum;
    const m = i === chosen.length - 1 ? left - assigned : Math.max(5, Math.round(left * share));
    assigned += m;
    if (m <= 0) return;
    blocks.push({ id: p.skill, minutes: m, title: SKILL_MODULE[p.skill]!.title, href: SKILL_MODULE[p.skill]!.href, skill: p.skill, why: p.why });
  });

  return { date: isoDate(input.now), focus: chosen.map((p) => p.skill), blocks, totalMinutes: blocks.reduce((s, b) => s + b.minutes, 0) };
}

export type WeekPlan = { objectives: { skill: SkillId; text: string; criterion: string }[]; days: { day: string; title: string; skill?: SkillId; note: string }[] };

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** A flexible week: the five highest-need skills on weekdays, a game on Saturday, review on Sunday. */
export function weeklyPlan(input: PlanInput): WeekPlan {
  const ranked = priorities(input);
  const seen = new Set<string>();
  const distinct = ranked.filter((p) => {
    const href = SKILL_MODULE[p.skill]!.href.split("?")[0];
    if (p.skill === "decisions" || p.skill === "time" || seen.has(href)) return false;
    seen.add(href);
    return true;
  });
  const weekday = Array.from({ length: 5 }, (_, i) => distinct[i % Math.max(1, distinct.length)]);
  const days = weekday.map((p, i) => ({ day: DAY_NAMES[i], title: SKILL_MODULE[p.skill]!.title, skill: p.skill, note: p.why }));
  days.push({ day: "Saturday", title: "Training game against the computer, then review it", skill: "decisions", note: "A full game shows which mistakes you make when nobody tells you there is a tactic. The review turns your errors into exercises." });
  days.push({ day: "Sunday", title: "Review and reflection", skill: undefined as unknown as SkillId, note: "Clear the spaced-review queue, retake a few assessment positions, and write one line in your journal about what you learned." });
  const objectives = distinct.slice(0, 3).map((p) => ({
    skill: p.skill,
    text: `Improve ${SKILL_BY_ID[p.skill].name.toLowerCase()}`,
    criterion: `Met when at least 4 of your last 5 first-time ${SKILL_BY_ID[p.skill].short.toLowerCase()} exercises are solved without help, across 3 or more new positions.`,
  }));
  return { objectives, days };
}
