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
  /**
   * Play the move on the board. Any move in `answers` (SAN) is accepted; `mate` means any mating move
   * is accepted. `rule` marks a question about the rules (castling, en passant...): tests check the
   * answers are legal but do not require them to be the engine's best move.
   */
  | { kind: "move"; prompt: string; fen: string; answers: string[]; mate?: boolean; rule?: boolean; explain: string };

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

  {
    id: "how-pieces-move",
    title: "How the pieces move and capture",
    minutes: 10,
    blocks: [
      { kind: "text", text: "Each piece moves in its own way. The rook moves in straight lines along ranks and files. The bishop moves diagonally. The queen combines both. The king moves one square in any direction. The knight jumps in an L shape: two squares one way, then one square to the side, and it is the only piece that can jump over others. Pawns move straight forward one square (two on their first move) but capture one square diagonally forward." },
      { kind: "text", text: "A piece captures by moving onto the square of an enemy piece, which is removed from the board. You can never capture your own pieces, and no piece except the knight can jump over another piece." },
      { kind: "board", fen: "4k3/8/8/3r4/8/2N5/8/4K3 w - - 0 1", caption: "The knight on c3 reaches d5 with its L-shaped jump and can capture the rook there.", arrows: [{ from: "c3", to: "d5" }] },
    ],
    questions: [
      { kind: "move", prompt: "White to move. Capture the black rook with the knight.", fen: "4k3/8/8/3r4/8/2N5/8/4K3 w - - 0 1", answers: ["Nxd5"], explain: "Two squares up and one to the right: the knight lands on d5 and removes the rook." },
      { kind: "move", prompt: "White to move. The black queen is undefended. Capture it with the rook.", fen: "4k3/8/8/8/q7/8/8/R3K3 w - - 0 1", answers: ["Rxa4"], explain: "The rook moves straight up the a-file and captures the queen. A free queen is worth nine pawns." },
      {
        kind: "choice",
        prompt: "How does a pawn capture?",
        options: [
          { text: "One square diagonally forward", correct: true, feedback: "Right. Pawns move straight but capture diagonally, which is why a pawn can be blocked by a piece directly in front of it." },
          { text: "One square straight forward", correct: false, feedback: "That is how a pawn moves, not how it captures." },
          { text: "Like a king, in any direction", correct: false, feedback: "Pawns only ever go forward, and they capture diagonally." },
        ],
      },
    ],
  },
  {
    id: "check-rules",
    title: "Check, checkmate and stalemate",
    minutes: 8,
    blocks: [
      { kind: "text", text: "When a king is attacked it is in check, and the player must get out of check on the very next move: move the king, capture the attacker, or put a piece in between. If none of these is possible, it is checkmate and the game is over. You are never allowed to make a move that leaves your own king in check." },
      { kind: "text", text: "Stalemate is different: the player to move is not in check but has no legal move at all. Stalemate is a draw, so when you are winning, always make sure your opponent still has a move." },
      { kind: "board", fen: "7k/5Q2/6K1/8/8/8/8/8 b - - 0 1", caption: "Black to move is not in check, but every king move walks into an attack. Stalemate: the game is drawn." },
    ],
    questions: [
      { kind: "move", prompt: "White is in check from the rook on e8. Make a move that gets out of check.", fen: "4r1k1/8/8/8/8/8/R7/4K3 w - - 0 1", answers: ["Kd1", "Kd2", "Kf1", "Kf2", "Re2"], rule: true, explain: "You can step the king off the e-file or block the check by putting the rook on e2. Any of these is legal." },
      {
        kind: "choice",
        prompt: "Black to move in the diagram. What is the result?",
        fen: "7k/5Q2/6K1/8/8/8/8/8 b - - 0 1",
        options: [
          { text: "A draw by stalemate", correct: true, feedback: "Yes. Black is not in check and has no legal move, so the game is drawn even though White has a queen." },
          { text: "White wins by checkmate", correct: false, feedback: "For checkmate the king must be in check. Here it is not: that is stalemate." },
          { text: "Black must pass", correct: false, feedback: "Passing is not allowed in chess. With no legal move and no check, the game ends in stalemate." },
        ],
      },
    ],
  },
  {
    id: "special-moves",
    title: "Castling, en passant and promotion",
    minutes: 10,
    blocks: [
      { kind: "text", text: "Castling moves the king two squares towards a rook and puts that rook on the square the king jumped over. It is allowed only if neither piece has moved yet, the squares between them are empty, and the king is not in check, does not pass through an attacked square, and does not land on one." },
      { kind: "text", text: "En passant: when a pawn moves two squares and lands beside an enemy pawn, that enemy pawn may capture it as if it had moved only one square. This capture is only allowed on the very next move." },
      { kind: "text", text: "Promotion: a pawn that reaches the last rank must become a queen, rook, bishop or knight. Almost always you choose a queen." },
      { kind: "board", fen: "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1", caption: "Black's pawn has just moved from d7 to d5, next to White's pawn on e5. White may capture it en passant: exd6." },
    ],
    questions: [
      { kind: "move", prompt: "White to move. Castle kingside.", fen: "r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1", answers: ["O-O"], rule: true, explain: "The king goes from e1 to g1 and the rook from h1 to f1. On the board, move your king two squares to the right." },
      { kind: "move", prompt: "White to move. Capture the d5 pawn en passant.", fen: "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1", answers: ["exd6"], rule: true, explain: "The e5 pawn captures diagonally onto d6, the square the black pawn passed over, and the d5 pawn is removed." },
      { kind: "move", prompt: "White to move. Promote the pawn to a queen.", fen: "8/P6k/8/8/8/8/8/K7 w - - 0 1", answers: ["a8=Q"], explain: "The pawn reaches the last rank and becomes a queen." },
    ],
  },
  {
    id: "opposition",
    title: "The opposition",
    minutes: 9,
    blocks: [
      { kind: "text", text: "Two kings stand in opposition when they face each other on a line with one square between them. Neither can step forward, so the side that has to move must give way. In pawn endings, having the opposition often decides whether the game is won or drawn." },
      { kind: "board", fen: "8/4k3/8/3KP3/8/8/8/8 b - - 0 1", caption: "Black to move holds the draw by taking the opposition with Kd7: the white king cannot get past." },
      { kind: "text", text: "A useful rule for the defender against king and pawn: stay directly in front of the pawn when you can, and when the enemy king comes forward, step in front of it with the opposition." },
    ],
    questions: [
      { kind: "move", prompt: "Black to move. Take the opposition and hold the draw.", fen: "8/4k3/8/3KP3/8/8/8/8 b - - 0 1", answers: ["Kd7"], explain: "Kd7 stands face to face with the white king. Every other move lets White's king reach the sixth rank in front of the pawn, which wins." },
      {
        kind: "choice",
        prompt: "The kings face each other with one square between them. Who has the opposition?",
        options: [
          { text: "The side that just moved, because the other side must now give way", correct: true, feedback: "Yes. Having the opposition means it is your opponent's turn to move in that standoff." },
          { text: "The side to move", correct: false, feedback: "The side to move is the one that has to step aside. The other side has the opposition." },
          { text: "Whoever has more pawns", correct: false, feedback: "The opposition is only about the kings' positions and whose move it is." },
        ],
      },
    ],
  },
  {
    id: "rook-endgames",
    title: "Rook endgame principles",
    minutes: 10,
    blocks: [
      { kind: "text", text: "Rook endings are the most common endgame. Three principles carry most of them. Keep your rook active: a rook attacking pawns or cutting off the king is worth far more than one passively defending. Put rooks behind passed pawns, both your own and your opponent's. And know the two key positions: Lucena (how to win with king and pawn against rook) and Philidor (how to draw against it)." },
      { kind: "board", fen: "1K6/1P1k4/8/8/8/8/r7/2R5 w - - 0 1", caption: "The Lucena position. White first drives the black king away with Rd1+, then builds a bridge with the rook on the fourth rank." },
    ],
    questions: [
      { kind: "move", prompt: "White to move in the Lucena position. Start the winning method.", fen: "1K6/1P1k4/8/8/8/8/r7/2R5 w - - 0 1", answers: ["Rd1+"], explain: "The check drives the black king one file further away. Then Rd4 and the king walks out; the rook on d4 blocks the checks." },
      {
        kind: "choice",
        prompt: "Where does a rook usually belong in relation to a passed pawn?",
        options: [
          { text: "Behind it", correct: true, feedback: "Yes. Behind your own passed pawn, the rook supports it more as it advances; behind an enemy one, it attacks it while gaining activity." },
          { text: "In front of it", correct: false, feedback: "In front of a pawn the rook becomes passive and loses activity as the pawn advances." },
          { text: "Next to it on the same rank", correct: false, feedback: "From the side the rook can be blocked or driven off. Behind is the classic rule." },
        ],
      },
    ],
  },
  {
    id: "defence",
    title: "How to defend worse positions",
    minutes: 8,
    blocks: [
      { kind: "text", text: "Every player gets worse positions. Good defenders make them hard to win. First, find what your opponent wants and stop the most dangerous threat. Then look for counterplay: an active rook, a passed pawn or a perpetual check is often worth more than a pawn. Trade the attacking pieces, not your defenders, and remember that some material-down endgames are drawn: opposite-coloured bishops, the wrong rook's pawn, or a fortress." },
      { kind: "text", text: "Above all, keep setting problems. Many games that were objectively lost are saved because the winning side had to find several precise moves and missed one." },
    ],
    questions: [
      {
        kind: "choice",
        prompt: "You are a pawn down in a rook ending. What usually gives the best drawing chances?",
        options: [
          { text: "An active rook that attacks pawns or checks the king", correct: true, feedback: "Yes. Rook activity often matters more than a pawn in rook endings." },
          { text: "Keeping the rook back to defend your weak pawns", correct: false, feedback: "Passive defence is usually how rook endings are lost." },
          { text: "Trading rooks to reach a pawn ending", correct: false, feedback: "A pawn down, the pawn ending is usually lost. Keep the rooks on." },
        ],
      },
      {
        kind: "choice",
        prompt: "Which pieces should a defender try to trade?",
        options: [
          { text: "The opponent's attacking pieces", correct: true, feedback: "Right. Each attacker you exchange weakens the attack." },
          { text: "Your own defenders", correct: false, feedback: "Trading off defenders makes the attack stronger." },
          { text: "Any pieces, as fast as possible", correct: false, feedback: "Trades help only when they remove attackers or reach a drawable ending." },
        ],
      },
    ],
  },
  {
    id: "sacrifices",
    title: "Sacrifices: when giving material wins",
    minutes: 9,
    blocks: [
      { kind: "text", text: "A sacrifice gives up material for something else: a mating attack, open lines, a lead in development, a strong passed pawn or a dominant piece. A sound sacrifice can be calculated to a clear gain. A speculative one relies on judgement: the compensation is real but cannot be calculated to the end." },
      { kind: "text", text: "Before sacrificing, ask: what exactly do I get, how long does it last, and what is my opponent's best defence? The exchange sacrifice, a rook for a bishop or knight, is the most common positional sacrifice: it is often played to destroy the opponent's pawn structure or to win a key square." },
    ],
    questions: [
      {
        kind: "choice",
        prompt: "What makes a sacrifice 'sound'?",
        options: [
          { text: "You can calculate that it wins back more than it gives up", correct: true, feedback: "Yes. A speculative sacrifice gives lasting compensation without a calculated win." },
          { text: "It looks spectacular", correct: false, feedback: "Spectacular is not the same as sound. Only calculation decides." },
          { text: "It is played early in the game", correct: false, feedback: "Timing does not make a sacrifice sound. What it achieves does." },
        ],
      },
      {
        kind: "choice",
        prompt: "In an exchange sacrifice, what do you give and what do you get?",
        options: [
          { text: "A rook for a bishop or knight", correct: true, feedback: "Right. You lose about two points of material, so you need lasting positional gains in return." },
          { text: "A queen for a rook", correct: false, feedback: "That is a different, much larger sacrifice." },
          { text: "A pawn for a tempo", correct: false, feedback: "That is a gambit, not an exchange sacrifice." },
        ],
      },
    ],
  },
  {
    id: "converting",
    title: "Converting an advantage",
    minutes: 8,
    blocks: [
      { kind: "text", text: "Winning a winning position is a skill of its own. When ahead in material, trade pieces, not pawns: every exchange makes your extra material count for more, and every pawn left on the board is a chance to promote. Remove your opponent's counterplay before you advance, bring your king in when the queens are gone, and do not rush." },
      { kind: "text", text: "The most common way to lose a won game is a tactic: before every move, keep checking your opponent's checks, captures and threats, exactly as you would in a worse position." },
    ],
    questions: [
      {
        kind: "choice",
        prompt: "You are a piece up. What should you usually trade?",
        options: [
          { text: "Pieces", correct: true, feedback: "Yes. The fewer pieces remain, the bigger your extra piece's share, and the less counterplay your opponent has." },
          { text: "Pawns", correct: false, feedback: "Trading pawns reduces your winning chances: without pawns, an extra piece is often not enough to win." },
          { text: "Nothing: keep everything on", correct: false, feedback: "Keeping pieces on gives your opponent tactical chances. Simplify." },
        ],
      },
    ],
  },
  {
    id: "zugzwang",
    title: "Zugzwang and spare tempi",
    minutes: 9,
    blocks: [
      { kind: "text", text: "Zugzwang is a position where the side to move would be fine if it could pass, but every move makes things worse. It appears mostly in endgames, especially pawn endings, where a single spare pawn move can decide the game." },
      { kind: "board", fen: "8/8/6k1/8/4K3/8/4P3/8 w - - 0 1", caption: "Keep pawn moves in reserve: a pawn that can still move one or two squares is a way to pass the move to your opponent." },
      { kind: "text", text: "Triangulation is another way to lose a move: the king walks around a small triangle and comes back to the same square, while the enemy king cannot do the same. Then the same position arises with the opponent to move." },
    ],
    questions: [
      { kind: "move", prompt: "White to move and win. The kings face each other; keep the win.", fen: "8/8/4k3/8/4K3/8/4P3/8 w - - 0 1", answers: ["e3", "Kd4", "Kf4"], explain: "e3 is the clearest: it passes the move to Black while the kings stand in opposition. Kd4 and Kf4 also win, because White still has the spare pawn move in reserve." },
      {
        kind: "choice",
        prompt: "What is zugzwang?",
        options: [
          { text: "Any move you make worsens your position, but you must move", correct: true, feedback: "Yes. Chess has no passing, so the obligation to move becomes a weakness." },
          { text: "A forced checkmate", correct: false, feedback: "Zugzwang can lead to mate, but it is about the obligation to move, not about mate itself." },
          { text: "A draw by repetition", correct: false, feedback: "Repetition is a different rule." },
        ],
      },
    ],
  },
  {
    id: "repertoire-building",
    title: "Building a repertoire that lasts",
    minutes: 8,
    blocks: [
      { kind: "text", text: "A repertoire is the set of openings you play: one system with White and one answer each to 1.e4 and 1.d4 is enough for years. Choose openings whose middlegames you like, because you will spend more time in those positions than in the opening itself." },
      { kind: "text", text: "Learn ideas first, then moves. For each opening, know the typical pawn structure, the main plan for both sides and the most common traps. Then deepen it with your own games: after each game, look up where you or your opponent left your preparation, and add that line." },
    ],
    questions: [
      {
        kind: "choice",
        prompt: "What should you learn first about a new opening?",
        options: [
          { text: "Its pawn structures and plans", correct: true, feedback: "Yes. With the plans you can find good moves even when the opponent leaves the book." },
          { text: "As many moves as possible", correct: false, feedback: "Moves without understanding are forgotten quickly and fail when the opponent deviates." },
          { text: "Only the traps", correct: false, feedback: "Traps are useful, but most opponents will not fall into them. Plans carry the whole game." },
        ],
      },
      {
        kind: "choice",
        prompt: "What is the best way to deepen your repertoire?",
        options: [
          { text: "Check your own games to see where the opening went off your preparation", correct: true, feedback: "Right. Your games show exactly which lines you meet in practice." },
          { text: "Memorise long engine lines", correct: false, feedback: "Long lines you rarely meet are a poor use of time." },
          { text: "Change openings every month", correct: false, feedback: "Constant changes mean you never get deep enough to benefit." },
        ],
      },
    ],
  },
  {
    id: "prophylaxis",
    title: "Prophylaxis: stopping the opponent's plan",
    minutes: 8,
    blocks: [
      { kind: "text", text: "Prophylaxis means asking, before your own plans, what your opponent wants to do, and preventing it. A quiet move that takes away the opponent's best square or break is often stronger than an active move that ignores it." },
      { kind: "text", text: "At expert level, many games are won by a series of prophylactic moves: the opponent runs out of useful plans while you keep improving. A simple habit: after every opponent move, ask 'if it were their move again, what would they play?'" },
    ],
    questions: [
      {
        kind: "choice",
        prompt: "What is the core question behind prophylactic thinking?",
        options: [
          { text: "What would my opponent do if it were their move?", correct: true, feedback: "Yes. Once you know their best idea, you can stop it before pursuing your own." },
          { text: "How can I attack as fast as possible?", correct: false, feedback: "Attack matters, but prophylaxis starts with the opponent's plan." },
          { text: "Which piece have I moved least?", correct: false, feedback: "Useful for development, but not the core of prophylaxis." },
        ],
      },
    ],
  },
  {
    id: "game-analysis",
    title: "Analysing your own games",
    minutes: 8,
    blocks: [
      { kind: "text", text: "Your own games are the best training material you have, because they show your real mistakes. Analyse each serious game first without an engine: write down what you thought during the game, find the critical moments, and look for better moves yourself. Only then check with the engine, and focus on the moments where your judgement and the engine's disagree most." },
      { kind: "text", text: "Turn each mistake into a lesson: was it a missed tactic, a wrong plan, poor time use or opening knowledge? If the same kind of mistake appears in several games, that is your next training priority." },
    ],
    questions: [
      {
        kind: "choice",
        prompt: "When should you switch on the engine while analysing your game?",
        options: [
          { text: "After analysing it yourself first", correct: true, feedback: "Yes. Your own analysis is where the learning happens; the engine then checks it." },
          { text: "Immediately, to save time", correct: false, feedback: "Then you learn what the engine thinks, not why you went wrong." },
          { text: "Never", correct: false, feedback: "The engine is an excellent checker once you have done your own work." },
        ],
      },
    ],
  },
  {
    id: "imbalances",
    title: "Evaluating imbalances",
    minutes: 10,
    blocks: [
      { kind: "text", text: "Strong players evaluate a position by its imbalances: the differences between the two sides. Material, pawn structure, space, development, king safety, piece quality (bishop pair, good against bad bishop, knight outposts) and the initiative. The side with the better imbalances knows where to play and which exchanges help." },
      { kind: "text", text: "Imbalances change with exchanges and pawn moves. Static advantages, such as a better pawn structure, last. Dynamic ones, such as a lead in development, must be used quickly or they disappear." },
    ],
    questions: [
      {
        kind: "choice",
        prompt: "You lead in development but your pawn structure is worse. What should you do?",
        options: [
          { text: "Open the position and act quickly before the lead disappears", correct: true, feedback: "Yes. A lead in development is dynamic: use it now, or the static weakness decides later." },
          { text: "Keep the position closed and wait", correct: false, feedback: "Waiting lets your opponent catch up in development, and then your structural weakness remains." },
          { text: "Trade queens immediately", correct: false, feedback: "Trading queens tends to favour the side with the better structure." },
        ],
      },
      {
        kind: "choice",
        prompt: "Which of these is a static advantage?",
        options: [
          { text: "A better pawn structure", correct: true, feedback: "Right. Pawn structure changes slowly, so it lasts into the endgame." },
          { text: "A lead in development", correct: false, feedback: "That is dynamic: it fades once the opponent develops." },
          { text: "Having the move", correct: false, feedback: "That is about the next move only." },
        ],
      },
    ],
  },
  {
    id: "bishops-knights",
    title: "Bishops against knights, and the bishop pair",
    minutes: 9,
    blocks: [
      { kind: "text", text: "Bishops are long-range pieces: they love open positions with pawns on both wings. Knights are short-range but can jump: they love closed positions and outposts. Two bishops together cover both colours and are a lasting advantage in open positions." },
      { kind: "text", text: "In endgames, opposite-coloured bishops have a strong drawing tendency, because the defender's bishop controls squares the attacker's bishop never can. With same-coloured bishops, the side with the more active bishop and better pawns usually wins." },
    ],
    questions: [
      {
        kind: "choice",
        prompt: "Pawns on both sides of the board and an open centre. Which minor piece is usually better?",
        options: [
          { text: "The bishop", correct: true, feedback: "Yes. A bishop can switch between the wings in one move; a knight takes several." },
          { text: "The knight", correct: false, feedback: "Knights prefer closed positions and pawns on one side." },
          { text: "They are always equal", correct: false, feedback: "Their value depends on the pawn structure." },
        ],
      },
      {
        kind: "choice",
        prompt: "A pawn up in an endgame with opposite-coloured bishops. What is the usual result?",
        options: [
          { text: "Often a draw", correct: true, feedback: "Right. The defending bishop blockades on squares the attacker can never challenge." },
          { text: "Always a win", correct: false, feedback: "Even two extra pawns are sometimes not enough in these endings." },
          { text: "A loss for the side with the extra pawn", correct: false, feedback: "The extra pawn does not hurt; it just often does not win." },
        ],
      },
    ],
  },
  {
    id: "time-management",
    title: "Time management and practical decisions",
    minutes: 7,
    blocks: [
      { kind: "text", text: "A good move played too late can lose on time. Spend your time where it matters: the critical moments, when a decision changes the character of the game. Play simple moves quickly, especially in positions you know, and never spend a third of your clock on one move without a reason." },
      { kind: "text", text: "When short of time, choose safe, solid moves over complicated ones, and make the moves you have already calculated. Use your opponent's time to think about the general plan." },
    ],
    questions: [
      {
        kind: "choice",
        prompt: "Where should you spend most of your thinking time?",
        options: [
          { text: "At critical moments that change the character of the game", correct: true, feedback: "Yes. Exchanges, pawn breaks and sacrifices deserve the time; routine moves do not." },
          { text: "Equally on every move", correct: false, feedback: "Moves are not equally important. Save time for the decisive ones." },
          { text: "In the opening", correct: false, feedback: "Openings you know should be played quickly." },
        ],
      },
    ],
  },
  {
    id: "dynamic-play",
    title: "Initiative and dynamic play",
    minutes: 9,
    blocks: [
      { kind: "text", text: "The initiative is the ability to make threats that your opponent has to answer. While you have it, your opponent cannot carry out their own plans. Strong players will give up a pawn, or even the exchange, to keep the initiative, because each forced reply buys another move for their own play." },
      { kind: "text", text: "Dynamic factors (activity, threats, open lines) must be used before the opponent consolidates; static factors (structure, material) decide if they cannot be. Judging which kind matters more in a given position is one of the hardest skills in chess." },
    ],
    questions: [
      {
        kind: "choice",
        prompt: "Why do strong players sometimes give up material to keep the initiative?",
        options: [
          { text: "Forced replies stop the opponent from carrying out their own plans", correct: true, feedback: "Yes. While the opponent is only answering threats, your advantage in activity can grow." },
          { text: "Material does not matter in chess", correct: false, feedback: "Material matters a lot. The initiative must be worth more than what is given." },
          { text: "To confuse the engine", correct: false, feedback: "This is about the position on the board, not about engines." },
        ],
      },
    ],
  },
];

export const LESSON_BY_ID = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
