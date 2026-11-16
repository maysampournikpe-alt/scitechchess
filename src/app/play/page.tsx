"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Chess } from "chess.js";
import { Board } from "@/components/Board";
import { GameReviewPanel } from "@/components/GameReviewPanel";
import { Feedback, PageHeader, Ready } from "@/components/ui";
import { BOT_LEVELS, botMove, suggestLevel } from "@/lib/engine/bot";
import { useEngine } from "@/lib/engine/useEngine";
import { applyUci, gameStatus, validFen } from "@/lib/chess/rules";
import { useStore } from "@/lib/store/store";
import type { GameReview } from "@/lib/engine/review";

const CLOCKS = [
  { id: "none", label: "No clock", ms: 0, inc: 0 },
  { id: "10+5", label: "10 min + 5 s", ms: 600_000, inc: 5_000 },
  { id: "15+10", label: "15 min + 10 s", ms: 900_000, inc: 10_000 },
  { id: "5+3", label: "5 min + 3 s", ms: 300_000, inc: 3_000 },
];
const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

function Play() {
  const params = useSearchParams();
  const { engine, error } = useEngine();
  const tactics = useStore((s) => s.skills.tactics.score);
  const saveGame = useStore((s) => s.saveGame);
  const record = useStore((s) => s.record);
  const [level, setLevel] = useState(() => suggestLevel(tactics));
  const [color, setColor] = useState<"w" | "b">((params.get("color") as "w" | "b") ?? "w");
  const [startFen, setStartFen] = useState(params.get("fen") ?? new Chess().fen());
  const [fenInput, setFenInput] = useState(params.get("fen") ?? "");
  const [clock, setClock] = useState(params.get("clock") ? "10+5" : "none");
  const [game, setGame] = useState<Chess | null>(null);
  const [fen, setFen] = useState(startFen);
  const [last, setLast] = useState<[string, string] | null>(null);
  const [result, setResult] = useState<{ text: string; me: "win" | "draw" | "loss" } | null>(null);
  const [claim, setClaim] = useState("");
  const [times, setTimes] = useState({ w: 0, b: 0 });
  const [thinking, setThinking] = useState(false);
  const moveStarted = useRef(0);
  const timeLog = useRef<{ ply: number; msLeft: number }[]>([]);
  const gameId = useRef("");
  const c = CLOCKS.find((x) => x.id === clock)!;

  function start() {
    if (!validFen(startFen)) return;
    const g = new Chess(startFen);
    setGame(g);
    setFen(g.fen());
    setLast(null);
    setResult(null);
    setClaim("");
    setTimes({ w: c.ms, b: c.ms });
    timeLog.current = [];
    gameId.current = Date.now().toString(36);
    moveStarted.current = Date.now();
  }

  function end(g: Chess, text: string, me: "win" | "draw" | "loss") {
    setResult({ text, me });
    const pgn = g.pgn();
    saveGame({ id: gameId.current, t: Date.now(), pgn, level, color, result: me });
  }

  function checkOver(g: Chess): boolean {
    const st = gameStatus(g);
    if (st.over) {
      const me = st.result === "1/2-1/2" ? "draw" : (st.result === "1-0") === (color === "w") ? "win" : "loss";
      end(g, st.reason === "checkmate" ? (me === "win" ? "Checkmate. You win." : "Checkmate. The computer wins.") : `Draw by ${st.reason}.`, me);
      return true;
    }
    setClaim(st.claimable === "threefold" ? "The same position has appeared three times. You may claim a draw." : st.claimable === "fifty-move" ? "Fifty moves without a capture or pawn move. You may claim a draw." : "");
    return false;
  }

  // Computer's move.
  useEffect(() => {
    if (!game || !engine || result || game.turn() === color) return;
    let live = true;
    setThinking(true);
    botMove(engine, game.fen(), BOT_LEVELS[level - 1]).then((uci) => {
      if (!live || !uci) return;
      const m = applyUci(game, uci);
      setThinking(false);
      if (!m) return;
      setFen(game.fen());
      setLast([m.from, m.to]);
      moveStarted.current = Date.now();
      checkOver(game);
    });
    return () => {
      live = false;
    };
  }, [fen, game, engine, result]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clock: only the player's clock runs, so the computer's thinking time never costs you.
  useEffect(() => {
    if (!game || result || !c.ms || game.turn() !== color) return;
    const t = setInterval(() => {
      const left = times[color] - (Date.now() - moveStarted.current);
      if (left <= 0) {
        clearInterval(t);
        setTimes((x) => ({ ...x, [color]: 0 }));
        end(game, "Your time ran out.", "loss");
      } else setTimes((x) => ({ ...x }));
    }, 250);
    return () => clearInterval(t);
  }, [fen, game, result, clock]); // eslint-disable-line react-hooks/exhaustive-deps

  function onMove(uci: string) {
    if (!game || result || game.turn() !== color) return;
    const m = applyUci(game, uci);
    if (!m) return;
    if (c.ms) {
      const left = times[color] - (Date.now() - moveStarted.current) + c.inc;
      timeLog.current.push({ ply: game.history().length, msLeft: left });
      setTimes((x) => ({ ...x, [color]: left }));
    }
    setFen(game.fen());
    setLast([m.from, m.to]);
    checkOver(game);
  }

  /** Practical decision-making is scored from how often the player avoided mistakes; time management from the clocked moves. */
  function onReviewed(r: GameReview) {
    const mine = r.moves.filter((x) => x.color === color);
    if (mine.length < 8) return;
    const errs = mine.filter((x) => x.judgement.quality === "mistake" || x.judgement.quality === "blunder").length;
    const rate = errs / mine.length;
    // One attempt for the whole game against an item as strong as the bot is configured (levels are not human-calibrated).
    const difficulty = 600 + level * 180;
    const outcome = rate <= 0.05 ? "solo" : rate <= 0.12 ? "assisted" : "failed";
    record({ itemId: `game:${gameId.current}`, module: "game", skill: "decisions", concept: "game:decisions", difficulty, itemRd: 250, outcome, hints: outcome === "assisted" ? 1 : 0, ms: 0, noCard: true });
    if (c.ms && timeLog.current.length >= 8) {
      const low = new Set(timeLog.current.filter((t) => t.msLeft < c.ms * 0.15).map((t) => t.ply));
      const lowMoves = mine.filter((x) => low.has(x.ply - 1));
      const lowErr = lowMoves.filter((x) => x.judgement.quality === "mistake" || x.judgement.quality === "blunder").length;
      const flagged = result?.text === "Your time ran out.";
      const tOutcome = flagged ? "failed" : lowMoves.length === 0 || lowErr === 0 ? "solo" : "failed";
      record({ itemId: `clock:${gameId.current}`, module: "game", skill: "time", concept: "game:time", difficulty, itemRd: 250, outcome: tOutcome, hints: 0, ms: 0, noCard: true });
    }
  }

  const running = game && !result;
  const myLeft = running && c.ms && game.turn() === color ? Math.max(0, times[color] - (Date.now() - moveStarted.current)) : times[color];

  return (
    <>
      <PageHeader title="Play the computer" lead="Practice and diagnostic games against Stockfish at an adjustable strength. Every finished game can be reviewed, and your worst mistakes become exercises." />
      {error && <Feedback tone="bad">The engine could not start in this browser: {error}</Feedback>}

      {!game && (
        <div className="card grid max-w-3xl gap-5 p-5">
          <fieldset>
            <legend className="text-lg font-semibold">Opponent</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {BOT_LEVELS.map((b) => (
                <label key={b.id} className="choice">
                  <input type="radio" name="level" className="sr-only" checked={level === b.id} onChange={() => setLevel(b.id)} />
                  <span className="font-semibold">
                    {b.id}. {b.name}
                  </span>
                  <span className="block text-sm text-muted">{b.description}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-sm text-muted">Level {suggestLevel(tactics)} is suggested from your tactics score. Levels are engine settings and are not calibrated to any rating list, so a result here is not a rating.</p>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset>
              <legend className="text-lg font-semibold">Your colour</legend>
              <div className="mt-2 flex gap-2">
                {(["w", "b"] as const).map((x) => (
                  <label key={x} className="choice">
                    <input type="radio" name="color" className="sr-only" checked={color === x} onChange={() => setColor(x)} />
                    {x === "w" ? "White" : "Black"}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="clock" className="text-lg font-semibold">
                Clock
              </label>
              <select id="clock" className="input mt-2" value={clock} onChange={(e) => setClock(e.target.value)}>
                {CLOCKS.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="fen" className="text-lg font-semibold">
              Start position (optional FEN)
            </label>
            <input
              id="fen"
              className="input num mt-2"
              value={fenInput}
              onChange={(e) => {
                setFenInput(e.target.value);
                setStartFen(e.target.value.trim() || new Chess().fen());
              }}
              placeholder="Leave empty for the normal starting position"
              aria-invalid={!validFen(startFen)}
            />
            {!validFen(startFen) && <p className="mt-1 text-sm text-bad">That is not a valid position.</p>}
          </div>
          <button className="btn btn-primary justify-self-start" disabled={!engine || !validFen(startFen)} onClick={start}>
            {engine ? "Start game" : "Loading engine…"}
          </button>
        </div>
      )}

      {game && (
        <div className="grid gap-6 md:grid-cols-[minmax(0,34rem)_1fr]">
          <Board fen={fen} orientation={color} movable={running && game.turn() === color ? color : null} onMove={onMove} lastMove={last} label="Game board" />
          <div className="grid content-start gap-4">
            <p className="text-muted">
              You are {color === "w" ? "White" : "Black"} against level {level} ({BOT_LEVELS[level - 1].name}).
            </p>
            {c.ms > 0 && (
              <p className={`num font-[family-name:var(--font-display)] text-4xl ${myLeft < 30_000 ? "text-bad" : ""}`} aria-label="Your remaining time">
                {fmt(myLeft)}
              </p>
            )}
            {running && <p aria-live="polite">{thinking ? "The computer is thinking…" : game.turn() === color ? "Your move." : ""}</p>}
            {claim && running && (
              <Feedback tone="info">
                {claim}{" "}
                <button className="btn mt-2" onClick={() => end(game, "Draw claimed.", "draw")}>
                  Claim the draw
                </button>
              </Feedback>
            )}
            {running && (
              <button className="btn btn-quiet self-start" onClick={() => end(game, "You resigned.", "loss")}>
                Resign
              </button>
            )}
            {result && (
              <>
                <Feedback tone={result.me === "win" ? "good" : result.me === "draw" ? "info" : "bad"}>{result.text}</Feedback>
                <button className="btn self-start" onClick={() => setGame(null)}>
                  New game
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {game && result && game.history().length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-2xl">Game review</h2>
          <GameReviewPanel startFen={startFen} sans={game.history()} playerColor={color} onReviewed={onReviewed} />
        </section>
      )}
    </>
  );
}

export default function PlayPage() {
  return (
    <Ready>
      <Suspense>
        <Play />
      </Suspense>
    </Ready>
  );
}
