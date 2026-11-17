import { readdirSync, readFileSync } from "node:fs";
import type { PuzzleRow } from "@/lib/chess/puzzle";

/** Every shipped puzzle, from all band files, sorted by rating. */
export function allPuzzleRows(): PuzzleRow[] {
  const dir = "public/data/puzzles";
  return readdirSync(dir)
    .filter((f) => /^b\d+\.json$/.test(f))
    .flatMap((f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8")) as PuzzleRow[])
    .sort((a, b) => a[3] - b[3]);
}
