"use client";
import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Board } from "./Board";
import { Quiz } from "./Quiz";
import type { PlanExercise } from "@/content/middlegame";
import { useEngine } from "@/lib/engine/useEngine";
import { ANALYSIS_OPTIONS } from "@/lib/engine/bot";
import { formatScore } from "@/lib/engine/classify";
import { applyUci } from "@/lib/chess/rules";

export function PlanExerciseView({ ex, assessment, onDone, onNext }: { ex: PlanExercise; assessment?: boolean; onDone?: (ok: boolean) => void; onNext?: () => void }) {
  const fen = useMemo(() => {
    const c = new Chess();
    for (const m of ex.moves) c.move(m);
    return c.fen();
  }, [ex]);
  const { engine } = useEngine();
  const [check, setCheck] = useState<string[] | null>(null);
  const [answered, setAnswered] = useState(false);

  async function answered_(ok: boolean) {
    setAnswered(true);
    onDone?.(ok);
    if (!engine || assessment) return;
    const a = await engine.search(fen, { depth: 14, multipv: 3 }, ANALYSIS_OPTIONS);
    setCheck(
      a.lines.map((l) => {
        const c = new Chess(fen);
        const san = l.pv.slice(0, 4).map((u) => applyUci(c, u)?.san).filter(Boolean);
        return `${formatScore(l.score, ex.side)}  ${san.join(" ")}`;
      }),
    );
  }

  const best = ex.options.find((o) => o.verdict === "best")!;
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,30rem)_1fr]">
      <div>
        <Board fen={fen} orientation={ex.side} label={`${ex.structure} position`} arrows={answered && best.move ? (() => { const c = new Chess(fen); const m = c.move(best.move!); return [{ from: m.from, to: m.to, color: "green" as const }]; })() : []} />
        <p className="mt-2 text-sm text-muted">{ex.side === "w" ? "White" : "Black"} to move.</p>
      </div>
      <div className="grid content-start gap-4">
        <Quiz
          prompt={`${ex.question} What would you do, and why?`}
          options={ex.options.map((o) => ({ text: o.text, correct: o.verdict === "best", partial: o.verdict === "playable", feedback: o.feedback }))}
          attempt={{ itemId: `plan:${ex.id}`, module: assessment ? "assessment" : "plan", skill: ex.skill, concept: `plan:${ex.id}`, difficulty: ex.difficulty, itemRd: 200, card: { label: `${ex.structure}: ${ex.title.toLowerCase()}`, href: `/middlegame/?id=${ex.id}`, kind: "concept" } }}
          onAnswered={answered_}
        />
        {answered && !assessment && (
          <div className="grid gap-2">
            <h3 className="text-lg">The idea behind it</h3>
            <p>{ex.concept}</p>
            <h3 className="mt-2 text-lg">Tactical check by Stockfish</h3>
            <p className="text-sm text-muted">The plans above are strategic teaching. The engine lines below only check that nothing tactical is being missed. Scores are from {ex.side === "w" ? "White" : "Black"}&apos;s side.</p>
            {check ? (
              <ol className="num grid gap-1">
                {check.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ol>
            ) : (
              <p role="status">{engine ? "Analysing…" : "Loading engine…"}</p>
            )}
          </div>
        )}
        {answered && onNext && (
          <button className="btn btn-primary self-start" onClick={onNext} autoFocus>
            Next
          </button>
        )}
      </div>
    </div>
  );
}
