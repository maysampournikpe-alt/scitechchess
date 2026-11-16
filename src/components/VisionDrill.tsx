"use client";
import { useEffect, useRef, useState } from "react";
import { Board } from "./Board";
import { Feedback } from "./ui";
import type { Drill } from "@/lib/learning/vision";
import { useStore } from "@/lib/store/store";

export function VisionDrill({ drill, assessment, onDone, onNext }: { drill: Drill; assessment?: boolean; onDone?: (ok: boolean) => void; onNext?: () => void }) {
  const record = useStore((s) => s.record);
  const [picked, setPicked] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const started = useRef(Date.now());
  useEffect(() => {
    setPicked(null);
    setHidden(false);
    started.current = Date.now();
    if (!drill.hideAfterMs) return;
    const t = setTimeout(() => setHidden(true), drill.hideAfterMs);
    return () => clearTimeout(t);
  }, [drill]);

  function choose(o: string) {
    if (picked) return;
    setPicked(o);
    const ok = o === drill.answer;
    record({ itemId: `vision:${drill.id}`, module: assessment ? "assessment" : "vision", skill: "visualization", concept: `vision:${drill.kind}`, difficulty: drill.difficulty, itemRd: 150, outcome: ok ? "solo" : "failed", hints: 0, ms: Date.now() - started.current, noCard: true });
    onDone?.(ok);
  }

  const waiting = !!drill.hideAfterMs && !hidden && !picked;
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,26rem)_1fr]">
      {drill.fen ? <Board fen={drill.fen} hidePieces={hidden && !picked} label={waiting ? "Memorise this position" : "Board vision position"} /> : <div aria-hidden="true" className="hidden md:block" />}
      <div className="grid content-start gap-4">
        {waiting ? (
          <>
            <p className="text-lg">Memorise the position. The pieces disappear in a few seconds.</p>
            <button className="btn self-start" onClick={() => setHidden(true)}>
              I&apos;m ready
            </button>
          </>
        ) : (
          <>
            <p className="text-lg">{drill.prompt}</p>
            <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Answers">
              {drill.options.map((o) => (
                <button key={o} className="choice" disabled={!!picked} data-state={picked ? (o === drill.answer ? "right" : o === picked ? "wrong" : undefined) : undefined} onClick={() => choose(o)}>
                  {o}
                </button>
              ))}
            </div>
          </>
        )}
        {picked && <Feedback tone={picked === drill.answer ? "good" : "bad"}>{picked === drill.answer ? "Correct." : `The answer is ${drill.answer}.`}</Feedback>}
        {picked && onNext && (
          <button className="btn btn-primary self-start" onClick={onNext} autoFocus>
            Next
          </button>
        )}
      </div>
    </div>
  );
}
