import { Chess, type Square } from "chess.js";
import { PIECE_NAME, loosePieces, pieces } from "@/lib/chess/features";

/** Board-vision drills, generated from the rules so every answer is computed, not authored. */
export type Drill = { id: string; kind: "color" | "knight" | "defended" | "memory"; prompt: string; options: string[]; answer: string; difficulty: number; fen?: string; hideAfterMs?: number };

const FILES = "abcdefgh";
const sq = (r: () => number) => (FILES[Math.floor(r() * 8)] + (1 + Math.floor(r() * 8))) as Square;

export function squareColor(s: string): "light" | "dark" {
  return (s.charCodeAt(0) - 97 + Number(s[1])) % 2 === 1 ? "dark" : "light";
}

export function knightMoves(s: string): number {
  const f = s.charCodeAt(0) - 97;
  const r = Number(s[1]) - 1;
  return [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]].filter(([df, dr]) => f + df >= 0 && f + df < 8 && r + dr >= 0 && r + dr < 8).length;
}

/** @param fens positions to use for the drills that need one (e.g. puzzle positions) */
export function makeDrill(kind: Drill["kind"], fens: string[], r: () => number = Math.random): Drill {
  if (kind === "color") {
    const s = sq(r);
    return { id: `color:${s}`, kind, prompt: `Without looking at a board: what colour is the square ${s}?`, options: ["light", "dark"], answer: squareColor(s), difficulty: 700 };
  }
  if (kind === "knight") {
    const s = sq(r);
    const n = knightMoves(s);
    return { id: `knight:${s}`, kind, prompt: `On an empty board, how many squares can a knight on ${s} move to?`, options: ["2", "3", "4", "6", "8"], answer: String(n), difficulty: 1000 };
  }
  const fen = fens[Math.floor(r() * fens.length)];
  const c = new Chess(fen);
  if (kind === "defended") {
    const side = c.turn() === "w" ? "b" : "w";
    const candidates = pieces(c, side).filter((p) => p.type !== "k");
    const p = candidates[Math.floor(r() * candidates.length)];
    const loose = loosePieces(c, side).some((x) => x.square === p.square);
    return { id: `defended:${fen}:${p.square}`, kind, fen, prompt: `Can the ${side === "w" ? "white" : "black"} ${PIECE_NAME[p.type]} on ${p.square} be captured right now for a material gain?`, options: ["yes", "no"], answer: loose ? "yes" : "no", difficulty: 1250 };
  }
  // memory: look at the position, then name a piece from memory
  const all = pieces(c).filter((p) => p.type !== "p");
  const p = all[Math.floor(r() * all.length)];
  const answer = `${p.color === "w" ? "white" : "black"} ${PIECE_NAME[p.type]}`;
  const opts = new Set([answer]);
  for (const x of all) if (opts.size < 4) opts.add(`${x.color === "w" ? "white" : "black"} ${PIECE_NAME[x.type]}`);
  for (const extra of ["white queen", "black rook", "white bishop", "black knight"]) if (opts.size < 4) opts.add(extra);
  return { id: `memory:${fen}:${p.square}`, kind, fen, hideAfterMs: 8000, prompt: `Which piece stood on ${p.square}?`, options: [...opts].sort(), answer, difficulty: 1450 };
}
