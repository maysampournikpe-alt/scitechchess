---
name: chess-content-verification
description: Use when adding or editing any chess content in ChessMastery (opening lessons, endgame lessons, middlegame plan exercises, puzzles, videos, or any sentence that states a chess fact). Explains which automated check proves each kind of claim and how to run it, so no unverified move, result or link ships.
---

# Chess content verification

Every chess claim in this repo must be proven by a check, not by memory. Content lives in
`src/content/*.ts` and `public/data/*.json`; the proofs live in `tests/content.test.ts`,
`tests/puzzles.test.ts` and `tests/rules.test.ts`.

## What proves what

| Claim | Proof | Where |
|---|---|---|
| A move sequence is legal | Play it with chess.js; `Chess.move` throws on an illegal move | `play()` in `tests/content.test.ts` |
| An opening line has the name shown | Its positions are looked up in `public/data/openings.json` (Lichess, CC0) by placement+side+castling; `dbName` must appear | "opening lessons" block |
| An endgame result ("White wins", "draw") | Stockfish lite at 1.2 s per move must agree; `keyMoves` must keep the result; `onlyMove: true` means every other legal move must lose it | "endgame lessons" block |
| A sentence in lesson text ("...b4 forks the knights", "b2 is defended by c1") | A targeted assertion on the board: `attackers()`, `get()`, piece on square | "specific claims" tests |
| A puzzle solution | Every move legal; mate-tagged puzzles end in mate | `tests/puzzles.test.ts` |
| A plan option's `move` | Legal in the exercise position | "middlegame plan exercises" block |
| A YouTube video exists and can be embedded | `node scripts/verify-videos.mjs` (oEmbed) must print `ok` | needs network access to youtube.com |

## Procedure

1. Write the content. For a new endgame, start with `onlyMove: false` unless you have checked
   every alternative.
2. For every factual sentence in the prose, add an assertion to the "specific claims" test. If
   you cannot express it as a board fact, rephrase it as an interpretation ("usually", "the
   plan is") rather than a fact.
3. Run `npx vitest run tests/content.test.ts`. A failure means the content is wrong, not the
   test: fix the text or the moves. Read the printed engine results; they often show that a
   second move also works (then list it, or set `onlyMove: false` and say "one way").
4. Run the whole suite (`npm test`) and the browser suite (`npm run build && npm run e2e`).

## Pitfalls seen in this repo

- The Lichess database names the Petroff "Petrov's Defense", not "Russian Game". Use the
  database spelling in `dbName`.
- "Only move" claims are often false in pawn endings: in the spare-tempo position Kd4 and Kf4
  also win. The engine check caught it.
- Opening `notes` are keyed by half-move number and must belong to the learner's colour
  (odd plies for White, even for Black).
- Never add a video ID from memory. If the checker cannot reach YouTube, leave `VIDEOS` empty.
