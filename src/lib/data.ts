"use client";
import { fromRow, type Puzzle, type PuzzleRow } from "@/lib/chess/puzzle";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
let puzzles: Promise<Puzzle[]> | null = null;

/** The shipped puzzle set (12,396 puzzles selected from the Lichess database, CC0), sorted by rating. Loaded once, on demand. */
export function loadPuzzles(): Promise<Puzzle[]> {
  if (!puzzles)
    puzzles = fetch(`${base}/data/puzzles.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load puzzles (${r.status})`);
        return r.json() as Promise<PuzzleRow[]>;
      })
      .then((rows) => rows.map(fromRow))
      .catch((e) => {
        puzzles = null;
        throw e;
      });
  return puzzles;
}

export type OpeningRow = [eco: string, name: string, pgn: string];
let openings: Promise<OpeningRow[]> | null = null;

/** Lichess opening names (CC0): 3,800+ named lines. */
export function loadOpeningNames(): Promise<OpeningRow[]> {
  if (!openings)
    openings = fetch(`${base}/data/openings.json`)
      .then((r) => r.json() as Promise<OpeningRow[]>)
      .catch((e) => {
        openings = null;
        throw e;
      });
  return openings;
}
