import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { Chess } from "chess.js";
import { UciClient } from "@/lib/engine/uci";
import { reviewGame, turningPoints } from "@/lib/engine/review";
import { gradeMove } from "@/lib/engine/judge";

describe("game review", () => {
  const require = createRequire(import.meta.url);
  let client: UciClient;
  let sf: { processCommand(c: string): void; terminate(): void };
  beforeAll(async () => {
    sf = require("stockfish")("lite-single", (line: string) => client.receive(line));
    client = new UciClient((c) => sf.processCommand(c));
    await client.init();
  });
  afterAll(() => sf.terminate());

  it("flags the move that allows Scholar's mate as Black's blunder and credits the mate", async () => {
    const sans = ["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6", "Qxf7#"];
    const progress: number[] = [];
    const r = await reviewGame(client, new Chess().fen(), sans, 10, (d) => progress.push(d));
    expect(r.moves).toHaveLength(7);
    expect(progress.at(-1)).toBe(8);
    const nf6 = r.moves[5];
    expect(nf6.san).toBe("Nf6");
    expect(nf6.judgement.quality).toBe("blunder");
    expect(nf6.bestSan).not.toBe("Nf6");
    expect(r.moves[6].judgement.quality).toBe("best");
    expect(r.summary.b.blunders).toBe(1);
    expect(r.summary.w.blunders).toBe(0);
    const tp = turningPoints(r, "b");
    expect(tp.map((m) => m.san)).toEqual(["Nf6"]);
    expect(turningPoints(r, "w")).toEqual([]);
    // The suggested move is legal in that position.
    const c = new Chess(nf6.fenBefore);
    expect(() => c.move(nf6.bestSan!)).not.toThrow();
  });

  it("calls giving away a bishop a blunder and a solid developing move fine", async () => {
    const fen = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
    expect((await gradeMove(client, fen, "f1a6", 10)).judgement.quality).toBe("blunder");
    expect(["best", "excellent", "good"]).toContain((await gradeMove(client, fen, "g1f3", 10)).judgement.quality);
    await expect(gradeMove(client, fen, "e1e3", 6)).rejects.toThrow();
  });


  it("rejects an illegal game instead of analysing it", async () => {
    await expect(reviewGame(client, new Chess().fen(), ["e4", "Ke2"], 6)).rejects.toThrow();
  });
});
