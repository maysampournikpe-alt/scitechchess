/**
 * Endgame lessons written for this project (original text, GPL-3.0-or-later).
 *
 * Each position is a well-known theoretical position. tests/content.test.ts checks every one
 * with Stockfish: the stated result must hold, every move listed in `keyMoves` must keep it,
 * and when `onlyMove` is set, every other legal move must lose it.
 * In the app, moves are also checked against the Lichess 7-piece tablebase when it is reachable.
 */
export type Endgame = {
  id: string;
  name: string;
  tier: "Beginner" | "Intermediate" | "Advanced";
  family: "Basic checkmates" | "Pawn endings" | "Rook endings";
  fen: string;
  /** The side the learner plays. */
  side: "w" | "b";
  /** What correct play achieves for the learner. */
  goal: "win" | "draw";
  /** When the practice game counts as completed. */
  until: "mate" | "promote" | "hold";
  /** For "hold": how many of the learner's moves the position must be kept. */
  holdMoves?: number;
  /** First moves (SAN) that keep the result. Used for the find-the-move question. */
  keyMoves: string[];
  /** True when keyMoves are the only moves that keep the result. */
  onlyMove: boolean;
  difficulty: number;
  principle: string;
  why: string;
  method: string[];
  pitfalls: string[];
};

export const ENDGAMES: Endgame[] = [
  {
    id: "two-rooks-mate",
    name: "Checkmate with two rooks",
    tier: "Beginner",
    family: "Basic checkmates",
    fen: "8/8/8/4k3/8/8/8/RR2K3 w - - 0 1",
    side: "w",
    goal: "win",
    until: "mate",
    keyMoves: ["Ra4", "Rb4"],
    onlyMove: false,
    difficulty: 600,
    principle: "The ladder: one rook guards a rank, the other checks on the next one.",
    why: "A rook controls a whole rank. With one rook holding the king back, each check from the other rook forces the king one rank closer to the edge. Your own king is not needed.",
    method: ["Cut the king off with one rook on the rank next to it.", "Check with the other rook on the king's rank.", "Repeat, moving the rooks like the rungs of a ladder.", "If the king attacks a rook, swing that rook to the far side of the board."],
    pitfalls: ["Putting a rook next to the king where it can be captured.", "Checking with the wrong rook, which lets the king step forward."],
  },
  {
    id: "queen-mate",
    name: "Checkmate with king and queen",
    tier: "Beginner",
    family: "Basic checkmates",
    fen: "8/8/8/4k3/8/8/8/Q3K3 w - - 0 1",
    side: "w",
    goal: "win",
    until: "mate",
    keyMoves: [],
    onlyMove: false,
    difficulty: 700,
    principle: "Use the queen to shrink the king's box, then bring your king to help.",
    why: "The queen alone cannot give mate: she needs the king to cover the squares next to the enemy king. So first restrict, then approach, then mate on the edge.",
    method: ["Place the queen a knight's move away from the enemy king to cut off ranks and files.", "Follow the king as it retreats, keeping the same distance.", "When the king is on the edge, stop and bring your own king up.", "Deliver mate with the queen protected by, or opposite, your king."],
    pitfalls: ["Stalemate: when the king is in a corner, always check that it still has a legal move before you play a quiet move.", "Giving pointless checks that let the king run back to the centre."],
  },
  {
    id: "rook-mate",
    name: "Checkmate with king and rook",
    tier: "Beginner",
    family: "Basic checkmates",
    fen: "8/8/8/4k3/8/8/8/R3K3 w - - 0 1",
    side: "w",
    goal: "win",
    until: "mate",
    keyMoves: [],
    onlyMove: false,
    difficulty: 900,
    principle: "The rook builds a wall; the kings face each other; then the rook checks.",
    why: "A rook check only drives the king back when your own king stands directly opposite, taking away the three squares in front. Until then, a waiting move with the rook passes the turn.",
    method: ["Cut the king off with the rook along a rank or file.", "Walk your king towards the enemy king.", "When the kings stand opposite each other with the enemy to move away, or after you make a waiting rook move, give check.", "Repeat until the king is on the edge, then mate."],
    pitfalls: ["Checking when the kings are not opposite: the king simply steps forward.", "Leaving the rook where the king can attack it for free."],
  },
  {
    id: "pawn-race",
    name: "The square of the pawn",
    tier: "Beginner",
    family: "Pawn endings",
    fen: "8/8/8/8/P6k/8/8/K7 w - - 0 1",
    side: "w",
    goal: "win",
    until: "promote",
    keyMoves: ["a5"],
    onlyMove: false,
    difficulty: 800,
    principle: "Draw a square from the pawn to the promotion rank. If the enemy king cannot step into it, the pawn queens by itself.",
    why: "The pawn on a4 needs four moves to promote. The square runs a4-a8-e8-e4. The black king on h4 is three files outside it, so it can never catch the pawn, and White does not even need the king.",
    method: ["Count the squares from the pawn to promotion.", "Make a square with that side length towards the enemy king.", "If the king is outside the square and it is your move, push."],
    pitfalls: ["Moving the king 'to help' and giving the enemy king time to step into the square.", "Forgetting that a pawn on its starting square can move two squares, which makes the square smaller."],
  },
  {
    id: "king-in-front",
    name: "King on the sixth rank in front of the pawn",
    tier: "Intermediate",
    family: "Pawn endings",
    fen: "4k3/8/4K3/4P3/8/8/8/8 w - - 0 1",
    side: "w",
    goal: "win",
    until: "promote",
    keyMoves: ["Kd6", "Kf6"],
    onlyMove: true,
    difficulty: 1100,
    principle: "With your king on the sixth rank in front of your pawn, you win no matter whose move it is.",
    why: "The white king steps to one side. Whichever way the black king goes, the white king takes control of the queening square from the other side and the pawn walks through.",
    method: ["Step sideways with the king (Kd6 or Kf6).", "When the black king moves, go to the seventh rank on the other side, controlling the promotion square.", "Only then push the pawn."],
    pitfalls: ["Stepping back with the king: the black king comes to e7 and the win is gone.", "In similar positions with the king beside the pawn, pushing too early leads to stalemate.", "Letting the black king get in front of the pawn with the opposition."],
  },
  {
    id: "spare-tempo",
    name: "Winning the opposition with a spare pawn move",
    tier: "Intermediate",
    family: "Pawn endings",
    fen: "8/8/4k3/8/4K3/8/4P3/8 w - - 0 1",
    side: "w",
    goal: "win",
    until: "promote",
    keyMoves: ["e3"],
    onlyMove: false,
    difficulty: 1300,
    principle: "The kings face each other. Whoever must move loses ground. A spare pawn move passes the turn to the opponent.",
    why: "The kings are in opposition and it is White's move, which normally means White cannot make progress. But the pawn is still on e2, so White has a move in reserve: e3 changes nothing except whose turn it is. Now Black must step aside and the white king goes round to the squares in front of the pawn. With the pawn already on e3 the same position would be a draw. The reserve move can also be kept for one move longer, as long as it is played while the kings face each other.",
    method: ["Recognise the opposition: kings on the same file with one square between them.", "If it is your move and you have a spare pawn move, use it.", "When the enemy king steps to one side, advance your king on the other side.", "Keep the king in front of the pawn until the key squares are yours."],
    pitfalls: ["Stepping back with the king (Kd3, Ke3 or Kf3): that gives up the ground you need and the win is gone.", "Using up the spare pawn move too early, before the kings face each other."],
  },
  {
    id: "opposition-defence",
    name: "Drawing with the opposition",
    tier: "Intermediate",
    family: "Pawn endings",
    fen: "8/4k3/8/3KP3/8/8/8/8 b - - 0 1",
    side: "b",
    goal: "draw",
    until: "hold",
    holdMoves: 8,
    keyMoves: ["Kd7"],
    onlyMove: true,
    difficulty: 1300,
    principle: "The defender takes the opposition: stand directly in front of the enemy king so it cannot come forward.",
    why: "After ...Kd7 the white king cannot reach the sixth rank. If White pushes e6+, Black steps back in front of the pawn and later takes the opposition again, and the game ends in stalemate or the pawn is lost. Every other king move lets the white king reach the sixth rank in front of its pawn, which wins.",
    method: ["Face the enemy king with one square between you.", "When the pawn checks, go straight back in front of the pawn.", "When the enemy king comes forward next to the pawn, step in front of it again.", "On the last rank, choose the square that leaves you stalemated or in opposition, never the corner next to the pawn."],
    pitfalls: ["Stepping back diagonally: the attacker takes the opposition and wins.", "Going to the side instead of straight back when the pawn reaches the sixth rank."],
  },
  {
    id: "breakthrough",
    name: "The pawn breakthrough",
    tier: "Intermediate",
    family: "Pawn endings",
    fen: "7k/ppp5/8/PPP5/8/8/8/7K w - - 0 1",
    side: "w",
    goal: "win",
    until: "promote",
    keyMoves: ["b6"],
    onlyMove: false,
    difficulty: 1500,
    principle: "Three pawns facing three: sacrifice two to make the third a queen.",
    why: "After b6, Black must capture or lose at once. If ...cxb6, then a6 forces ...bxa6 and the c-pawn runs free; if ...axb6, then c6 forces ...bxc6 and the a-pawn runs free. Black's king is too far away to stop the last pawn.",
    method: ["Push the middle pawn.", "Whichever way Black captures, push the pawn on the far side from the capture.", "The pawn that is left has an open road."],
    pitfalls: ["Pushing a side pawn first (a6 or c6): Black captures, and it is Black who gets the passed pawn and wins.", "Trying this when the enemy king is close enough to catch the passed pawn."],
  },
  {
    id: "lucena",
    name: "The Lucena position: building a bridge",
    tier: "Advanced",
    family: "Rook endings",
    fen: "1K6/1P1k4/8/8/8/8/r7/2R5 w - - 0 1",
    side: "w",
    goal: "win",
    until: "promote",
    keyMoves: ["Rd1+"],
    onlyMove: false,
    difficulty: 1700,
    principle: "King on the queening square, pawn on the seventh: check the enemy king away, then put your rook on the fourth rank to block the checks.",
    why: "White's king is stuck in front of its pawn. First the black king is pushed one file further away. Then the rook goes to the fourth rank. When the white king comes out and the black rook starts checking, the king walks towards it and the rook finally blocks a check: the bridge. After that the pawn promotes.",
    method: ["Check with the rook to drive the king one more file from the pawn.", "Place the rook on the fourth rank (Rd4).", "Bring the king out from in front of the pawn.", "Walk the king towards the checking rook; block the last check with your rook."],
    pitfalls: ["Bringing the king out first: the checks from the side never stop.", "Putting the rook on the fifth rank instead of the fourth, which changes the timing of the bridge."],
  },
  {
    id: "philidor",
    name: "The Philidor position: defence on the sixth rank",
    tier: "Advanced",
    family: "Rook endings",
    fen: "4k3/R7/8/3KP3/8/8/8/1r6 b - - 0 1",
    side: "b",
    goal: "draw",
    until: "hold",
    holdMoves: 10,
    keyMoves: ["Rb6"],
    onlyMove: false,
    difficulty: 1700,
    principle: "Keep your rook on your third rank so the enemy king cannot advance. When the pawn steps onto that rank, go to the far end and check from behind.",
    why: "The rook on b6 stops the white king from reaching the sixth rank. White's only way to make progress is to push the pawn to e6, but then the king has lost its shelter from checks. The rook drops to the first rank and checks from behind for ever.",
    method: ["Put the rook on the rank in front of the enemy king and pawn (the sixth rank here).", "Wait there. Do not check.", "As soon as the pawn advances to that rank, move the rook to the first rank.", "Check from behind. The king has nowhere to hide."],
    pitfalls: ["Checking from behind too early, while the king can still shelter in front of its pawn.", "Leaving the sixth rank before the pawn has moved."],
  },
];

export const ENDGAME_BY_ID = Object.fromEntries(ENDGAMES.map((e) => [e.id, e]));
