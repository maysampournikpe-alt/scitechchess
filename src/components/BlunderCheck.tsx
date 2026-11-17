"use client";
import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Board } from "./Board";
import { Feedback } from "./ui";
import type { Puzzle } from "@/lib/chess/puzzle";
import { solutionSan } from "@/lib/chess/puzzle";
import { opponentThreats } from "@/lib/chess/features";
import { applyUci } from "@/lib/chess/rules";
import { useEngine } from "@/lib/engine/useEngine";
import { gradeMove } from "@/lib/engine/judge";
import { useStore } from "@/lib/store/store";

/**
 * A real game position in which the player to move went on to blunder (the move before a
 * Lichess puzzle). The task is only to find a move that does not lose: checks, captures and
 * threats first.
 */
export function BlunderCheck({ puzzle, onNext, context }: { puzzle: Puzzle; onNext: () => void; context?: string }) {
  const { engine, error } = useEngine();
  const record = useStore((s) => s.record);
  const side = puzzle.fen.split(" ")[1] as "w" | "b";
  const [result, setResult] = useState<{ ok: boolean; text: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const started = useRef(Date.now());
  useEffect(() => {
    setResult(null);
    setShowScan(false);
    started.current = Date.now();
  }, [puzzle]);

  const gameMove = applyUci(new Chess(puzzle.fen), puzzle.moves[0])!;
  const threats = opponentThreats(puzzle.fen);

  async function onMove(uci: string) {
    if (!engine || busy || result) return;
    setBusy(true);
    const g = await gradeMove(engine, puzzle.fen, uci, 12);
    const bad = g.judgement.quality === "mistake" || g.judgement.quality === "blunder";
    const text: string[] = [];
    if (uci === puzzle.moves[0]) text.push(`${g.san} is the move that was actually played in the game, and it loses: the opponent answered ${solutionSan(puzzle).slice(0, 3).join(" ")}.`);
    else if (bad) text.push(`${g.san} is a ${g.judgement.quality}: it gives up ${g.judgement.loss.toFixed(0)} points of expected score.`);
    else text.push(`${g.san} is safe (${g.judgement.quality}). In the game, ${gameMove.san} was played instead and lost to ${solutionSan(puzzle).slice(0, 3).join(" ")}.`);
    if (g.bestUci && bad) text.push(`A safe move was ${applyUci(new Chess(puzzle.fen), g.bestUci)?.san}.`);
    setResult({ ok: !bad, text });
    setBusy(false);
    record({ itemId: `blunder:${puzzle.id}`, module: "puzzle", skill: "decisions", concept: "blunder-check", difficulty: Math.max(600, puzzle.rating - 200), itemRd: 150, outcome: bad ? "failed" : showScan ? "assisted" : "solo", hints: showScan ? 1 : 0, ms: Date.now() - started.current, context, card: { label: "Blunder check", href: `/blunder-check/?id=${puzzle.id}&r=${puzzle.rating}`, kind: "puzzle" } });
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,32rem)_1fr]">
      <Board fen={puzzle.fen} orientation={side} movable={result || busy || !engine ? null : side} onMove={onMove} label="Blunder check position" />
      <div className="grid content-start gap-4">
        <div>
          <h2 className="text-2xl">{side === "w" ? "White" : "Black"} to move: play a safe move</h2>
          <p className="mt-1 text-muted">This position is from a real game, and the player to move went wrong here. You do not need the best move, only one that does not lose. Before moving, check: what does every check, capture and threat for your opponent do?</p>
        </div>
        {error && <Feedback tone="bad">The engine could not start: {error}</Feedback>}
        {!engine && !error && <p role="status">Loading engine…</p>}
        {!result && !showScan && (
          <button className="btn self-start" onClick={() => setShowScan(true)}>
            Show me the blunder check
          </button>
        )}
        {showScan && threats && (
          <Feedback tone="info">
            If you passed, your opponent could play: {[...threats.mates.map((m) => `${m} (mate)`), ...threats.winningCaptures, ...threats.checks.slice(0, 4).map((m) => `${m} (check)`)].join(", ") || "nothing forcing"}. Opponent checks and captures are where blunders hide.
          </Feedback>
        )}
        {busy && <p role="status">Checking your move…</p>}
        {result && (
          <>
            <Feedback tone={result.ok ? "good" : "bad"}>
              {result.text.map((t) => (
                <p key={t}>{t}</p>
              ))}
            </Feedback>
            <button className="btn btn-primary self-start" onClick={onNext} autoFocus>
              Next position
            </button>
          </>
        )}
      </div>
    </div>
  );
}
