import { Chess } from "chess.js";
import type { Options, UciClient } from "./uci";

/**
 * Computer opponents. Levels 4-9 use Stockfish's own strength limiter (UCI_Elo, whose floor in
 * this build is 1320). Levels 1-3 are weaker than that floor, so they use the lowest engine
 * skill at a shallow depth and sometimes play a random legal move.
 *
 * The labels describe how the bot is configured. They are NOT calibrated against human
 * ratings on any site, and the app never converts a result against a bot into an Elo.
 */
export type BotLevel = {
  id: number;
  name: string;
  description: string;
  options: Options;
  depth?: number;
  movetime?: number;
  /** Chance of playing a uniformly random legal move instead of the engine's choice. */
  randomMove: number;
};

export const BOT_LEVELS: BotLevel[] = [
  { id: 1, name: "First steps", description: "Often plays random moves. For learning the rules.", options: { UCI_LimitStrength: false, "Skill Level": 0 }, depth: 1, randomMove: 0.45 },
  { id: 2, name: "Beginner", description: "Sees one move ahead and still gives pieces away.", options: { UCI_LimitStrength: false, "Skill Level": 0 }, depth: 2, randomMove: 0.25 },
  { id: 3, name: "Novice", description: "Takes free pieces, misses most tactics.", options: { UCI_LimitStrength: false, "Skill Level": 1 }, depth: 4, randomMove: 0.1 },
  { id: 4, name: "Casual", description: "Engine limiter at its lowest setting (1320).", options: { UCI_LimitStrength: true, UCI_Elo: 1320 }, movetime: 300, randomMove: 0 },
  { id: 5, name: "Club", description: "Engine limiter set to 1500.", options: { UCI_LimitStrength: true, UCI_Elo: 1500 }, movetime: 400, randomMove: 0 },
  { id: 6, name: "Strong club", description: "Engine limiter set to 1700.", options: { UCI_LimitStrength: true, UCI_Elo: 1700 }, movetime: 500, randomMove: 0 },
  { id: 7, name: "Advanced", description: "Engine limiter set to 1900.", options: { UCI_LimitStrength: true, UCI_Elo: 1900 }, movetime: 600, randomMove: 0 },
  { id: 8, name: "Expert", description: "Engine limiter set to 2200.", options: { UCI_LimitStrength: true, UCI_Elo: 2200 }, movetime: 800, randomMove: 0 },
  { id: 9, name: "Full strength", description: "No limiter. Used as the defender in endgame practice.", options: { UCI_LimitStrength: false, "Skill Level": 20 }, movetime: 1000, randomMove: 0 },
];

/** Suggest a starting bot level from the internal training score. A starting point, not a measurement. */
export function suggestLevel(score: number): number {
  const cuts = [700, 950, 1150, 1350, 1550, 1750, 1950, 2200];
  return 1 + cuts.filter((c) => score >= c).length;
}

export async function botMove(engine: UciClient, fen: string, level: BotLevel, random: () => number = Math.random): Promise<string | null> {
  const chess = new Chess(fen);
  const legal = chess.moves({ verbose: true });
  if (legal.length === 0) return null;
  if (level.randomMove > 0 && random() < level.randomMove) {
    const m = legal[Math.floor(random() * legal.length)];
    return m.from + m.to + (m.promotion ?? "");
  }
  const { bestmove } = await engine.search(fen, { depth: level.depth, movetime: level.movetime }, level.options);
  return bestmove;
}

/** Options that put the engine back to full strength for analysis. */
export const ANALYSIS_OPTIONS: Options = { UCI_LimitStrength: false, "Skill Level": 20 };
