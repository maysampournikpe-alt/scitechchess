"use client";
import { useCallback, useEffect, useState } from "react";
import { VisionDrill } from "@/components/VisionDrill";
import { PageHeader, Ready } from "@/components/ui";
import { loadPuzzles } from "@/lib/data";
import { makeDrill, type Drill } from "@/lib/learning/vision";
import { useStore } from "@/lib/store/store";

const KINDS = [
  { id: "color", label: "Square colours" },
  { id: "knight", label: "Knight moves" },
  { id: "defended", label: "Hanging pieces" },
  { id: "memory", label: "Blindfold memory" },
] as const;

function Vision() {
  const [fens, setFens] = useState<string[]>([]);
  const [kind, setKind] = useState<Drill["kind"]>("color");
  const [drill, setDrill] = useState<Drill | null>(null);
  const [tally, setTally] = useState({ n: 0, ok: 0 });
  const vis = useStore((s) => s.skills.visualization);
  useEffect(() => {
    loadPuzzles().then((ps) => setFens(ps.map((p) => p.fen)), () => setFens([]));
  }, []);
  const next = useCallback(() => {
    if ((kind === "defended" || kind === "memory") && fens.length === 0) return setDrill(null);
    setDrill(makeDrill(kind, fens));
  }, [kind, fens]);
  useEffect(next, [next]);

  return (
    <>
      <PageHeader title="Board vision" lead="Short drills that train you to see the board without moving pieces: square colours, knight geometry, loose pieces and remembering a position." />
      <div role="tablist" aria-label="Drill type" className="mb-4 flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button key={k.id} role="tab" aria-selected={kind === k.id} className={`btn ${kind === k.id ? "btn-primary" : ""}`} onClick={() => setKind(k.id)}>
            {k.label}
          </button>
        ))}
      </div>
      <p className="num mb-4 text-sm text-muted">
        This session: {tally.ok} of {tally.n} right. Your board vision score: {Math.round(vis.score)} from {vis.n} answers.
      </p>
      {drill ? <VisionDrill key={drill.id + tally.n} drill={drill} onDone={(ok) => setTally((t) => ({ n: t.n + 1, ok: t.ok + (ok ? 1 : 0) }))} onNext={next} /> : <p role="status">Loading positions…</p>}
    </>
  );
}

export default function VisionPage() {
  return (
    <Ready>
      <Vision />
    </Ready>
  );
}
