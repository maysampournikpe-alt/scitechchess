"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { EndgamePractice } from "@/components/EndgamePractice";
import { PageHeader, Ready } from "@/components/ui";
import { loadPuzzles } from "@/lib/data";
import type { Puzzle } from "@/lib/chess/puzzle";
import { applyUci } from "@/lib/chess/rules";
import { material } from "@/lib/chess/features";
import type { Endgame } from "@/content/endgames";
import { useStore } from "@/lib/store/store";

/**
 * A puzzle whose solver ends at least a rook ahead in material. Practice starts just before the
 * solver's last move, so the learner is to move and still has to cash in.
 */
function wonPosition(p: Puzzle): { fen: string; side: "w" | "b"; lead: number } | null {
  if (!p.themes.includes("crushing") || p.themes.includes("mate")) return null;
  const c = new Chess(p.fen);
  for (const u of p.moves.slice(0, -1)) if (!applyUci(c, u)) return null;
  const fen = c.fen();
  const side = c.turn();
  if (!applyUci(c, p.moves.at(-1)!) || c.isGameOver()) return null;
  const lead = material(c, side) - material(c, side === "w" ? "b" : "w");
  return lead >= 5 ? { fen, side, lead } : null;
}

function Conversion() {
  const [all, setAll] = useState<Puzzle[] | null>(null);
  const [i, setI] = useState(0);
  const rating = useStore((s) => s.skills.endgameConversion.score);
  useEffect(() => {
    loadPuzzles(useStore.getState().skills.endgameConversion.score, 700).then(setAll, () => setAll([]));
  }, []);
  const pool = useMemo(() => (all ?? []).map((p) => ({ p, w: wonPosition(p) })).filter((x) => x.w).sort((a, b) => Math.abs(a.p.rating - rating) - Math.abs(b.p.rating - rating)).slice(0, 60), [all, rating]);
  const pick = useCallback(() => setI(Math.floor(Math.random() * Math.max(1, pool.length))), [pool.length]);
  useEffect(pick, [pick]);
  const item = pool[i];
  if (!all) return <p role="status">Loading positions…</p>;
  if (!item) return <p>No suitable positions found.</p>;
  const eg: Endgame = {
    id: `conversion-${item.p.id}`,
    name: `Convert a ${item.w!.lead}-point material lead`,
    tier: "Intermediate",
    family: "Pawn endings",
    fen: item.w!.fen,
    side: item.w!.side,
    goal: "win",
    until: "hold",
    holdMoves: 12,
    keyMoves: [],
    onlyMove: false,
    difficulty: item.p.rating,
    principle: "",
    why: "",
    method: [],
    pitfalls: [],
  };
  return (
    <>
      <section className="card mb-6 max-w-3xl p-5">
        <h2 className="text-xl">How to convert</h2>
        <ul className="prose-lesson mt-2">
          <li>Before every move, check your opponent&apos;s checks, captures and threats. Winning positions are usually lost to one tactic.</li>
          <li>Trade pieces, not pawns: every exchange makes your extra material count for more.</li>
          <li>Bring your worst piece into play before you go for the king.</li>
          <li>Do not hurry. Moves that improve your position without allowing counterplay are good moves.</li>
        </ul>
      </section>
      <EndgamePractice key={eg.id} endgame={eg} concept="conversion" href="/conversion/" />
      <button className="btn mt-6" onClick={pick}>
        Another position
      </button>
    </>
  );
}

export default function ConversionPage() {
  return (
    <Ready>
      <PageHeader title="Convert and defend" lead="Winning positions from real games, played out against Stockfish at full strength. Keep the advantage for 12 moves. Every move is checked, and a move that throws the win away is taken back so you can find a better one." />
      <Conversion />
      <section className="card mt-10 max-w-3xl p-5">
        <h2 className="text-xl">Defence and survival</h2>
        <p className="mt-1 text-muted">Holding bad positions is trained with defensive puzzles, where the only good move is a defensive one, and with the drawing endgames.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link className="btn" href="/puzzles/?theme=defensiveMove">
            Defensive puzzles
          </Link>
          <Link className="btn" href="/endgames/?id=philidor">
            Philidor defence
          </Link>
          <Link className="btn" href="/endgames/?id=opposition-defence">
            Drawing with the opposition
          </Link>
          <Link className="btn" href="/blunder-check/">
            Blunder check
          </Link>
        </div>
      </section>
    </Ready>
  );
}
