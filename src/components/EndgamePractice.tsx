"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Board } from "./Board";
import { Feedback } from "./ui";
import type { Endgame } from "@/content/endgames";
import { applyUci } from "@/lib/chess/rules";
import { gameStatus } from "@/lib/chess/rules";
import { useEngine } from "@/lib/engine/useEngine";
import { judgeAfterMove } from "@/lib/engine/judge";
import { useStore } from "@/lib/store/store";

type Phase = "playing" | "thinking" | "slipped" | "done" | "failed";

/** Play a theoretical endgame out against the engine, with every move checked for whether it keeps the result. */
export function EndgamePractice({ endgame }: { endgame: Endgame }) {
  const { engine, error } = useEngine();
  const record = useStore((s) => s.record);
  const chess = useRef(new Chess(endgame.fen));
  const [fen, setFen] = useState(endgame.fen);
  const [last, setLast] = useState<[string, string] | null>(null);
  const [phase, setPhase] = useState<Phase>("playing");
  const [msg, setMsg] = useState("");
  const [slips, setSlips] = useState(0);
  const [source, setSource] = useState<"tablebase" | "engine" | null>(null);
  const [rev, setRev] = useState(0);
  const myMoves = useRef(0);
  const started = useRef(Date.now());
  const recorded = useRef(false);
  const goalText = endgame.goal === "win" ? (endgame.until === "mate" ? "Deliver checkmate." : "Promote a pawn safely.") : `Hold the draw for ${endgame.holdMoves} moves.`;

  function restart() {
    chess.current = new Chess(endgame.fen);
    setFen(endgame.fen);
    setLast(null);
    setPhase("playing");
    setMsg("");
    setSlips(0);
    myMoves.current = 0;
    started.current = Date.now();
    recorded.current = false;
  }
  useEffect(restart, [endgame]); // eslint-disable-line react-hooks/exhaustive-deps

  function finish(success: boolean, text: string) {
    setPhase(success ? "done" : "failed");
    setMsg(text);
    if (recorded.current) return;
    recorded.current = true;
    record({
      itemId: `endgame-play:${endgame.id}`,
      module: "endgame",
      skill: "endgameConversion",
      concept: `endgame:${endgame.id}`,
      difficulty: endgame.difficulty,
      itemRd: 200,
      outcome: success && slips === 0 ? "solo" : "failed",
      hints: 0,
      ms: Date.now() - started.current,
      card: { label: endgame.name, href: `/endgames/?id=${endgame.id}`, kind: "endgame" },
    });
  }

  async function onMove(uci: string) {
    if (phase !== "playing" || !engine) return;
    const c = chess.current;
    const before = c.fen();
    const move = applyUci(c, uci);
    if (!move) return;
    myMoves.current += 1;
    setFen(c.fen());
    setLast([move.from, move.to]);

    const status = gameStatus(c);
    if (status.over) {
      if (status.reason === "checkmate") return finish(endgame.goal === "win", "Checkmate. Well played.");
      return finish(endgame.goal === "draw", endgame.goal === "draw" ? `Draw by ${status.reason}. The position is held.` : `Draw by ${status.reason}. The win has gone: in a winning position, always check the opponent still has a safe move.`);
    }

    setPhase("thinking");
    const verdict = await judgeAfterMove(engine, c.fen());
    setSource(verdict.source);
    const kept = verdict.result === endgame.goal || (endgame.goal === "draw" && verdict.result === "win") || verdict.result === "unclear";
    if (!kept) {
      c.load(before);
      myMoves.current -= 1;
      setSlips((s) => s + 1);
      setPhase("slipped");
      setMsg(
        `${move.san} ${endgame.goal === "win" ? (verdict.result === "draw" ? "lets the win slip to a draw" : "loses") : "loses the draw"} (${verdict.source === "tablebase" ? "exact tablebase result" : "engine evaluation"}). The position has been put back. Look at the method again and try a different move.`,
      );
      return;
    }

    if (endgame.until === "promote" && move.promotion) return finish(true, `${move.san}: the pawn has promoted and the position is still winning.`);
    if (endgame.until === "hold" && myMoves.current >= (endgame.holdMoves ?? 8)) return finish(true, `You kept the draw for ${myMoves.current} moves against the best attacking tries.`);

    const reply = verdict.reply ? applyUci(c, verdict.reply) : null;
    if (!reply) return finish(false, "The engine did not return a move. Restart the exercise.");
    setFen(c.fen());
    setLast([reply.from, reply.to]);
    const after = gameStatus(c);
    if (after.over) return finish(endgame.goal === "draw" && after.result === "1/2-1/2", after.reason === "checkmate" ? "You were checkmated." : `Draw by ${after.reason}.`);
    setPhase("playing");
    setMsg(`You played ${move.san}. The defender replied ${reply.san}.`);
  }

  const turn = useMemo(() => fen.split(" ")[1], [fen]);

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,32rem)_1fr]">
      <Board fen={fen} orientation={endgame.side} movable={phase === "playing" && engine && turn === endgame.side ? endgame.side : null} onMove={onMove} lastMove={last} resetKey={rev} label={`${endgame.name} practice board`} />
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-xl">Play it out</h3>
          <p className="mt-1 text-muted">
            You are {endgame.side === "w" ? "White" : "Black"}. {goalText} Stockfish plays the other side at full strength.
          </p>
        </div>
        {error && <Feedback tone="bad">The chess engine could not start in this browser: {error}</Feedback>}
        {!engine && !error && <Feedback tone="info">Loading the engine (about 2 MB, once)…</Feedback>}
        {phase === "thinking" && <Feedback tone="info">Checking your move…</Feedback>}
        {msg && phase !== "thinking" && <Feedback tone={phase === "done" ? "good" : phase === "slipped" || phase === "failed" ? "bad" : "info"}>{msg}</Feedback>}
        {phase === "slipped" && (
          <button className="btn btn-primary self-start" onClick={() => (setFen(chess.current.fen()), setRev((r) => r + 1), setPhase("playing"))}>
            Try another move
          </button>
        )}
        {(phase === "done" || phase === "failed") && (
          <>
            <p className="text-muted">
              {phase === "done" && slips === 0
                ? "Recorded as completed without a slip."
                : `Recorded as not yet clean (${slips} slip${slips === 1 ? "" : "s"}). It is scheduled for review.`}
            </p>
            <button className="btn self-start" onClick={restart}>
              Practise again
            </button>
          </>
        )}
        {source && <p className="text-sm text-muted">Moves are being checked with {source === "tablebase" ? "the Lichess 7-piece tablebase (exact results)" : "Stockfish (an evaluation, not a proof; the tablebase was not reachable)"}.</p>}
      </div>
    </div>
  );
}
