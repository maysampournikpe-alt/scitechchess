import { beforeEach, describe, expect, it } from "vitest";

// Minimal localStorage for Node.
const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
} as Storage;

(globalThis as unknown as { window: unknown }).window = globalThis;

const { useStore } = await import("@/lib/store/store");
const base = { itemId: "p1", module: "puzzle" as const, skill: "tactics" as const, concept: "theme:fork", difficulty: 1200, hints: 0, ms: 5000 };

describe("progress store", () => {
  beforeEach(() => {
    mem.clear();
    useStore.getState().reset();
  });

  it("records attempts, marks repeats, and moves the skill score", () => {
    const s = useStore.getState();
    const before = s.skills.tactics.score;
    expect(s.record({ ...base, outcome: "solo" }).firstSeen).toBe(true);
    expect(useStore.getState().record({ ...base, outcome: "solo" }).firstSeen).toBe(false);
    expect(useStore.getState().skills.tactics.score).toBeGreaterThan(before);
    expect(useStore.getState().skills.tactics.n).toBe(2);
    expect(useStore.getState().skills.calculation.n).toBe(0);
  });

  it("turns a failed or hinted exercise into a review card, and never a clean first solve", () => {
    useStore.getState().record({ ...base, outcome: "solo" });
    expect(Object.keys(useStore.getState().cards)).toHaveLength(0);
    useStore.getState().record({ ...base, itemId: "p2", outcome: "failed", card: { label: "Fork puzzle", href: "/puzzles/?id=p2", kind: "puzzle" } });
    useStore.getState().record({ ...base, itemId: "p3", outcome: "assisted", hints: 2 });
    const cards = useStore.getState().cards;
    expect(Object.keys(cards).sort()).toEqual(["p2", "p3"]);
    expect(cards.p2.href).toBe("/puzzles/?id=p2");
    expect(cards.p2.due).toBeGreaterThan(Date.now());
  });

  it("does not credit a hinted solve like an unassisted one", () => {
    useStore.getState().record({ ...base, itemId: "a", outcome: "solo" });
    const solo = useStore.getState().skills.tactics.score;
    useStore.getState().reset();
    useStore.getState().record({ ...base, itemId: "a", outcome: "assisted", hints: 3 });
    expect(useStore.getState().skills.tactics.score).toBeLessThan(solo);
  });

  it("persists to storage and survives a reload", async () => {
    useStore.getState().record({ ...base, outcome: "failed" });
    useStore.getState().addJournal("Learned the ladder mate");
    const saved = mem.get("chessmastery-v1")!;
    expect(JSON.parse(saved).state.attempts).toHaveLength(1);
    useStore.setState({ attempts: [], journal: [], cards: {} });
    mem.set("chessmastery-v1", saved);
    await useStore.persist.rehydrate();
    expect(useStore.getState().attempts).toHaveLength(1);
    expect(useStore.getState().journal[0].text).toBe("Learned the ladder mate");
    expect(useStore.getState().hydrated).toBe(true);
  });

  it("exports everything, re-imports it, rejects foreign files, and deletes on reset", () => {
    useStore.getState().record({ ...base, outcome: "failed" });
    useStore.getState().setSettings({ lichessToken: "lip_secret" });
    const file = useStore.getState().exportData();
    expect(file).not.toContain("lip_secret");
    useStore.getState().reset();
    expect(useStore.getState().attempts).toHaveLength(0);
    expect(Object.keys(useStore.getState().cards)).toHaveLength(0);
    expect(useStore.getState().importData("{}")).toBe(false);
    expect(useStore.getState().importData("not json")).toBe(false);
    expect(useStore.getState().importData(JSON.stringify({ app: "chessmastery-ai", data: { attempts: "x", skills: {} } }))).toBe(false);
    const damaged = JSON.parse(file);
    damaged.data.attempts[0].t = "yesterday";
    expect(useStore.getState().importData(JSON.stringify(damaged))).toBe(false);
    const badLink = JSON.parse(file);
    badLink.data.cards = { x: { ...Object.values(badLink.data.cards as Record<string, object>)[0], href: "https://evil.example" } };
    expect(useStore.getState().importData(JSON.stringify(badLink))).toBe(false);
    expect(useStore.getState().attempts).toHaveLength(0);
    expect(useStore.getState().importData(file)).toBe(true);
    expect(useStore.getState().attempts).toHaveLength(1);
  });
});
