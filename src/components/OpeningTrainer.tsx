"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Board, type Arrow } from "./Board";
import { Feedback } from "./ui";
import type { Opening } from "@/content/openings";
import { applyUci } from "@/lib/chess/rules";
import { useStore } from "@/lib/store/store";

const DIFFICULTY = { 1: 1000, 2: 1300, 3: 1600 } as const;

/**
 * Drill one repertoire line on the board. In "guided" mode the move to play is shown with its
 * idea; in "from memory" mode nothing is shown and every wrong move counts.
 */
export function OpeningTrainer({ opening, guided }: { opening: Opening; guided: boolean }) {
  const record = useStore((s) => s.record);
  const me = opening.color === "white" ? "w" : "b";
  const line = useMemo(() => {
    const c = new Chess();
    return opening.moves.map((san) => {
      const m = c.move(san);
      return { san: m.san, from: m.from, to: m.to, uci: m.from + m.to + (m.promotion ?? ""), fenAfter: c.fen() };
    });
  }, [opening]);

  const [ply, setPly] = useState(0);
  const [errors, setErrors] = useState(0);
  const [msg, setMsg] = useState<{ tone: "good" | "bad" | "info"; text: string } | null>(null);
  const [rev, setRev] = useState(0);
  const started = useRef(Date.now());
  const recorded = useRef(false);

  const fen = ply === 0 ? new Chess().fen() : line[ply - 1].fenAfter;
  const done = ply >= line.length;
  const myTurn = !done && (ply % 2 === 0 ? "w" : "b") === me;

  useEffect(() => {
    setPly(0);
    setErrors(0);
    setMsg(null);
    started.current = Date.now();
    recorded.current = false;
  }, [opening, guided]);

  // The trainer plays the other side's moves.
  useEffect(() => {
    if (done || myTurn) return;
    const t = setTimeout(() => setPly((p) => p + 1), 450);
    return () => clearTimeout(t);
  }, [ply, done, myTurn]);

  useEffect(() => {
    if (!done || recorded.current || guided) return;
    recorded.current = true;
    record({
      itemId: `opening-line:${opening.id}`,
      module: "opening",
      skill: "openingKnowledge",
      concept: `opening:${opening.id}`,
      difficulty: DIFFICULTY[opening.workload],
      itemRd: 200,
      outcome: errors === 0 ? "solo" : "failed",
      hints: 0,
      ms: Date.now() - started.current,
      card: { label: `${opening.name}: main line`, href: `/openings/?id=${opening.id}&tab=memory`, kind: "opening" },
    });
  }, [done, guided, errors, opening, record]);

  function onMove(uci: string) {
    if (!myTurn) return;
    const expected = line[ply];
    const c = new Chess(fen);
    const played = applyUci(c, uci);
    if (!played) return;
    if (played.san === expected.san) {
      setMsg(opening.notes[ply + 1] ? { tone: "good", text: `${expected.san}. ${opening.notes[ply + 1]}` } : { tone: "good", text: `${expected.san} is the repertoire move.` });
      setPly(ply + 1);
      return;
    }
    setErrors((e) => e + 1);
    setRev((r) => r + 1);
    setMsg({ tone: "bad", text: `${played.san} is not the move in this line. The repertoire move is ${expected.san}.${opening.notes[ply + 1] ? ` ${opening.notes[ply + 1]}` : ""} Play it to continue.` });
  }

  const arrows: Arrow[] = guided && myTurn ? [{ from: line[ply].from, to: line[ply].to, color: "green" }] : [];
  const last = ply > 0 ? ([line[ply - 1].from, line[ply - 1].to] as [string, string]) : null;
  const history = line.slice(0, ply).map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${m.san}` : m.san)).join(" ");

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,32rem)_1fr]">
      <Board fen={fen} orientation={me} movable={myTurn ? me : null} onMove={onMove} lastMove={last} arrows={arrows} resetKey={rev} label={`${opening.name} trainer`} />
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-xl">{guided ? "Guided walk-through" : "From memory"}</h3>
          <p className="mt-1 text-muted">
            You play {opening.color}. {guided ? "The arrow shows your move; the note explains it." : "No arrows. A wrong move marks the line for review."}
          </p>
        </div>
        {guided && myTurn && opening.notes[ply + 1] && <Feedback tone="info">Your move is {line[ply].san}. {opening.notes[ply + 1]}</Feedback>}
        {msg && !(guided && myTurn && msg.tone === "good") && <Feedback tone={msg.tone}>{msg.text}</Feedback>}
        <p className="num min-h-6 text-muted" aria-label="Moves so far">
          {history || "Starting position."}
        </p>
        {done && (
          <>
            <Feedback tone={errors === 0 ? "good" : "info"}>
              <p className="font-semibold">{guided ? "End of the line." : errors === 0 ? "Whole line played from memory." : `Line finished with ${errors} wrong move${errors === 1 ? "" : "s"}.`}</p>
              <p className="mt-1">{guided ? "Now play it from memory: that is what counts for your opening score." : errors === 0 ? "It will come back for review at a longer interval." : "It is scheduled for review tomorrow."}</p>
            </Feedback>
            <button
              className="btn self-start"
              onClick={() => {
                setPly(0);
                setErrors(0);
                setMsg(null);
                recorded.current = false;
                started.current = Date.now();
              }}
            >
              Start again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
