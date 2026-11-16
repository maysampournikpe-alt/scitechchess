import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { applyText, applyUci, gameStatus, legalDests, perft, validFen } from "@/lib/chess/rules";

// Published perft results (chessprogramming.org/Perft_Results). A move generator that
// gets these right handles castling, en passant, promotion, pins and checks correctly.
const PERFT: [name: string, fen: string, depth: number, nodes: number][] = [
  ["start", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 3, 8902],
  ["kiwipete", "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1", 3, 97862],
  ["position 3", "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1", 4, 43238],
  ["position 4", "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1", 3, 9467],
  ["position 5", "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8", 3, 62379],
  ["position 6", "r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10", 3, 89890],
];

describe("move generation matches published perft counts", () => {
  for (const [name, fen, depth, nodes] of PERFT)
    it(`${name} depth ${depth} = ${nodes}`, () => expect(perft(new Chess(fen), depth)).toBe(nodes));
});

describe("special rules", () => {
  it("rejects illegal moves and leaves the position unchanged", () => {
    const c = new Chess();
    expect(applyUci(c, "e2e5")).toBeNull();
    expect(applyText(c, "Ke2")).toBeNull();
    expect(applyText(c, "nonsense")).toBeNull();
    expect(c.fen()).toBe(new Chess().fen());
  });
  it("accepts SAN and UCI text", () => {
    const c = new Chess();
    expect(applyText(c, "e4")?.san).toBe("e4");
    expect(applyText(c, "e7e5")?.san).toBe("e5");
  });
  it("forbids castling through, out of, or into check, and after the king has moved", () => {
    expect(legalDests(new Chess("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1")).get("e1")).toEqual(expect.arrayContaining(["g1", "c1"]));
    // f1 attacked by the rook on f8: no kingside castling, queenside still fine
    const through = legalDests(new Chess("4kr2/8/8/8/8/8/8/R3K2R w KQ - 0 1")).get("e1")!;
    expect(through).not.toContain("g1");
    expect(through).toContain("c1");
    // king in check
    const inCheck = legalDests(new Chess("4r1k1/8/8/8/8/8/8/R3K2R w KQ - 0 1")).get("e1")!;
    expect(inCheck).not.toContain("g1");
    expect(inCheck).not.toContain("c1");
    // no castling rights in the FEN
    expect(legalDests(new Chess("4k3/8/8/8/8/8/8/R3K2R w - - 0 1")).get("e1")).not.toContain("g1");
  });
  it("allows en passant only on the move right after the double step", () => {
    const c = new Chess("4k3/8/8/8/4p3/8/3P4/4K3 w - - 0 1");
    c.move("d4");
    expect(c.moves()).toContain("exd3");
    c.move("Kd7");
    c.move("Kf1");
    expect(c.moves()).not.toContain("exd3");
  });
  it("forbids an en passant capture that would expose the king", () => {
    // Capturing en passant would remove both pawns from the 5th rank and expose the king to the rook.
    const c = new Chess("8/8/8/K2pP2r/8/8/8/4k3 w - d6 0 1");
    expect(c.moves()).not.toContain("exd6");
  });
  it("requires a promotion piece and supports underpromotion", () => {
    const c = new Chess("8/P6k/8/8/8/8/8/K7 w - - 0 1");
    expect(c.moves()).toEqual(expect.arrayContaining(["a8=Q", "a8=R", "a8=B", "a8=N"]));
    expect(applyUci(c, "a7a8n")?.san).toBe("a8=N");
  });
  it("detects checkmate, stalemate and insufficient material", () => {
    expect(gameStatus(new Chess("R5k1/5ppp/8/8/8/8/8/6K1 b - - 0 1"))).toMatchObject({ over: true, result: "1-0", reason: "checkmate" });
    expect(gameStatus(new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1"))).toMatchObject({ over: true, reason: "stalemate" });
    expect(gameStatus(new Chess("8/8/4k3/8/8/2B5/8/4K3 w - - 0 1"))).toMatchObject({ over: true, reason: "insufficient material" });
    expect(gameStatus(new Chess("8/8/4k3/8/8/2R5/8/4K3 w - - 0 1"))).toEqual({ over: false });
  });
  it("treats threefold repetition as a claim and fivefold as an automatic draw", () => {
    const c = new Chess();
    const shuffle = ["Nf3", "Nf6", "Ng1", "Ng8"];
    for (let i = 0; i < 2; i++) for (const m of shuffle) c.move(m);
    expect(gameStatus(c)).toEqual({ over: false, claimable: "threefold" });
    for (let i = 0; i < 2; i++) for (const m of shuffle) c.move(m);
    expect(gameStatus(c)).toMatchObject({ over: true, reason: "fivefold repetition" });
  });
  it("treats fifty moves as a claim and seventy-five as an automatic draw", () => {
    expect(gameStatus(new Chess("8/8/4k3/8/8/2R5/8/4K3 w - - 100 80"))).toEqual({ over: false, claimable: "fifty-move" });
    expect(gameStatus(new Chess("8/8/4k3/8/8/2R5/8/4K3 w - - 150 120"))).toMatchObject({ over: true, reason: "seventy-five-move rule" });
  });
  it("validates FEN and round-trips PGN", () => {
    expect(validFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")).toBe(true);
    expect(validFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBN w KQkq - 0 1")).toBe(false);
    expect(validFen("not a fen")).toBe(false);
    const a = new Chess();
    for (const m of ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Bxc6", "dxc6", "O-O"]) a.move(m);
    const b = new Chess();
    b.loadPgn(a.pgn());
    expect(b.fen()).toBe(a.fen());
    expect(() => new Chess().loadPgn("1. e4 e5 2. Ke3")).toThrow();
  });
});
