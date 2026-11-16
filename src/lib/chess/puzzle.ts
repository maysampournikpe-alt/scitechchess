import { Chess } from "chess.js";
import { applyUci, toUci, type Uci } from "./rules";

/** A puzzle in the Lichess puzzle-database format (CC0). */
export type Puzzle = {
  id: string;
  /** Position BEFORE the opponent's first move. */
  fen: string;
  /** moves[0] is the opponent's move; the solver then plays moves[1], moves[3], ... */
  moves: Uci[];
  rating: number;
  themes: string[];
};

export type PuzzleRow = [id: string, fen: string, moves: string, rating: number, themes: string];

export function fromRow(r: PuzzleRow): Puzzle {
  return { id: r[0], fen: r[1], moves: r[2].split(" "), rating: r[3], themes: r[4].split(" ") };
}

export type TryResult =
  | { kind: "illegal" }
  | { kind: "wrong"; san: string }
  | { kind: "correct"; san: string; reply?: { uci: Uci; san: string } }
  | { kind: "solved"; san: string };

/**
 * Runs one puzzle. The board position is `fen`; the solver is always the side to move.
 * A wrong try does not change the position, so the solver can try again
 * (the caller decides how a second attempt is scored).
 */
export class PuzzleRun {
  readonly chess: Chess;
  readonly solverColor: "w" | "b";
  /** Index into puzzle.moves of the next move the solver must find. */
  private next = 1;
  lastMove: [string, string];

  constructor(readonly puzzle: Puzzle) {
    this.chess = new Chess(puzzle.fen);
    const first = applyUci(this.chess, puzzle.moves[0]);
    if (!first) throw new Error(`Puzzle ${puzzle.id}: first move ${puzzle.moves[0]} is illegal`);
    this.lastMove = [first.from, first.to];
    this.solverColor = this.chess.turn();
  }

  get fen(): string {
    return this.chess.fen();
  }
  get done(): boolean {
    return this.next >= this.puzzle.moves.length;
  }
  /** The move the solver has to find now (used for hints and for showing the solution). */
  get expected(): Uci {
    return this.puzzle.moves[this.next];
  }
  /** Solver moves still to find, including the current one. */
  get movesLeft(): number {
    return Math.ceil((this.puzzle.moves.length - this.next) / 2);
  }

  tryMove(uci: Uci): TryResult {
    if (this.done) return { kind: "illegal" };
    const move = applyUci(this.chess, uci);
    if (!move) return { kind: "illegal" };
    const matches = toUci(move) === this.expected;
    // Lichess convention: any move that gives checkmate is accepted.
    if (!matches && !this.chess.isCheckmate()) {
      this.chess.undo();
      return { kind: "wrong", san: move.san };
    }
    this.lastMove = [move.from, move.to];
    this.next += 1;
    if (this.done || this.chess.isCheckmate()) {
      this.next = this.puzzle.moves.length;
      return { kind: "solved", san: move.san };
    }
    const replyUci = this.puzzle.moves[this.next];
    const reply = applyUci(this.chess, replyUci);
    if (!reply) throw new Error(`Puzzle ${this.puzzle.id}: reply ${replyUci} is illegal`);
    this.lastMove = [reply.from, reply.to];
    this.next += 1;
    return { kind: "correct", san: move.san, reply: { uci: replyUci, san: reply.san } };
  }

  /** Plays the expected move for the solver (used by "show solution"). */
  playExpected(): TryResult {
    return this.tryMove(this.expected);
  }
}

/** The whole solution in SAN, starting from the solver's first move. */
export function solutionSan(puzzle: Puzzle): string[] {
  const chess = new Chess(puzzle.fen);
  const out: string[] = [];
  puzzle.moves.forEach((uci, i) => {
    const m = applyUci(chess, uci);
    if (!m) throw new Error(`Puzzle ${puzzle.id}: move ${uci} is illegal`);
    if (i > 0) out.push(m.san);
  });
  return out;
}

export type CalcResult = { correct: number; total: number; error: string | null };

/**
 * Calculation mode: the solver writes all of their moves (SAN or UCI, separated by spaces or
 * commas, move numbers allowed) before touching the board. The opponent's replies come from the
 * puzzle. `correct` counts solver moves that matched before the first error.
 */
export function checkCalculation(puzzle: Puzzle, text: string): CalcResult {
  const tokens = text
    .replace(/\d+\.(\.\.)?/g, " ")
    .split(/[\s,]+/)
    .filter(Boolean);
  const run = new PuzzleRun(puzzle);
  const total = Math.ceil((puzzle.moves.length - 1) / 2);
  let correct = 0;
  for (const tok of tokens) {
    if (run.done) break;
    const probe = new Chess(run.fen);
    const m = (() => {
      try {
        return probe.move(/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(tok) ? { from: tok.slice(0, 2), to: tok.slice(2, 4), promotion: tok[4] } : tok);
      } catch {
        return null;
      }
    })();
    if (!m) return { correct, total, error: `"${tok}" is not a legal move at that point in the line.` };
    const r = run.tryMove(toUci(m));
    if (r.kind === "wrong") return { correct, total, error: `${m.san} is where the line goes wrong.` };
    correct += 1;
  }
  if (!run.done) return { correct, total, error: correct === 0 ? "No moves were entered." : `The line stops too early: ${total - correct} more move${total - correct === 1 ? "" : "s"} were needed.` };
  return { correct, total, error: null };
}
