import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { Chess } from "chess.js";
import { LEVELS, OPENING_CHOICES } from "@/content/journey";
import { LESSONS, LESSON_BY_ID } from "@/content/lessons";
import { OPENING_BY_ID } from "@/content/openings";
import { ENDGAME_BY_ID } from "@/content/endgames";
import { PLAN_BY_ID } from "@/content/middlegame";
import { MODEL_GAME_BY_ID } from "@/content/games";
import { THEME_BY_ID } from "@/lib/learning/select";
import { buildJourney, checkpointPassed, goalIndex, levelIndexFor, openingFor, type JourneyInput } from "@/lib/learning/journey";
import { newSkill, SKILLS, type SkillId, type SkillState } from "@/lib/learning/skills";
import type { Attempt } from "@/lib/learning/mastery";
import type { Profile } from "@/lib/learning/plan";
import { UciClient } from "@/lib/engine/uci";
import { gradeMove } from "@/lib/engine/judge";
import { loosePieces } from "@/lib/chess/features";
import { applyText } from "@/lib/chess/rules";
import { allPuzzleRows } from "./puzzle-data";

describe("journey content", () => {
  const ids = LEVELS.flatMap((l) => l.units.flatMap((u) => u.nodes.map((n) => n.id)));
  it("every step id is unique and every reference exists", () => {
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of LEVELS)
      for (const u of l.units)
        for (const n of u.nodes) {
          if (n.kind === "lesson") expect(LESSON_BY_ID[n.lesson], n.id).toBeTruthy();
          if (n.kind === "endgame") expect(ENDGAME_BY_ID[n.endgame], n.id).toBeTruthy();
          if (n.kind === "plan") expect(PLAN_BY_ID[n.plan], n.id).toBeTruthy();
          if (n.kind === "game") expect(MODEL_GAME_BY_ID[n.game], n.id).toBeTruthy();
          if (n.kind === "puzzles" && n.theme) expect(THEME_BY_ID[n.theme], n.id).toBeTruthy();
          if (n.kind === "puzzles") expect(n.need).toBeLessThanOrEqual(n.count);
        }
    for (const slots of Object.values(OPENING_CHOICES)) for (const list of Object.values(slots)) for (const id of list) expect(OPENING_BY_ID[id], id).toBeTruthy();
  });
  it("levels are contiguous and every unit mixes activity types", () => {
    for (let i = 1; i < LEVELS.length; i++) expect(LEVELS[i].from).toBe(LEVELS[i - 1].to);
    for (const l of LEVELS) expect(new Set(l.units.flatMap((u) => u.nodes.map((n) => n.kind))).size).toBeGreaterThanOrEqual(3);
  });
  it("every themed puzzle step has enough shipped puzzles near its level", () => {
    const rows = allPuzzleRows();
    for (const l of LEVELS)
      for (const u of l.units)
        for (const n of u.nodes)
          if (n.kind === "puzzles") {
            const lo = l.from - 300, hi = l.to + 200;
            const n2 = rows.filter((r) => r[3] >= lo && r[3] <= hi && (!n.theme || r[4].split(" ").includes(n.theme))).length;
            expect(n2, `${n.id}: ${n.theme} between ${lo} and ${hi}`).toBeGreaterThanOrEqual(n.count * 3);
          }
  });
  it("lesson board positions are legal and the facts stated about them hold", () => {
    for (const l of LESSONS) {
      for (const b of l.blocks) if (b.kind === "board") expect(() => new Chess(b.fen), `${l.id}: ${b.fen}`).not.toThrow();
      for (const q of l.questions) {
        if (q.kind === "choice") expect(q.options.filter((o) => o.correct), l.id).toHaveLength(1);
        if (q.fen) new Chess(q.fen);
      }
    }
    const safety = new Chess(LESSON_BY_ID["piece-safety"].questions[0].fen!);
    expect(loosePieces(safety, "b").map((p) => p.square)).toEqual(["d5"]);
    expect(new Chess("4k3/8/2n5/1B6/8/8/8/4K3 b - - 0 1").moves({ square: "c6" })).toEqual([]);
    const iqp = new Chess("r1bq1rk1/pp2bppp/2n2n2/3p4/3P4/2NB1N2/PP3PPP/R1BQ1RK1 w - - 0 1");
    const files = iqp.board().flat().filter((p) => p?.type === "p" && p.color === "w").map((p) => p!.square[0]);
    expect(files).toContain("d");
    expect(files).not.toContain("c");
    expect(files).not.toContain("e");
  });
});

describe("lesson move answers, checked with Stockfish", () => {
  const require = createRequire(import.meta.url);
  let client: UciClient;
  let sf: { processCommand(c: string): void; terminate(): void };
  beforeAll(async () => {
    sf = require("stockfish")("lite-single", (line: string) => client.receive(line));
    client = new UciClient((c) => sf.processCommand(c));
    await client.init();
  });
  afterAll(() => sf.terminate());
  for (const l of LESSONS)
    l.questions.forEach((q, i) => {
      if (q.kind !== "move") return;
      it(`${l.id} question ${i + 1}: every accepted answer is legal and best (or mates)`, async () => {
        for (const san of q.answers) {
          const c = new Chess(q.fen);
          const m = applyText(c, san);
          expect(m, `${l.id}: ${san}`).not.toBeNull();
          if (q.mate) expect(c.isCheckmate(), `${san} should mate`).toBe(true);
          else {
            const g = await gradeMove(client, q.fen, m!.from + m!.to + (m!.promotion ?? ""), 16);
            expect(["best", "excellent"], `${l.id}: ${san} is ${g.judgement.quality}`).toContain(g.judgement.quality);
          }
        }
      });
    });
});

const T0 = Date.UTC(2026, 0, 5);
const profile = (o: Partial<Profile> = {}): Profile => ({ experience: "casual", rating: null, ratingSource: "x", goal: "r2000", goalRating: 2000, minutesPerDay: 30, weaknesses: [], preference: "mix", createdAt: T0, ...o });
const skills = (tactics = 1000): Record<SkillId, SkillState> => ({ ...(Object.fromEntries(SKILLS.map((s) => [s.id, newSkill()])) as Record<SkillId, SkillState>), tactics: { ...newSkill(tactics), n: 10 } });
const input = (o: Partial<JourneyInput> = {}): JourneyInput => ({ profile: profile(), skills: skills(), now: T0, attempts: [], introduced: [], repertoire: [], videoTopics: new Set(["Forks, pins and skewers"]), ...o });
const att = (o: Partial<Attempt>): Attempt => ({ t: T0, itemId: "x", module: "puzzle", skill: "tactics", concept: "c", difficulty: 1000, outcome: "solo", hints: 0, ms: 1, firstSeen: true, ...o });

describe("journey engine", () => {
  it("places the learner by measured level and points the goal at the right level", () => {
    expect(LEVELS[levelIndexFor(650)].id).toBe("foundations");
    expect(LEVELS[levelIndexFor(1250)].id).toBe("to-1400");
    expect(LEVELS[levelIndexFor(3000)].id).toBe("to-2200");
    expect(LEVELS[goalIndex(profile(), 0)].id).toBe("to-2000");
    expect(LEVELS[goalIndex(profile({ goalRating: 1500 }), 0)].id).toBe("to-1600");
    const j = buildJourney(input());
    expect(LEVELS[j.currentIndex].id).toBe("to-1200");
    expect(j.levels[j.goalIndex].level.id).toBe("to-2000");
    expect(j.levels[0].status).toBe("placed-above");
  });
  it("opens steps in order in the current level and locks later levels", () => {
    const j = buildJourney(input());
    const cur = j.levels[j.currentIndex].units.flatMap((u) => u.nodes);
    expect(cur[0].locked).toBe(false);
    expect(cur.slice(1).filter((n) => !n.done).every((n) => n.locked)).toBe(true);
    expect(j.levels[j.currentIndex + 1].units.flatMap((u) => u.nodes).every((n) => n.locked)).toBe(true);
    expect(j.next?.node.node.id).toBe(cur[0].node.id);
  });
  it("completes steps only from recorded results, and hints never count", () => {
    const j0 = buildJourney(input());
    const first = j0.levels[j0.currentIndex].units[0];
    const lessonNode = LEVELS[j0.currentIndex].units.flatMap((u) => u.nodes).find((n) => n.kind === "lesson")!;
    const lesson = lessonNode.kind === "lesson" ? LESSON_BY_ID[lessonNode.lesson] : null!;
    const hinted = lesson.questions.map((_, i) => att({ itemId: `lesson:${lesson.id}:${i}`, outcome: "assisted" }));
    const j1 = buildJourney(input({ attempts: hinted }));
    expect(j1.levels[j1.currentIndex].units.flatMap((u) => u.nodes).find((n) => n.node.id === lessonNode.id)!.done).toBe(false);
    const right = lesson.questions.map((_, i) => att({ itemId: `lesson:${lesson.id}:${i}` }));
    const j2 = buildJourney(input({ attempts: right }));
    expect(j2.levels[j2.currentIndex].units.flatMap((u) => u.nodes).find((n) => n.node.id === lessonNode.id)!.done).toBe(true);
    expect(first.nodes.length).toBeGreaterThan(0);
  });
  it("puts the learner's weakest skill and goal focus first", () => {
    const weakEnd = { ...skills(1100), endgameKnowledge: { ...newSkill(700), n: 10 } };
    const j = buildJourney(input({ skills: weakEnd, profile: profile({ goal: "endgame", goalRating: null }) }));
    expect(j.levels[j.currentIndex].units[0].unit.skill).toBe("endgameKnowledge");
    expect(j.levels[j.currentIndex].units[0].focus).toBe(true);
  });
  it("a passed checkpoint completes the level and moves the learner on; a failed one does not", () => {
    const sitting = (solo: number) => Array.from({ length: 8 }, (_, i) => att({ itemId: `p${i}${solo}`, context: "checkpoint:to-1200", outcome: i < solo ? "solo" : "failed" }));
    expect(checkpointPassed(sitting(5), "to-1200")).toBe(false);
    expect(checkpointPassed(sitting(6), "to-1200")).toBe(true);
    const j = buildJourney(input({ attempts: sitting(6) }));
    expect(LEVELS[j.currentIndex].id).toBe("to-1400");
    expect(j.levels[2].status).toBe("passed");
  });
  it("a video step with no checked video is skipped instead of blocking the path", () => {
    const j = buildJourney(input({ videoTopics: new Set() }));
    const v = j.levels.flatMap((l) => l.units.flatMap((u) => u.nodes)).find((n) => n.node.kind === "video")!;
    expect(v.done).toBe(true);
    expect(v.unavailable).toBe(true);
  });
  it("uses the learner's own repertoire for opening steps", () => {
    expect(openingFor("vsE4", "to-1200", ["french"])).toBe("french");
    expect(openingFor("vsE4", "to-1200", [])).toBe("caro-kann");
    expect(openingFor("white", "to-1000", [])).toBe("italian");
  });
});
