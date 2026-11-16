"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PuzzlePlayer } from "@/components/PuzzlePlayer";
import { CalculationExercise } from "@/components/CalculationExercise";
import { EndgameFind } from "@/components/EndgameFind";
import { PlanExerciseView } from "@/components/PlanExerciseView";
import { VisionDrill } from "@/components/VisionDrill";
import { Quiz } from "@/components/Quiz";
import { Board } from "@/components/Board";
import { Feedback, PageHeader, Ready } from "@/components/ui";
import { loadPuzzles } from "@/lib/data";
import type { Puzzle } from "@/lib/chess/puzzle";
import { pickPuzzle } from "@/lib/learning/select";
import { makeDrill, type Drill } from "@/lib/learning/vision";
import { ENDGAMES } from "@/content/endgames";
import { OPENINGS } from "@/content/openings";
import { PLAN_EXERCISES } from "@/content/middlegame";
import { buildReport } from "@/lib/learning/report";
import { useStore } from "@/lib/store/store";
import { Chess } from "chess.js";

type Step = { section: string; kind: "puzzle" | "calc" | "endgame" | "opening" | "plan" | "vision" };

/** 22 items, about 15 minutes. Tactics come first and adapt to each answer; the rest sample each skill. */
const STEPS: Step[] = [
  ...Array.from({ length: 8 }, () => ({ section: "Tactics", kind: "puzzle" as const })),
  ...Array.from({ length: 2 }, () => ({ section: "Calculation", kind: "calc" as const })),
  ...Array.from({ length: 3 }, () => ({ section: "Endgames", kind: "endgame" as const })),
  ...Array.from({ length: 3 }, () => ({ section: "Opening understanding", kind: "opening" as const })),
  ...Array.from({ length: 2 }, () => ({ section: "Positional understanding", kind: "plan" as const })),
  ...Array.from({ length: 4 }, () => ({ section: "Board vision", kind: "vision" as const })),
];

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

function Assessment() {
  const setDone = useStore((s) => s.setAssessmentDone);
  const [all, setAll] = useState<Puzzle[] | null>(null);
  const [i, setI] = useState(-1);
  const [item, setItem] = useState<React.ReactNode>(null);
  const [answered, setAnswered] = useState(false);
  const [used] = useState(() => new Set<string>());
  const pools = useMemo(
    () => ({
      endgames: shuffle(ENDGAMES.filter((e) => e.keyMoves.length > 0)),
      questions: shuffle(OPENINGS.flatMap((o) => o.questions.map((q) => ({ o, q })))),
      plans: shuffle(PLAN_EXERCISES),
      vision: shuffle(["color", "knight", "defended", "memory"] as Drill["kind"][]),
    }),
    [],
  );

  useEffect(() => {
    loadPuzzles().then(setAll, () => setAll([]));
  }, []);

  useEffect(() => {
    if (i < 0 || i >= STEPS.length || !all) return;
    setAnswered(false);
    const s = useStore.getState();
    const done = () => setAnswered(true);
    const k = STEPS[i].kind;
    const n = STEPS.slice(0, i).filter((x) => x.kind === k).length;
    if (k === "puzzle" || k === "calc") {
      const skill = k === "puzzle" ? "tactics" : "calculation";
      const p = pickPuzzle(all, { target: s.skills[skill].score, exclude: used, minMoves: k === "calc" ? 4 : undefined, maxMoves: k === "puzzle" ? 4 : undefined, spread: 60 })!;
      used.add(p.id);
      setItem(k === "puzzle" ? <PuzzlePlayer key={p.id} puzzle={p} module="assessment" strict onDone={done} /> : <CalculationExercise key={p.id} puzzle={p} assessment onDone={done} />);
    } else if (k === "endgame") {
      const e = pools.endgames[n % pools.endgames.length];
      setItem(<EndgameFind key={e.id} endgame={e} assessment onDone={done} />);
    } else if (k === "opening") {
      const { o, q } = pools.questions[n % pools.questions.length];
      const c = new Chess();
      for (const m of o.moves.slice(0, q.afterPly)) c.move(m);
      setItem(
        <div key={q.id} className="grid gap-6 md:grid-cols-[minmax(0,26rem)_1fr]">
          <Board fen={c.fen()} orientation={o.color === "white" ? "w" : "b"} label={`${o.name} position`} />
          <Quiz prompt={`${o.name}. ${q.prompt}`} options={q.options} attempt={{ itemId: `opening-q:${q.id}`, module: "assessment", skill: "openingUnderstanding", concept: `opening:${o.id}`, difficulty: 900 + o.workload * 200, itemRd: 200 }} onAnswered={done} />
        </div>,
      );
    } else if (k === "plan") {
      const p = pools.plans[n % pools.plans.length];
      setItem(<PlanExerciseView key={p.id} ex={p} assessment onDone={done} />);
    } else {
      const d = makeDrill(pools.vision[n % pools.vision.length], all.map((p) => p.fen));
      setItem(<VisionDrill key={d.id + i} drill={d} assessment onDone={done} />);
    }
  }, [i, all, pools, used]);

  useEffect(() => {
    if (i === STEPS.length) setDone();
  }, [i, setDone]);

  if (i < 0)
    return (
      <>
        <PageHeader title="Chess assessment" lead="22 short tasks across tactics, calculation, endgames, opening ideas, positional judgement and board vision. About 15 minutes." />
        <div className="card grid max-w-2xl gap-4 p-5">
          <p>
            Tactics adapt as you go: a correct answer makes the next position harder. You get one try per task and no hints, because the goal is to measure, not to teach. Every task shows the answer afterwards.
          </p>
          <p className="text-muted">The result is a set of training scores for this site, each with an uncertainty range. It is not an official rating of any kind, and one sitting is only a first estimate: your scores keep updating as you train.</p>
          <button className="btn btn-primary justify-self-start" disabled={!all} onClick={() => setI(0)}>
            {all ? "Begin" : "Loading…"}
          </button>
        </div>
      </>
    );

  if (i >= STEPS.length) return <Results />;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl">{STEPS[i].section}</h1>
        <p className="num text-muted">
          Task {i + 1} of {STEPS.length}
        </p>
      </div>
      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuemin={0} aria-valuemax={STEPS.length} aria-valuenow={i} aria-label="Assessment progress">
        <div className="h-full bg-accent" style={{ width: `${(i / STEPS.length) * 100}%` }} />
      </div>
      {item}
      <div className="mt-6 flex gap-2">
        <button className="btn btn-primary" disabled={!answered} onClick={() => setI(i + 1)}>
          {i === STEPS.length - 1 ? "See my results" : "Next task"}
        </button>
        {!answered && STEPS[i].kind === "calc" && <p className="self-center text-sm text-muted">Enter your line to continue.</p>}
      </div>
    </>
  );
}

function Results() {
  const skills = useStore((s) => s.skills);
  const attempts = useStore((s) => s.attempts);
  const report = useMemo(() => buildReport(skills, attempts, Date.now()), [skills, attempts]);
  return (
    <>
      <PageHeader title="Your diagnostic report" lead="Built only from the tasks you just did and anything you had already practised." />
      <div className="card grid max-w-3xl gap-3 p-5">
        {report.sentences.map((s) => (
          <p key={s}>{s}</p>
        ))}
        <Feedback tone="info">
          Each skill was sampled with only a few tasks, so the ranges are wide. They narrow as you train. For a fuller picture of your play, add a{" "}
          <Link className="underline" href="/play/">
            game against the computer
          </Link>
          : the review measures practical decision-making.
        </Feedback>
        <div className="flex flex-wrap gap-2">
          <Link href="/train/" className="btn btn-primary">
            See my training plan
          </Link>
          <Link href="/progress/" className="btn">
            See all skills
          </Link>
        </div>
      </div>
    </>
  );
}

export default function AssessmentPage() {
  return (
    <Ready>
      <Assessment />
    </Ready>
  );
}
