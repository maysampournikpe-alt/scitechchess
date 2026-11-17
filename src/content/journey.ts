import type { SkillId } from "@/lib/learning/skills";

/**
 * The journey: levels from first moves to expert, each with a guide, units and a checkpoint.
 * Original text, GPL-3.0-or-later. Every id referenced here (lessons, openings, endgames, plan
 * exercises, model games, puzzle themes) is checked to exist by tests/journey.test.ts.
 *
 * Level numbers use this site's training score, which is on the Lichess puzzle-difficulty scale.
 * They are milestones for training, not a rating anyone would give you over the board.
 */
export type JourneyNode =
  | { kind: "lesson"; id: string; lesson: string }
  | { kind: "puzzles"; id: string; title: string; theme?: string; count: number; need: number }
  | { kind: "video"; id: string; topic: string }
  | { kind: "opening"; id: string; slot: "white" | "vsE4" | "vsD4" }
  | { kind: "endgame"; id: string; endgame: string }
  | { kind: "plan"; id: string; plan: string }
  | { kind: "game"; id: string; game: string }
  | { kind: "drill"; id: string; title: string; drill: "calculation" | "blunder" | "vision" | "conversion"; need: number };

export type Unit = { id: string; title: string; skill: SkillId; goalTags: string[]; nodes: JourneyNode[] };

export type Level = {
  id: string;
  title: string;
  /** Training score range of this level. The checkpoint tests at `to`. */
  from: number;
  to: number;
  guide: { summary: string; focus: string[]; habits: string[]; mistakes: string[]; leaveWhen: string };
  units: Unit[];
};

const P = (id: string, title: string, theme: string | undefined, count = 8, need = 6): JourneyNode => ({ kind: "puzzles", id, title, theme, count, need });

export const LEVELS: Level[] = [
  {
    id: "foundations",
    title: "Foundations",
    from: 0,
    to: 800,
    guide: {
      summary: "Games at this level are decided by pieces left unprotected and by missed one-move checkmates. The fastest way up is not openings or strategy, but a safety habit before every move and the basic mating patterns.",
      focus: ["Basic checkmates: back rank, queen and rook against a lone king", "Seeing every piece that is attacked and not defended", "The opening principles: centre, development, castling"],
      habits: ["Before every move, look at every check and capture your opponent could make", "Count attackers and defenders before you put a piece on a square"],
      mistakes: ["Moving a piece to a square where it can be taken for free", "Missing a mate in one, for either side", "Bringing the queen out early and losing time"],
      leaveWhen: "Pass the checkpoint: solve at least 6 of 8 puzzles rated around 800 with no help.",
    },
    units: [
      { id: "f-mates", title: "Checkmate patterns", skill: "tactics", goalTags: ["tactics"], nodes: [{ kind: "lesson", id: "f-mates-l", lesson: "mate-basics" }, { kind: "video", id: "f-mates-v", topic: "Checkmate patterns" }, P("f-mates-p", "Mate in one", "mateIn1"), { kind: "endgame", id: "f-mates-e1", endgame: "two-rooks-mate" }, { kind: "endgame", id: "f-mates-e2", endgame: "queen-mate" }] },
      { id: "f-safety", title: "Keep your pieces", skill: "decisions", goalTags: ["tactics"], nodes: [{ kind: "lesson", id: "f-safety-l", lesson: "piece-safety" }, { kind: "video", id: "f-safety-v", topic: "Forks, pins and skewers" }, P("f-safety-p", "Hanging pieces", "hangingPiece"), { kind: "drill", id: "f-safety-d", title: "Board vision: loose pieces", drill: "vision", need: 8 }, { kind: "drill", id: "f-safety-b", title: "Blunder check", drill: "blunder", need: 4 }] },
      { id: "f-opening", title: "Starting the game well", skill: "openingUnderstanding", goalTags: ["openings"], nodes: [{ kind: "lesson", id: "f-opening-l", lesson: "opening-principles" }, { kind: "video", id: "f-opening-v", topic: "Opening principles" }, { kind: "opening", id: "f-opening-o", slot: "white" }] },
    ],
  },
  {
    id: "to-1000",
    title: "Road to 1000",
    from: 800,
    to: 1000,
    guide: {
      summary: "You no longer give pieces away for nothing. Now you need to take your opponent's: the simple double attacks (forks, pins, skewers) that win material in one or two moves, and the first pawn-endgame rules.",
      focus: ["Forks with knights, queens and pawns", "Pins and skewers along lines", "The square of the pawn and the king in front of its pawn"],
      habits: ["Look for two enemy targets that one of your pieces could attack at once", "In endgames, bring your king forward"],
      mistakes: ["Ignoring a pin and moving the pinned piece away", "Trading into a pawn ending without checking whether it wins"],
      leaveWhen: "Pass the checkpoint: 6 of 8 puzzles around 1000 without help.",
    },
    units: [
      { id: "k1-forks", title: "Forks", skill: "tactics", goalTags: ["tactics"], nodes: [{ kind: "lesson", id: "k1-forks-l", lesson: "forks" }, { kind: "video", id: "k1-forks-v", topic: "Forks, pins and skewers" }, P("k1-forks-p", "Forks", "fork")] },
      { id: "k1-pins", title: "Pins and skewers", skill: "tactics", goalTags: ["tactics"], nodes: [{ kind: "lesson", id: "k1-pins-l", lesson: "pins-skewers" }, P("k1-pins-p", "Pins", "pin"), P("k1-skewer-p", "Skewers", "skewer", 6, 4)] },
      { id: "k1-pawns", title: "First pawn endings", skill: "endgameKnowledge", goalTags: ["endgame"], nodes: [{ kind: "lesson", id: "k1-pawns-l", lesson: "king-pawn-basics" }, { kind: "endgame", id: "k1-pawns-e1", endgame: "pawn-race" }, { kind: "endgame", id: "k1-pawns-e2", endgame: "king-in-front" }, { kind: "video", id: "k1-pawns-v", topic: "King and pawn endgames" }] },
    ],
  },
  {
    id: "to-1200",
    title: "Road to 1200",
    from: 1000,
    to: 1200,
    guide: {
      summary: "Tactics now come in two-move combinations, and games are lost to threats you did not see coming. This level builds a thinking routine: forcing moves first, for both sides, and a short repertoire you understand.",
      focus: ["Discovered attacks and double checks", "Mate in two and short calculation", "The opposition in pawn endings", "One opening for White and one answer each to 1.e4 and 1.d4"],
      habits: ["Use the candidate-move routine: checks, captures, threats, then the opponent's best reply", "After every opponent move, ask what it threatens"],
      mistakes: ["Calculating only the reply you hope for", "Learning many openings instead of understanding a few"],
      leaveWhen: "Pass the checkpoint: 6 of 8 puzzles around 1200 without help.",
    },
    units: [
      { id: "k12-disc", title: "Discovered attacks", skill: "tactics", goalTags: ["tactics"], nodes: [{ kind: "lesson", id: "k12-disc-l", lesson: "discovered-attacks" }, { kind: "video", id: "k12-disc-v", topic: "Discovered attacks" }, P("k12-disc-p", "Discovered attacks", "discoveredAttack"), P("k12-dbl-p", "Double checks", "doubleCheck", 6, 4)] },
      { id: "k12-calc", title: "Thinking routine", skill: "calculation", goalTags: ["tactics", "tournament"], nodes: [{ kind: "lesson", id: "k12-calc-l", lesson: "candidate-moves" }, { kind: "video", id: "k12-calc-v", topic: "Calculation" }, P("k12-m2-p", "Mate in two", "mateIn2"), { kind: "drill", id: "k12-calc-d", title: "Calculate whole lines", drill: "calculation", need: 3 }] },
      { id: "k12-opp", title: "The opposition", skill: "endgameKnowledge", goalTags: ["endgame"], nodes: [{ kind: "endgame", id: "k12-opp-e1", endgame: "opposition-defence" }, { kind: "endgame", id: "k12-opp-e2", endgame: "spare-tempo" }] },
      { id: "k12-rep", title: "Your first repertoire", skill: "openingKnowledge", goalTags: ["openings"], nodes: [{ kind: "opening", id: "k12-rep-w", slot: "white" }, { kind: "opening", id: "k12-rep-e4", slot: "vsE4" }, { kind: "opening", id: "k12-rep-d4", slot: "vsD4" }] },
    ],
  },
  {
    id: "to-1400",
    title: "Road to 1400",
    from: 1200,
    to: 1400,
    guide: {
      summary: "Combinations start with a sacrifice or a move that removes a defender, and the middlegame needs a plan. This level adds the ideas behind defenders and pawn structure, and the first model game.",
      focus: ["Deflection, decoy and removing the defender", "Calculating three moves deep", "Pawn structure: isolated pawns, holes and passed pawns", "The pawn breakthrough"],
      habits: ["Ask of each enemy piece: what is it defending?", "Before planning, read the pawn structure"],
      mistakes: ["Making moves without a plan in quiet positions", "Missing that a defender is overloaded"],
      leaveWhen: "Pass the checkpoint: 6 of 8 puzzles around 1400 without help.",
    },
    units: [
      { id: "k14-defl", title: "Defenders under attack", skill: "tactics", goalTags: ["tactics"], nodes: [{ kind: "lesson", id: "k14-defl-l", lesson: "deflection-decoy" }, { kind: "video", id: "k14-defl-v", topic: "Deflection and removing the defender" }, P("k14-defl-p", "Deflection", "deflection"), P("k14-attr-p", "Decoys", "attraction", 6, 4), P("k14-cap-p", "Removing the defender", "capturingDefender", 6, 4)] },
      { id: "k14-calc", title: "Three moves deep", skill: "calculation", goalTags: ["tactics", "tournament"], nodes: [{ kind: "drill", id: "k14-calc-d", title: "Calculate whole lines", drill: "calculation", need: 4 }, { kind: "drill", id: "k14-blunder-d", title: "Blunder check", drill: "blunder", need: 5 }] },
      { id: "k14-struct", title: "Pawn structure", skill: "planning", goalTags: ["positional"], nodes: [{ kind: "lesson", id: "k14-struct-l", lesson: "pawn-structure" }, { kind: "video", id: "k14-struct-v", topic: "Isolated queen's pawn" }, { kind: "plan", id: "k14-struct-plan", plan: "iqp-activity" }, { kind: "game", id: "k14-opera", game: "opera" }] },
      { id: "k14-end", title: "Pawn breakthroughs", skill: "endgameKnowledge", goalTags: ["endgame"], nodes: [{ kind: "endgame", id: "k14-end-e", endgame: "breakthrough" }, P("k14-pawnend-p", "Pawn endgames", "pawnEndgame", 6, 4)] },
    ],
  },
  {
    id: "to-1600",
    title: "Road to 1600",
    from: 1400,
    to: 1600,
    guide: {
      summary: "Opponents now punish one-move threats, so wins come from in-between moves, quiet moves and better endgame technique. Rook endings, the most common endgame, start here, along with typical plans for common structures.",
      focus: ["In-between moves and quiet moves", "Rook endgames: Lucena and Philidor", "Plans in the Carlsbad and French structures", "Defending worse positions"],
      habits: ["Before recapturing, check for something stronger", "In rook endings, keep your rook active"],
      mistakes: ["Automatic recaptures", "Passive rook defence", "Giving up when worse instead of making the opponent prove it"],
      leaveWhen: "Pass the checkpoint: 6 of 8 puzzles around 1600 without help.",
    },
    units: [
      { id: "k16-quiet", title: "In-between and quiet moves", skill: "tactics", goalTags: ["tactics"], nodes: [{ kind: "lesson", id: "k16-quiet-l", lesson: "quiet-moves" }, { kind: "video", id: "k16-quiet-v", topic: "In-between moves" }, P("k16-inter-p", "Zwischenzug", "intermezzo", 6, 4), P("k16-quiet-p", "Quiet moves", "quietMove", 6, 4)] },
      { id: "k16-rook", title: "Rook endgames", skill: "endgameKnowledge", goalTags: ["endgame"], nodes: [{ kind: "endgame", id: "k16-rook-luc", endgame: "lucena" }, { kind: "endgame", id: "k16-rook-phil", endgame: "philidor" }, { kind: "video", id: "k16-rook-v", topic: "Lucena and Philidor" }, P("k16-rook-p", "Rook endgames", "rookEndgame", 6, 4)] },
      { id: "k16-plans", title: "Plans from the opening", skill: "planning", goalTags: ["positional", "openings"], nodes: [{ kind: "plan", id: "k16-plan-c", plan: "carlsbad-minority" }, { kind: "video", id: "k16-plans-v", topic: "Minority attack" }, { kind: "plan", id: "k16-plan-f", plan: "french-chain" }] },
      { id: "k16-def", title: "Defence", skill: "defense", goalTags: ["tactics", "tournament"], nodes: [P("k16-def-p", "Defensive moves", "defensiveMove"), { kind: "game", id: "k16-reti", game: "reti-tartakower" }] },
    ],
  },
  {
    id: "to-1800",
    title: "Road to 1800",
    from: 1600,
    to: 1800,
    guide: {
      summary: "At this level games are won by players who improve their pieces patiently and attack at the right moment. You need longer combinations, a feel for good and bad pieces, and the ability to convert an advantage.",
      focus: ["Longer combinations and sacrifices", "Outposts, good and bad bishops", "Attacking with opposite-side castling", "Converting winning positions"],
      habits: ["Find your worst piece and improve it", "When winning, trade pieces, not pawns, and avoid counterplay"],
      mistakes: ["Attacking before the pieces are ready", "Letting a winning position slip by hurrying"],
      leaveWhen: "Pass the checkpoint: 6 of 8 puzzles around 1800 without help.",
    },
    units: [
      { id: "k18-combo", title: "Longer combinations", skill: "calculation", goalTags: ["tactics"], nodes: [P("k18-long-p", "Long combinations", "long"), P("k18-sac-p", "Sacrifices", "sacrifice"), { kind: "game", id: "k18-immortal", game: "immortal" }] },
      { id: "k18-pieces", title: "Good and bad pieces", skill: "evaluation", goalTags: ["positional"], nodes: [{ kind: "lesson", id: "k18-pieces-l", lesson: "good-bad-pieces" }, { kind: "video", id: "k18-pieces-v", topic: "Good and bad pieces" }, { kind: "plan", id: "k18-plan-sv", plan: "sveshnikov-outpost" }, { kind: "plan", id: "k18-plan-st", plan: "stonewall-bishops" }] },
      { id: "k18-attack", title: "Attacking the king", skill: "planning", goalTags: ["positional", "tactics"], nodes: [{ kind: "lesson", id: "k18-attack-l", lesson: "opposite-castling" }, { kind: "video", id: "k18-attack-v", topic: "Attacking the king" }, { kind: "plan", id: "k18-plan-oc", plan: "dragon-opposite-castling" }, P("k18-ks-p", "Kingside attacks", "kingsideAttack")] },
      { id: "k18-convert", title: "Converting", skill: "endgameConversion", goalTags: ["endgame", "tournament"], nodes: [{ kind: "drill", id: "k18-conv-d", title: "Convert a winning position", drill: "conversion", need: 2 }] },
    ],
  },
  {
    id: "to-2000",
    title: "Road to 2000",
    from: 1800,
    to: 2000,
    guide: {
      summary: "Near 2000 the difference is depth: longer and quieter calculation, a repertoire you know beyond the first moves, and endgames played precisely. Every part of your game has to be solid, because opponents now find the weak one.",
      focus: ["Very long combinations, x-rays, interference and zugzwang", "Deep calculation with quiet moves", "A deeper repertoire", "Technical endgames"],
      habits: ["Evaluate the end of every line as a fresh position", "Review your own games and turn each mistake into an exercise"],
      mistakes: ["Stopping calculation one move too early", "Knowing opening moves without the plans behind them"],
      leaveWhen: "Pass the checkpoint: 6 of 8 puzzles around 2000 without help.",
    },
    units: [
      { id: "k20-adv", title: "Advanced tactics", skill: "tactics", goalTags: ["tactics"], nodes: [P("k20-xray-p", "X-ray attacks", "xRayAttack", 6, 4), P("k20-inter-p", "Interference", "interference", 6, 4), P("k20-zug-p", "Zugzwang", "zugzwang", 6, 4)] },
      { id: "k20-calc", title: "Deep calculation", skill: "calculation", goalTags: ["tactics", "tournament"], nodes: [{ kind: "lesson", id: "k20-calc-l", lesson: "deep-calculation" }, P("k20-vlong-p", "Very long combinations", "veryLong"), { kind: "drill", id: "k20-calc-d", title: "Calculate whole lines", drill: "calculation", need: 5 }] },
      { id: "k20-rep", title: "Repertoire in depth", skill: "openingKnowledge", goalTags: ["openings"], nodes: [{ kind: "opening", id: "k20-rep-w", slot: "white" }, { kind: "opening", id: "k20-rep-e4", slot: "vsE4" }, { kind: "opening", id: "k20-rep-d4", slot: "vsD4" }] },
      { id: "k20-tech", title: "Technique", skill: "endgameConversion", goalTags: ["endgame"], nodes: [{ kind: "drill", id: "k20-conv-d", title: "Convert a winning position", drill: "conversion", need: 3 }, { kind: "game", id: "k20-fischer", game: "game-of-the-century" }] },
    ],
  },
  {
    id: "to-2200",
    title: "Road to 2200 and beyond",
    from: 2000,
    to: 2200,
    guide: {
      summary: "From here, improvement comes from the hardest problems, your own games and serious opening preparation. The site's puzzles go up to about 2800, and every game you import becomes training material.",
      focus: ["The hardest puzzles in every theme", "Analysing your own games with the engine", "A complete repertoire with sharp lines"],
      habits: ["Analyse every serious game before checking with the engine", "Keep a journal of what you learn"],
      mistakes: ["Relying on the engine before thinking for yourself"],
      leaveWhen: "Pass the checkpoint: 6 of 8 puzzles around 2200 without help.",
    },
    units: [
      { id: "k22-hard", title: "The hardest puzzles", skill: "tactics", goalTags: ["tactics"], nodes: [P("k22-hard-p", "Mixed hard puzzles", undefined, 10, 7), P("k22-def-p", "Hard defence", "defensiveMove")] },
      { id: "k22-rep", title: "Sharp openings", skill: "openingKnowledge", goalTags: ["openings"], nodes: [{ kind: "opening", id: "k22-rep-e4", slot: "vsE4" }, { kind: "opening", id: "k22-rep-d4", slot: "vsD4" }, { kind: "game", id: "k22-legall", game: "legall" }] },
      { id: "k22-calc", title: "Calculation at full depth", skill: "calculation", goalTags: ["tactics", "tournament"], nodes: [{ kind: "drill", id: "k22-calc-d", title: "Calculate whole lines", drill: "calculation", need: 6 }, { kind: "drill", id: "k22-blunder-d", title: "Blunder check", drill: "blunder", need: 6 }] },
    ],
  },
];

/** Openings offered per level and slot, easiest first. The learner's own repertoire choice always wins. */
export const OPENING_CHOICES: Record<string, Record<"white" | "vsE4" | "vsD4", string[]>> = {
  foundations: { white: ["italian", "london"], vsE4: ["scandinavian"], vsD4: ["qgd"] },
  "to-1200": { white: ["italian", "london", "vienna"], vsE4: ["caro-kann", "scandinavian"], vsD4: ["qgd", "slav", "dutch-stonewall"] },
  "to-2000": { white: ["ruy-lopez", "queens-gambit", "scotch", "english"], vsE4: ["french", "petroff", "pirc"], vsD4: ["nimzo-indian", "kings-indian", "slav"] },
  "to-2200": { white: ["ruy-lopez", "english"], vsE4: ["sicilian-najdorf"], vsD4: ["grunfeld", "kings-indian"] },
};

export const LEVEL_BY_ID = Object.fromEntries(LEVELS.map((l) => [l.id, l]));
