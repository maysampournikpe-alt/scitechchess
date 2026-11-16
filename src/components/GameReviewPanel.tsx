"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Board } from "./Board";
import { Feedback } from "./ui";
import { useEngine } from "@/lib/engine/useEngine";
import { reviewGame, turningPoints, type GameReview, type MoveReview } from "@/lib/engine/review";
import { formatScore, THRESHOLDS, type Quality } from "@/lib/engine/classify";
import { describeMove, moveFacts } from "@/lib/chess/features";
import { useStore } from "@/lib/store/store";

const TONE: Record<Quality, string> = { best: "text-good", excellent: "text-good", good: "text-text", inaccuracy: "text-warn", mistake: "text-brass", blunder: "text-bad" };

type Props = { startFen: string; sans: string[]; playerColor: "w" | "b" | null; onReviewed?: (r: GameReview) => void };

/** Engine review of a finished game, move by move, with the player's worst errors saved as exercises. */
export function GameReviewPanel({ startFen, sans, playerColor, onReviewed }: Props) {
  const { engine, error } = useEngine();
  const depth = useStore((s) => s.settings.engineDepth);
  const savePosition = useStore((s) => s.savePosition);
  const addCard = useStore((s) => s.addCard);
  const [progress, setProgress] = useState<[number, number]>([0, sans.length + 1]);
  const [review, setReview] = useState<GameReview | null>(null);
  const [failed, setFailed] = useState("");
  const [sel, setSel] = useState(0);
  const [saved, setSaved] = useState(0);
  const key = startFen + "|" + sans.join(" ");
  const ran = useRef("");

  useEffect(() => {
    if (!engine || ran.current === key || sans.length === 0) return;
    ran.current = key;
    setReview(null);
    setFailed("");
    reviewGame(engine, startFen, sans, Math.min(depth, 14), (d, t) => setProgress([d, t])).then(
      (r) => {
        setReview(r);
        // The player's largest errors become "find the better move" exercises in My mistakes.
        if (playerColor) {
          const tps = turningPoints(r, playerColor);
          for (const m of tps) {
            const id = savePosition({ fen: m.fenBefore, best: m.bestUci ?? undefined, note: `From your game: you played ${m.san}; the engine preferred ${m.bestSan}.` });
            addCard({ id: `pos:${id}`, kind: "concept", concept: "game:mistake", label: `Your game, move ${Math.ceil(m.ply / 2)}: find a better move than ${m.san}`, href: `/mistakes/?pos=${id}` });
          }
          setSaved(tps.length);
          const first = tps[0];
          if (first) setSel(first.ply - 1);
        }
        onReviewed?.(r);
      },
      (e) => setFailed(String(e?.message ?? e)),
    );
  }, [engine, key]); // eslint-disable-line react-hooks/exhaustive-deps

  const m: MoveReview | undefined = review?.moves[sel];
  const facts = useMemo(() => (m?.bestUci ? moveFacts(m.fenBefore, m.bestUci) : null), [m]);

  if (error) return <Feedback tone="bad">The engine could not start in this browser, so the game cannot be reviewed: {error}</Feedback>;
  if (failed) return <Feedback tone="bad">This game could not be reviewed: {failed}</Feedback>;
  if (!review)
    return (
      <div className="card p-5" role="status">
        <p>
          Reviewing the game with Stockfish: position {progress[0]} of {progress[1]}
        </p>
        <progress className="mt-2 w-full" max={progress[1]} value={progress[0]} />
      </div>
    );

  return (
    <div className="grid gap-6">
      <div className="overflow-x-auto">
        <table className="w-full max-w-xl text-left">
          <caption className="mb-2 text-left text-sm text-muted">
            Move quality by expected-score loss: inaccuracy from {THRESHOLDS.good} points, mistake from {THRESHOLDS.inaccuracy}, blunder from {THRESHOLDS.mistake}. Depth {Math.min(depth, 14)}.
          </caption>
          <thead>
            <tr className="border-b border-line text-sm text-muted">
              <th scope="col" className="py-1 font-normal">Side</th>
              <th scope="col" className="py-1 font-normal">Inaccuracies</th>
              <th scope="col" className="py-1 font-normal">Mistakes</th>
              <th scope="col" className="py-1 font-normal">Blunders</th>
              <th scope="col" className="py-1 font-normal">Average loss</th>
            </tr>
          </thead>
          <tbody className="num">
            {(["w", "b"] as const).map((c) => (
              <tr key={c} className="border-b border-line/60">
                <th scope="row" className="py-1 font-semibold">
                  {c === "w" ? "White" : "Black"}
                  {playerColor === c ? " (you)" : ""}
                </th>
                <td>{review.summary[c].inaccuracies}</td>
                <td>{review.summary[c].mistakes}</td>
                <td>{review.summary[c].blunders}</td>
                <td>{review.summary[c].avgLoss}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {saved > 0 && (
        <Feedback tone="info">
          {saved} position{saved === 1 ? "" : "s"} from your biggest errors {saved === 1 ? "was" : "were"} added to{" "}
          <Link href="/mistakes/" className="underline">
            My mistakes
          </Link>{" "}
          as exercises.
        </Feedback>
      )}

      <div className="grid gap-6 md:grid-cols-[minmax(0,28rem)_1fr]">
        {m && <Board fen={m.fenBefore} orientation={playerColor ?? "w"} arrows={m.bestUci && m.judgement.quality !== "best" ? [{ from: m.bestUci.slice(0, 2), to: m.bestUci.slice(2, 4), color: "green" }] : []} label="Position before the selected move" />}
        <div className="grid content-start gap-4">
          <ol className="flex max-h-56 flex-wrap content-start gap-1 overflow-y-auto" aria-label="Moves">
            {review.moves.map((x, i) => (
              <li key={x.ply}>
                <button className={`num rounded-md px-2 py-1 ${i === sel ? "bg-raised outline outline-1 outline-accent" : ""} ${TONE[x.judgement.quality]}`} aria-current={i === sel} onClick={() => setSel(i)}>
                  {x.color === "w" ? `${Math.ceil(x.ply / 2)}. ` : ""}
                  {x.san}
                  {x.judgement.quality === "blunder" ? "??" : x.judgement.quality === "mistake" ? "?" : x.judgement.quality === "inaccuracy" ? "?!" : ""}
                </button>
              </li>
            ))}
          </ol>
          {m && (
            <Feedback tone={m.judgement.quality === "blunder" || m.judgement.quality === "mistake" ? "bad" : "info"}>
              <p className="font-semibold">
                {Math.ceil(m.ply / 2)}
                {m.color === "w" ? "." : "..."} {m.san}: {m.judgement.quality}
              </p>
              <p className="num mt-1">
                Engine score before the move: {formatScore(m.whiteScore, "w")} (from White&apos;s side). Expected score given up: {m.judgement.loss.toFixed(1)} points.
              </p>
              {m.judgement.quality !== "best" && m.bestSan && (
                <p className="mt-1">
                  The engine preferred <strong>{m.bestSan}</strong>
                  {m.line.length > 1 ? `, continuing ${m.line.slice(1).join(" ")}` : ""}. {facts ? describeMove(facts) : ""}
                </p>
              )}
              <p className="mt-2">
                <Link className="underline" href={`/analysis/?fen=${encodeURIComponent(m.fenBefore)}`}>
                  Open this position in analysis
                </Link>
              </p>
            </Feedback>
          )}
        </div>
      </div>
    </div>
  );
}
