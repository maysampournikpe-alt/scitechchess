"use client";
import { useState } from "react";
import { Chess } from "chess.js";
import { Board } from "./Board";
import { Feedback } from "./ui";
import type { Endgame } from "@/content/endgames";
import { applyUci } from "@/lib/chess/rules";
import { useStore } from "@/lib/store/store";

export function EndgameFind({ endgame, assessment, onDone, onNext }: { endgame: Endgame; assessment?: boolean; onDone?: (ok: boolean) => void; onNext?: () => void }) {
  const record = useStore((s) => s.record);
  const [answer, setAnswer] = useState<{ san: string; right: boolean } | null>(null);
  const [start] = useState(() => Date.now());

  function onMove(uci: string) {
    if (answer) return;
    const m = applyUci(new Chess(endgame.fen), uci);
    if (!m) return;
    const right = endgame.keyMoves.includes(m.san);
    setAnswer({ san: m.san, right });
    record({ itemId: `endgame-q:${endgame.id}`, module: assessment ? "assessment" : "endgame", skill: "endgameKnowledge", concept: `endgame:${endgame.id}`, difficulty: endgame.difficulty, itemRd: 200, outcome: right ? "solo" : "failed", hints: 0, ms: Date.now() - start, card: { label: endgame.name, href: `/endgames/?id=${endgame.id}`, kind: "endgame" } });
    onDone?.(right);
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,32rem)_1fr]">
      <Board fen={endgame.fen} orientation={endgame.side} movable={answer ? null : endgame.side} onMove={onMove} label="Find the move" />
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-xl">{assessment ? "Endgame" : "Find the move"}</h3>
          <p className="mt-1 text-muted">
            {endgame.side === "w" ? "White" : "Black"} to move. Play the move that {endgame.goal === "win" ? "keeps the win" : "holds the draw"}. One try.
          </p>
        </div>
        {answer && (
          <Feedback tone={answer.right ? "good" : "bad"}>
            <p className="font-semibold">{answer.right ? `${answer.san} is correct.` : `${answer.san} is not it. The move is ${endgame.keyMoves.join(" or ")}.`}</p>
            <p className="mt-1">{endgame.why}</p>
          </Feedback>
        )}
        {answer && onNext && (
          <button className="btn btn-primary self-start" onClick={onNext} autoFocus>
            Next
          </button>
        )}
      </div>
    </div>
  );
}
