import { describe, expect, it } from "vitest";
import { fetchExplorer, parseExplorer } from "@/lib/chess/explorer";

const sample = { white: 10, draws: 5, black: 5, moves: [{ uci: "e7e5", san: "e5", white: 4, draws: 2, black: 2 }, { uci: "bad" }], opening: { name: "King's Pawn Game" } };
const fake = (status: number, body: unknown = sample) => ((() => Promise.resolve({ ok: status < 400, status, json: async () => body })) as unknown as typeof fetch);

describe("opening explorer client", () => {
  it("parses totals and moves, skipping malformed entries", () => {
    expect(parseExplorer(sample)).toEqual({ total: 20, opening: "King's Pawn Game", moves: [{ uci: "e7e5", san: "e5", white: 4, draws: 2, black: 2, games: 8 }] });
    expect(parseExplorer({})).toBeNull();
  });
  it("never sends a request without a token, and maps each failure to a reason", async () => {
    let called = false;
    const spy = (() => ((called = true), Promise.reject())) as unknown as typeof fetch;
    expect(await fetchExplorer("x", "masters", "  ", spy)).toEqual({ error: "no-token" });
    expect(called).toBe(false);
    expect(await fetchExplorer("x", "masters", "t", fake(401))).toEqual({ error: "unauthorized" });
    expect(await fetchExplorer("x", "masters", "t", fake(429))).toEqual({ error: "rate-limited" });
    expect(await fetchExplorer("x", "masters", "t", (() => Promise.reject(new Error("offline"))) as unknown as typeof fetch)).toEqual({ error: "network" });
    expect(await fetchExplorer("x", "masters", "t", fake(200))).toMatchObject({ total: 20 });
  });
});
