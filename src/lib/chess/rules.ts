import { Chess, type Move, type Square } from "chess.js";

export type Uci = string; // e.g. "e2e4", "e7e8q"

export function toUci(m: Pick<Move, "from" | "to" | "promotion">): Uci {
  return m.from + m.to + (m.promotion ?? "");
}

/** Apply a UCI move. Returns the move, or null when it is illegal in this position. */
export function applyUci(chess: Chess, uci: Uci): Move | null {
  try {
    return chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  } catch {
    return null;
  }
}

/** Apply SAN or UCI text typed by a person. Returns null when illegal or unparseable. */
export function applyText(chess: Chess, text: string): Move | null {
  const t = text.trim();
  if (!t) return null;
  if (/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(t)) {
    const m = applyUci(chess, t.toLowerCase());
    if (m) return m;
  }
  try {
    return chess.move(t);
  } catch {
    return null;
  }
}

/** Legal destinations per origin square, in the shape the board component needs. */
export function legalDests(chess: Chess): Map<Square, Square[]> {
  const dests = new Map<Square, Square[]>();
  for (const m of chess.moves({ verbose: true })) {
    const list = dests.get(m.from);
    if (list) list.push(m.to);
    else dests.set(m.from, [m.to]);
  }
  return dests;
}

export function isPromotion(chess: Chess, from: Square, to: Square): boolean {
  const p = chess.get(from);
  return !!p && p.type === "p" && (to[1] === "8" || to[1] === "1");
}

export function validFen(fen: string): boolean {
  try {
    new Chess(fen);
    return true;
  } catch {
    return false;
  }
}

export type GameStatus =
  | { over: false; claimable?: "threefold" | "fifty-move" }
  | {
      over: true;
      result: "1-0" | "0-1" | "1/2-1/2";
      reason: "checkmate" | "stalemate" | "insufficient material" | "fivefold repetition" | "seventy-five-move rule";
    };

/** Position key for repetition: placement, side to move, castling rights and en passant square. */
function repetitionKey(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

/**
 * Game status under FIDE rules. Threefold repetition and the fifty-move rule are claims
 * (the game goes on unless a player claims); fivefold and seventy-five moves end the game.
 * chess.js has no fivefold/75-move check, so those are computed here.
 */
export function gameStatus(chess: Chess): GameStatus {
  if (chess.isCheckmate()) return { over: true, result: chess.turn() === "w" ? "0-1" : "1-0", reason: "checkmate" };
  if (chess.isStalemate()) return { over: true, result: "1/2-1/2", reason: "stalemate" };
  if (chess.isInsufficientMaterial()) return { over: true, result: "1/2-1/2", reason: "insufficient material" };

  const halfmoves = Number(chess.fen().split(" ")[4]);
  if (halfmoves >= 150) return { over: true, result: "1/2-1/2", reason: "seventy-five-move rule" };

  const replay = new Chess();
  const header = chess.header();
  if (header.SetUp === "1" && header.FEN) replay.load(header.FEN);
  const counts = new Map<string, number>();
  const bump = () => {
    const k = repetitionKey(replay.fen());
    counts.set(k, (counts.get(k) ?? 0) + 1);
  };
  bump();
  for (const san of chess.history()) {
    replay.move(san);
    bump();
  }
  const seen = counts.get(repetitionKey(chess.fen())) ?? 1;
  if (seen >= 5) return { over: true, result: "1/2-1/2", reason: "fivefold repetition" };
  if (seen >= 3) return { over: false, claimable: "threefold" };
  if (halfmoves >= 100) return { over: false, claimable: "fifty-move" };
  return { over: false };
}

/** Count leaf nodes to a depth. Used only by tests, to compare with published perft numbers. */
export function perft(chess: Chess, depth: number): number {
  if (depth === 0) return 1;
  const moves = chess.moves({ verbose: true });
  if (depth === 1) return moves.length;
  let n = 0;
  for (const m of moves) {
    chess.move(m);
    n += perft(chess, depth - 1);
    chess.undo();
  }
  return n;
}
