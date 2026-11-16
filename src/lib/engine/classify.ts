import type { Score } from "./uci";

/**
 * Move-quality classification. This is ChessMastery's own documented method, not a copy of
 * any other site's formula.
 *
 * 1. An engine score is mapped to "expected score" for the side to move, in percent, with a
 *    logistic curve: E = 100 / (1 + exp(-K * centipawns)). K = 0.004 is our own setting:
 *    +100cp ≈ 60%, +300cp ≈ 77%, +600cp ≈ 92%. A forced mate counts as 100% (or 0%).
 *    This is a model of how decisive an advantage is, NOT a measured probability of winning.
 * 2. A move is judged by how many points of expected score it gives up compared with the
 *    engine's best move in the same position, searched to the same depth.
 * 3. Context adjusts the label: a loss that leaves the position still clearly winning
 *    (>= 90%) is capped at "inaccuracy"; throwing away a forced mate or walking into one is
 *    always at least a "mistake".
 */
export const K = 0.004;

export function expectedScore(score: Score): number {
  if ("mate" in score) return score.mate > 0 ? 100 : 0;
  return 100 / (1 + Math.exp(-K * score.cp));
}

export type Quality = "best" | "excellent" | "good" | "inaccuracy" | "mistake" | "blunder";

/** Upper bounds of expected-score loss (in points) for each label. */
export const THRESHOLDS = { excellent: 2, good: 5, inaccuracy: 10, mistake: 20 } as const;

export type Judgement = { quality: Quality; loss: number; before: number; after: number };

/**
 * @param best   score of the engine's best move, from the mover's point of view
 * @param played score after the move actually played, from the mover's point of view
 * @param isBest true when the played move is the engine's first choice
 */
export function judge(best: Score, played: Score, isBest = false): Judgement {
  const before = expectedScore(best);
  const after = expectedScore(played);
  const loss = Math.max(0, before - after);
  let quality: Quality;
  if (isBest || loss === 0) quality = "best";
  else if (loss < THRESHOLDS.excellent) quality = "excellent";
  else if (loss < THRESHOLDS.good) quality = "good";
  else if (loss < THRESHOLDS.inaccuracy) quality = "inaccuracy";
  else if (loss < THRESHOLDS.mistake) quality = "mistake";
  else quality = "blunder";

  const rank: Quality[] = ["best", "excellent", "good", "inaccuracy", "mistake", "blunder"];
  const atLeast = (q: Quality) => (rank.indexOf(quality) < rank.indexOf(q) ? q : quality);
  const atMost = (q: Quality) => (rank.indexOf(quality) > rank.indexOf(q) ? q : quality);

  if (!isBest) {
    const hadMate = "mate" in best && best.mate > 0;
    const stillMate = "mate" in played && played.mate > 0;
    const getsMated = "mate" in played && played.mate < 0 && !("mate" in best && best.mate < 0);
    if (getsMated) quality = atLeast("mistake");
    else if (hadMate && !stillMate) quality = after >= 90 ? atLeast("inaccuracy") : atLeast("mistake");
    if (!getsMated && after >= 90) quality = atMost("inaccuracy");
  }
  return { quality, loss, before, after };
}

/** Flip a score to the other side's point of view. */
export function negate(score: Score): Score {
  return "mate" in score ? { mate: -score.mate } : { cp: -score.cp };
}

/** Human-readable score from White's point of view, e.g. "+1.3" or "#-4". */
export function formatScore(score: Score, sideToMove: "w" | "b"): string {
  const s = sideToMove === "w" ? score : negate(score);
  if ("mate" in s) return `#${s.mate}`;
  return `${s.cp >= 0 ? "+" : ""}${(s.cp / 100).toFixed(1)}`;
}
