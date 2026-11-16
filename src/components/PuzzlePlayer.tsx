"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Board, type Arrow } from "./Board";
import { Feedback } from "./ui";
import { PuzzleRun, solutionSan, type Puzzle } from "@/lib/chess/puzzle";
import { describeMove, moveFacts, opponentThreats, PIECE_NAME } from "@/lib/chess/features";
import { applyUci } from "@/lib/chess/rules";
import { mainTheme, THEME_BY_ID } from "@/lib/learning/select";
import { useStore } from "@/lib/store/store";
import { getEngine } from "@/lib/engine/browser";
import { ANALYSIS_OPTIONS } from "@/lib/engine/bot";
import type { SkillId } from "@/lib/learning/skills";
import type { Attempt } from "@/lib/learning/mastery";

type Props = {
  puzzle: Puzzle;
  /** Theme the session is about, if any; otherwise the puzzle's most specific theme is used. */
  theme?: string;
  module?: Attempt["module"];
  /** Assessment mode: one try, no hints, no retry. */
  strict?: boolean;
  onDone?: (outcome: Attempt["outcome"]) => void;
  nextLabel?: string;
  onNext?: () => void;
};

const region = (square: string) => {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  const side = file <= 2 ? "queenside (a to c files)" : file >= 5 ? "kingside (f to h files)" : "centre files";
  return `${side}, around rank ${rank}`;
};

export function PuzzlePlayer({ puzzle, theme, module = "puzzle", strict, onDone, nextLabel = "Next puzzle", onNext }: Props) {
  const record = useStore((s) => s.record);
  const run = useMemo(() => new PuzzleRun(puzzle), [puzzle]);
  const [fen, setFen] = useState(run.fen);
  const [lastMove, setLastMove] = useState<[string, string]>(run.lastMove);
  const [hints, setHints] = useState(0);
  const [wrong, setWrong] = useState<{ san: string; text: string; refutation?: string } | null>(null);
  const [state, setState] = useState<"playing" | "solved" | "revealed">("playing");
  const [progress, setProgress] = useState("");
  const [rev, setRev] = useState(0);
  const firstError = useRef(false); // read synchronously when scoring
  const [missed, setMissed] = useState(false); // the same fact, for rendering
  const started = useRef(Date.now());
  const recorded = useRef(false);
  const startFen = useMemo(() => run.fen, [run]);

  const concept = mainTheme(puzzle, theme);
  const themeLabel = THEME_BY_ID[concept]?.label ?? concept;
  const skill: SkillId = module === "calculation" ? "calculation" : (THEME_BY_ID[concept]?.skill ?? "tactics");

  useEffect(() => {
    setFen(run.fen);
    setLastMove(run.lastMove);
    setHints(0);
    setWrong(null);
    setState("playing");
    setProgress("");
    firstError.current = false;
    setMissed(false);
    recorded.current = false;
    started.current = Date.now();
  }, [run]);

  function finish(outcome: Attempt["outcome"]) {
    if (recorded.current) return;
    recorded.current = true;
    record({
      itemId: `puzzle:${puzzle.id}`,
      module,
      skill,
      concept: `theme:${concept}`,
      difficulty: puzzle.rating,
      outcome,
      hints,
      ms: Date.now() - started.current,
      card: { label: `${themeLabel} puzzle (${puzzle.rating})`, href: `/puzzles/?id=${puzzle.id}`, kind: "puzzle" },
    });
    onDone?.(outcome);
  }

  async function explainWrong(san: string, uci: string) {
    const facts = moveFacts(run.fen, uci);
    let text = facts ? describeMove(facts) : `${san} was played.`;
    if (facts?.leavesPieceLoose) text += ` The ${PIECE_NAME[facts.promotion ?? facts.piece]} can be captured on its new square.`;
    setWrong({ san, text });
    try {
      // Ask the engine for the opponent's best answer, so the reason given is a real line.
      const probe = new Chess(run.fen);
      applyUci(probe, uci);
      if (probe.isGameOver()) return;
      const engine = await getEngine();
      const a = await engine.search(probe.fen(), { depth: 12 }, ANALYSIS_OPTIONS);
      const line: string[] = [];
      for (const m of a.lines[0]?.pv.slice(0, 3) ?? []) {
        const mv = applyUci(probe, m);
        if (!mv) break;
        line.push(mv.san);
      }
      if (line.length) setWrong((w) => (w && w.san === san ? { ...w, refutation: line.join(" ") } : w));
    } catch {
      /* engine unavailable: the rule-based sentence still stands */
    }
  }

  function onMove(uci: string) {
    if (state !== "playing") return;
    const res = run.tryMove(uci);
    if (res.kind === "illegal") return;
    if (res.kind === "wrong") {
      firstError.current = true;
      setMissed(true);
      void explainWrong(res.san, uci);
      setRev((r) => r + 1); // same position: make the board redraw so the piece snaps back
      if (strict) {
        setState("revealed");
        finish("failed");
      }
      return;
    }
    setWrong(null);
    setFen(run.fen);
    setLastMove(run.lastMove);
    if (res.kind === "solved") {
      setState("solved");
      finish(firstError.current ? "failed" : hints > 0 ? "assisted" : "solo");
    } else {
      setProgress(`${res.san} is right. ${res.reply ? `The reply was ${res.reply.san}.` : ""} ${run.movesLeft} more move${run.movesLeft === 1 ? "" : "s"} to find.`);
    }
  }

  function reveal() {
    firstError.current = true;
    setMissed(true);
    while (!run.done) run.playExpected();
    setFen(run.fen);
    setLastMove(run.lastMove);
    setState("revealed");
    finish("failed");
  }

  const expected = run.done ? null : run.expected;
  const arrows: Arrow[] = [];
  if (state === "playing" && expected) {
    if (hints >= 4) arrows.push({ from: expected.slice(0, 2), to: expected.slice(2, 4), color: "green" });
    else if (hints >= 3) arrows.push({ from: expected.slice(0, 2), color: "yellow" });
  }
  const threats = hints >= 2 && state === "playing" ? opponentThreats(run.fen) : null;
  const solution = useMemo(() => solutionSan(puzzle), [puzzle]);
  const firstFacts = useMemo(() => moveFacts(startFen, puzzle.moves[1]), [startFen, puzzle]);
  const toMove = run.solverColor === "w" ? "White" : "Black";

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,34rem)_1fr]">
      <Board resetKey={rev} fen={fen} orientation={run.solverColor} movable={state === "playing" ? run.solverColor : null} onMove={onMove} lastMove={lastMove} arrows={arrows} label="Puzzle board" />
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl">{toMove} to move</h2>
          <p className="mt-1 text-muted">
            Find the best move{puzzle.moves.length > 2 ? " and the follow-up" : ""}.{" "}
            <span className="chip num ml-1">Difficulty {puzzle.rating}</span>
            {theme && <span className="chip ml-1">{themeLabel}</span>}
          </p>
        </div>

        {state === "playing" && progress && !wrong && <Feedback tone="good">{progress}</Feedback>}

        {wrong && state === "playing" && (
          <Feedback tone="bad">
            <p className="font-semibold">{wrong.san} is not the solution.</p>
            <p className="mt-1">{wrong.text}</p>
            {wrong.refutation && (
              <p className="mt-1">
                Engine line after {wrong.san}: <span className="num font-semibold">{wrong.refutation}</span>
              </p>
            )}
            <p className="mt-1 text-muted">Try again. This attempt is recorded as missed, so the position will come back for review.</p>
          </Feedback>
        )}

        {state === "playing" && !strict && (
          <div className="flex flex-col gap-3">
            {hints >= 1 && expected && <Feedback tone="info">Hint 1: look at the {region(expected.slice(2, 4))}.</Feedback>}
            {hints >= 2 && (
              <Feedback tone="info">
                Hint 2: the idea is <strong>{themeLabel.toLowerCase()}</strong>.
                {threats && (threats.mates.length > 0 || threats.winningCaptures.length > 0) && (
                  <> Your opponent is threatening {threats.mates.length ? `mate with ${threats.mates.join(" or ")}` : threats.winningCaptures.slice(0, 3).join(", ")}.</>
                )}
              </Feedback>
            )}
            {hints >= 3 && expected && <Feedback tone="info">Hint 3: the piece on {expected.slice(0, 2)} makes the move.</Feedback>}
            {hints >= 4 && <Feedback tone="info">Hint 4: the move is shown on the board.</Feedback>}
            <div className="flex flex-wrap gap-2">
              {hints < 4 && (
                <button className="btn" onClick={() => setHints((h) => h + 1)}>
                  {hints === 0 ? "Get a hint" : "Another hint"}
                </button>
              )}
              <button className="btn btn-quiet" onClick={reveal}>
                Show the solution
              </button>
            </div>
            {hints > 0 && <p className="text-sm text-muted">Solving with hints is recorded as assisted, not as solved alone.</p>}
          </div>
        )}

        {state !== "playing" && (
          <>
            <Feedback tone={state === "solved" && !missed ? "good" : "bad"}>
              <p className="font-semibold">
                {state === "revealed" ? (strict ? "Not this time." : "Solution shown.") : missed ? "Solved after a wrong try." : hints > 0 ? `Solved with ${hints} hint${hints === 1 ? "" : "s"}.` : "Solved without help."}
              </p>
              {strict && wrong && <p className="mt-1">You played {wrong.san}. {wrong.text}{wrong.refutation ? ` Engine line: ${wrong.refutation}.` : ""}</p>}
              <p className="mt-1">
                Solution: <span className="num font-semibold">{solution.join(" ")}</span>
              </p>
              {firstFacts && <p className="mt-1">{describeMove(firstFacts)}</p>}
              <p className="mt-1 text-muted">
                Pattern: {themeLabel.toLowerCase()}.{" "}
                {state === "revealed" || missed || hints > 0 ? "Scheduled for spaced review." : ""}
              </p>
            </Feedback>
            {onNext && (
              <button className="btn btn-primary self-start" onClick={onNext} autoFocus>
                {nextLabel}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
