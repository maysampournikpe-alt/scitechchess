"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PuzzlePlayer } from "@/components/PuzzlePlayer";
import { CalculationExercise } from "@/components/CalculationExercise";
import { BlunderCheck } from "@/components/BlunderCheck";
import { VisionDrill } from "@/components/VisionDrill";
import { EndgameFind } from "@/components/EndgameFind";
import { EndgamePractice } from "@/components/EndgamePractice";
import { OpeningTrainer } from "@/components/OpeningTrainer";
import { PlanExerciseView } from "@/components/PlanExerciseView";
import { loadVideos, Player, type Verified } from "@/components/VideoPlayer";
import { Feedback } from "@/components/ui";
import { LessonView } from "./LessonView";
import type { JourneyNode, Level, Unit } from "@/content/journey";
import { LESSON_BY_ID } from "@/content/lessons";
import { ENDGAME_BY_ID } from "@/content/endgames";
import { OPENING_BY_ID } from "@/content/openings";
import { PLAN_BY_ID } from "@/content/middlegame";
import { MODEL_GAME_BY_ID } from "@/content/games";
import { loadPuzzles } from "@/lib/data";
import type { Puzzle } from "@/lib/chess/puzzle";
import { pickPuzzle } from "@/lib/learning/select";
import { makeDrill } from "@/lib/learning/vision";
import { CHECKPOINT, openingFor } from "@/lib/learning/journey";
import { Chess } from "chess.js";
import { useStore } from "@/lib/store/store";

/** Middle of a level's rating range: the difficulty journey exercises are drawn from. */
const levelTarget = (l: Level) => Math.round((Math.max(l.from, 500) + l.to) / 2);

/** A run of puzzles near a target rating, recorded against `context`. */
export function PuzzleRun({ target, spread, theme, context, strict, filter, render }: { target: number; spread: number; theme?: string; context: string; strict?: boolean; filter?: (p: Puzzle) => boolean; render?: (p: Puzzle, next: () => void) => React.ReactNode }) {
  const [pool, setPool] = useState<Puzzle[] | null>(null);
  const [error, setError] = useState("");
  const [p, setP] = useState<Puzzle | null>(null);
  useEffect(() => {
    loadPuzzles(target, spread + 300).then(setPool, (e) => setError(String(e.message ?? e)));
  }, [target, spread]);
  const next = useCallback(() => {
    if (!pool) return;
    const seen = useStore.getState().seen;
    const exclude = new Set(Object.keys(seen).map((k) => k.slice(k.indexOf(":") + 1)));
    const list = filter ? pool.filter(filter) : pool;
    setP(pickPuzzle(list, { target, theme, exclude, spread }));
  }, [pool, target, theme, spread, filter]);
  useEffect(next, [next]);
  if (error) return <Feedback tone="bad">The puzzles could not be loaded: {error}</Feedback>;
  if (!p) return <p role="status">{pool ? "No puzzle fits this step." : "Loading puzzles…"}</p>;
  return <>{render ? render(p, next) : <PuzzlePlayer key={p.id} puzzle={p} theme={theme} strict={strict} context={context} module={strict ? "assessment" : "puzzle"} onNext={next} nextLabel="Next" />}</>;
}

function VideoStep({ node }: { node: Extract<JourneyNode, { kind: "video" }> }) {
  const introduce = useStore((s) => s.introduce);
  const watched = useStore((s) => s.introduced.includes(`video:${node.id}`));
  const [list, setList] = useState<Verified[] | null>(null);
  useEffect(() => {
    loadVideos().then((v) => setList(v.filter((x) => x.topic === node.topic)));
  }, [node.topic]);
  if (!list) return <p role="status">Loading…</p>;
  if (list.length === 0) return <Feedback tone="info">No video on “{node.topic}” has been confirmed with YouTube for this version, so this step is skipped.</Feedback>;
  const [main, ...more] = list;
  return (
    <div className="grid gap-4">
      <div className="max-w-3xl">
        <Player v={main} />
        <p className="mt-2 font-semibold">{main.title}</p>
        <p className="text-sm text-muted">{main.channel}. Plays through YouTube.</p>
      </div>
      {watched ? (
        <Feedback tone="good">Marked as watched. A video only introduces an idea: the next steps check whether you can use it.</Feedback>
      ) : (
        <button className="btn btn-primary self-start" onClick={() => introduce(`video:${node.id}`)}>
          I&apos;ve watched it
        </button>
      )}
      {more.length > 0 && (
        <details>
          <summary className="text-sm font-semibold">Other videos on this topic</summary>
          <ul className="mt-2 grid gap-3 md:grid-cols-2">
            {more.map((v) => (
              <li key={v.youtubeId}>
                <Player v={v} />
                <p className="mt-1 text-sm">
                  {v.title} <span className="text-muted">({v.channel})</span>
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function DrillStep({ node, level }: { node: Extract<JourneyNode, { kind: "drill" }>; level: Level }) {
  const target = levelTarget(level);
  const [k, setK] = useState(0);
  const [visionFens, setVisionFens] = useState<string[]>([]);
  useEffect(() => {
    if (node.drill === "vision") loadPuzzles(1300, 100).then((ps) => setVisionFens(ps.map((p) => p.fen)));
  }, [node.drill]);
  if (node.drill === "calculation") return <PuzzleRun target={target} spread={250} context={node.id} filter={(p) => p.moves.length >= 4} render={(p, next) => <CalculationExercise key={p.id} puzzle={p} context={node.id} onNext={next} />} />;
  if (node.drill === "blunder") return <PuzzleRun target={target} spread={250} context={node.id} render={(p, next) => <BlunderCheck key={p.id} puzzle={p} context={node.id} onNext={next} />} />;
  if (node.drill === "conversion") return <ConversionStep node={node} level={level} />;
  if (!visionFens.length) return <p role="status">Loading…</p>;
  const drill = makeDrill("defended", visionFens);
  return <VisionDrill key={drill.id + k} drill={drill} context={node.id} onNext={() => setK((x) => x + 1)} />;
}

function ConversionStep({ node, level }: { node: Extract<JourneyNode, { kind: "drill" }>; level: Level }) {
  return (
    <PuzzleRun
      target={levelTarget(level)}
      spread={300}
      context={node.id}
      filter={(p) => p.themes.includes("crushing") && !p.themes.includes("mate") && p.moves.length >= 4}
      render={(p, next) => {
        // Start just before the solver's last move, so the learner is to move in a won position.
        const c = new Chess(p.fen);
        for (const u of p.moves.slice(0, -1)) c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
        const fenBefore = c.fen();
        const side = fenBefore.split(" ")[1] as "w" | "b";
        return (
          <div className="grid gap-4">
            <EndgamePractice key={p.id} endgame={{ id: `conversion-${p.id}`, name: "Convert a winning position", tier: "Intermediate", family: "Pawn endings", fen: fenBefore, side, goal: "win", until: "hold", holdMoves: 10, keyMoves: [], onlyMove: false, difficulty: p.rating, principle: "", why: "", method: [], pitfalls: [] }} concept="conversion" href="/conversion/" context={node.id} />
            <button className="btn self-start" onClick={next}>
              Another position
            </button>
          </div>
        );
      }}
    />
  );
}

export function StepView({ node, level, unit }: { node: JourneyNode; level: Level; unit: Unit }) {
  const repertoire = useStore((s) => s.repertoire);
  switch (node.kind) {
    case "lesson":
      return <LessonView lesson={LESSON_BY_ID[node.lesson]} context={node.id} difficulty={levelTarget(level)} skill={unit.skill} />;
    case "puzzles":
      return <PuzzleRun target={levelTarget(level)} spread={250} theme={node.theme} context={node.id} />;
    case "video":
      return <VideoStep node={node} />;
    case "drill":
      return <DrillStep node={node} level={level} />;
    case "endgame": {
      const e = ENDGAME_BY_ID[node.endgame];
      return (
        <div className="grid gap-10">
          <div className="prose-lesson grid gap-2">
            <p className="text-lg">{e.principle}</p>
            <p>{e.why}</p>
            <ol className="list-decimal pl-5">
              {e.method.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ol>
          </div>
          {e.keyMoves.length > 0 && <EndgameFind endgame={e} />}
          <EndgamePractice endgame={e} context={node.id} />
        </div>
      );
    }
    case "opening": {
      const o = OPENING_BY_ID[openingFor(node.slot, level.id, repertoire)];
      return (
        <div className="grid gap-6">
          <div className="prose-lesson">
            <p className="text-lg">{o.why}</p>
            <ul className="mt-2">
              {o.ideas.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted">
              Want a different opening for this slot?{" "}
              <Link className="underline" href="/openings/">
                Add another to your repertoire
              </Link>{" "}
              and the journey will use it.
            </p>
          </div>
          <h2 className="text-xl">Walk through it, then play it from memory</h2>
          <OpeningTrainer opening={o} guided />
          <OpeningTrainer opening={o} guided={false} />
        </div>
      );
    }
    case "plan":
      return <PlanExerciseView ex={PLAN_BY_ID[node.plan]} />;
    case "game": {
      const g = MODEL_GAME_BY_ID[node.game];
      return (
        <div className="grid max-w-2xl gap-3">
          <p className="text-lg">{g.summary}</p>
          <p className="text-muted">
            {g.white} vs {g.black}, {g.year}. Replay it with the notes, then use “Guess the move” and find at least 40% of the winner&apos;s moves.
          </p>
          <Link className="btn btn-primary self-start" href={`/games/?id=${g.id}`}>
            Open the game
          </Link>
        </div>
      );
    }
  }
}

export function CheckpointView({ level }: { level: Level }) {
  const attempts = useStore((s) => s.attempts);
  const mine = attempts.filter((a) => a.context === `checkpoint:${level.id}`);
  const sitting = mine.slice(mine.length - (mine.length % CHECKPOINT.size || CHECKPOINT.size));
  const inProgress = mine.length % CHECKPOINT.size;
  const lastFull = inProgress === 0 && mine.length > 0 ? mine.slice(-CHECKPOINT.size) : null;
  const passed = lastFull && lastFull.filter((a) => a.outcome === "solo").length >= CHECKPOINT.need;
  return (
    <div className="grid gap-4">
      <Feedback tone="info">
        {CHECKPOINT.size} puzzles rated around {level.to}. One try each, no hints. Solve at least {CHECKPOINT.need} to pass.{" "}
        {inProgress > 0 ? `This sitting: ${sitting.filter((a) => a.outcome === "solo").length} solved of ${inProgress} so far.` : lastFull ? `Last sitting: ${lastFull.filter((a) => a.outcome === "solo").length} of ${CHECKPOINT.size}${passed ? ", passed." : ". Try again when ready."}` : ""}
      </Feedback>
      <PuzzleRun target={level.to} spread={60} context={`checkpoint:${level.id}`} strict />
    </div>
  );
}
