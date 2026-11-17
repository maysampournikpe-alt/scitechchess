import { describe, expect, it } from "vitest";
import { allPuzzleRows } from "./puzzle-data";
import { Chess } from "chess.js";
import { fromRow, PuzzleRun, solutionSan, type PuzzleRow } from "@/lib/chess/puzzle";
import { applyUci } from "@/lib/chess/rules";

const rows: PuzzleRow[] = allPuzzleRows();
const puzzles = rows.map(fromRow);

describe("shipped puzzle set", () => {
  it("has unique ids and is sorted by rating", () => {
    expect(new Set(puzzles.map((p) => p.id)).size).toBe(puzzles.length);
    expect(puzzles.length).toBeGreaterThan(3000);
    for (let i = 1; i < puzzles.length; i++) expect(puzzles[i].rating).toBeGreaterThanOrEqual(puzzles[i - 1].rating);
  });
  it("every solution is legal from start to finish, and mate puzzles end in mate", () => {
    for (const p of puzzles) {
      const c = new Chess(p.fen);
      for (const uci of p.moves) expect(applyUci(c, uci), `${p.id} ${uci}`).not.toBeNull();
      expect(p.moves.length % 2, p.id).toBe(0);
      if (p.themes.includes("mate")) expect(c.isCheckmate(), p.id).toBe(true);
    }
  });
});

describe("PuzzleRun", () => {
  const p = puzzles.find((x) => x.moves.length === 4)!;
  it("accepts the solution and plays the opponent's replies", () => {
    const run = new PuzzleRun(p);
    expect(run.solverColor).not.toBe(new Chess(p.fen).turn());
    const r1 = run.tryMove(p.moves[1]);
    expect(r1.kind).toBe("correct");
    expect(r1.kind === "correct" && r1.reply?.uci).toBe(p.moves[2]);
    expect(run.tryMove(p.moves[3]).kind).toBe("solved");
    expect(run.done).toBe(true);
    expect(solutionSan(p)).toHaveLength(3);
  });
  it("rejects a wrong move without changing the position", () => {
    const run = new PuzzleRun(p);
    const before = run.fen;
    const wrong = run.chess.moves({ verbose: true }).find((m) => m.from + m.to !== p.moves[1].slice(0, 4))!;
    run.chess.move(wrong);
    const isMate = run.chess.isCheckmate();
    run.chess.undo();
    if (!isMate) {
      expect(run.tryMove(wrong.from + wrong.to + (wrong.promotion ?? "")).kind).toBe("wrong");
      expect(run.fen).toBe(before);
    }
    expect(run.tryMove("a1a1").kind).toBe("illegal");
  });
  it("accepts any checkmating move on a mate-in-one", () => {
    // Two different rook moves mate; the stored solution is only one of them.
    const alt = { id: "t", fen: "6k1/2p2ppp/8/8/8/8/8/RR4K1 b - - 0 1", moves: ["c7c6", "a1a8"], rating: 600, themes: ["mateIn1"] };
    const c = new Chess(alt.fen);
    c.move("c6");
    const mates = c.moves({ verbose: true }).filter((m) => { c.move(m); const x = c.isCheckmate(); c.undo(); return x; });
    for (const m of mates) expect(new PuzzleRun(alt).tryMove(m.from + m.to).kind).toBe("solved");
    expect(mates.length).toBe(2);
  });
});
