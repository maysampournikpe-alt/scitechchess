import type { Attempt } from "./mastery";
import { confidence, currentRd, SKILL_BY_ID, type SkillId, type SkillState } from "./skills";

/** Minimum first-time attempts before the report will say anything about a skill or pattern. */
export const MIN_SAMPLE = 4;

export type ConceptStat = { concept: string; skill: SkillId; attempts: number; solo: number; rate: number };

/** First-time, unassisted success rate per concept. Repeats of a known position are excluded. */
export function conceptStats(attempts: Attempt[], sinceMs = 0): ConceptStat[] {
  const map = new Map<string, ConceptStat>();
  for (const a of attempts) {
    if (!a.firstSeen || a.t < sinceMs) continue;
    const s = map.get(a.concept) ?? { concept: a.concept, skill: a.skill, attempts: 0, solo: 0, rate: 0 };
    s.attempts += 1;
    if (a.outcome === "solo") s.solo += 1;
    s.rate = s.solo / s.attempts;
    map.set(a.concept, s);
  }
  return [...map.values()];
}

/** Human label for a concept id like "theme:fork". */
export function conceptLabel(concept: string): string {
  const [kind, raw = ""] = concept.split(":");
  const words = raw.replace(/([a-z])([A-Z0-9])/g, "$1 $2").replace(/-/g, " ").toLowerCase();
  if (kind === "theme") return `${words} puzzles`;
  if (kind === "opening") return `the ${words} line`;
  if (kind === "endgame") return `${words} endgames`;
  return words;
}

export type Report = { enoughData: boolean; strongest: SkillId | null; weakest: SkillId | null; sentences: string[]; next: string[] };

/** A diagnostic report in plain sentences. Every sentence is backed by counts from the attempt log. */
export function buildReport(skills: Record<SkillId, SkillState>, attempts: Attempt[], now: number): Report {
  const measured = (Object.keys(skills) as SkillId[]).filter((id) => skills[id].n >= MIN_SAMPLE);
  if (measured.length < 2) {
    return {
      enoughData: false,
      strongest: null,
      weakest: null,
      sentences: [
        measured.length === 0
          ? "There is not enough data for a diagnosis yet. Take the assessment or solve a few exercises first."
          : `Only ${SKILL_BY_ID[measured[0]].name.toLowerCase()} has been measured so far. A comparison needs at least two measured skills.`,
      ],
      next: ["Take the assessment"],
    };
  }
  const sorted = [...measured].sort((a, b) => skills[b].score - skills[a].score);
  const strongest = sorted[0];
  const weakest = sorted.at(-1)!;
  const fmt = (id: SkillId) => `${Math.round(skills[id].score)} ±${Math.round(2 * currentRd(skills[id], now))}`;
  const sentences: string[] = [];
  const gap = skills[strongest].score - skills[weakest].score;
  const overlap = gap < 2 * (currentRd(skills[strongest], now) + currentRd(skills[weakest], now));
  sentences.push(`Your strongest measured area is ${SKILL_BY_ID[strongest].name.toLowerCase()} (${fmt(strongest)} from ${skills[strongest].n} attempts).`);
  sentences.push(
    `Your biggest improvement opportunity is ${SKILL_BY_ID[weakest].name.toLowerCase()} (${fmt(weakest)} from ${skills[weakest].n} attempts)` +
      (overlap ? ". The ranges still overlap, so treat this ordering as provisional until more attempts are in." : "."),
  );

  const stats = conceptStats(attempts).filter((s) => s.attempts >= MIN_SAMPLE);
  const reliable = stats.filter((s) => s.rate >= 0.8).sort((a, b) => b.attempts - a.attempts)[0];
  const missed = stats.filter((s) => s.rate <= 0.5).sort((a, b) => a.rate - b.rate || b.attempts - a.attempts);
  if (reliable) sentences.push(`You solve ${conceptLabel(reliable.concept)} reliably: ${reliable.solo} of ${reliable.attempts} first-time attempts without help.`);
  for (const m of missed.slice(0, 2)) sentences.push(`You often miss ${conceptLabel(m.concept)}: ${m.attempts - m.solo} of ${m.attempts} first-time attempts went wrong or needed help.`);

  const unmeasured = (Object.keys(skills) as SkillId[]).filter((id) => skills[id].n === 0);
  if (unmeasured.length) sentences.push(`Not measured yet: ${unmeasured.map((id) => SKILL_BY_ID[id].short.toLowerCase()).join(", ")}.`);

  const next = [`Work on ${SKILL_BY_ID[weakest].name.toLowerCase()}`, ...missed.slice(0, 2).map((m) => `Targeted practice on ${conceptLabel(m.concept)}`)];
  const lowConfidence = measured.filter((id) => confidence(skills[id], now) === "low");
  if (lowConfidence.length) next.push(`More attempts in ${lowConfidence.map((id) => SKILL_BY_ID[id].short.toLowerCase()).join(", ")} to narrow the range`);
  return { enoughData: true, strongest, weakest, sentences, next };
}

/** Concepts the learner keeps missing recently, for targeted practice. */
export function recurringMisses(attempts: Attempt[], now: number, windowDays = 21): ConceptStat[] {
  const since = now - windowDays * 86_400_000;
  return conceptStats(attempts, since)
    .filter((s) => s.attempts >= 3 && s.attempts - s.solo >= 2 && s.rate <= 0.5)
    .sort((a, b) => b.attempts - b.solo - (a.attempts - a.solo));
}

export type DnaTrait = { concept: string; label: string; misses: number; attempts: number; rate: number; skill: SkillId };

/**
 * "Weakness DNA": every concept the learner has met at least `min` times on new positions and
 * gets wrong or needs help with at least 40% of the time, worst first. Each trait carries its
 * counts, so the page can show the evidence next to the claim.
 */
export function weaknessDna(attempts: Attempt[], min = MIN_SAMPLE): DnaTrait[] {
  return conceptStats(attempts)
    .filter((s) => s.attempts >= min && 1 - s.rate >= 0.4)
    .map((s) => ({ concept: s.concept, label: conceptLabel(s.concept), misses: s.attempts - s.solo, attempts: s.attempts, rate: 1 - s.rate, skill: s.skill }))
    .sort((a, b) => b.rate - a.rate || b.attempts - a.attempts);
}
