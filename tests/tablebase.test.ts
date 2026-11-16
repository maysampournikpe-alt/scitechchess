import { describe, expect, it } from "vitest";
import { parseTablebase, pieceCount, probeTablebase } from "@/lib/chess/tablebase";
import { resultFromScore } from "@/lib/engine/judge";

describe("tablebase client", () => {
  it("counts pieces", () => expect(pieceCount("4k3/8/4K3/4P3/8/8/8/8 w - - 0 1")).toBe(3));
  it("maps API categories, treating 50-move-rule cases as draws", () => {
    expect(parseTablebase({ category: "win", moves: [{ uci: "e6d6" }] })).toEqual({ result: "win", bestMove: "e6d6" });
    expect(parseTablebase({ category: "cursed-win", moves: [] })).toEqual({ result: "draw", bestMove: null });
    expect(parseTablebase({ category: "blessed-loss" })).toEqual({ result: "draw", bestMove: null });
    expect(parseTablebase({ category: "unknown" })).toBeNull();
    expect(parseTablebase("oops")).toBeNull();
  });
  it("returns null instead of throwing when offline, on HTTP errors, or with too many pieces", async () => {
    const offline = (() => Promise.reject(new Error("offline"))) as unknown as typeof fetch;
    const http500 = (() => Promise.resolve({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;
    const ok = (() => Promise.resolve({ ok: true, json: async () => ({ category: "draw", moves: [{ uci: "e7d7" }] }) })) as unknown as typeof fetch;
    expect(await probeTablebase("8/4k3/8/3KP3/8/8/8/8 b - - 0 1", offline)).toBeNull();
    expect(await probeTablebase("8/4k3/8/3KP3/8/8/8/8 b - - 0 1", http500)).toBeNull();
    expect(await probeTablebase("8/4k3/8/3KP3/8/8/8/8 b - - 0 1", ok)).toEqual({ result: "draw", bestMove: "e7d7" });
    expect(await probeTablebase("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", ok)).toBeNull();
  });
  it("only calls an engine score a result when it is clear", () => {
    expect(resultFromScore({ mate: 4 })).toBe("win");
    expect(resultFromScore({ cp: 900 })).toBe("win");
    expect(resultFromScore({ cp: 20 })).toBe("draw");
    expect(resultFromScore({ cp: 200 })).toBe("unclear");
    expect(resultFromScore({ cp: -600 })).toBe("loss");
  });
});
