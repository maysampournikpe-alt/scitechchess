import type { UciClient, Score } from "./uci";
import { ANALYSIS_OPTIONS } from "./bot";
import { probeTablebase, type TbResult } from "@/lib/chess/tablebase";

export type Verdict = { result: TbResult | "unclear"; source: "tablebase" | "engine"; reply: string | null };

/** Turn an engine score (for the side to move) into a coarse result. Deliberately cautious: the middle band is "unclear". */
export function resultFromScore(s: Score): TbResult | "unclear" {
  if ("mate" in s) return s.mate > 0 ? "win" : "loss";
  if (s.cp >= 350) return "win";
  if (s.cp <= -350) return "loss";
  if (Math.abs(s.cp) <= 80) return "draw";
  return "unclear";
}

const flip = (r: TbResult | "unclear"): TbResult | "unclear" => (r === "win" ? "loss" : r === "loss" ? "win" : r);

/**
 * Judge the position after the learner has moved (so the opponent is to move).
 * Returns the result from the LEARNER's point of view and the opponent's best reply.
 * Uses the exact tablebase when it is reachable, otherwise a Stockfish search.
 */
export async function judgeAfterMove(engine: UciClient, fen: string, useTablebase = true, depth = 18): Promise<Verdict> {
  if (useTablebase) {
    const tb = await probeTablebase(fen);
    if (tb) return { result: flip(tb.result), source: "tablebase", reply: tb.bestMove };
  }
  const a = await engine.search(fen, { depth, movetime: 1500 }, ANALYSIS_OPTIONS);
  const score = a.lines[0]?.score;
  return { result: score ? flip(resultFromScore(score)) : "unclear", source: "engine", reply: a.bestmove };
}

/**
 * Grade one move in one position: the engine searches the position (for the best move's score)
 * and the position after the move, at the same depth, and the move is labelled with the
 * thresholds in classify.ts.
 */
export async function gradeMove(engine: UciClient, fen: string, uci: string, depth = 12) {
  const { Chess } = await import("chess.js");
  const { applyUci } = await import("@/lib/chess/rules");
  const { judge, negate } = await import("./classify");
  const before = await engine.search(fen, { depth }, ANALYSIS_OPTIONS);
  const c = new Chess(fen);
  const m = applyUci(c, uci);
  if (!m) throw new Error(`Illegal move ${uci}`);
  const best = before.lines[0]?.score ?? { cp: 0 };
  const isBest = before.bestmove === uci;
  let after: Score;
  if (c.isCheckmate()) after = { mate: 1 };
  else if (c.isGameOver()) after = { cp: 0 };
  else after = negate((await engine.search(c.fen(), { depth }, ANALYSIS_OPTIONS)).lines[0]?.score ?? { cp: 0 });
  return { san: m.san, bestUci: before.bestmove, judgement: judge(best, isBest ? best : after, isBest) };
}
