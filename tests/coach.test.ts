import { describe, expect, it } from "vitest";
import { answer, matchTopic, TOPICS } from "@/lib/learning/coach";
import { newSkill, SKILLS, type SkillId, type SkillState } from "@/lib/learning/skills";

const skills = Object.fromEntries(SKILLS.map((s) => [s.id, newSkill()])) as Record<SkillId, SkillState>;

describe("coach", () => {
  it("matches typed questions to topics", () => {
    expect(matchTopic("What should I study today?")).toBe("today");
    expect(matchTopic("help me with the Caro-Kann repertoire")).toBe("repertoire");
    expect(matchTopic("explain this rook endgame")).toBe("endgame");
    expect(matchTopic("what is the capital of France")).toBeNull();
  });
  it("answers every topic without data, and never claims a weakness it cannot see", () => {
    for (const t of TOPICS) {
      const a = answer(t.id, { skills, attempts: [], plan: null, now: Date.now() });
      expect(a.text.length).toBeGreaterThan(0);
      expect(a.links.every((l) => l.href.startsWith("/"))).toBe(true);
    }
    expect(answer("weakness", { skills, attempts: [], plan: null, now: Date.now() }).text.join(" ")).toContain("not enough data");
  });
});
