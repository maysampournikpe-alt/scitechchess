import { Chess } from "chess.js";
import type { Score, UciClient } from "./uci";
import { ANALYSIS_OPTIONS } from "./bot";
import { judge, negate, type Judgement } from "./classify";
import { applyUci } from "@/lib/chess/rules";

export type MoveReview = {
  ply: number;
  color: "w" | "b";
  san: string;
  fenBefore: string;
  fenAfter: string;
  judgement: Judgement;
  /** Engine's preferred move in the position before this move. */
  bestSan: string | null;
  bestUci: string | null;
  /** Engine's main line from the position before the move, in SAN. */
  line: string[];
  /** Score before the move, from White's point of view. */
  whiteScore: Score;
};

export type GameReview = {
  moves: MoveReview[];
  summary: Record<"w" | "b", { moves: number; inaccuracies: number; mistakes: number; blunders: number; avgLoss: number }>;
};

function pvToSan(fen: string, pv: string[], max = 5): string[] {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const u of pv.slice(0, max)) {
    const m = applyUci(c, u);
    if (!m) break;
    out.push(m.san);
  }
  return out;
}

/**
 * Review a game: every position is searched once to the same depth, and each move is judged by
 * how much expected score it gives up compared with the engine's choice (see classify.ts).
 * @param sans moves in SAN from `startFen`
 */
export async function reviewGame(engine: UciClient, startFen: string, sans: string[], depth = 12, onProgress?: (done: number, total: number) => void): Promise<GameReview> {
  const c = new Chess(startFen);
  const fens = [c.fen()];
  const played: { san: string; uci: string }[] = [];
  for (const san of sans) {
    const m = c.move(san);
    played.push({ san: m.san, uci: m.from + m.to + (m.promotion ?? "") });
    fens.push(c.fen());
  }

  // Score for the side to move in each position, plus the engine's line.
  const evals: { score: Score; best: string | null; pv: string[] }[] = [];
  for (let i = 0; i < fens.length; i++) {
    const pos = new Chess(fens[i]);
    if (pos.isCheckmate()) evals.push({ score: { mate: -1 }, best: null, pv: [] });
    else if (pos.isGameOver()) evals.push({ score: { cp: 0 }, best: null, pv: [] });
    else {
      const a = await engine.search(fens[i], { depth }, ANALYSIS_OPTIONS);
      evals.push({ score: a.lines[0]?.score ?? { cp: 0 }, best: a.bestmove, pv: a.lines[0]?.pv ?? [] });
    }
    onProgress?.(i + 1, fens.length);
  }

  const moves: MoveReview[] = played.map((p, i) => {
    const color = fens[i].split(" ")[1] as "w" | "b";
    const before = evals[i];
    const after = negate(evals[i + 1].score); // back to the mover's point of view
    const isBest = before.best === p.uci;
    const line = pvToSan(fens[i], before.pv);
    return {
      ply: i + 1,
      color,
      san: p.san,
      fenBefore: fens[i],
      fenAfter: fens[i + 1],
      judgement: judge(before.score, isBest ? before.score : after, isBest),
      bestSan: line[0] ?? null,
      bestUci: before.best,
      line,
      whiteScore: color === "w" ? before.score : negate(before.score),
    };
  });

  const summary = { w: blank(), b: blank() };
  for (const m of moves) {
    const s = summary[m.color];
    s.moves += 1;
    s.avgLoss += m.judgement.loss;
    if (m.judgement.quality === "inaccuracy") s.inaccuracies += 1;
    if (m.judgement.quality === "mistake") s.mistakes += 1;
    if (m.judgement.quality === "blunder") s.blunders += 1;
  }
  for (const k of ["w", "b"] as const) summary[k].avgLoss = summary[k].moves ? Math.round((summary[k].avgLoss / summary[k].moves) * 10) / 10 : 0;
  return { moves, summary };
}

const blank = () => ({ moves: 0, inaccuracies: 0, mistakes: 0, blunders: 0, avgLoss: 0 });

/** The most instructive errors by one side: the largest losses, at most `max`. */
export function turningPoints(review: GameReview, color: "w" | "b", max = 3): MoveReview[] {
  return review.moves
    .filter((m) => m.color === color && (m.judgement.quality === "mistake" || m.judgement.quality === "blunder") && m.bestUci)
    .sort((a, b) => b.judgement.loss - a.judgement.loss)
    .slice(0, max)
    .sort((a, b) => a.ply - b.ply);
}
