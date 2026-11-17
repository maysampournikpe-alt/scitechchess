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
  { youtubeId: "rt3p0Z3xzwM", topic: "Checkmate patterns", practiceHref: "/puzzles/?theme=mateIn1", level: "beginner" },
  { youtubeId: "Wjvy_TH1qQs", topic: "Checkmate patterns", practiceHref: "/puzzles/?theme=mateIn1", level: "beginner" },
  { youtubeId: "bDqmIYepVVc", topic: "Checkmate patterns", practiceHref: "/puzzles/?theme=mateIn2", level: "intermediate" },
  { youtubeId: "RD4nYJzr69A", topic: "Opening principles", practiceHref: "/openings/", level: "beginner" },
  { youtubeId: "hWREkfZnV64", topic: "Opening principles", practiceHref: "/openings/", level: "beginner" },
  { youtubeId: "27tTpm_suWU", topic: "Opening principles", practiceHref: "/openings/", level: "beginner" },
  { youtubeId: "YNe_eK2tKIU", topic: "Discovered attacks", practiceHref: "/puzzles/?theme=discoveredAttack", level: "beginner" },
  { youtubeId: "5hi8uS3XSpE", topic: "Discovered attacks", practiceHref: "/puzzles/?theme=discoveredAttack", level: "intermediate" },
  { youtubeId: "2zbosE7hY94", topic: "Discovered attacks", practiceHref: "/puzzles/?theme=doubleCheck", level: "beginner" },
  { youtubeId: "hoNzyPVHgOo", topic: "Deflection and removing the defender", practiceHref: "/puzzles/?theme=capturingDefender", level: "intermediate" },
  { youtubeId: "n1BiELeof-g", topic: "Deflection and removing the defender", practiceHref: "/puzzles/?theme=capturingDefender", level: "beginner" },
  { youtubeId: "lXK-eY7hXaA", topic: "Deflection and removing the defender", practiceHref: "/puzzles/?theme=deflection", level: "intermediate" },
  { youtubeId: "hihzNGHzOKY", topic: "Deflection and removing the defender", practiceHref: "/puzzles/?theme=attraction", level: "intermediate" },
  { youtubeId: "p6TanusLhMw", topic: "Good and bad pieces", practiceHref: "/middlegame/?id=stonewall-bishops", level: "intermediate" },
  { youtubeId: "CjKjPE3y8zA", topic: "Good and bad pieces", practiceHref: "/middlegame/?id=sveshnikov-outpost", level: "intermediate" },
  { youtubeId: "hqMZ3NGqKKY", topic: "Good and bad pieces", practiceHref: "/middlegame/?id=stonewall-bishops", level: "advanced" },
  { youtubeId: "guGzsVPEmmc", topic: "Attacking the king", practiceHref: "/middlegame/?id=dragon-opposite-castling", level: "intermediate" },
  { youtubeId: "ZfqXnilP034", topic: "Attacking the king", practiceHref: "/middlegame/?id=dragon-opposite-castling", level: "intermediate" },
  { youtubeId: "pl_6wnfO2JE", topic: "Attacking the king", practiceHref: "/puzzles/?theme=kingsideAttack", level: "intermediate" },
  { youtubeId: "H0BBgBLfNVM", topic: "In-between moves", practiceHref: "/puzzles/?theme=intermezzo", level: "intermediate" },
  { youtubeId: "01YPBnqtclg", topic: "In-between moves", practiceHref: "/puzzles/?theme=intermezzo", level: "beginner" },
  { youtubeId: "MQnPA9y6s0c", topic: "In-between moves", practiceHref: "/puzzles/?theme=intermezzo", level: "intermediate" },
];
