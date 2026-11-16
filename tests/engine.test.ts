import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { Chess } from "chess.js";
import { parseBestMove, parseInfo, UciClient } from "@/lib/engine/uci";
import { expectedScore, judge } from "@/lib/engine/classify";
import { ANALYSIS_OPTIONS, BOT_LEVELS, botMove, suggestLevel } from "@/lib/engine/bot";

describe("UCI parsing", () => {
  it("parses centipawn and mate info lines", () => {
    expect(parseInfo("info depth 12 seldepth 18 multipv 2 score cp -34 nodes 1 nps 1 time 1 pv e7e5 g1f3")).toEqual({ multipv: 2, depth: 12, score: { cp: -34 }, pv: ["e7e5", "g1f3"] });
    expect(parseInfo("info depth 5 score mate 3 pv a1a8")?.score).toEqual({ mate: 3 });
    expect(parseInfo("info depth 5 score cp 20 lowerbound pv a1a8")).toBeNull();
    expect(parseInfo("info string hello")).toBeNull();
    expect(parseBestMove("bestmove e2e4 ponder e7e5")).toBe("e2e4");
  });
});

describe("move classification", () => {
  it("maps scores to a 0-100 expected score, symmetric around equality", () => {
    expect(expectedScore({ cp: 0 })).toBe(50);
    expect(expectedScore({ cp: 300 }) + expectedScore({ cp: -300 })).toBeCloseTo(100);
    expect(expectedScore({ mate: 2 })).toBe(100);
    expect(expectedScore({ mate: -2 })).toBe(0);
  });
  it("labels by expected-score loss", () => {
    expect(judge({ cp: 50 }, { cp: 50 }, true).quality).toBe("best");
    expect(judge({ cp: 50 }, { cp: 40 }).quality).toBe("excellent");
    expect(judge({ cp: 50 }, { cp: 10 }).quality).toBe("good");
    expect(judge({ cp: 50 }, { cp: -30 }).quality).toBe("inaccuracy");
    expect(judge({ cp: 50 }, { cp: -150 }).quality).toBe("mistake");
    expect(judge({ cp: 50 }, { cp: -500 }).quality).toBe("blunder");
  });
  it("uses context: still winning is at most an inaccuracy, losing a forced mate matters", () => {
    expect(judge({ cp: 1500 }, { cp: 700 }).quality).toBe("inaccuracy");
    expect(judge({ mate: 3 }, { cp: 900 }).quality).toBe("inaccuracy");
    expect(judge({ mate: 3 }, { cp: 100 }).quality).toBe("blunder");
    expect(judge({ cp: 0 }, { mate: -2 }).quality).toBe("blunder");
  });
});

describe("Stockfish (same lite build the browser loads)", () => {
  const require = createRequire(import.meta.url);
  let client: UciClient;
  let sf: { processCommand(c: string): void; terminate(): void };
  beforeAll(async () => {
    sf = require("stockfish")("lite-single", (line: string) => client.receive(line));
    client = new UciClient((c) => sf.processCommand(c));
    await client.init();
  });
  afterAll(() => sf.terminate());

  it("finds a mate in one", async () => {
    const a = await client.search("6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1", { depth: 8 }, ANALYSIS_OPTIONS);
    expect(a.bestmove).toBe("a1a8");
    expect(a.lines[0].score).toEqual({ mate: 1 });
  });
  it("returns several lines with MultiPV, best first", async () => {
    const a = await client.search(new Chess().fen(), { depth: 8, multipv: 3 }, ANALYSIS_OPTIONS);
    expect(a.lines.map((l) => l.multipv)).toEqual([1, 2, 3]);
    expect(a.lines[0].pv[0]).toBe(a.bestmove);
  });
  it("reports no move in a finished game", async () => {
    const a = await client.search("R5k1/5ppp/8/8/8/8/8/6K1 b - - 0 1", { depth: 4 });
    expect(a.bestmove).toBeNull();
  });
  it("every bot level returns a legal move, and queued searches do not mix up", async () => {
    const fen = "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3";
    const moves = await Promise.all(BOT_LEVELS.map((l) => botMove(client, fen, { ...l, movetime: l.movetime && 80 })));
    for (const uci of moves) {
      const c = new Chess(fen);
      expect(() => c.move({ from: uci!.slice(0, 2), to: uci!.slice(2, 4), promotion: uci![4] })).not.toThrow();
    }
  });
  it("suggests a level in range", () => {
    expect(suggestLevel(400)).toBe(1);
    expect(suggestLevel(1400)).toBe(5);
    expect(suggestLevel(2600)).toBe(9);
  });
});
