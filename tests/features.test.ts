import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { describeMove, forcingMoves, loosePieces, moveFacts, opponentThreats } from "@/lib/chess/features";

describe("position facts", () => {
  it("finds a knight fork of king and rook", () => {
    const f = moveFacts("r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1", "d5c7")!;
    expect(f.check).toBe(true);
    expect(f.attacks.map((p) => p.type).sort()).toEqual(["k", "r"]);
    expect(describeMove(f)).toContain("gives check");
    expect(describeMove(f)).toContain("rook on a8");
  });
  it("finds a discovered check", () => {
    const f = moveFacts("4k3/8/8/8/4N3/8/8/4R1K1 w - - 0 1", "e4d6")!;
    expect(f.check).toBe(true);
    expect(f.discovered).toBe(true);
  });
  it("reports undefended and under-defended pieces", () => {
    const c = new Chess("4k3/8/8/3r4/8/2N5/8/4K3 b - - 0 1");
    expect(loosePieces(c, "b").map((p) => p.square)).toEqual(["d5"]);
    expect(loosePieces(c, "w")).toEqual([]);
  });
  it("lists forcing moves and the opponent's threats", () => {
    expect(forcingMoves("6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1").mates).toEqual(["Ra8#"]);
    expect(opponentThreats("6k1/5ppp/8/8/8/8/8/R5K1 b - - 0 1")?.mates).toEqual(["Ra8#"]);
    expect(opponentThreats("4k3/8/8/8/8/8/8/4K2R b K - 0 1")?.mates).toEqual([]);
  });
  it("returns null for an illegal move", () => expect(moveFacts(new Chess().fen(), "e2e5")).toBeNull());
});
