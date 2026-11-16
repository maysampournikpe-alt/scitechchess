"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Chessground } from "@lichess-org/chessground";
import type { Api } from "@lichess-org/chessground/api";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Key } from "@lichess-org/chessground/types";
import { applyText, isPromotion, legalDests, toUci } from "@/lib/chess/rules";
import { PIECE_NAME } from "@/lib/chess/features";
import { useStore } from "@/lib/store/store";

let audio: AudioContext | null = null;
/** A short synthesized click; lower and longer for a capture. No sound files are shipped. */
function moveSound(capture: boolean) {
  try {
    audio ??= new AudioContext();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.frequency.value = capture ? 220 : 440;
    g.gain.setValueAtTime(0.08, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + (capture ? 0.16 : 0.08));
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + 0.2);
  } catch {
    /* audio unavailable */
  }
}

export type Arrow = { from: string; to?: string; color?: "green" | "red" | "blue" | "yellow" };

type Props = {
  fen: string;
  orientation?: "w" | "b";
  /** Which side the person may move. null = view only. */
  movable?: "w" | "b" | "both" | null;
  /** Called with a legal move in UCI. The parent owns the position and passes back a new `fen`. */
  onMove?: (uci: string) => void;
  lastMove?: [string, string] | null;
  arrows?: Arrow[];
  /** Hide the pieces (blindfold and calculation exercises). */
  hidePieces?: boolean;
  /** Show the typed-move box. On by default: it is the keyboard and screen-reader way to move. */
  textInput?: boolean;
  label?: string;
  /** Change this number to make the board redraw the current position (e.g. to snap back a rejected move). */
  resetKey?: number;
};

const PROMO = ["q", "r", "b", "n"] as const;

/** Plain-language description of a position for screen readers. */
function describePosition(chess: Chess): string {
  const list = (color: "w" | "b") =>
    chess
      .board()
      .flat()
      .filter((p) => p && p.color === color)
      .map((p) => `${PIECE_NAME[p!.type]} ${p!.square}`)
      .join(", ");
  return `${chess.turn() === "w" ? "White" : "Black"} to move. White: ${list("w")}. Black: ${list("b")}.`;
}

export function Board({ fen, orientation = "w", movable = null, onMove, lastMove, arrows, hidePieces, textInput = true, label = "Chessboard", resetKey = 0 }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const [promo, setPromo] = useState<{ from: Square; to: Square } | null>(null);
  const [typed, setTyped] = useState("");
  const [typedError, setTypedError] = useState("");
  const [announce, setAnnounce] = useState("");
  const [flipped, setFlipped] = useState(false);
  // Keyboard play: a cursor square moved with the arrow keys; Enter or Space picks a piece, then its target.
  const [cursor, setCursor] = useState<Square | null>(null);
  const [picked, setPicked] = useState<Square | null>(null);
  const inputId = useId();
  const sound = useStore((s) => s.settings.sound);
  const prevPieces = useRef<number | null>(null);

  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);
  const turn = chess.turn();
  const canMove = !!onMove && movable !== null && (movable === "both" || movable === turn) && !chess.isGameOver();
  const side = (flipped ? (orientation === "w" ? "b" : "w") : orientation) === "w" ? "white" : "black";

  useEffect(() => {
    if (!el.current) return;
    api.current = Chessground(el.current, { fen: hidePieces ? "8/8/8/8/8/8/8/8" : fen, orientation: side, coordinates: true, animation: { duration: 180 }, highlight: { lastMove: true, check: true }, premovable: { enabled: false }, drawable: { enabled: true } });
    // Chessground caches the board's screen position. Recompute it whenever the layout changes
    // (fonts loading, panels opening), otherwise clicks land on the wrong squares.
    const refresh = () => api.current?.state.dom.bounds.clear();
    const ro = new ResizeObserver(() => api.current?.redrawAll());
    ro.observe(el.current);
    ro.observe(document.body);
    window.addEventListener("pointerdown", refresh, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("pointerdown", refresh, true);
      api.current?.destroy();
      api.current = null;
    };
    // The board is created once with the first position; later positions are applied by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const cg = api.current;
    if (!cg) return;
    cg.set({
      fen: hidePieces ? "8/8/8/8/8/8/8/8" : fen,
      orientation: side,
      turnColor: turn === "w" ? "white" : "black",
      check: !hidePieces && chess.inCheck(),
      lastMove: lastMove && !hidePieces ? (lastMove as Key[]) : undefined,
      viewOnly: !canMove,
      movable: {
        free: false,
        color: canMove ? (turn === "w" ? "white" : "black") : undefined,
        dests: canMove ? (legalDests(chess) as Map<Key, Key[]>) : new Map(),
        showDests: true,
        events: {
          after: (orig, dest) => {
            const from = orig as Square;
            const to = dest as Square;
            if (isPromotion(chess, from, to)) setPromo({ from, to });
            else onMoveRef.current?.(from + to);
          },
        },
      },
    });
    const shapes: DrawShape[] = (arrows ?? []).map((a) => ({ orig: a.from as Key, dest: a.to as Key | undefined, brush: a.color ?? "green" }));
    if (cursor) shapes.push({ orig: cursor as Key, brush: "blue" });
    if (picked) shapes.push({ orig: picked as Key, brush: "green" });
    cg.setAutoShapes(hidePieces ? [] : shapes);
  }, [fen, side, turn, canMove, chess, lastMove, arrows, hidePieces, resetKey, cursor, picked]);

  function describeSquare(sq: Square) {
    const p = chess.get(sq);
    return `${sq}, ${p ? `${p.color === "w" ? "white" : "black"} ${PIECE_NAME[p.type]}` : "empty"}`;
  }

  function onBoardKey(e: React.KeyboardEvent) {
    const moves: Record<string, [number, number]> = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    if (e.key in moves) {
      e.preventDefault();
      const flip = side === "black" ? -1 : 1;
      const from = cursor ?? (side === "black" ? "e8" : "e1");
      const f = Math.min(7, Math.max(0, from.charCodeAt(0) - 97 + moves[e.key][0] * flip));
      const r = Math.min(8, Math.max(1, Number(from[1]) + moves[e.key][1] * flip));
      const sq = (String.fromCharCode(97 + f) + r) as Square;
      setCursor(sq);
      setAnnounce(describeSquare(sq) + (picked ? `. Moving the piece from ${picked}.` : ""));
      return;
    }
    if ((e.key === "Enter" || e.key === " ") && cursor && canMove) {
      e.preventDefault();
      if (!picked) {
        const p = chess.get(cursor);
        if (p && p.color === turn && legalDests(chess).has(cursor)) {
          setPicked(cursor);
          setAnnounce(`Picked up the ${PIECE_NAME[p.type]} on ${cursor}. Legal squares: ${legalDests(chess).get(cursor)!.join(", ")}.`);
        } else setAnnounce(`No piece of yours that can move on ${cursor}.`);
        return;
      }
      if (cursor === picked) {
        setPicked(null);
        setAnnounce("Put the piece back.");
        return;
      }
      if (!legalDests(chess).get(picked)?.includes(cursor)) {
        setAnnounce(`${picked} to ${cursor} is not legal.`);
        return;
      }
      const from = picked;
      setPicked(null);
      if (isPromotion(chess, from, cursor)) setPromo({ from, to: cursor });
      else onMoveRef.current?.(from + cursor);
      return;
    }
    if (e.key === "Escape" && picked) {
      setPicked(null);
      setAnnounce("Cancelled.");
    }
  }

  // Play a sound when a move lands (piece count drops on a capture).
  useEffect(() => {
    const count = chess.board().flat().filter(Boolean).length;
    if (sound && lastMove && prevPieces.current !== null && !hidePieces) moveSound(count < prevPieces.current);
    prevPieces.current = count;
  }, [chess, lastMove, sound, hidePieces]);

  useEffect(() => {
    if (lastMove) setAnnounce(`Last move: ${lastMove[0]} to ${lastMove[1]}. ${turn === "w" ? "White" : "Black"} to move.`);
  }, [lastMove, turn]);

  function submitTyped(e: React.FormEvent) {
    e.preventDefault();
    const probe = new Chess(fen);
    const m = applyText(probe, typed);
    if (!m) {
      setTypedError(`"${typed}" is not a legal move here. Use notation such as Nf3, exd5, O-O or e2e4.`);
      return;
    }
    setTypedError("");
    setTyped("");
    onMove?.(toUci(m));
  }

  function cancelPromo() {
    setPromo(null);
    api.current?.set({ fen }); // put the pawn back
  }

  return (
    <div className="w-full">
      <div
        className="board-frame"
        data-fen={fen}
        tabIndex={canMove ? 0 : -1}
        onKeyDown={onBoardKey}
        onBlur={() => setCursor(null)}
        aria-label={canMove ? "Board. Use the arrow keys to move between squares and Enter to pick up and place a piece." : undefined}
      >
        <div ref={el} role="img" aria-label={`${label}. ${hidePieces ? "Pieces are hidden for this exercise." : describePosition(chess)}`} />
        {promo && (
          <div role="dialog" aria-modal="true" aria-label="Choose a piece to promote to" className="absolute inset-0 z-10 grid place-items-center bg-black/60">
            <div className="card flex flex-col gap-2 p-3">
              <p className="px-1 text-sm">Promote to</p>
              <div className="flex gap-2">
                {PROMO.map((p, i) => (
                  <button
                    key={p}
                    autoFocus={i === 0}
                    className="btn"
                    onClick={() => {
                      const uci = promo.from + promo.to + p;
                      setPromo(null);
                      onMoveRef.current?.(uci);
                    }}
                  >
                    {PIECE_NAME[p][0].toUpperCase() + PIECE_NAME[p].slice(1)}
                  </button>
                ))}
              </div>
              <button className="btn btn-quiet" onClick={cancelPromo}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      <div className="mt-2 flex flex-wrap items-start gap-2">
        {textInput && canMove && (
          <form onSubmit={submitTyped} className="flex min-w-0 flex-1 items-start gap-2">
            <div className="min-w-0 flex-1">
              <label htmlFor={inputId} className="sr-only">
                Type your move
              </label>
              <input
                id={inputId}
                className="input"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="Type a move, e.g. Nf3"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-invalid={!!typedError}
                aria-describedby={typedError ? `${inputId}-err` : undefined}
              />
              {typedError && (
                <p id={`${inputId}-err`} role="alert" className="mt-1 text-sm text-bad">
                  {typedError}
                </p>
              )}
            </div>
            <button className="btn" type="submit">
              Play
            </button>
          </form>
        )}
        <button className="btn btn-quiet ml-auto" onClick={() => setFlipped((f) => !f)} aria-label="Flip the board">
          Flip
        </button>
      </div>
    </div>
  );
}
