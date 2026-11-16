import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";
import { applyUci, type Uci } from "./rules";

/**
 * Facts about a position that can be computed with certainty from the rules alone.
 * All feedback text in the app is assembled from these facts (and from engine lines),
 * so the app never states something about a position that it has not checked.
 */

export const PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
export const PIECE_NAME: Record<PieceSymbol, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

const other = (c: Color): Color => (c === "w" ? "b" : "w");

export type Placed = { square: Square; type: PieceSymbol; color: Color };

export function pieces(chess: Chess, color?: Color): Placed[] {
  const out: Placed[] = [];
  for (const row of chess.board()) for (const p of row) if (p && (!color || p.color === color)) out.push(p);
  return out;
}

export function material(chess: Chess, color: Color): number {
  return pieces(chess, color).reduce((s, p) => s + (p.type === "k" ? 0 : PIECE_VALUE[p.type]), 0);
}

/**
 * Pieces of `color` that can be captured for a material gain right now:
 * either nothing defends them, or the cheapest attacker is worth less than the piece.
 * This is a one-move static check, not a full exchange calculation.
 */
export function loosePieces(chess: Chess, color: Color): (Placed & { reason: "undefended" | "attacked by a cheaper piece" })[] {
  const out: (Placed & { reason: "undefended" | "attacked by a cheaper piece" })[] = [];
  for (const p of pieces(chess, color)) {
    if (p.type === "k") continue;
    const attackers = chess.attackers(p.square, other(color));
    if (attackers.length === 0) continue;
    const defenders = chess.attackers(p.square, color);
    const cheapest = Math.min(...attackers.map((s) => PIECE_VALUE[chess.get(s)!.type]));
    if (defenders.length === 0) out.push({ ...p, reason: "undefended" });
    else if (cheapest < PIECE_VALUE[p.type]) out.push({ ...p, reason: "attacked by a cheaper piece" });
  }
  return out;
}

export type MoveFacts = {
  san: string;
  piece: PieceSymbol;
  captures?: PieceSymbol;
  check: boolean;
  mate: boolean;
  promotion?: PieceSymbol;
  castles: boolean;
  /** Enemy pieces the moved piece attacks after the move that are loose or worth more than it. */
  attacks: Placed[];
  /** True when the moved piece ends on a square where it can be captured for a material gain. */
  leavesPieceLoose: boolean;
  /** A different piece now gives check or attacks through the vacated square. */
  discovered: boolean;
};

/** Facts about one move in one position. Returns null when the move is illegal. */
export function moveFacts(fen: string, uci: Uci): MoveFacts | null {
  const chess = new Chess(fen);
  const mover = chess.turn();
  const looseBefore = new Set(loosePieces(chess, other(mover)).map((p) => p.square));
  const move = applyUci(chess, uci);
  if (!move) return null;
  const enemy = other(mover);
  const movedType = (move.promotion ?? move.piece) as PieceSymbol;

  const attacks: Placed[] = [];
  for (const p of pieces(chess, enemy)) {
    if (!chess.attackers(p.square, mover).includes(move.to)) continue;
    const defended = chess.attackers(p.square, enemy).length > 0;
    if (p.type === "k" || !defended || PIECE_VALUE[p.type] > PIECE_VALUE[movedType]) attacks.push(p);
  }

  // Discovered: an enemy piece became loose, or the king is checked, by a piece other than the one that moved.
  let discovered = false;
  if (chess.inCheck()) {
    const kingSq = pieces(chess, enemy).find((p) => p.type === "k")!.square;
    discovered = chess.attackers(kingSq, mover).some((s) => s !== move.to);
  }
  if (!discovered) {
    for (const p of loosePieces(chess, enemy)) {
      if (looseBefore.has(p.square)) continue;
      const by = chess.attackers(p.square, mover);
      if (by.length > 0 && !by.includes(move.to)) discovered = true;
    }
  }

  const leavesPieceLoose = loosePieces(chess, mover).some((p) => p.square === move.to);

  return {
    san: move.san,
    piece: move.piece,
    captures: move.captured,
    check: chess.inCheck(),
    mate: chess.isCheckmate(),
    promotion: move.promotion,
    castles: move.isKingsideCastle() || move.isQueensideCastle(),
    attacks,
    leavesPieceLoose,
    discovered,
  };
}

/** One plain-English sentence describing what a move does, built only from checked facts. */
export function describeMove(f: MoveFacts): string {
  const parts: string[] = [];
  const name = PIECE_NAME[f.piece];
  if (f.mate) return `${f.san} is checkmate.`;
  if (f.castles) parts.push("castles, moving the king to safety and connecting the rook");
  else if (f.captures) parts.push(`captures a ${PIECE_NAME[f.captures]} with the ${name}`);
  else parts.push(`moves the ${name}`);
  if (f.promotion) parts.push(`promotes to a ${PIECE_NAME[f.promotion]}`);
  if (f.check) parts.push(f.discovered ? "gives a discovered check" : "gives check");
  else if (f.discovered) parts.push("uncovers an attack from the piece behind it");
  const targets = f.attacks.filter((p) => p.type !== "k");
  if (f.check && targets.length >= 1)
    parts.push(`and at the same time attacks the ${targets.map((p) => `${PIECE_NAME[p.type]} on ${p.square}`).join(" and the ")}`);
  else if (targets.length >= 2)
    parts.push(`attacking the ${targets.map((p) => `${PIECE_NAME[p.type]} on ${p.square}`).join(" and the ")} at once`);
  else if (targets.length === 1) parts.push(`attacking the ${PIECE_NAME[targets[0].type]} on ${targets[0].square}`);
  return `${f.san} ${parts.join(", ")}.`;
}

/**
 * Forcing moves available to the side to move: checks and captures that win material on the spot.
 * This is the "checks, captures, threats" scan taught in the blunder-prevention trainer.
 */
export function forcingMoves(fen: string): { checks: string[]; winningCaptures: string[]; mates: string[] } {
  const chess = new Chess(fen);
  const mover = chess.turn();
  const checks: string[] = [];
  const winningCaptures: string[] = [];
  const mates: string[] = [];
  for (const m of chess.moves({ verbose: true })) {
    chess.move(m);
    if (chess.isCheckmate()) mates.push(m.san);
    else if (chess.inCheck()) checks.push(m.san);
    if (m.captured) {
      const defended = chess.attackers(m.to, other(mover)).length > 0;
      if (!defended || PIECE_VALUE[m.captured] > PIECE_VALUE[m.piece]) winningCaptures.push(m.san);
    }
    chess.undo();
  }
  return { checks, winningCaptures, mates };
}

/** What the opponent could do if the side to move passed: their mates, checks and winning captures. */
export function opponentThreats(fen: string): { checks: string[]; winningCaptures: string[]; mates: string[] } | null {
  const parts = fen.split(" ");
  parts[1] = parts[1] === "w" ? "b" : "w";
  parts[3] = "-";
  try {
    const flipped = new Chess(parts.join(" "));
    if (flipped.inCheck()) return null; // side to move is giving check; a "pass" is not a legal position
    return forcingMoves(flipped.fen());
  } catch {
    return null; // the side to move is in check, so a null move makes no sense
  }
}
