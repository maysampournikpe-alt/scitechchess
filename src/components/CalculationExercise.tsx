"use client";
import { useEffect, useRef, useState } from "react";
import { Board } from "./Board";
import { Feedback } from "./ui";
import { checkCalculation, PuzzleRun, solutionSan, type CalcResult, type Puzzle } from "@/lib/chess/puzzle";
import { mainTheme } from "@/lib/learning/select";
import { useStore } from "@/lib/store/store";

/** The whole line is written down before any piece moves: this trains calculation, not recognition. */
export function CalculationExercise({ puzzle, assessment, onDone, onNext }: { puzzle: Puzzle; assessment?: boolean; onDone?: (solo: boolean) => void; onNext?: () => void }) {
  const record = useStore((s) => s.record);
  const run = new PuzzleRun(puzzle);
  const [text, setText] = useState("");
  const [result, setResult] = useState<CalcResult | null>(null);
  const [blind, setBlind] = useState(false);
  const started = useRef(Date.now());
  useEffect(() => {
    setText("");
    setResult(null);
    started.current = Date.now();
  }, [puzzle]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (result) return;
    const r = checkCalculation(puzzle, text);
    setResult(r);
    const solo = r.error === null;
    record({
      itemId: `calc:${puzzle.id}`,
      module: assessment ? "assessment" : "calculation",
      skill: "calculation",
      concept: `theme:${mainTheme(puzzle)}`,
      difficulty: puzzle.rating,
      outcome: solo ? "solo" : "failed",
      hints: 0,
      ms: Date.now() - started.current,
      card: { label: `Calculation line (${puzzle.rating})`, href: "/calculation/", kind: "puzzle" },
    });
    onDone?.(solo);
  }

  const mine = run.solverColor === "w" ? "White" : "Black";
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,32rem)_1fr]">
      <Board fen={run.fen} orientation={run.solverColor} lastMove={run.lastMove} hidePieces={blind && !result} label="Calculation position (pieces cannot be moved)" />
      <div className="grid content-start gap-4">
        <div>
          <h2 className="text-2xl">{mine} to move</h2>
          <p className="mt-1 text-muted">
            Work out the whole combination without moving pieces, then write all of {mine.toLowerCase()}&apos;s moves: {Math.ceil((puzzle.moves.length - 1) / 2)} move{puzzle.moves.length > 3 ? "s" : ""}. You may skip the opponent&apos;s replies.
          </p>
        </div>
        {!assessment && !result && (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={blind} onChange={(e) => setBlind(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
            Blindfold: hide the pieces after I have looked
          </label>
        )}
        <form onSubmit={submit} className="grid gap-2">
          <label htmlFor="line" className="text-sm text-muted">
            Your line
          </label>
          <input id="line" className="input num" value={text} onChange={(e) => setText(e.target.value)} disabled={!!result} placeholder="e.g. Qxh7+ Kxh7 Rh3+" autoComplete="off" spellCheck={false} />
          <button className="btn btn-primary justify-self-start" disabled={!!result || !text.trim()}>
            Check my line
          </button>
        </form>
        {result && (
          <Feedback tone={result.error ? "bad" : "good"}>
            <p className="font-semibold">{result.error ? `${result.correct} of ${result.total} moves right. ${result.error}` : "The whole line is correct."}</p>
            <p className="num mt-1">Solution: {solutionSan(puzzle).join(" ")}</p>
          </Feedback>
        )}
        {result && onNext && (
          <button className="btn btn-primary justify-self-start" onClick={onNext} autoFocus>
            Next
          </button>
        )}
      </div>
    </div>
  );
}
