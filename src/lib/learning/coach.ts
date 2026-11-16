import type { Attempt } from "./mastery";
import type { DayPlan } from "./plan";
import { buildReport, conceptLabel, recurringMisses } from "./report";
import { SKILL_BY_ID, type SkillId, type SkillState } from "./skills";

/**
 * The coach is deterministic: it answers a fixed set of questions from the learner's own data.
 * No language model is used, so it costs nothing to run and never invents chess variations.
 */
export type Topic = "today" | "weakness" | "week" | "calculation" | "harder" | "move" | "endgame" | "repertoire";
export type Answer = { text: string[]; links: { href: string; label: string }[] };

export const TOPICS: { id: Topic; question: string; keywords: string[] }[] = [
  { id: "today", question: "What should I study today?", keywords: ["today", "study", "next", "plan", "should i"] },
  { id: "weakness", question: "What is my biggest weakness?", keywords: ["weak", "worst", "bad at", "improve most"] },
  { id: "week", question: "What did I learn this week?", keywords: ["week", "learn", "progress", "did i"] },
  { id: "calculation", question: "How can I improve my calculation?", keywords: ["calculat", "visuali", "see ahead", "blind"] },
  { id: "harder", question: "Give me a harder exercise", keywords: ["hard", "challenge", "difficult", "tough"] },
  { id: "move", question: "Why was my move bad?", keywords: ["move", "bad", "why", "mistake", "blunder", "position"] },
  { id: "endgame", question: "Explain a rook endgame", keywords: ["endgame", "rook", "lucena", "philidor", "pawn ending"] },
  { id: "repertoire", question: "Help me build an opening repertoire", keywords: ["opening", "repertoire", "caro", "sicilian", "french", "italian", "london", "defen"] },
];

/** Pick the topic whose keywords match the typed question best; null when nothing matches. */
export function matchTopic(question: string): Topic | null {
  const q = question.toLowerCase();
  let best: Topic | null = null;
  let hits = 0;
  for (const t of TOPICS) {
    const n = t.keywords.filter((k) => q.includes(k)).length;
    if (n > hits) {
      hits = n;
      best = t.id;
    }
  }
  return best;
}

export type CoachData = { skills: Record<SkillId, SkillState>; attempts: Attempt[]; plan: DayPlan | null; now: number };

export function answer(topic: Topic, d: CoachData): Answer {
  const report = buildReport(d.skills, d.attempts, d.now);
  switch (topic) {
    case "today": {
      if (!d.plan) return { text: ["Set up your profile first, then I can build a plan around your time and results."], links: [{ href: "/onboarding/", label: "Set up my training" }] };
      return {
        text: [`You have ${d.plan.totalMinutes} minutes planned today:`, ...d.plan.blocks.map((b) => `${b.minutes} min: ${b.title}. ${b.why}`)],
        links: d.plan.blocks.map((b) => ({ href: b.href, label: b.title })),
      };
    }
    case "weakness": {
      const misses = recurringMisses(d.attempts, d.now);
      const text = [...report.sentences.filter((s) => !s.startsWith("Not measured"))];
      if (misses[0]) text.push(`In the last three weeks the pattern you missed most was ${conceptLabel(misses[0].concept)} (${misses[0].attempts - misses[0].solo} of ${misses[0].attempts}).`);
      return { text, links: report.weakest ? [{ href: "/train/", label: `Today's plan targets ${SKILL_BY_ID[report.weakest].short.toLowerCase()}` }] : [{ href: "/assessment/", label: "Take the assessment" }] };
    }
    case "week": {
      const since = d.now - 7 * 86_400_000;
      const week = d.attempts.filter((a) => a.t >= since);
      if (week.length === 0) return { text: ["You have not done any exercises in the last seven days."], links: [{ href: "/train/", label: "Start today's training" }] };
      const byConcept = new Map<string, { n: number; solo: number }>();
      for (const a of week) {
        const s = byConcept.get(a.concept) ?? { n: 0, solo: 0 };
        s.n += 1;
        if (a.outcome === "solo") s.solo += 1;
        byConcept.set(a.concept, s);
      }
      const top = [...byConcept.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 5);
      const solo = week.filter((a) => a.outcome === "solo").length;
      return {
        text: [`This week: ${week.length} exercises, ${solo} solved without help.`, ...top.map(([c, s]) => `${conceptLabel(c)}: ${s.solo} of ${s.n} clean.`)],
        links: [{ href: "/progress/", label: "See my progress" }],
      };
    }
    case "calculation": {
      const c = d.skills.calculation;
      return {
        text: [
          c.n ? `Your calculation score is ${Math.round(c.score)} from ${c.n} lines.` : "Your calculation has not been measured yet.",
          "Train it by writing the whole line before moving anything. Look at every check and capture for both sides first, then the opponent's best reply to your candidate, not the reply you hope for.",
          "When a line is right, set the board aside and try the blindfold option: it builds the picture in your head that calculation depends on.",
        ],
        links: [
          { href: "/calculation/", label: "Calculation exercises" },
          { href: "/vision/", label: "Board vision drills" },
        ],
      };
    }
    case "harder":
      return { text: [`These puzzles are chosen about 200 points above your tactics score (${Math.round(d.skills.tactics.score)}). Expect to fail some: that is where learning happens.`], links: [{ href: "/puzzles/?mode=hard", label: "Harder puzzles" }] };
    case "move":
      return {
        text: [
          "I can only judge a move I can see. Open the position in Analysis: the engine shows its top three lines, and the blunder check lists every check, winning capture and threat in the position.",
          "If it was in a game, paste the PGN there and I will review every move and save your worst errors as exercises.",
        ],
        links: [{ href: "/analysis/", label: "Open analysis" }],
      };
    case "endgame":
      return {
        text: ["The two rook endings every player needs are the Lucena (how to win with the king in front of the pawn: build a bridge with the rook on the fourth rank) and the Philidor (how to draw: keep the rook on the third rank until the pawn advances, then check from behind)."],
        links: [
          { href: "/endgames/?id=lucena", label: "Lucena lesson" },
          { href: "/endgames/?id=philidor", label: "Philidor lesson" },
        ],
      };
    case "repertoire":
      return {
        text: ["Pick one opening for White, one against 1.e4 and one against 1.d4. The opening list marks which ones fit the amount of theory you told me you want; each lesson explains the plans before the moves."],
        links: [{ href: "/openings/", label: "Choose openings" }],
      };
  }
}
