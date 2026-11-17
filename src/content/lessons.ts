/**
 * Journey lessons (original text, GPL-3.0-or-later). A lesson is a short explanation with board
 * diagrams, followed by questions. tests/journey.test.ts checks every position is legal, every
 * "move" answer is legal, mating answers really mate, and the other answers lose nothing against
 * Stockfish's best move.
 */
export type LessonBlock =
  | { kind: "text"; text: string }
  | { kind: "board"; fen: string; caption: string; arrows?: { from: string; to: string }[] };

export type LessonQuestion =
  | { kind: "choice"; prompt: string; fen?: string; options: { text: string; correct: boolean; feedback: string }[] }
  /** Play the move on the board. Any move in `answers` (SAN) is accepted; `mate` means any mating move is accepted. */
  | { kind: "move"; prompt: string; fen: string; answers: string[]; mate?: boolean; explain: string };

export type Lesson = { id: string; title: string; minutes: number; blocks: LessonBlock[]; questions: LessonQuestion[] };

export const LESSONS: Lesson[] = [
  {
    id: "mate-basics",
    title: "Checkmate patterns you must know",
    minutes: 8,
    blocks: [
      { kind: "text", text: "Checkmate means the king is attacked and has no way out: it cannot move to a safe square, the attacker cannot be captured, and nothing can block. Most mates in real games repeat a few patterns. Learn to see them and you will find wins, and avoid losses, in seconds." },
      { kind: "board", fen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1", caption: "The back-rank mate. Black's own pawns take away the king's escape squares. Ra8 is checkmate.", arrows: [{ from: "a1", to: "a8" }] },
      { kind: "text", text: "A king and queen, or king and rook, can force mate on the edge of the board. The attacking king takes away the squares in front, and the queen or rook gives check along the edge." },
      { kind: "board", fen: "k7/8/1K6/8/8/8/8/7Q w - - 0 1", caption: "The white king covers a7 and b7. A queen check along the eighth rank covers the rest." },
    ],
    questions: [
      { kind: "move", prompt: "White to move. Give checkmate.", fen: "k7/8/1K6/8/8/8/8/7Q w - - 0 1", answers: ["Qh8#"], mate: true, explain: "The queen checks along the back rank and also covers b8. The king on b6 covers a7 and b7, so the black king has no square." },
      { kind: "move", prompt: "White to move. Checkmate with the rook.", fen: "k7/8/1K6/8/8/8/8/7R w - - 0 1", answers: ["Rh8#"], mate: true, explain: "Same pattern as the queen: the rook controls the whole eighth rank while your king takes the second rank away." },
      {
        kind: "choice",
        prompt: "In a back-rank mate, why can the king not escape?",
        options: [
          { text: "Its own pawns block the squares in front of it", correct: true, feedback: "Yes. That is why players often make 'luft' with a move like h3 or h6: an escape square for the king." },
          { text: "The attacking king is right next to it", correct: false, feedback: "In a back-rank mate the attacking king is usually far away. The defender's own pawns do the job." },
          { text: "Because it is in the corner", correct: false, feedback: "The king can be anywhere on the back rank. What matters is that its pawns block every forward square." },
        ],
      },
    ],
  },
  {
    id: "piece-safety",
    title: "Keep your pieces safe",
    minutes: 8,
    blocks: [
      { kind: "text", text: "Piece values give you a quick way to judge trades: pawn 1, knight 3, bishop 3, rook 5, queen 9. Most games between beginners are decided by a piece left unprotected, not by deep strategy." },
      { kind: "text", text: "Before every move, ask two questions. Is any of my pieces attacked and not defended enough? Can my opponent attack one with check or with a capture? Count attackers and defenders: if a piece is attacked more times than it is defended, or attacked by something cheaper, it is in danger." },
      { kind: "board", fen: "4k3/8/8/3r4/8/2N5/8/4K3 b - - 0 1", caption: "The black rook on d5 is attacked by the knight on c3 and nothing defends it. Black must move it." },
    ],
    questions: [
      {
        kind: "choice",
        prompt: "Black to move. Which black piece is in danger right now?",
        fen: "4k3/8/8/3r4/8/2N5/8/4K3 b - - 0 1",
        options: [
          { text: "The rook on d5", correct: true, feedback: "Right: the knight on c3 attacks it and nothing defends it." },
          { text: "The king on e8", correct: false, feedback: "The king is not attacked. Look at what the white knight can reach." },
          { text: "Nothing is in danger", correct: false, feedback: "The knight on c3 attacks d5, and the rook there has no defender." },
        ],
      },
      {
        kind: "choice",
        prompt: "A white knight can capture a black rook, but the rook is defended by a pawn. Is the trade good for White?",
        options: [
          { text: "Yes: White gives a knight (3) for a rook (5)", correct: true, feedback: "Correct. Even though the knight is lost, White comes out two points ahead. This is called winning the exchange." },
          { text: "No: White loses the knight", correct: false, feedback: "White does lose the knight, but gets a rook for it. Compare the values: 5 for 3." },
          { text: "It is exactly even", correct: false, feedback: "A rook is worth about 5 and a knight about 3, so it is not even." },
        ],
      },
    ],
  },
  {
    id: "opening-principles",
    title: "Opening principles",
    minutes: 7,
    blocks: [
      { kind: "text", text: "In the first moves you have three jobs: put pawns and pieces in the centre, develop knights and bishops quickly, and castle to make your king safe. Moving the same piece twice, bringing the queen out early, or grabbing pawns on the edge usually costs time that your opponent uses to attack." },
      { kind: "board", fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2", caption: "1.e4 e5 2.Nf3: White develops a knight towards the centre and attacks the e5 pawn at the same time.", arrows: [{ from: "f3", to: "e5" }] },
      { kind: "text", text: "A good rule of thumb: knights before bishops, castle before move ten, and do not move a piece twice unless there is a concrete reason." },
    ],
    questions: [
      { kind: "move", prompt: "After 1.e4 e5, play the developing move that attacks Black's e5 pawn.", fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", answers: ["Nf3"], explain: "Nf3 develops a piece, controls the centre, and makes Black spend a move defending e5." },
      {
        kind: "choice",
        prompt: "Which of these is usually the worst idea in the first five moves?",
        options: [
          { text: "Moving the queen out several times", correct: true, feedback: "Yes. The queen gets chased by smaller pieces and each chase gives your opponent a free developing move." },
          { text: "Castling", correct: false, feedback: "Castling early is one of the main goals of the opening." },
          { text: "Developing a knight", correct: false, feedback: "Developing knights early is exactly what you want." },
        ],
      },
    ],
  },
  {
    id: "forks",
    title: "Forks: two targets at once",
    minutes: 8,
    blocks: [
      { kind: "text", text: "A fork is one piece attacking two targets at the same time. The opponent can only save one. Knights are the best forking pieces because they jump and attack squares that other pieces do not, but queens, pawns and even kings can fork too." },
      { kind: "board", fen: "r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1", caption: "Nc7+ checks the king and attacks the rook on a8. After the king moves, White takes the rook.", arrows: [{ from: "d5", to: "c7" }] },
      { kind: "text", text: "To spot forks, look for enemy pieces that stand a knight's jump apart from a square you can reach, especially the king, queen and rooks. A fork with check is the strongest kind, because the opponent must answer the check first." },
    ],
    questions: [
      { kind: "move", prompt: "White to move. Win the black queen with a fork.", fen: "q3k3/8/8/1N6/8/8/8/4K3 w - - 0 1", answers: ["Nc7+"], explain: "Nc7+ attacks the king on e8 and the queen on a8. Black must deal with the check, and White takes the queen." },
      { kind: "move", prompt: "White to move. Fork the king and rook.", fen: "r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1", answers: ["Nc7+"], explain: "The knight on c7 gives check and hits a8. The rook is lost." },
    ],
  },
  {
    id: "pins-skewers",
    title: "Pins and skewers",
    minutes: 9,
    blocks: [
      { kind: "text", text: "A pin attacks a piece that cannot move, or should not move, because a more valuable piece stands behind it on the same line. If the piece behind is the king, the pin is absolute: the pinned piece may not move at all." },
      { kind: "board", fen: "4k3/8/2n5/1B6/8/8/8/4K3 b - - 0 1", caption: "The bishop pins the knight on c6 to the king on e8. The knight cannot move.", arrows: [{ from: "b5", to: "e8" }] },
      { kind: "text", text: "A skewer is a pin turned around: the more valuable piece is in front. It must move out of the way, and the piece behind it is captured." },
      { kind: "board", fen: "1q6/8/8/1k6/8/8/8/K6R w - - 0 1", caption: "Rb1+ checks the king; when it steps aside, the rook takes the queen on b8.", arrows: [{ from: "h1", to: "b1" }] },
    ],
    questions: [
      { kind: "move", prompt: "White to move. Win the queen with a skewer.", fen: "1q6/8/8/1k6/8/8/8/K6R w - - 0 1", answers: ["Rb1+"], explain: "The rook checks along the b-file. The king must leave the file, and then the rook captures the queen behind it." },
      {
        kind: "choice",
        prompt: "Black to move. How many moves does the knight on c6 have?",
        fen: "4k3/8/2n5/1B6/8/8/8/4K3 b - - 0 1",
        options: [
          { text: "None: it is pinned to the king", correct: true, feedback: "Right. Moving it would put the black king in check from the bishop, which is illegal." },
          { text: "Eight", correct: false, feedback: "A knight in the middle can have up to eight moves, but this one is pinned to its king." },
          { text: "Only captures", correct: false, feedback: "Even captures are illegal here: any knight move exposes the king to the bishop." },
        ],
      },
    ],
  },
  {
    id: "king-pawn-basics",
    title: "King and pawn endgames: the basics",
    minutes: 10,
    blocks: [
      { kind: "text", text: "When the pieces are gone, the king becomes a strong piece. Two ideas decide most simple pawn endings: the square of the pawn (can the enemy king catch a running pawn?) and the opposition (whose king has to give way?)." },
      { kind: "board", fen: "8/8/8/8/P6k/8/8/K7 w - - 0 1", caption: "Draw a square from the a4 pawn to a8 and across to e8. The black king on h4 is outside it, so the pawn queens alone." },
      { kind: "text", text: "Opposition: when the kings face each other with one square between them, the side that must move has to step aside. In king and pawn against king, the attacker wants to win the opposition to get the king in front of the pawn." },
      { kind: "board", fen: "4k3/8/4K3/4P3/8/8/8/8 w - - 0 1", caption: "With the king on the sixth rank in front of its pawn, White wins whoever is to move. Kd6 or Kf6 is the way." },
    ],
    questions: [
      { kind: "move", prompt: "White to move and win: the pawn on a4 against the king on h4.", fen: "8/8/8/8/P6k/8/8/K7 w - - 0 1", answers: ["a5"], explain: "The black king is outside the square of the pawn, so the pawn simply runs." },
      { kind: "move", prompt: "White to move. Keep the win.", fen: "4k3/8/4K3/4P3/8/8/8/8 w - - 0 1", answers: ["Kd6", "Kf6"], explain: "Stepping to the side keeps control of the queening path. Whichever way the black king goes, the white king takes the seventh rank on the other side." },
    ],
  },
  {
    id: "discovered-attacks",
    title: "Discovered attacks and double checks",
    minutes: 8,
    blocks: [
      { kind: "text", text: "A discovered attack happens when one piece moves out of the way and uncovers an attack by the piece behind it. The piece that moves can make its own threat at the same time, so the opponent faces two threats in one move. When the uncovered attack is a check, it is called a discovered check." },
      { kind: "board", fen: "4k3/7q/8/8/4B3/8/8/4R1K1 w - - 0 1", caption: "The bishop on e4 blocks the rook's line to the king. Bxh7+ captures the queen and uncovers check from the rook.", arrows: [{ from: "e4", to: "h7" }] },
      { kind: "text", text: "If both the moving piece and the uncovered piece give check, it is a double check. The king must move: blocking or capturing cannot stop two checks at once." },
    ],
    questions: [
      { kind: "move", prompt: "White to move. Use a discovered check to win the queen.", fen: "4k3/7q/8/8/4B3/8/8/4R1K1 w - - 0 1", answers: ["Bxh7"], explain: "The bishop takes the queen, and the rook on e1 now gives check. Black has no time to take the bishop back with anything that matters." },
      {
        kind: "choice",
        prompt: "Against a double check, what can the defender do?",
        options: [
          { text: "Only move the king", correct: true, feedback: "Correct. Two pieces are checking, so no single block or capture can stop both." },
          { text: "Capture one of the checking pieces", correct: false, feedback: "That would still leave the other check, so it is illegal unless the king itself captures and escapes both." },
          { text: "Block one of the checks", correct: false, feedback: "Blocking stops only one of the two checks." },
        ],
      },
    ],
  },
  {
    id: "candidate-moves",
    title: "Candidate moves and how to calculate",
    minutes: 10,
    blocks: [
      { kind: "text", text: "Strong players do not look at every move. They list a few candidate moves first, starting with the forcing ones: checks, captures and threats, for both sides. Then they calculate each candidate until the position is quiet, and only then choose." },
      { kind: "text", text: "A simple routine for every move in a serious game: 1) What did my opponent's last move change, and what does it threaten? 2) List my checks, captures and threats. 3) For each candidate, find the opponent's best reply, not the one you hope for. 4) Before moving, do a final blunder check." },
      { kind: "board", fen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1", caption: "Forcing moves first: the check Ra8 is the first candidate here, and it ends the game." },
    ],
    questions: [
      {
        kind: "choice",
        prompt: "Which moves should you look at first when searching for candidates?",
        options: [
          { text: "Checks, captures and threats", correct: true, feedback: "Yes. Forcing moves limit the opponent's replies, so they are both the most dangerous and the easiest to calculate." },
          { text: "The move that looks most natural", correct: false, feedback: "Natural moves are fine candidates, but forcing moves come first, or you will miss tactics for both sides." },
          { text: "Pawn moves", correct: false, feedback: "Pawn moves can be strong, but they are rarely the first thing to check." },
        ],
      },
      {
        kind: "choice",
        prompt: "When you calculate your move, which reply should you assume from your opponent?",
        options: [
          { text: "Their best reply", correct: true, feedback: "Always. Calculating only the replies you hope for is the most common cause of blunders." },
          { text: "The most natural-looking reply", correct: false, feedback: "Opponents do not always play the natural move. Check the strongest ones." },
          { text: "A random reply", correct: false, feedback: "Calculation is about the critical replies, starting with forcing ones." },
        ],
      },
    ],
  },
  {
    id: "deflection-decoy",
    title: "Deflection, decoy and removing the defender",
    minutes: 9,
    blocks: [
      { kind: "text", text: "Many pieces have a job: guarding a square, a piece or the back rank. Deflection forces such a piece away from its job. Removing the defender captures it outright. A decoy (attraction) does the opposite: it lures an enemy piece, often the king, onto a bad square." },
      { kind: "text", text: "To find these ideas, ask of each enemy piece: what is it defending? If one piece defends two things, it is overloaded, and attacking one of them may win the other." },
    ],
    questions: [
      {
        kind: "choice",
        prompt: "A black rook is the only piece guarding both the back rank and a black knight. What is that rook?",
        options: [
          { text: "Overloaded", correct: true, feedback: "Yes. Forcing it to deal with one job means it abandons the other." },
          { text: "Pinned", correct: false, feedback: "A pin is about a line to a more valuable piece. This is about having two jobs." },
          { text: "Trapped", correct: false, feedback: "A trapped piece has no safe squares. This rook is free to move, but has too much to do." },
        ],
      },
      {
        kind: "choice",
        prompt: "What is the difference between a deflection and a decoy?",
        options: [
          { text: "A deflection drives a defender away; a decoy lures a piece onto a fatal square", correct: true, feedback: "Exactly. Both often involve a sacrifice, but the direction is opposite." },
          { text: "They are the same thing", correct: false, feedback: "They are related but different: one pushes a piece away, the other pulls it in." },
          { text: "A decoy only works against the queen", correct: false, feedback: "Decoys are most often used against the king." },
        ],
      },
    ],
  },
  {
    id: "pawn-structure",
    title: "Reading the pawn structure",
    minutes: 10,
    blocks: [
      { kind: "text", text: "Pawns cannot move backwards, so the pawn structure is the most permanent feature of a position. It tells you where to play: attack where your pawns point, use open files for rooks, put knights on squares enemy pawns can no longer attack, and aim at pawns that cannot be defended by other pawns." },
      { kind: "text", text: "Key terms: an isolated pawn has no friendly pawns on the files next to it. A backward pawn cannot be supported by neighbours because they have advanced. A passed pawn has no enemy pawns in front of it on its own or neighbouring files. A hole is a square that no pawn of yours can ever control again." },
      { kind: "board", fen: "r1bq1rk1/pp2bppp/2n2n2/3p4/3P4/2NB1N2/PP3PPP/R1BQ1RK1 w - - 0 1", caption: "The white pawn on d4 is isolated: there are no white pawns on the c- or e-files." },
    ],
    questions: [
      {
        kind: "choice",
        prompt: "In the diagram, why is the d4 pawn called isolated?",
        fen: "r1bq1rk1/pp2bppp/2n2n2/3p4/3P4/2NB1N2/PP3PPP/R1BQ1RK1 w - - 0 1",
        options: [
          { text: "There are no white pawns on the files next to it", correct: true, feedback: "Right. No pawn can ever defend it, so pieces must." },
          { text: "It is blocked by a black pawn", correct: false, feedback: "Being blocked does not make a pawn isolated. Isolation is about the neighbouring files." },
          { text: "It is the only pawn in the centre", correct: false, feedback: "The definition is about the c- and e-files having no white pawns." },
        ],
      },
      {
        kind: "choice",
        prompt: "Where does the side playing against an isolated queen's pawn usually want a knight?",
        options: [
          { text: "On the square directly in front of the pawn", correct: true, feedback: "Yes. A blockading knight there cannot be chased by a pawn and stops the pawn advancing." },
          { text: "On the edge of the board", correct: false, feedback: "Knights on the edge control few squares. The blockade square in front of the pawn is ideal." },
          { text: "Behind its own pawns", correct: false, feedback: "That is passive. The knight belongs in front of the isolated pawn." },
        ],
      },
    ],
  },
  {
    id: "quiet-moves",
    title: "In-between moves and quiet moves",
    minutes: 8,
    blocks: [
      { kind: "text", text: "An in-between move (zwischenzug) is a forcing move played before the expected reply: instead of recapturing at once, a player gives a check or makes a bigger threat first. Always ask, before recapturing: is there something even stronger?" },
      { kind: "text", text: "A quiet move is a non-forcing move inside a combination: no check, no capture. They are the hardest moves to find because we search for forcing moves first. When the forcing moves do not work, look for a quiet move that adds a threat the opponent cannot meet." },
    ],
    questions: [
      {
        kind: "choice",
        prompt: "Your opponent has just captured one of your pieces. What should you check before recapturing?",
        options: [
          { text: "Whether a check or stronger threat is available first", correct: true, feedback: "Yes. That is exactly how in-between moves are found, by both sides." },
          { text: "Nothing: always recapture immediately", correct: false, feedback: "Automatic recaptures are a common way to miss in-between moves." },
          { text: "Whether you can castle", correct: false, feedback: "Castling may matter later, but the forcing options come first." },
        ],
      },
    ],
  },
  {
    id: "good-bad-pieces",
    title: "Good and bad pieces, outposts and weak squares",
    minutes: 10,
    blocks: [
      { kind: "text", text: "A bishop is bad when its own pawns are fixed on squares of its colour: it bites on its own pawns. Trade your bad bishop, keep your good one. A knight is strongest on an outpost: a square in the enemy half that no enemy pawn can attack, ideally supported by your own pawn." },
      { kind: "text", text: "When planning, find your worst-placed piece and improve it. Many master games are won by slowly moving every piece to its best square before any tactics happen." },
    ],
    questions: [
      {
        kind: "choice",
        prompt: "Your pawns are fixed on d5 and e4 (both light squares). Which of your bishops is the bad one?",
        options: [
          { text: "The light-squared bishop", correct: true, feedback: "Right: it is blocked by its own pawns on light squares." },
          { text: "The dark-squared bishop", correct: false, feedback: "The dark-squared bishop moves on squares your pawns are not on, so it is the good one." },
          { text: "Both are equally good", correct: false, feedback: "With pawns fixed on light squares, the light-squared bishop has far less scope." },
        ],
      },
      {
        kind: "choice",
        prompt: "What makes a square an outpost for a knight?",
        options: [
          { text: "No enemy pawn can ever attack it", correct: true, feedback: "Yes. Then the knight can only be removed by trading a piece for it." },
          { text: "It is in the centre", correct: false, feedback: "Central squares are good, but an outpost is defined by being safe from enemy pawns." },
          { text: "It is next to the enemy king", correct: false, feedback: "That can be useful, but it is not what makes an outpost." },
        ],
      },
    ],
  },
  {
    id: "opposite-castling",
    title: "Attacking with opposite-side castling",
    minutes: 8,
    blocks: [
      { kind: "text", text: "When the kings are castled on opposite sides, both players can throw their pawns at the enemy king without weakening their own. The game becomes a race: speed matters more than material. Open files towards the enemy king, sacrifice if it saves time, and count how many moves each attack needs." },
      { kind: "text", text: "With kings on the same side, a pawn storm also weakens your own king. Then attacks are usually made with pieces, and pawns advance only when the centre is closed." },
    ],
    questions: [
      {
        kind: "choice",
        prompt: "Kings are castled on opposite sides and both sides are attacking. What matters most?",
        options: [
          { text: "Speed: whose attack arrives first", correct: true, feedback: "Yes. A pawn or even a piece is often sacrificed to open lines a move faster." },
          { text: "Keeping all the material", correct: false, feedback: "In a race, a move is often worth more than a pawn." },
          { text: "Trading queens", correct: false, feedback: "That ends both attacks. Sometimes it is right for the defender, but it is not the main principle." },
        ],
      },
    ],
  },
  {
    id: "deep-calculation",
    title: "Deep calculation and visualisation",
    minutes: 10,
    blocks: [
      { kind: "text", text: "At higher levels, combinations get longer and the key move is often quiet. Train calculation without moving pieces: set up a position, write down your whole line, and only then check it. When you lose track, go back to the last position you can see clearly and calculate again from there." },
      { kind: "text", text: "Check the final position of every line with fresh eyes: who is better, is anything hanging, did the opponent have an in-between move? Most errors in long lines happen at the end, when you stop checking." },
    ],
    questions: [
      {
        kind: "choice",
        prompt: "Where do most calculation errors in long lines happen?",
        options: [
          { text: "At the end: the final position is misjudged or an in-between move is missed", correct: true, feedback: "Yes. Always evaluate the end of the line as if it were a new position." },
          { text: "On the first move", correct: false, feedback: "The first move is usually checked carefully. Errors creep in later." },
          { text: "Errors are random", correct: false, feedback: "They tend to cluster at the end of lines and on quiet replies." },
        ],
      },
    ],
  },
];

export const LESSON_BY_ID = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
