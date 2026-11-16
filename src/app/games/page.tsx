"use client";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Chess } from "chess.js";
import { Board } from "@/components/Board";
import { Feedback, PageHeader, Ready } from "@/components/ui";
import { MODEL_GAMES, MODEL_GAME_BY_ID, type ModelGame } from "@/content/games";
import { applyUci } from "@/lib/chess/rules";
import { useStore } from "@/lib/store/store";

type Ply = { san: string; from: string; to: string; fen: string };

function useLine(g: ModelGame): Ply[] {
  return useMemo(() => {
    const c = new Chess();
    return g.moves.map((san) => {
      const m = c.move(san);
      return { san: m.san, from: m.from, to: m.to, fen: c.fen() };
    });
  }, [g]);
}

function Replay({ g }: { g: ModelGame }) {
  const line = useLine(g);
  const [ply, setPly] = useState(0);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "ArrowRight") setPly((p) => Math.min(line.length, p + 1));
      if (e.key === "ArrowLeft") setPly((p) => Math.max(0, p - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [line.length]);
  const fen = ply === 0 ? new Chess().fen() : line[ply - 1].fen;
  const note = g.notes[ply];
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,32rem)_1fr]">
      <div>
        <Board fen={fen} orientation={g.learner} lastMove={ply ? [line[ply - 1].from, line[ply - 1].to] : null} label={`${g.title}, move ${Math.ceil(ply / 2)}`} />
        <div className="mt-3 flex gap-2">
          <button className="btn" onClick={() => setPly(0)} disabled={ply === 0}>
            Start
          </button>
          <button className="btn" onClick={() => setPly(ply - 1)} disabled={ply === 0} aria-label="Previous move">
            Back
          </button>
          <button className="btn btn-primary" onClick={() => setPly(ply + 1)} disabled={ply === line.length} aria-label="Next move">
            Forward
          </button>
          <Link className="btn btn-quiet" href={`/analysis/?fen=${encodeURIComponent(fen)}`}>
            Analyse
          </Link>
        </div>
        <p className="mt-2 text-sm text-muted">Arrow keys also step through the game.</p>
      </div>
      <div className="grid content-start gap-4">
        <div aria-live="polite">
          {ply === 0 ? <p>{g.summary}</p> : note ? <Feedback tone="info">{`${Math.ceil(ply / 2)}${ply % 2 ? "." : "..."} ${line[ply - 1].san}: ${note}`}</Feedback> : <p className="text-muted">{`${Math.ceil(ply / 2)}${ply % 2 ? "." : "..."} ${line[ply - 1].san}`}</p>}
        </div>
        <ol className="flex flex-wrap gap-1" aria-label="Moves">
          {line.map((m, i) => (
            <li key={i}>
              <button className={`num rounded-md px-2 py-1 ${i + 1 === ply ? "bg-raised outline outline-1 outline-accent" : ""} ${g.notes[i + 1] ? "font-semibold" : ""}`} aria-current={i + 1 === ply} onClick={() => setPly(i + 1)}>
                {i % 2 === 0 ? `${i / 2 + 1}. ` : ""}
                {m.san}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** Guess the winner's moves. The other side's moves are played automatically. */
function Guess({ g }: { g: ModelGame }) {
  const line = useLine(g);
  const record = useStore((s) => s.record);
  const [ply, setPly] = useState(0);
  const [score, setScore] = useState({ tried: 0, matched: 0 });
  const [msg, setMsg] = useState<{ tone: "good" | "bad" | "info"; text: string } | null>(null);
  const [rev, setRev] = useState(0);
  const started = useRef(Date.now());
  const recorded = useRef(false);
  const done = ply >= line.length;
  const myTurn = !done && (ply % 2 === 0 ? "w" : "b") === g.learner;
  const fen = ply === 0 ? new Chess().fen() : line[ply - 1].fen;

  useEffect(() => {
    if (done || myTurn) return;
    const t = setTimeout(() => setPly((p) => p + 1), 500);
    return () => clearTimeout(t);
  }, [ply, done, myTurn]);

  useEffect(() => {
    if (!done || recorded.current || score.tried === 0) return;
    recorded.current = true;
    const rate = score.matched / score.tried;
    record({ itemId: `model:${g.id}`, module: "plan", skill: "planning", concept: `model:${g.id}`, difficulty: 1500, itemRd: 250, outcome: rate >= 0.7 ? "solo" : rate >= 0.4 ? "assisted" : "failed", hints: rate >= 0.7 ? 0 : 1, ms: Date.now() - started.current, noCard: true });
  }, [done, score, g, record]);

  function onMove(uci: string) {
    if (!myTurn) return;
    const m = applyUci(new Chess(fen), uci);
    if (!m) return;
    const actual = line[ply];
    const hit = m.san === actual.san;
    setScore((s) => ({ tried: s.tried + 1, matched: s.matched + (hit ? 1 : 0) }));
    setMsg({ tone: hit ? "good" : "bad", text: hit ? `${actual.san}: the move played.${g.notes[ply + 1] ? ` ${g.notes[ply + 1]}` : ""}` : `You chose ${m.san}. ${g.white.split(" ").at(-1)} played ${actual.san}.${g.notes[ply + 1] ? ` ${g.notes[ply + 1]}` : ""}` });
    setRev((r) => r + 1);
    setPly(ply + 1);
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,32rem)_1fr]">
      <Board fen={fen} orientation={g.learner} movable={myTurn ? g.learner : null} onMove={onMove} lastMove={ply ? [line[ply - 1].from, line[ply - 1].to] : null} resetKey={rev} label="Guess the move" />
      <div className="grid content-start gap-4">
        <p className="text-muted">You play {g.learner === "w" ? g.white : g.black}. Find the move that was played; the reply comes automatically. A different move is not necessarily worse: use Analysis to check it.</p>
        <p className="num">
          Matched {score.matched} of {score.tried}
        </p>
        {msg && <Feedback tone={msg.tone}>{msg.text}</Feedback>}
        {done && (
          <>
            <Feedback tone="info">Game over: {g.moves.at(-1)}. {g.summary}</Feedback>
            <button
              className="btn self-start"
              onClick={() => {
                setPly(0);
                setScore({ tried: 0, matched: 0 });
                setMsg(null);
                recorded.current = false;
                started.current = Date.now();
              }}
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Router() {
  const params = useSearchParams();
  const g = MODEL_GAME_BY_ID[params.get("id") ?? ""];
  const [mode, setMode] = useState<"replay" | "guess">("replay");
  if (!g)
    return (
      <>
        <PageHeader title="Model games" lead="Famous games with notes on the ideas behind them. Replay them, then guess the winner's moves." />
        <ul className="grid gap-4 md:grid-cols-3">
          {MODEL_GAMES.map((x) => (
            <li key={x.id} className="card p-5">
              <h2 className="text-xl">{x.title}</h2>
              <p className="text-sm text-muted">
                {x.white} vs {x.black}, {x.event}, {x.year}
              </p>
              <p className="mt-2">{x.summary}</p>
              <Link href={`/games/?id=${x.id}`} className="btn btn-primary mt-4">
                Study this game
              </Link>
            </li>
          ))}
        </ul>
      </>
    );
  return (
    <>
      <PageHeader title={g.title} lead={`${g.white} vs ${g.black}. ${g.event}, ${g.year}.`}>
        <Link href="/games/" className="btn btn-quiet">
          All games
        </Link>
      </PageHeader>
      <div role="tablist" aria-label="Mode" className="mb-6 flex gap-2">
        {(["replay", "guess"] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} className={`btn ${mode === m ? "btn-primary" : ""}`} onClick={() => setMode(m)}>
            {m === "replay" ? "Replay with notes" : "Guess the move"}
          </button>
        ))}
      </div>
      {mode === "replay" ? <Replay key={g.id} g={g} /> : <Guess key={g.id} g={g} />}
    </>
  );
}

export default function GamesPage() {
  return (
    <Ready>
      <Suspense>
        <Router />
      </Suspense>
    </Ready>
  );
}
