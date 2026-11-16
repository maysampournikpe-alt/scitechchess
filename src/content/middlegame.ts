/**
 * Middlegame lessons written for this project (original text, GPL-3.0-or-later).
 *
 * Positions are given as move sequences from the starting position, so tests can prove they
 * are legal and reachable. The strategic explanations are standard teaching about these
 * pawn structures. They are interpretations, not engine output: the app shows Stockfish's
 * evaluation next to them, labelled separately, as a tactical check.
 */
export type PlanOption = {
  text: string;
  /** "best" = the classic plan; "playable" = a reasonable alternative; "poor" = works against the position. */
  verdict: "best" | "playable" | "poor";
  feedback: string;
  /** A move (SAN) that starts this plan in the position, when there is one. Checked for legality by tests. */
  move?: string;
};

export type PlanExercise = {
  id: string;
  structure: string;
  title: string;
  /** Opening lessons that lead to this structure (ids from openings.ts). */
  fromOpenings: string[];
  moves: string[];
  side: "w" | "b";
  skill: "planning" | "evaluation";
  difficulty: number;
  question: string;
  options: PlanOption[];
  concept: string;
  /** Plans for each side in this structure, for the pawn-structure explorer. */
  whitePlans: string[];
  blackPlans: string[];
  typicalEndgame: string;
};

export const PLAN_EXERCISES: PlanExercise[] = [
  {
    id: "carlsbad-minority",
    structure: "Carlsbad structure",
    title: "Two pawns attack three",
    fromOpenings: ["queens-gambit", "qgd"],
    moves: ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "cxd5", "exd5", "Bg5", "Be7", "e3", "O-O", "Bd3", "Nbd7", "Qc2", "Re8", "Nf3", "c6", "O-O", "Nf8"],
    side: "w",
    skill: "planning",
    difficulty: 1400,
    question: "White has pawns on a2 and b2 against Black's a7, b7 and c6. What would you do, and why?",
    options: [
      { text: "Rab1, then b4 and b5, to break up Black's queenside pawns", verdict: "best", move: "Rab1", feedback: "This is the minority attack. When the b-pawn reaches b5 and exchanges on c6, Black is left with a backward pawn on c6 on a half-open file, or an isolated pawn on d5. Either is a long-term target for White's rooks." },
      { text: "Ne5 followed by f4, building a kingside attack", verdict: "playable", move: "Ne5", feedback: "A knight on e5 is a real alternative plan in this structure. It is harder to carry out here because Black can challenge the knight with ...Ng4 or ...N6d7, and f4 leaves a hole on e4. The queenside plan is the more reliable one." },
      { text: "Push h4 and g4 to storm the black king", verdict: "poor", move: "h4", feedback: "Both kings are castled on the same side. Advancing the pawns in front of your own king opens it up as much as Black's, and the centre is not closed enough to justify it." },
      { text: "Trade as many pieces as possible to head for a draw", verdict: "poor", feedback: "White has the easier game here because of a clear plan. Trading without a purpose gives that up; exchanges are useful only when they help the minority attack, for example swapping the defenders of c6." },
    ],
    concept: "A pawn minority can attack a majority to create a weakness. The side with fewer pawns on a wing advances them so that exchanges leave the opponent with a weak pawn.",
    whitePlans: ["Minority attack with Rb1, b4, b5.", "Central expansion with f3 and e4 (usually with the knight on e2).", "Knight outpost on e5."],
    blackPlans: ["Kingside play with ...Ne4, ...f5 and piece pressure.", "Meet b5 with ...c5, or with ...a6 so that an a-file opens for the rook.", "Reroute a knight to d6, where it covers b5, c4 and e4."],
    typicalEndgame: "Rook endgames where White attacks a weak c6 pawn. Black usually holds with active rooks, but has to suffer.",
  },
  {
    id: "iqp-activity",
    structure: "Isolated queen's pawn",
    title: "Playing with the isolated pawn",
    fromOpenings: ["caro-kann", "nimzo-indian"],
    moves: ["e4", "c6", "d4", "d5", "exd5", "cxd5", "c4", "Nf6", "Nc3", "e6", "Nf3", "Be7", "cxd5", "Nxd5", "Bd3", "Nc6", "O-O", "O-O"],
    side: "w",
    skill: "planning",
    difficulty: 1500,
    question: "White has an isolated pawn on d4: no white pawn can ever defend it. How should White play this kind of position?",
    options: [
      { text: "Keep the pieces on, use the open lines and the e5 square to attack, and look for the d4-d5 break", verdict: "best", move: "Re1", feedback: "The isolated pawn gives White space, the half-open e- and c-files and an outpost on e5. Those advantages matter most in the middlegame, so White plays actively: Re1, a3, Bc2 and Qd3 aim at h7, and d4-d5 can open the position when White's pieces are better placed." },
      { text: "Exchange minor pieces to reduce Black's pressure on d4", verdict: "poor", feedback: "Every exchange helps Black. With fewer pieces White's attacking chances disappear, while the pawn on d4 stays weak. The side with the isolated pawn avoids trades." },
      { text: "Push d5 immediately", verdict: "poor", feedback: "Not possible yet: the d5 square is occupied by Black's knight and well defended. The break works only after preparation, when it opens lines for better-placed white pieces." },
      { text: "Defend the pawn with every piece and wait", verdict: "poor", feedback: "Passive defence gives Black exactly what Black wants: a blockade on d5 and pressure against a fixed target. The pawn is best defended by activity." },
    ],
    concept: "An isolated queen's pawn is weak in the endgame and strong in the middlegame. Its owner wants activity and an attack; the opponent wants to blockade the square in front of it and exchange pieces.",
    whitePlans: ["Battery on the b1-h7 diagonal with Bc2 and Qd3.", "Knight to e5, rook lift via e3.", "The d4-d5 break at the right moment."],
    blackPlans: ["Blockade d5 with a knight.", "Exchange minor pieces.", "Pile up on d4 once the attack is over."],
    typicalEndgame: "With queens and minor pieces gone, the isolated pawn becomes a pure weakness and its owner usually defends.",
  },
  {
    id: "dragon-opposite-castling",
    structure: "Opposite-side castling",
    title: "Kings on opposite wings",
    fromOpenings: ["sicilian-najdorf"],
    moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "g6", "Be3", "Bg7", "f3", "O-O", "Qd2", "Nc6", "O-O-O", "Bd7"],
    side: "w",
    skill: "planning",
    difficulty: 1500,
    question: "White has castled queenside and Black kingside. What is White's plan?",
    options: [
      { text: "Advance the h-pawn to open the h-file, and trade off the bishop on g7 with Bh6", verdict: "best", move: "h4", feedback: "With kings on opposite sides, the pawns in front of your own king are not needed for defence, so they can be used as battering rams. h4-h5 opens the h-file for the rook, and Bh6 removes the bishop that guards the dark squares around Black's king. Speed matters: Black is doing the same on the c-file." },
      { text: "Play Kb1 first to make the king safer", verdict: "playable", move: "Kb1", feedback: "A useful move that is often played at some point: it steps off the c-file and covers a2. It is not a plan by itself, though. If White spends too long on safety, Black's attack on the c-file arrives first." },
      { text: "Play a3 and b4 to gain space on the queenside", verdict: "poor", move: "a3", feedback: "Those are the pawns in front of White's own king. Moving them gives Black's pieces and pawns something to open lines against." },
      { text: "Exchange queens with Qd5 or Nd5 ideas to reach an endgame", verdict: "poor", feedback: "White's set-up with f3, Be3, Qd2 and long castling is built for a kingside attack. Heading for an endgame gives up the whole point and leaves Black with comfortable play on the c-file." },
    ],
    concept: "When the kings are castled on opposite sides, both players attack with pawns and the game becomes a race. Count how many moves each attack needs, and open lines against the enemy king as fast as possible.",
    whitePlans: ["h4-h5 to open the h-file.", "Bh6 to trade the g7 bishop.", "g4 to support the advance and stop ...h5 in some lines."],
    blackPlans: ["...Rc8 and ...Ne5-c4 to use the c-file.", "An exchange sacrifice on c3 to wreck White's king cover.", "...h5 to slow down the h-pawn."],
    typicalEndgame: "Rare: these games are usually decided by an attack. If queens come off, Black's structure is healthy and the g7 bishop is strong.",
  },
  {
    id: "sveshnikov-outpost",
    structure: "Hole on d5",
    title: "A square no pawn can defend",
    fromOpenings: ["sicilian-najdorf"],
    moves: ["e4", "c5", "Nf3", "Nc6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "e5", "Ndb5", "d6", "Bg5", "a6", "Na3", "b5"],
    side: "w",
    skill: "evaluation",
    difficulty: 1400,
    question: "Black's pawns on d6 and e5 have left the d5 square without pawn protection. How should White use that?",
    options: [
      { text: "Nd5: put a knight on the square where no pawn can ever attack it", verdict: "best", move: "Nd5", feedback: "A square in the enemy half that cannot be attacked by a pawn is an outpost. A knight on d5 attacks f6, e7, c7 and b6 at once and can be removed only by giving up a piece for it." },
      { text: "Bxf6, removing a defender of d5, and only then Nd5", verdict: "playable", move: "Bxf6", feedback: "Also a main line. Taking the knight removes one of the pieces that could challenge d5 and damages Black's pawns after ...gxf6. In return Black gets the bishop pair and the f-pawns can later advance, so the position stays double-edged." },
      { text: "Nab1, bringing the offside knight back into the game", verdict: "poor", move: "Nab1", feedback: "The a3 knight does need a route back, usually via c2, but retreating now wastes the moment. The d5 square is available immediately and Black's ...b4 fork is a threat that Nd5 answers." },
      { text: "f4, attacking the e5 pawn at once", verdict: "poor", move: "f4", feedback: "This ignores the threat of ...b4, which forks the two knights. The outpost should be occupied first." },
    ],
    concept: "A hole is a square that can no longer be defended by a pawn. A knight on a central hole is often worth more than a rook's pawn or even the exchange, because it cannot be driven away.",
    whitePlans: ["Occupy d5 with a knight and keep a second piece ready to recapture there.", "Bring the a3 knight to e3 via c2.", "Play c3 or c4 and a4 to attack Black's queenside pawns."],
    blackPlans: ["Use the bishop pair and the f-pawns: ...f5.", "Challenge d5 with ...Ne7 and ...Be6.", "Queenside expansion with ...b4."],
    typicalEndgame: "If the knight on d5 survives into an endgame against a bad dark-squared bishop, White is better. If Black trades it off and keeps the bishops, Black is fine.",
  },
  {
    id: "french-chain",
    structure: "French pawn chain",
    title: "Attacking the base of the chain",
    fromOpenings: ["french"],
    moves: ["e4", "e6", "d4", "d5", "e5", "c5", "c3", "Nc6", "Nf3", "Qb6", "Be2", "cxd4", "cxd4"],
    side: "b",
    skill: "planning",
    difficulty: 1300,
    question: "The centre is locked. White's pawn on d4 supports the one on e5. What should Black aim at?",
    options: [
      { text: "Bring a third attacker to d4 with ...Nh6 and ...Nf5", verdict: "best", move: "Nh6", feedback: "The d4 pawn is the base of White's chain and can no longer be defended by a pawn. It is already attacked by the queen and the c6 knight. A knight on f5 makes three attackers, and White's pieces get tied to its defence." },
      { text: "Take the pawn on b2 with the queen", verdict: "poor", feedback: "The b2 pawn is defended by the bishop on c1, so this simply loses the queen for a pawn. Even in lines where b2 is free, the queen often gets trapped there." },
      { text: "Play ...f6 at once to attack the head of the chain", verdict: "playable", move: "f6", feedback: "...f6 is a standard second break in the French and can be good later. Played now, before development is finished, it loosens Black's own king. Usually the base is attacked first." },
      { text: "Castle queenside quickly and attack on the kingside", verdict: "poor", feedback: "White has more space on the kingside, where the e5 pawn points. Black's play is on the queenside and against d4; the king normally goes to the kingside or stays in the centre for a while." },
    ],
    concept: "A pawn chain is strongest at its head and weakest at its base, because the base has no pawn behind it. Attack the base with pawns and pieces; the head is attacked later, to break the chain up.",
    whitePlans: ["Defend d4 and finish development.", "Kingside space: pieces to the kingside, sometimes h4-h5.", "Trade Black's f5 knight with Bd3 or g4 when it is safe."],
    blackPlans: ["...Qb6, ...Nc6, ...Nh6-f5 against d4.", "...f6 to break the head of the chain.", "...Bd7 and ...Bb5 to exchange the bad bishop."],
    typicalEndgame: "Black's light-squared bishop, blocked by its own pawns on e6 and d5, is a problem in endgames unless it has been exchanged.",
  },
  {
    id: "stonewall-bishops",
    structure: "Stonewall",
    title: "Which pieces to keep",
    fromOpenings: ["dutch-stonewall"],
    moves: ["d4", "f5", "g3", "Nf6", "Bg2", "e6", "Nf3", "d5", "O-O", "Bd6", "c4", "c6", "b3", "Qe7"],
    side: "w",
    skill: "evaluation",
    difficulty: 1500,
    question: "Black's pawns are fixed on light squares: c6, d5, e6, f5. Which exchange would help White most?",
    options: [
      { text: "Trade the dark-squared bishops, for example with Ba3", verdict: "best", move: "Ba3", feedback: "Black's pawns are on light squares, so the dark squares, above all e5, are guarded only by pieces. The bishop on d6 is the main guardian. Once it is exchanged, White's knights can settle on e5 and Black is left with the bishop that is blocked by its own pawns. Note that Black's last move ...Qe7 was aimed against exactly this." },
      { text: "Trade the light-squared bishops", verdict: "poor", feedback: "That would be a gift. Black's light-squared bishop is the bad piece, hemmed in by its own pawns. Exchanging it solves Black's biggest problem." },
      { text: "Trade knights on e4", verdict: "playable", feedback: "Sometimes necessary, because a black knight on e4 is strong. But it does not change the balance of weak squares the way removing the d6 bishop does." },
      { text: "Avoid all exchanges and attack on the kingside", verdict: "poor", feedback: "Black's wall controls e4 and g4, so there is no easy way in on the kingside. White's advantage is positional: the dark squares and the queenside." },
    ],
    concept: "A bishop is 'bad' when its own pawns are fixed on squares of its colour. Trade your bad bishop, keep your good one, and exchange the opponent's good bishop when you can.",
    whitePlans: ["Exchange dark-squared bishops with b3 and Ba3, or Bf4.", "Knights to e5 and d3.", "Queenside play with c5 or cxd5 at the right moment."],
    blackPlans: ["Knight to e4.", "Solve the c8 bishop: ...b6 and ...Bb7, or ...Bd7-e8-h5.", "Kingside attack with ...Qe8-h5 and ...g5 if White is slow."],
    typicalEndgame: "Good knight on e5 against bad bishop on c8: one of the classic winning endgames for White.",
  },
];

export const PLAN_BY_ID = Object.fromEntries(PLAN_EXERCISES.map((p) => [p.id, p]));
