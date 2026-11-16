"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Chess } from "chess.js";
import { Board } from "@/components/Board";
import { Empty, Feedback, PageHeader, Ready } from "@/components/ui";
import { useStore } from "@/lib/store/store";
import { useNow } from "@/lib/store/derived";
import { dueCards } from "@/lib/learning/srs";
import { useEngine } from "@/lib/engine/useEngine";
import { ANALYSIS_OPTIONS } from "@/lib/engine/bot";
import { expectedScore } from "@/lib/engine/classify";
import { applyUci } from "@/lib/chess/rules";

/** A saved position from the learner's own game: find a move as good as the engine's. */
function PositionExercise({ id }: { id: string }) {
  const pos = useStore((s) => s.positions.find((p) => p.id === id));
  const record = useStore((s) => s.record);
  const { engine } = useEngine();
  const [verdict, setVerdict] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [start] = useState(() => Date.now());
  if (!pos) return <Empty title="Position not found">It may have been deleted.</Empty>;
  const side = pos.fen.split(" ")[1] as "w" | "b";

  async function onMove(uci: string) {
    if (!engine || verdict || busy) return;
    const c = new Chess(pos!.fen);
    const m = applyUci(c, uci);
    if (!m) return;
    setBusy(true);
    // A move counts if it keeps nearly all of the best move's expected score (within 5 points).
    const a = await engine.search(pos!.fen, { depth: 14, multipv: 4 }, ANALYSIS_OPTIONS);
    const top = a.lines[0];
    const mine = a.lines.find((l) => l.pv[0] === uci);
    let ok = uci === pos!.best || uci === top?.pv[0];
    if (!ok && mine && top) ok = expectedScore(top.score) - expectedScore(mine.score) < 5;
    const bestSan = top ? applyUci(new Chess(pos!.fen), top.pv[0])?.san : null;
    setVerdict({ ok, text: ok ? `${m.san} is as good as the engine's choice.` : `${m.san} is not good enough here. The engine plays ${bestSan}.` });
    setBusy(false);
    record({ itemId: `pos:${id}`, module: "game", skill: "decisions", concept: "game:mistake", difficulty: 1300, itemRd: 250, outcome: ok ? "solo" : "failed", hints: 0, ms: Date.now() - start });
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,32rem)_1fr]">
      <Board fen={pos.fen} orientation={side} movable={verdict || busy ? null : side} onMove={onMove} label="Position from your game" />
      <div className="grid content-start gap-4">
        <p>{pos.note}</p>
        <p className="text-muted">{side === "w" ? "White" : "Black"} to move. Find a better move.</p>
        {!engine && <p role="status">Loading engine…</p>}
        {busy && <p role="status">Checking…</p>}
        {verdict && <Feedback tone={verdict.ok ? "good" : "bad"}>{verdict.text}</Feedback>}
        <Link href="/mistakes/" className="btn self-start">
          Back to my mistakes
        </Link>
      </div>
    </div>
  );
}

function Mistakes() {
  const params = useSearchParams();
  const posId = params.get("pos");
  const cards = useStore((s) => s.cards);
  const removeCard = useStore((s) => s.removeCard);
  const now = useNow();
  if (posId) return <PositionExercise id={posId} />;
  const all = Object.values(cards);
  const due = dueCards(all, now);
  const later = all.filter((c) => c.due > now).sort((a, b) => a.due - b.due);
  const day = (t: number) => new Date(t).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  if (all.length === 0)
    return (
      <Empty title="Nothing to review yet" href="/puzzles/" action="Solve some puzzles">
        Every exercise you miss, solve with hints, or get wrong in a game is saved here and scheduled for review: the next day, then a few days later, then further apart as you get it right.
      </Empty>
    );

  const row = (c: (typeof all)[number]) => (
    <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3">
      <div>
        <p>{c.label}</p>
        <p className="text-sm text-muted">
          {c.lapses > 0 ? `Missed ${c.lapses + 1} times. ` : ""}
          {c.due <= now ? "Due now." : `Next review ${day(c.due)}.`}
        </p>
      </div>
      <div className="flex gap-2">
        <Link href={c.href} className={`btn ${c.due <= now ? "btn-primary" : ""}`}>
          {c.due <= now ? "Review" : "Practise early"}
        </Link>
        <button className="btn btn-quiet" onClick={() => removeCard(c.id)} aria-label={`Remove ${c.label}`}>
          Remove
        </button>
      </div>
    </li>
  );

  return (
    <>
      <h2 className="text-2xl">Due now ({due.length})</h2>
      {due.length === 0 ? <p className="mt-2 text-muted">Nothing is due. Come back {later[0] ? day(later[0].due) : "later"}.</p> : <ul className="mt-3 grid gap-2">{due.map(row)}</ul>}
      {later.length > 0 && (
        <>
          <h2 className="mt-8 text-2xl">Coming up ({later.length})</h2>
          <ul className="mt-3 grid gap-2">{later.map(row)}</ul>
        </>
      )}
    </>
  );
}

export default function MistakesPage() {
  return (
    <Ready>
      <PageHeader title="My mistakes" lead="Positions you missed, sorted by when they are due. The most-forgotten ones come first." />
      <Suspense>
        <Mistakes />
      </Suspense>
    </Ready>
  );
}
