"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BlunderCheck } from "@/components/BlunderCheck";
import { PageHeader, Ready } from "@/components/ui";
import { loadPuzzles } from "@/lib/data";
import type { Puzzle } from "@/lib/chess/puzzle";
import { pickPuzzle } from "@/lib/learning/select";
import { useStore } from "@/lib/store/store";

function Trainer() {
  const params = useSearchParams();
  const id = params.get("id");
  const r = Number(params.get("r")) || undefined;
  const [all, setAll] = useState<Puzzle[] | null>(null);
  const [p, setP] = useState<Puzzle | null>(null);
  useEffect(() => {
    loadPuzzles(id ? r : useStore.getState().skills.decisions.score + 200, id ? 50 : 450).then(setAll, () => setAll([]));
  }, [id, r]);
  const next = useCallback(() => {
    if (!all) return;
    const s = useStore.getState();
    const exclude = new Set(Object.keys(s.seen).filter((k) => k.startsWith("blunder:")).map((k) => k.slice(8)));
    setP(pickPuzzle(all, { target: s.skills.decisions.score + 200, exclude }));
  }, [all]);
  useEffect(() => {
    if (!all) return;
    const found = id ? all.find((x) => x.id === id) : null;
    if (found) setP(found);
    else next();
  }, [all, id, next]);
  return p ? <BlunderCheck key={p.id} puzzle={p} onNext={next} /> : <p role="status">Loading positions…</p>;
}

export default function BlunderCheckPage() {
  return (
    <Ready>
      <PageHeader title="Blunder check" lead="Most games below master level are decided by one missed threat. These are real positions where a player went wrong. Your only job is not to." />
      <Suspense>
        <Trainer />
      </Suspense>
    </Ready>
  );
}
