"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Chess } from "chess.js";
import { Board, type Arrow } from "@/components/Board";
import { GameReviewPanel } from "@/components/GameReviewPanel";
import { Feedback, PageHeader, Ready } from "@/components/ui";
import { useEngine } from "@/lib/engine/useEngine";
import { ANALYSIS_OPTIONS } from "@/lib/engine/bot";
import { formatScore } from "@/lib/engine/classify";
import { applyUci, validFen } from "@/lib/chess/rules";
import { describeMove, forcingMoves, moveFacts, opponentThreats } from "@/lib/chess/features";
import type { Line } from "@/lib/engine/uci";
import { useStore } from "@/lib/store/store";

const MAX_PGN = 200_000;

function Explorer({ initialFen }: { initialFen: string }) {
  const { engine, error } = useEngine();
  const depth = useStore((s) => s.settings.engineDepth);
  const savePosition = useStore((s) => s.savePosition);
  const addCard = useStore((s) => s.addCard);
  const [history, setHistory] = useState<string[]>([initialFen]);
  const [lastMove, setLastMove] = useState<[string, string] | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const fen = history.at(-1)!;
  useEffect(() => setHistory([initialFen]), [initialFen]);

  useEffect(() => {
    if (!engine) return;
    const c = new Chess(fen);
    setLines([]);
    setSaved(false);
    if (c.isGameOver()) return;
    let live = true;
    setBusy(true);
    engine.search(fen, { depth, multipv: 3 }, ANALYSIS_OPTIONS).then((a) => {
      if (!live) return;
      setLines(a.lines);
      setBusy(false);
    });
    return () => {
      live = false;
    };
  }, [engine, fen, depth]);

  const turn = fen.split(" ")[1] as "w" | "b";
  const sanLines = useMemo(
    () =>
      lines.map((l) => {
        const c = new Chess(fen);
        const out: string[] = [];
        for (const u of l.pv.slice(0, 8)) {
          const m = applyUci(c, u);
          if (!m) break;
          out.push(m.san);
        }
        return { ...l, san: out };
      }),
    [lines, fen],
  );
  const best = lines[0]?.pv[0];
  const facts = best ? moveFacts(fen, best) : null;
  const threats = opponentThreats(fen);
  const forcing = forcingMoves(fen);
  const arrows: Arrow[] = best ? [{ from: best.slice(0, 2), to: best.slice(2, 4), color: "blue" }] : [];

  function onMove(uci: string) {
    const c = new Chess(fen);
    const m = applyUci(c, uci);
    if (!m) return;
    setHistory((h) => [...h, c.fen()]);
    setLastMove([m.from, m.to]);
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,34rem)_1fr]">
      <div>
        <Board fen={fen} orientation={turn === "w" || history.length > 1 ? "w" : "b"} movable="both" onMove={onMove} lastMove={lastMove} arrows={arrows} label="Analysis board" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn" disabled={history.length < 2} onClick={() => (setHistory((h) => h.slice(0, -1)), setLastMove(null))}>
            Take back
          </button>
          <Link className="btn" href={`/play/?fen=${encodeURIComponent(fen)}&color=${turn}`}>
            Practise from here
          </Link>
          <button
            className="btn"
            disabled={saved}
            onClick={() => {
              const id = savePosition({ fen, best, note: "A position you saved from analysis. Find the best move." });
              addCard({ id: `pos:${id}`, kind: "concept", concept: "game:mistake", label: "Saved position: find the best move", href: `/mistakes/?pos=${id}` });
              setSaved(true);
            }}
          >
            {saved ? "Added to review" : "Save as a review card"}
          </button>
        </div>
        <p className="num mt-2 break-all text-xs text-muted">{fen}</p>
      </div>
      <div className="grid content-start gap-4">
        {error && <Feedback tone="bad">The engine could not start: {error}</Feedback>}
        <section>
          <h2 className="text-xl">Engine lines</h2>
          <p className="text-sm text-muted">Stockfish 19 lite, depth {depth}, top three moves. Scores are from White&apos;s side.</p>
          {busy && <p role="status">Thinking…</p>}
          <ol className="mt-2 grid gap-2">
            {sanLines.map((l) => (
              <li key={l.multipv} className="rounded-lg border border-line p-3">
                <span className="num mr-2 font-semibold">{formatScore(l.score, turn)}</span>
                <span className="num">{l.san.join(" ")}</span>
              </li>
            ))}
          </ol>
        </section>
        {facts && (
          <section>
            <h2 className="text-xl">What the top move does</h2>
            <p className="mt-1">{describeMove(facts)}</p>
            <p className="mt-1 text-sm text-muted">This sentence is generated from checked facts about the move (captures, checks, attacked pieces). It is not a full strategic explanation.</p>
          </section>
        )}
        <section>
          <h2 className="text-xl">Blunder check</h2>
          <ul className="mt-1 grid gap-1">
            <li>Your checks: {forcing.mates.length ? `${forcing.mates.join(", ")} (mate)` : forcing.checks.join(", ") || "none"}</li>
            <li>Captures that win material at once: {forcing.winningCaptures.join(", ") || "none"}</li>
            <li>If you passed, the opponent could play: {threats ? [...threats.mates.map((x) => `${x} (mate)`), ...threats.winningCaptures].join(", ") || "nothing forcing" : "you are in check"}</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function Analysis() {
  const params = useSearchParams();
  const [fenText, setFenText] = useState(params.get("fen") ?? "");
  const [fen, setFen] = useState(params.get("fen") && validFen(params.get("fen")!) ? params.get("fen")! : new Chess().fen());
  const [pgn, setPgn] = useState("");
  const [pgnError, setPgnError] = useState("");
  const [game, setGame] = useState<{ start: string; sans: string[]; color: "w" | "b" | null } | null>(null);
  const [color, setColor] = useState<"w" | "b" | "">("");

  function loadPgn() {
    setPgnError("");
    if (pgn.length > MAX_PGN) return setPgnError("That PGN is too long. Paste one game at a time.");
    const c = new Chess();
    try {
      c.loadPgn(pgn.trim());
    } catch (e) {
      return setPgnError(`The PGN could not be read: ${(e as Error).message}`);
    }
    const sans = c.history();
    if (sans.length === 0) return setPgnError("No moves were found in that PGN.");
    if (sans.length > 400) return setPgnError("That game has more than 400 moves; reviewing it would take very long.");
    const h = c.header();
    setGame({ start: h.SetUp === "1" && h.FEN ? h.FEN : new Chess().fen(), sans, color: color || null });
  }

  return (
    <>
      <PageHeader title="Analysis" lead="Explore any position with Stockfish running in your browser, or paste a game to have it reviewed move by move." />
      <div className="mb-6 flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="fen-in" className="mb-1 block text-sm text-muted">
            Position (FEN)
          </label>
          <input id="fen-in" className="input num" value={fenText} onChange={(e) => setFenText(e.target.value)} placeholder="Paste a FEN" />
        </div>
        <button className="btn" disabled={!validFen(fenText.trim())} onClick={() => setFen(fenText.trim())}>
          Load position
        </button>
        <button className="btn btn-quiet" onClick={() => (setFen(new Chess().fen()), setFenText(""))}>
          Starting position
        </button>
      </div>
      <Explorer initialFen={fen} />

      <section className="card mt-10 grid gap-3 p-5" aria-labelledby="import">
        <h2 id="import" className="text-2xl">
          Review one of your games
        </h2>
        <p className="max-w-[65ch] text-muted">Paste the PGN of a game you played anywhere. Nothing is uploaded: the review runs on your device. Your worst errors are turned into exercises if you say which side you were.</p>
        <label htmlFor="pgn" className="sr-only">
          PGN
        </label>
        <textarea id="pgn" className="input num min-h-40" value={pgn} onChange={(e) => setPgn(e.target.value)} placeholder={'[Event "Club game"]\n\n1. e4 e5 2. Nf3 Nc6 ...'} />
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="side" className="mb-1 block text-sm text-muted">
              I played
            </label>
            <select id="side" className="input" value={color} onChange={(e) => setColor(e.target.value as "w" | "b" | "")}>
              <option value="">Don&apos;t save exercises</option>
              <option value="w">White</option>
              <option value="b">Black</option>
            </select>
          </div>
          <button className="btn btn-primary" disabled={!pgn.trim()} onClick={loadPgn}>
            Review this game
          </button>
        </div>
        {pgnError && (
          <p role="alert" className="text-bad">
            {pgnError}
          </p>
        )}
        {game && <GameReviewPanel key={game.sans.join(" ")} startFen={game.start} sans={game.sans} playerColor={game.color} />}
      </section>
    </>
  );
}

export default function AnalysisPage() {
  return (
    <Ready>
      <Suspense>
        <Analysis />
      </Suspense>
    </Ready>
  );
}
