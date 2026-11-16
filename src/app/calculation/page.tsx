"use client";
import { useCallback, useEffect, useState } from "react";
import { CalculationExercise } from "@/components/CalculationExercise";
import { PageHeader, Ready } from "@/components/ui";
import { loadPuzzles } from "@/lib/data";
import type { Puzzle } from "@/lib/chess/puzzle";
import { pickPuzzle } from "@/lib/learning/select";
import { useStore } from "@/lib/store/store";

function Calc() {
  const [all, setAll] = useState<Puzzle[] | null>(null);
  const [p, setP] = useState<Puzzle | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    loadPuzzles().then(setAll, (e) => setErr(String(e.message ?? e)));
  }, []);
  const next = useCallback(() => {
    if (!all) return;
    const s = useStore.getState();
    const exclude = new Set(Object.keys(s.seen).filter((k) => k.startsWith("calc:")).map((k) => k.slice(5)));
    // Lines of at least two of your own moves; the difficulty follows your calculation score.
    setP(pickPuzzle(all, { target: s.skills.calculation.score, minMoves: 4, exclude }));
  }, [all]);
  useEffect(next, [next]);
  const score = useStore((s) => s.skills.calculation);
  return (
    <>
      <PageHeader title="Calculation" lead="See the whole combination in your head, write it down, then check it. Guessing the first move is not enough here: every move of the line has to be right." />
      <p className="num mb-4 text-sm text-muted">Your calculation score: {Math.round(score.score)} from {score.n} line{score.n === 1 ? "" : "s"}.</p>
      {err && <p role="alert">The positions could not be loaded: {err}</p>}
      {!p && !err && <p role="status">Loading…</p>}
      {p && <CalculationExercise key={p.id} puzzle={p} onNext={next} />}
    </>
  );
}

export default function CalculationPage() {
  return (
    <Ready>
      <Calc />
    </Ready>
  );
}
