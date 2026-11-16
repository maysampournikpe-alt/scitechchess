/**
 * Lichess endgame tablebase (https://tablebase.lichess.ovh, free public API, up to 7 pieces).
 * A tablebase gives the exact result with perfect play, so when it answers we can say
 * "this move wins" or "this move throws away the win" as a fact, not an engine estimate.
 * The app works without it: if the request fails, callers fall back to Stockfish.
 */
export type TbResult = "win" | "draw" | "loss";
export type TbAnswer = { result: TbResult; bestMove: string | null };

export function pieceCount(fen: string): number {
  return fen.split(" ")[0].replace(/[^a-zA-Z]/g, "").length;
}

/** Map the API's category for the side to move onto win/draw/loss. Cursed wins and blessed losses are draws under the 50-move rule. */
export function parseTablebase(json: unknown): TbAnswer | null {
  if (typeof json !== "object" || json === null) return null;
  const j = json as { category?: unknown; moves?: unknown };
  const map: Record<string, TbResult> = { win: "win", "maybe-win": "win", "syzygy-win": "win", loss: "loss", "maybe-loss": "loss", "syzygy-loss": "loss", draw: "draw", "cursed-win": "draw", "blessed-loss": "draw" };
  if (typeof j.category !== "string" || !(j.category in map)) return null;
  const first = Array.isArray(j.moves) ? (j.moves[0] as { uci?: unknown } | undefined) : undefined;
  return { result: map[j.category], bestMove: typeof first?.uci === "string" ? first.uci : null };
}

/** Result for the side to move in `fen`, or null when the tablebase cannot be used. */
export async function probeTablebase(fen: string, fetcher: typeof fetch = fetch, timeoutMs = 2500): Promise<TbAnswer | null> {
  if (pieceCount(fen) > 7) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetcher(`https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(fen)}`, { signal: ctrl.signal });
    if (!r.ok) return null;
    return parseTablebase(await r.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
