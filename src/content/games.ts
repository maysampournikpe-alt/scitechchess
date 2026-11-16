/**
 * Model games. The moves are the historical game scores; the notes are written for this
 * project. tests/content.test.ts proves every move is legal and that each game ends as stated.
 * Notes describe ideas; they do not claim every move was the engine's best (several were not).
 */
export type ModelGame = {
  id: string;
  title: string;
  white: string;
  black: string;
  year: number;
  event: string;
  /** The side whose moves the learner guesses. */
  learner: "w" | "b";
  ending: "checkmate";
  themes: string[];
  summary: string;
  moves: string[];
  /** Notes keyed by half-move number (1 = White's first move). */
  notes: Record<number, string>;
};

export const MODEL_GAMES: ModelGame[] = [
  {
    id: "opera",
    title: "The Opera Game",
    white: "Paul Morphy",
    black: "Duke of Brunswick and Count Isouard",
    year: 1858,
    event: "Paris, played during an opera",
    learner: "w",
    ending: "checkmate",
    themes: ["development", "open lines", "pins", "sacrifice"],
    summary: "The classic lesson in rapid development. Black spends moves on pawns and on winning a pawn; Morphy brings every piece into play, opens lines towards the uncastled king and finishes with a queen sacrifice.",
    moves: ["e4", "e5", "Nf3", "d6", "d4", "Bg4", "dxe5", "Bxf3", "Qxf3", "dxe5", "Bc4", "Nf6", "Qb3", "Qe7", "Nc3", "c6", "Bg5", "b5", "Nxb5", "cxb5", "Bxb5+", "Nbd7", "O-O-O", "Rd8", "Rxd7", "Rxd7", "Rd1", "Qe6", "Bxd7+", "Nxd7", "Qb8+", "Nxb8", "Rd8#"],
    notes: {
      6: "Black pins the knight, but will soon give up the bishop pair to keep material level.",
      11: "Bc4 develops with a threat: the queen will join it against f7.",
      13: "Qb3 hits f7 and b7 at once. Black has to defend with the queen, which blocks the f8 bishop.",
      17: "Bg5 pins the f6 knight. White now has every minor piece in play; Black has two.",
      19: "Nxb5: a piece is given up to open lines against the king still standing on e8.",
      23: "Castling queenside brings the rook to the open d-file with tempo against the pinned knight.",
      25: "Rxd7 removes a defender, and the second rook takes its place.",
      31: "Qb8+! The queen sacrifice drags the knight away from d7.",
      33: "Rd8# The rook, protected by the bishop on g5, mates. Every white piece that moved took part.",
    },
  },
  {
    id: "immortal",
    title: "The Immortal Game",
    white: "Adolf Anderssen",
    black: "Lionel Kieseritzky",
    year: 1851,
    event: "London, casual game",
    learner: "w",
    ending: "checkmate",
    themes: ["King's Gambit", "initiative", "sacrifice", "mating net"],
    summary: "A romantic-era attacking game. White gives away both rooks, a bishop and the queen, and mates with three minor pieces. Modern analysis finds better moves for both sides, but the ideas of initiative and piece activity over material are timeless.",
    moves: ["e4", "e5", "f4", "exf4", "Bc4", "Qh4+", "Kf1", "b5", "Bxb5", "Nf6", "Nf3", "Qh6", "d3", "Nh5", "Nh4", "Qg5", "Nf5", "c6", "g4", "Nf6", "Rg1", "cxb5", "h4", "Qg6", "h5", "Qg5", "Qf3", "Ng8", "Bxf4", "Qf6", "Nc3", "Bc5", "Nd5", "Qxb2", "Bd6", "Bxg1", "e5", "Qxa1+", "Ke2", "Na6", "Nxg7+", "Kd8", "Qf6+", "Nxf6", "Be7#"],
    notes: {
      3: "The King's Gambit: a pawn is offered to open the f-file and gain time in the centre.",
      19: "g4 and h4 chase the black queen with gain of time.",
      29: "Bxf4 regains the pawn and develops: White now leads heavily in development.",
      35: "Bd6!? offers the rook on g1. Taking it lets White's pieces swarm the king.",
      37: "e5 shuts the black queen out of the defence. Both white rooks are about to be lost.",
      41: "Nxg7+ drives the king to d8.",
      43: "Qf6+! The last sacrifice: the queen deflects the knight from guarding e7.",
      45: "Be7# Mate with bishop and two knights, against a black army that is still almost complete.",
    },
  },
  {
    id: "reti-tartakower",
    title: "Réti vs Tartakower",
    white: "Richard Réti",
    black: "Savielly Tartakower",
    year: 1910,
    event: "Vienna, casual game",
    learner: "w",
    ending: "checkmate",
    themes: ["Caro-Kann", "open d-file", "queen sacrifice", "double check"],
    summary: "A short game that shows why the king should not stay in the centre on an open file. Black wins a pawn with the queen while undeveloped, White castles queenside onto the d-file, and a queen sacrifice ends it.",
    moves: ["e4", "c6", "d4", "d5", "Nc3", "dxe4", "Nxe4", "Nf6", "Qd3", "e5", "dxe5", "Qa5+", "Bd2", "Qxe5", "O-O-O", "Nxe4", "Qd8+", "Kxd8", "Bg5+", "Kc7", "Bd8#"],
    notes: {
      9: "Qd3 develops and prepares long castling. It also sets a trap.",
      15: "O-O-O offers the knight: White's rook now looks down the d-file at the black king.",
      17: "Qd8+!! The queen is given up to pull the king onto the open file.",
      19: "Bg5+ is a double check: the rook on d1 and the bishop both give check, so the king must move.",
      21: "Bd8# The king on c7 has no square left.",
    },
  },
];

export const MODEL_GAME_BY_ID = Object.fromEntries(MODEL_GAMES.map((g) => [g.id, g]));
