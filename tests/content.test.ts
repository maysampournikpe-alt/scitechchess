import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { Chess } from "chess.js";
import { OPENINGS } from "@/content/openings";
import { ENDGAMES } from "@/content/endgames";
import { PLAN_EXERCISES } from "@/content/middlegame";
import { UciClient, type Score } from "@/lib/engine/uci";
import { ANALYSIS_OPTIONS } from "@/lib/engine/bot";

const play = (moves: string[]) => {
  const c = new Chess();
  for (const m of moves) c.move(m); // throws on an illegal move
  return c;
};

describe("opening lessons", () => {
  const db: [string, string, string][] = JSON.parse(readFileSync("public/data/openings.json", "utf8"));
  // Index the database by position (placement + side + castling), so transpositions are found.
  const byPosition = new Map<string, string>();
  for (const [, name, pgn] of db) {
    const c = new Chess();
    c.loadPgn(pgn);
    byPosition.set(c.fen().split(" ").slice(0, 3).join(" "), name);
  }
  it("the database itself parses", () => expect(byPosition.size).toBeGreaterThan(3000));

  for (const o of OPENINGS) {
    it(`${o.id}: line is legal, named correctly, and its notes and questions point at real moves`, () => {
      const c = new Chess();
      const names: string[] = [];
      for (const m of o.moves) {
        c.move(m);
        const n = byPosition.get(c.fen().split(" ").slice(0, 3).join(" "));
        if (n) names.push(n);
      }
      expect(names.some((n) => n.includes(o.dbName)), `${o.id}: database names were ${[...new Set(names)].join(" | ")}`).toBe(true);
      for (const ply of Object.keys(o.notes).map(Number)) {
        expect(ply).toBeGreaterThanOrEqual(1);
        expect(ply).toBeLessThanOrEqual(o.moves.length);
        // A note explains the learner's own move.
        expect(ply % 2 === 1 ? "white" : "black", `${o.id} note ${ply}`).toBe(o.color);
      }
      for (const q of o.questions) {
        expect(q.afterPly).toBeLessThanOrEqual(o.moves.length);
        expect(q.options.filter((x) => x.correct)).toHaveLength(1);
      }
      expect(new Set(OPENINGS.map((x) => x.id)).size).toBe(OPENINGS.length);
    });
  }
});

describe("middlegame plan exercises", () => {
  for (const p of PLAN_EXERCISES) {
    it(`${p.id}: position is reachable, the right side is to move, option moves are legal`, () => {
      const c = play(p.moves);
      expect(c.turn()).toBe(p.side);
      expect(p.options.filter((o) => o.verdict === "best")).toHaveLength(1);
      for (const o of p.options) if (o.move) expect(c.moves(), `${p.id}: ${o.move}`).toContain(o.move);
    });
  }
  it("specific claims made in the feedback text hold on the board", () => {
    // French: "b2 is defended by the bishop on c1"
    const french = play(PLAN_EXERCISES.find((p) => p.id === "french-chain")!.moves);
    expect(french.attackers("b2", "w")).toContain("c1");
    expect(french.attackers("d4", "b").sort()).toEqual(["b6", "c6"]);
    // Sveshnikov: "...b4 forks the two knights"
    const svesh = play(PLAN_EXERCISES.find((p) => p.id === "sveshnikov-outpost")!.moves);
    expect(svesh.get("a3")?.type).toBe("n");
    expect(svesh.get("c3")?.type).toBe("n");
    expect(svesh.get("b5")).toMatchObject({ type: "p", color: "b" });
    // IQP: d4 is isolated and d5 is occupied by a black knight
    const iqp = play(PLAN_EXERCISES.find((p) => p.id === "iqp-activity")!.moves);
    expect(iqp.get("d5")).toMatchObject({ type: "n", color: "b" });
    const whitePawnFiles = iqp.board().flat().filter((x) => x && x.type === "p" && x.color === "w").map((x) => x!.square[0]);
    expect(whitePawnFiles).toContain("d");
    expect(whitePawnFiles).not.toContain("c");
    expect(whitePawnFiles).not.toContain("e");
    // Petroff trap quoted in the opening lesson: 3...Nxe4 4.Qe2, and a knight retreat loses the queen to Nc6+
    const trap = play(["e4", "e5", "Nf3", "Nf6", "Nxe5", "Nxe4", "Qe2", "Nf6", "Nc6+"]);
    expect(trap.inCheck()).toBe(true);
    expect(trap.attackers("d8", "w")).toContain("c6");
    // Ruy Lopez: 4.Bxc6 dxc6 5.Nxe5 Qd4 hits e5 and e4
    const ruy = play(["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Bxc6", "dxc6", "Nxe5", "Qd4"]);
    expect(ruy.attackers("e5", "b")).toContain("d4");
    expect(ruy.attackers("e4", "b")).toContain("d4");
  });
});

describe("endgame lessons, checked with Stockfish", () => {
  const require = createRequire(import.meta.url);
  let client: UciClient;
  let sf: { processCommand(c: string): void; terminate(): void };
  beforeAll(async () => {
    sf = require("stockfish")("lite-single", (line: string) => client.receive(line));
    client = new UciClient((c) => sf.processCommand(c));
    await client.init();
  });
  afterAll(() => sf.terminate());

  /** Result for the learner after `san`, judged from the engine score with the opponent to move. */
  async function outcomeAfter(fen: string, san: string): Promise<"win" | "draw" | "loss" | "unclear"> {
    const c = new Chess(fen);
    c.move(san);
    if (c.isCheckmate()) return "win";
    if (c.isStalemate() || c.isInsufficientMaterial()) return "draw";
    const a = await client.search(c.fen(), { depth: 30, movetime: 1200 }, { ...ANALYSIS_OPTIONS, Hash: 64 });
    const s: Score = a.lines[0].score; // opponent's point of view
    if ("mate" in s) return s.mate < 0 ? "win" : "loss";
    if (s.cp <= -400) return "win";
    if (s.cp >= 400) return "loss";
    if (Math.abs(s.cp) <= 60) return "draw";
    return "unclear";
  }

  it("claims in the lesson text: retreats and side-pawn pushes lose the result; no spare move means a draw", async () => {
    for (const m of ["Kd3", "Ke3", "Kf3"]) expect(await outcomeAfter("8/8/4k3/8/4K3/8/4P3/8 w - - 0 1", m), m).toBe("draw");
    for (const m of ["Kd4", "Kf4", "Kd3", "Kf3"]) expect(await outcomeAfter("8/8/4k3/8/4K3/4P3/8/8 w - - 0 1", m), m).toBe("draw");
    for (const m of ["a6", "c6"]) expect(await outcomeAfter("7k/ppp5/8/PPP5/8/8/8/7K w - - 0 1", m), m).toBe("loss");
    for (const m of ["Kd5", "Kf5"]) expect(await outcomeAfter("4k3/8/4K3/4P3/8/8/8/8 w - - 0 1", m), m).toBe("draw");
  });

  for (const e of ENDGAMES) {
    it(`${e.id}: stated result and key moves are right`, async () => {
      const c = new Chess(e.fen);
      expect(c.turn()).toBe(e.side);
      const legal = c.moves();
      for (const k of e.keyMoves) expect(legal, `${e.id}: ${k}`).toContain(k);
      // Only moves that carry a claim are searched: the key moves, and every move when the lesson says "only move".
      const results = new Map<string, string>();
      for (const m of e.onlyMove ? legal : e.keyMoves) results.set(m, await outcomeAfter(e.fen, m));
      const keeping = legal.filter((m) => results.get(m) === e.goal);
      for (const k of e.keyMoves) expect(results.get(k), `${e.id}: ${k} -> ${JSON.stringify([...results])}`).toBe(e.goal);
      if (e.onlyMove) expect(keeping.sort(), `${e.id}: ${JSON.stringify([...results])}`).toEqual([...e.keyMoves].sort());
    });
  }
});
