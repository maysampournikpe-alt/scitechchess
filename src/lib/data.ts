"use client";
import { fromRow, type Puzzle, type PuzzleRow } from "@/lib/chess/puzzle";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Puzzles from the Lichess database (CC0) are stored in one file per 100-point rating band
 * (public/data/puzzles/b{band}.json), so a phone downloads only the range a learner needs.
 */
let index: Promise<number[]> | null = null;
const bandCache = new Map<number, Promise<Puzzle[]>>();

function loadIndex(): Promise<number[]> {
  index ??= fetch(`${base}/data/puzzles/index.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`Could not load puzzles (${r.status})`);
      return r.json() as Promise<{ bands: Record<string, number> }>;
    })
    .then((j) => Object.keys(j.bands).map(Number))
    .catch((e) => {
      index = null;
      throw e;
    });
  return index;
}

function loadBand(band: number): Promise<Puzzle[]> {
  let p = bandCache.get(band);
  if (!p) {
    p = fetch(`${base}/data/puzzles/b${band}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load puzzles (${r.status})`);
        return r.json() as Promise<PuzzleRow[]>;
      })
      .then((rows) => rows.map(fromRow))
      .catch((e) => {
        bandCache.delete(band);
        throw e;
      });
    bandCache.set(band, p);
  }
  return p;
}

/**
 * Puzzles rated within `spread` of `center`, sorted by rating. Without a center, every band
 * is loaded (several MB): use that only to look up one puzzle whose rating is unknown.
 */
export async function loadPuzzles(center?: number, spread = 400): Promise<Puzzle[]> {
  const bands = await loadIndex();
  const wanted = center === undefined ? bands : bands.filter((b) => (b + 1) * 100 > center - spread && b * 100 <= center + spread);
  // Near the edges of the scale there may be no band in range: fall back to the closest one.
  const pick = wanted.length ? wanted : [bands.reduce((a, b) => (Math.abs(b * 100 - (center ?? 0)) < Math.abs(a * 100 - (center ?? 0)) ? b : a))];
  const lists = await Promise.all(pick.map(loadBand));
  return lists.flat().sort((a, b) => a.rating - b.rating);
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
