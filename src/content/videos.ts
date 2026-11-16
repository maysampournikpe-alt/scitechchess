/** Channels to search per topic. These are search links, not claims about any specific video. */
export const CHANNELS = ["Daniel Naroditsky", "John Bartholomew", "ChessNetwork", "Saint Louis Chess Club", "Hanging Pawns", "GothamChess", "Chess Vibes", "Remote Chess Academy", "PowerPlayChess", "Chessbrah"];

export const VIDEO_TOPICS: { label: string; query: string; practiceHref: string }[] = [
  { label: "Forks and double attacks", query: "chess fork tactics", practiceHref: "/puzzles/?theme=fork" },
  { label: "Pins and skewers", query: "chess pins skewers", practiceHref: "/puzzles/?theme=pin" },
  { label: "Discovered attacks", query: "chess discovered attack", practiceHref: "/puzzles/?theme=discoveredAttack" },
  { label: "Calculation technique", query: "chess calculation candidate moves", practiceHref: "/calculation/" },
  { label: "Isolated queen's pawn", query: "isolated queen pawn chess plans", practiceHref: "/middlegame/?id=iqp-activity" },
  { label: "Minority attack", query: "minority attack carlsbad chess", practiceHref: "/middlegame/?id=carlsbad-minority" },
  { label: "King and pawn endgames", query: "king pawn endgame opposition", practiceHref: "/endgames/?id=opposition-defence" },
  { label: "Lucena and Philidor", query: "lucena philidor rook endgame", practiceHref: "/endgames/?id=lucena" },
];
