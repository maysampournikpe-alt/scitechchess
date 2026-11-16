/**
 * Lichess opening explorer (explorer.lichess.ovh). Since 2025 it answers 401 without a Lichess
 * API token, so the learner can paste their own token in Settings. The token stays in this
 * browser and is sent only to the explorer host.
 */
export type ExplorerMove = { uci: string; san: string; white: number; draws: number; black: number; games: number };
export type ExplorerResult = { total: number; moves: ExplorerMove[]; opening: string | null };
export type ExplorerError = { error: "no-token" | "unauthorized" | "network" | "rate-limited" };

export function parseExplorer(json: unknown): ExplorerResult | null {
  if (typeof json !== "object" || json === null) return null;
  const j = json as { white?: number; draws?: number; black?: number; moves?: unknown; opening?: { name?: string } | null };
  if (!Array.isArray(j.moves)) return null;
  const moves: ExplorerMove[] = [];
  for (const m of j.moves as { uci?: unknown; san?: unknown; white?: unknown; draws?: unknown; black?: unknown }[]) {
    if (typeof m.uci !== "string" || typeof m.san !== "string") continue;
    const w = Number(m.white) || 0;
    const d = Number(m.draws) || 0;
    const b = Number(m.black) || 0;
    moves.push({ uci: m.uci, san: m.san, white: w, draws: d, black: b, games: w + d + b });
  }
  return { total: (Number(j.white) || 0) + (Number(j.draws) || 0) + (Number(j.black) || 0), moves, opening: j.opening?.name ?? null };
}

export async function fetchExplorer(fen: string, db: "masters" | "lichess", token: string, fetcher: typeof fetch = fetch): Promise<ExplorerResult | ExplorerError> {
  if (!token.trim()) return { error: "no-token" };
  const q = db === "lichess" ? "&speeds=blitz,rapid,classical&ratings=1600,1800,2000,2200,2500" : "";
  try {
    const r = await fetcher(`https://explorer.lichess.ovh/${db}?fen=${encodeURIComponent(fen)}${q}`, { headers: { Authorization: `Bearer ${token.trim()}` } });
    if (r.status === 401 || r.status === 403) return { error: "unauthorized" };
    if (r.status === 429) return { error: "rate-limited" };
    if (!r.ok) return { error: "network" };
    return parseExplorer(await r.json()) ?? { error: "network" };
  } catch {
    return { error: "network" };
  }
}
