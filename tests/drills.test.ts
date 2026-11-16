import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { Chess } from "chess.js";
import { checkCalculation, fromRow, solutionSan, type PuzzleRow } from "@/lib/chess/puzzle";
import { knightMoves, makeDrill, squareColor } from "@/lib/learning/vision";

const puzzles = (JSON.parse(readFileSync("public/data/puzzles.json", "utf8")) as PuzzleRow[]).map(fromRow);

describe("calculation mode", () => {
  const p = puzzles.find((x) => x.moves.length === 6)!;
  const sol = solutionSan(p); // solver, reply, solver, reply, solver
  const mine = sol.filter((_, i) => i % 2 === 0);
  it("accepts the full line in SAN, in UCI and with move numbers", () => {
    expect(checkCalculation(p, mine.join(" "))).toEqual({ correct: 3, total: 3, error: null });
    expect(checkCalculation(p, [p.moves[1], p.moves[3], p.moves[5]].join(", ")).error).toBeNull();
    expect(checkCalculation(p, `1. ${mine[0]} 2. ${mine[1]} 3. ${mine[2]}`).error).toBeNull();
  });
  it("reports where the line goes wrong, or that it stops early", () => {
    expect(checkCalculation(p, mine[0]).error).toContain("stops too early");
    expect(checkCalculation(p, "").correct).toBe(0);
    expect(checkCalculation(p, `${mine[0]} Zz9`)).toMatchObject({ correct: 1, error: expect.stringContaining("not a legal move") });
  });
});

describe("board vision drills", () => {
  it("computes square colours and knight mobility", () => {
    expect(squareColor("a1")).toBe("dark");
    expect(squareColor("h1")).toBe("light");
    expect(squareColor("d4")).toBe("dark");
    expect(knightMoves("a1")).toBe(2);
    expect(knightMoves("b1")).toBe(3);
    expect(knightMoves("d4")).toBe(8);
  });
  it("every generated drill has its answer among the options and refers to real pieces", () => {
    const fens = puzzles.slice(0, 50).map((x) => x.fen);
    let seed = 1;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 200; i++) {
      const d = makeDrill((["color", "knight", "defended", "memory"] as const)[i % 4], fens, r);
      expect(d.options).toContain(d.answer);
      if (d.fen) {
        const square = d.id.split(":").at(-1)!;
        expect(new Chess(d.fen).get(square as never)).toBeTruthy();
      }
    }
  });
});
