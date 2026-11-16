import type { Puzzle } from "@/lib/chess/puzzle";

/** Lichess theme tags grouped the way the trainer presents them. */
export const THEMES: { id: string; label: string; skill: "tactics" | "defense" | "calculation" }[] = [
  { id: "fork", label: "Forks", skill: "tactics" },
  { id: "pin", label: "Pins", skill: "tactics" },
  { id: "skewer", label: "Skewers", skill: "tactics" },
  { id: "discoveredAttack", label: "Discovered attacks", skill: "tactics" },
  { id: "discoveredCheck", label: "Discovered checks", skill: "tactics" },
  { id: "doubleCheck", label: "Double checks", skill: "tactics" },
  { id: "backRankMate", label: "Back-rank mates", skill: "tactics" },
  { id: "deflection", label: "Deflections", skill: "tactics" },
  { id: "attraction", label: "Decoys (attraction)", skill: "tactics" },
  { id: "clearance", label: "Clearance", skill: "tactics" },
  { id: "interference", label: "Interference", skill: "tactics" },
  { id: "intermezzo", label: "Zwischenzug", skill: "tactics" },
  { id: "capturingDefender", label: "Removing the defender", skill: "tactics" },
  { id: "hangingPiece", label: "Hanging pieces", skill: "tactics" },
  { id: "trappedPiece", label: "Trapped pieces", skill: "tactics" },
  { id: "sacrifice", label: "Sacrifices", skill: "tactics" },
  { id: "promotion", label: "Promotion", skill: "tactics" },
  { id: "advancedPawn", label: "Advanced pawns", skill: "tactics" },
  { id: "mateIn1", label: "Mate in one", skill: "tactics" },
  { id: "mateIn2", label: "Mate in two", skill: "tactics" },
  { id: "mateIn3", label: "Mate in three", skill: "calculation" },
  { id: "kingsideAttack", label: "Kingside attacks", skill: "tactics" },
  { id: "exposedKing", label: "Exposed king", skill: "tactics" },
  { id: "defensiveMove", label: "Defensive moves", skill: "defense" },
  { id: "quietMove", label: "Quiet moves", skill: "defense" },
  { id: "zugzwang", label: "Zugzwang", skill: "calculation" },
  { id: "xRayAttack", label: "X-ray attacks", skill: "tactics" },
  { id: "endgame", label: "Endgame tactics", skill: "tactics" },
  { id: "rookEndgame", label: "Rook endgames", skill: "tactics" },
  { id: "pawnEndgame", label: "Pawn endgames", skill: "calculation" },
  { id: "long", label: "Long combinations", skill: "calculation" },
  { id: "veryLong", label: "Very long combinations", skill: "calculation" },
];
export const THEME_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t]));

/** Tags that describe the phase or outcome rather than the idea; never used as the puzzle's concept. */
const GENERIC = new Set(["middlegame", "endgame", "opening", "short", "long", "veryLong", "oneMove", "crushing", "advantage", "mate", "master", "masterVsMaster", "superGM", "equality"]);

/** The most specific teaching theme of a puzzle. */
export function mainTheme(p: Puzzle, prefer?: string): string {
  if (prefer && p.themes.includes(prefer)) return prefer;
  return p.themes.find((t) => !GENERIC.has(t) && THEME_BY_ID[t]) ?? p.themes.find((t) => !GENERIC.has(t)) ?? p.themes[0];
}

export type PickOptions = { target: number; theme?: string; exclude?: Set<string>; minMoves?: number; maxMoves?: number; random?: () => number; spread?: number };

/**
 * Choose the next puzzle: near the target difficulty, not seen before when possible,
 * with a little randomness so sessions differ. Falls back to seen puzzles, then to a wider band.
 */
export function pickPuzzle(all: Puzzle[], o: PickOptions): Puzzle | null {
  const random = o.random ?? Math.random;
  const fits = (p: Puzzle) => (!o.theme || p.themes.includes(o.theme)) && (!o.minMoves || p.moves.length >= o.minMoves) && (!o.maxMoves || p.moves.length <= o.maxMoves);
  const pool = all.filter(fits);
  if (pool.length === 0) return null;
  const fresh = pool.filter((p) => !o.exclude?.has(p.id));
  const from = fresh.length ? fresh : pool;
  for (const band of [o.spread ?? 75, 150, 300, 5000]) {
    const near = from.filter((p) => Math.abs(p.rating - o.target) <= band);
    if (near.length) return near[Math.floor(random() * near.length)];
  }
  return from[0];
}
