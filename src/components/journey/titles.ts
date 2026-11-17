import type { JourneyNode } from "@/content/journey";
import { LESSON_BY_ID } from "@/content/lessons";
import { ENDGAME_BY_ID } from "@/content/endgames";
import { OPENING_BY_ID } from "@/content/openings";
import { PLAN_BY_ID } from "@/content/middlegame";
import { MODEL_GAME_BY_ID } from "@/content/games";
import { openingFor } from "@/lib/learning/journey";

export function nodeTitle(node: JourneyNode, levelId: string, repertoire: string[]): string {
  switch (node.kind) {
    case "lesson":
      return LESSON_BY_ID[node.lesson].title;
    case "puzzles":
    case "drill":
      return node.title;
    case "video":
      return `Video: ${node.topic}`;
    case "opening":
      return OPENING_BY_ID[openingFor(node.slot, levelId, repertoire)].name;
    case "endgame":
      return ENDGAME_BY_ID[node.endgame].name;
    case "plan":
      return `${PLAN_BY_ID[node.plan].structure}: ${PLAN_BY_ID[node.plan].title.toLowerCase()}`;
    case "game":
      return MODEL_GAME_BY_ID[node.game].title;
  }
}

