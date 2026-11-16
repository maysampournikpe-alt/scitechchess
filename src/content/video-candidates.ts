/**
 * Candidate videos, found by web search. NOT shown as-is: at build time
 * scripts/verify-videos.mjs asks YouTube's oEmbed endpoint about each ID and writes only the
 * ones that exist and allow embedding to public/data/videos.json, with the title and channel
 * YouTube reports. Nothing here is displayed unless YouTube confirms it.
 */
export type VideoCandidate = { youtubeId: string; topic: string; practiceHref: string; level: "beginner" | "intermediate" | "advanced" };

export const VIDEO_CANDIDATES: VideoCandidate[] = [
  { youtubeId: "Pl4dZ5bvGg4", topic: "Forks, pins and skewers", practiceHref: "/puzzles/?theme=fork", level: "beginner" },
  { youtubeId: "k3b7kId3tmE", topic: "Forks, pins and skewers", practiceHref: "/puzzles/?theme=pin", level: "beginner" },
  { youtubeId: "EFODqEcAkxA", topic: "Forks, pins and skewers", practiceHref: "/puzzles/?theme=discoveredAttack", level: "beginner" },
  { youtubeId: "GKF2IRM4sgo", topic: "Forks, pins and skewers", practiceHref: "/puzzles/?theme=skewer", level: "beginner" },
  { youtubeId: "-050V8zdTb0", topic: "Isolated queen's pawn", practiceHref: "/middlegame/?id=iqp-activity", level: "intermediate" },
  { youtubeId: "zG4srUcJJnw", topic: "Isolated queen's pawn", practiceHref: "/middlegame/?id=iqp-activity", level: "intermediate" },
  { youtubeId: "zJq0_C8EHRA", topic: "Isolated queen's pawn", practiceHref: "/middlegame/?id=iqp-activity", level: "advanced" },
  { youtubeId: "CPKor-4NTug", topic: "Minority attack", practiceHref: "/middlegame/?id=carlsbad-minority", level: "intermediate" },
  { youtubeId: "dMDAmC78sJY", topic: "Minority attack", practiceHref: "/middlegame/?id=carlsbad-minority", level: "intermediate" },
  { youtubeId: "WTUtqOAtVfM", topic: "King and pawn endgames", practiceHref: "/endgames/?id=opposition-defence", level: "beginner" },
  { youtubeId: "UBqSAgsTqDY", topic: "King and pawn endgames", practiceHref: "/endgames/?id=spare-tempo", level: "beginner" },
  { youtubeId: "8gk7p0Vsbg0", topic: "King and pawn endgames", practiceHref: "/endgames/?id=breakthrough", level: "intermediate" },
  { youtubeId: "rDist9x7szE", topic: "Lucena and Philidor", practiceHref: "/endgames/?id=lucena", level: "intermediate" },
  { youtubeId: "pD-FzMo7hYc", topic: "Lucena and Philidor", practiceHref: "/endgames/?id=philidor", level: "intermediate" },
  { youtubeId: "qmCKAG7wrdc", topic: "Calculation", practiceHref: "/calculation/", level: "intermediate" },
  { youtubeId: "UHj2CBUtQXQ", topic: "Calculation", practiceHref: "/calculation/", level: "intermediate" },
  { youtubeId: "Nf6Nhce5Cyk", topic: "Calculation", practiceHref: "/blunder-check/", level: "beginner" },
];
