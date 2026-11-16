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
