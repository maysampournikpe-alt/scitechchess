"use client";
import { useState } from "react";
import { Chess } from "chess.js";
import { Board } from "./Board";
import { applyUci } from "@/lib/chess/rules";

// A real mate in one (back-rank): the visitor can solve it right on the landing page.
const FEN = "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1";

export function HeroBoard() {
  const [fen, setFen] = useState(FEN);
  const [msg, setMsg] = useState("White to move. Can you find the checkmate?");
  const [rev, setRev] = useState(0);
  const [last, setLast] = useState<[string, string] | null>(null);
  const solved = fen !== FEN;

  function onMove(uci: string) {
    const c = new Chess(FEN);
    const m = applyUci(c, uci);
    if (!m) return;
    if (c.isCheckmate()) {
      setFen(c.fen());
      setLast([m.from, m.to]);
      setMsg(`${m.san} is checkmate: the king is trapped behind its own pawns. That pattern is called a back-rank mate.`);
    } else {
      setRev((r) => r + 1);
      setMsg(`${m.san} is legal, but it is not checkmate. Look at the black king's escape squares.`);
    }
  }

  return (
    <div>
      <Board fen={fen} movable={solved ? null : "w"} onMove={onMove} lastMove={last} resetKey={rev} textInput={false} label="Try it: a mate in one" />
      <p className="mt-1 min-h-12 text-sm text-muted" role="status" aria-live="polite">
        {msg}
      </p>
    </div>
  );
}
