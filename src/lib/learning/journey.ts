import { LEVELS, OPENING_CHOICES, type JourneyNode, type Level, type Unit } from "@/content/journey";
import { LESSON_BY_ID } from "@/content/lessons";
import { OPENING_BY_ID, OPENINGS } from "@/content/openings";
import type { Attempt } from "./mastery";
import { priorities, type PlanInput, type Profile } from "./plan";

/**
 * Journey state, derived entirely from the attempt log: a step is complete only when the
 * recorded results say so. Nothing here is stored separately, so it cannot drift from reality.
 */
export const CHECKPOINT = { size: 8, need: 6 } as const;

export type NodeState = { node: JourneyNode; done: boolean; locked: boolean; progress: string; minutes: number; openingId?: string; unavailable?: boolean };
export type UnitState = { unit: Unit; nodes: NodeState[]; done: number; focus: boolean };
export type LevelStatus = "passed" | "placed-above" | "current" | "ahead" | "beyond-goal";
export type LevelState = { level: Level; index: number; status: LevelStatus; units: UnitState[]; checkpointPassed: boolean; remainingMinutes: number; nodesDone: number; nodesTotal: number };
export type Journey = { levels: LevelState[]; startIndex: number; currentIndex: number; goalIndex: number; next: { level: Level; node: NodeState } | null; estimate: number };

export type JourneyInput = Pick<PlanInput, "profile" | "skills" | "now"> & { attempts: Attempt[]; introduced: string[]; repertoire: string[]; videoTopics: Set<string> | null };

const GOAL_TAG: Record<string, string> = { tactics: "tactics", openings: "openings", positional: "positional", endgame: "endgame", tournament: "tournament" };

export function levelIndexFor(score: number): number {
  const i = LEVELS.findIndex((l) => score < l.to);
  return i === -1 ? LEVELS.length - 1 : i;
}

/** The level the goal points at. Rating goals map onto the level that ends at or above them. */
export function goalIndex(profile: Profile, startIndex: number): number {
  if (profile.goalRating) {
    const i = LEVELS.findIndex((l) => l.to >= profile.goalRating!);
    return i === -1 ? LEVELS.length - 1 : i;
  }
  if (profile.goal === "learn") return Math.max(startIndex, 1);
  if (profile.goal === "title") return LEVELS.length - 1;
  return Math.min(LEVELS.length - 1, startIndex + 2);
}

/** Which opening fills a repertoire slot: the learner's own choice first, otherwise the level's suggestion. */
export function openingFor(slot: "white" | "vsE4" | "vsD4", levelId: string, repertoire: string[]): string {
  const group = slot === "white" ? "White" : slot === "vsE4" ? "Black against 1.e4" : "Black against 1.d4";
  const mine = repertoire.find((id) => OPENING_BY_ID[id]?.group === group);
  if (mine) return mine;
  const keys = Object.keys(OPENING_CHOICES);
  const order = LEVELS.map((l) => l.id);
  const key = [...keys].reverse().find((k) => order.indexOf(k) <= order.indexOf(levelId)) ?? keys[0];
  return OPENING_CHOICES[key][slot][0] ?? OPENINGS.find((o) => o.group === group)!.id;
}

function solo(attempts: Attempt[], pred: (a: Attempt) => boolean): number {
  return new Set(attempts.filter((a) => a.outcome === "solo" && pred(a)).map((a) => a.itemId)).size;
}

export function checkpointPassed(attempts: Attempt[], levelId: string): boolean {
  const mine = attempts.filter((a) => a.context === `checkpoint:${levelId}`);
  // Judge each sitting of CHECKPOINT.size puzzles separately; any passing sitting counts.
  for (let i = 0; i + CHECKPOINT.size <= mine.length; i += CHECKPOINT.size) {
    if (mine.slice(i, i + CHECKPOINT.size).filter((a) => a.outcome === "solo").length >= CHECKPOINT.need) return true;
  }
  return false;
}

function nodeState(node: JourneyNode, level: Level, input: JourneyInput): Omit<NodeState, "locked"> {
  const { attempts, introduced, repertoire } = input;
  switch (node.kind) {
    case "lesson": {
      const lesson = LESSON_BY_ID[node.lesson];
      const right = lesson.questions.filter((_, i) => attempts.some((a) => a.itemId === `lesson:${lesson.id}:${i}` && a.outcome === "solo")).length;
      return { node, done: right === lesson.questions.length, progress: `${right} of ${lesson.questions.length} questions right`, minutes: lesson.minutes };
    }
    case "puzzles": {
      const n = solo(attempts, (a) => a.context === node.id);
      return { node, done: n >= node.need, progress: `${Math.min(n, node.need)} of ${node.need} solved without help`, minutes: Math.round(node.count * 1.5) };
    }
    case "video": {
      const unavailable = input.videoTopics !== null && !input.videoTopics.has(node.topic);
      const watched = introduced.includes(`video:${node.id}`);
      return { node, done: watched || unavailable, unavailable, progress: unavailable ? "No checked video for this topic yet: skipped" : watched ? "Watched" : "Not watched yet", minutes: 12 };
    }
    case "opening": {
      const id = openingFor(node.slot, level.id, repertoire);
      const ok = solo(attempts, (a) => a.itemId === `opening-line:${id}`) > 0;
      return { node, openingId: id, done: ok, progress: ok ? "Main line played from memory" : "Play the main line from memory once", minutes: 10 };
    }
    case "endgame": {
      const ok = solo(attempts, (a) => a.itemId === `endgame-play:${node.endgame}`) > 0;
      return { node, done: ok, progress: ok ? "Played out without a slip" : "Play it out against the engine without a slip", minutes: 8 };
    }
    case "plan": {
      const ok = solo(attempts, (a) => a.itemId === `plan:${node.plan}`) > 0;
      return { node, done: ok, progress: ok ? "Found the plan" : "Find the main plan", minutes: 6 };
    }
    case "game": {
      const ok = attempts.some((a) => a.itemId === `model:${node.game}` && a.outcome !== "failed");
      return { node, done: ok, progress: ok ? "Studied" : "Guess at least 40% of the moves", minutes: 12 };
    }
    case "drill": {
      const n = solo(attempts, (a) => a.context === node.id);
      return { node, done: n >= node.need, progress: `${Math.min(n, node.need)} of ${node.need} done cleanly`, minutes: node.need * 2 };
    }
  }
}

export function buildJourney(input: JourneyInput): Journey {
  const { profile, skills, attempts } = input;
  const startIndex = levelIndexFor(skills.tactics.score);
  const passedUpTo = Math.max(-1, ...LEVELS.map((l, i) => (checkpointPassed(attempts, l.id) ? i : -1)));
  const currentIndex = Math.min(LEVELS.length - 1, Math.max(startIndex, passedUpTo + 1));
  const gIndex = Math.max(goalIndex(profile, startIndex), currentIndex);
  const rank = new Map(priorities({ ...input, dueReviews: 0, recurring: [] }).map((p, i) => [p.skill, i]));
  const goalTag = GOAL_TAG[profile.goal];

  const levels: LevelState[] = LEVELS.map((level, index) => {
    const units = [...level.units].sort((a, b) => {
      const fa = goalTag && a.goalTags.includes(goalTag) ? 0 : 1;
      const fb = goalTag && b.goalTags.includes(goalTag) ? 0 : 1;
      return fa - fb || (rank.get(a.skill) ?? 99) - (rank.get(b.skill) ?? 99);
    });
    const checkpoint = checkpointPassed(attempts, level.id);
    const passed = checkpoint || index <= passedUpTo;
    const unitStates: UnitState[] = units.map((unit) => {
      const nodes = unit.nodes.map((n) => ({ ...nodeState(n, level, input), locked: index > currentIndex && !passed }));
      return { unit, nodes, done: nodes.filter((n) => n.done).length, focus: !!goalTag && unit.goalTags.includes(goalTag) };
    });
    // In the current level, steps open in order: the first unfinished one, plus everything already done.
    if (index === currentIndex && !passed) {
      let opened = false;
      for (const n of unitStates.flatMap((u) => u.nodes)) {
        n.locked = !n.done && opened;
        if (!n.done) opened = true;
      }
    }
    const all = unitStates.flatMap((u) => u.nodes);
    const status: LevelStatus = passed ? "passed" : index < startIndex ? "placed-above" : index === currentIndex ? "current" : index > gIndex ? "beyond-goal" : "ahead";
    return { level, index, status, units: unitStates, checkpointPassed: checkpoint, remainingMinutes: all.filter((n) => !n.done).reduce((s, n) => s + n.minutes, 0), nodesDone: all.filter((n) => n.done).length, nodesTotal: all.length };
  });

  const cur = levels[currentIndex];
  const nextNode = cur.units.flatMap((u) => u.nodes).find((n) => !n.done && !n.locked) ?? null;
  const estimate = levels.slice(currentIndex, gIndex + 1).reduce((s, l) => s + l.remainingMinutes + 15, 0);
  return { levels, startIndex, currentIndex, goalIndex: gIndex, next: nextNode ? { level: cur.level, node: nextNode } : null, estimate };
}

export function findNode(id: string): { level: Level; unit: Unit; node: JourneyNode } | null {
  for (const level of LEVELS) for (const unit of level.units) for (const node of unit.nodes) if (node.id === id) return { level, unit, node };
  return null;
}
