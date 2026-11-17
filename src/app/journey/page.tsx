"use client";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { NeedsProfile, PageHeader, Ready } from "@/components/ui";
import { CheckpointView, StepView } from "@/components/journey/StepView";
import { LEVEL_BY_ID, type JourneyNode } from "@/content/journey";
import { nodeTitle } from "@/components/journey/titles";
import { buildJourney, findNode, CHECKPOINT, type Journey, type LevelState, type NodeState } from "@/lib/learning/journey";
import { loadVideos } from "@/components/VideoPlayer";
import { useStore } from "@/lib/store/store";
import { useNow } from "@/lib/store/derived";

const KIND: Record<JourneyNode["kind"], { label: string; glyph: string }> = {
  lesson: { label: "Lesson", glyph: "Aa" },
  puzzles: { label: "Puzzles", glyph: "♞" },
  video: { label: "Video", glyph: "▶" },
  opening: { label: "Opening", glyph: "♙" },
  endgame: { label: "Endgame", glyph: "♚" },
  plan: { label: "Plan", glyph: "♜" },
  game: { label: "Model game", glyph: "♛" },
  drill: { label: "Drill", glyph: "♝" },
};

const GOAL_TEXT: Record<string, string> = { learn: "learning the game", title: "a title", tournament: "better tournament results", tactics: "stronger tactics", openings: "better openings", positional: "positional understanding", endgame: "endgame technique" };

function useJourney(): Journey | null {
  const profile = useStore((s) => s.profile);
  const skills = useStore((s) => s.skills);
  const attempts = useStore((s) => s.attempts);
  const introduced = useStore((s) => s.introduced);
  const repertoire = useStore((s) => s.repertoire);
  const now = useNow();
  const [topics, setTopics] = useState<Set<string> | null>(null);
  useEffect(() => {
    loadVideos().then((v) => setTopics(new Set(v.map((x) => x.topic))));
  }, []);
  return useMemo(() => (profile && now ? buildJourney({ profile, skills, now, attempts, introduced, repertoire, videoTopics: topics }) : null), [profile, skills, now, attempts, introduced, repertoire, topics]);
}

/** Offsets that make the column of steps wind left and right, like a path. */
const WIND = [0, 44, 72, 44, 0, -44, -72, -44];

function Path({ level, repertoire, current }: { level: LevelState; repertoire: string[]; current: string | null }) {
  let i = 0;
  return (
    <ol className="grid gap-10">
      {level.units.map((u) => (
        <li key={u.unit.id}>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
            <h3 className="text-xl">
              {u.unit.title}
              {u.focus && <span className="chip ml-2 border-brass align-middle text-brass">Your goal</span>}
            </h3>
            <p className="num text-sm text-muted">
              {u.done} of {u.nodes.length} done
            </p>
          </div>
          <ol className="flex flex-col items-center gap-5">
            {u.nodes.map((n) => {
              const x = WIND[i++ % WIND.length];
              return (
                <li key={n.node.id} style={{ transform: `translateX(${x}px)` }} className="w-60 max-w-full">
                  <StepBubble n={n} title={nodeTitle(n.node, level.level.id, repertoire)} isCurrent={n.node.id === current} />
                </li>
              );
            })}
          </ol>
        </li>
      ))}
    </ol>
  );
}

function StepBubble({ n, title, isCurrent }: { n: NodeState; title: string; isCurrent: boolean }) {
  const k = KIND[n.node.kind];
  const circle = `grid h-16 w-16 shrink-0 place-items-center rounded-full border-4 text-2xl transition-transform ${
    n.done ? "border-good bg-good text-bg" : n.locked ? "border-line bg-raised text-muted" : "border-accent bg-accent-strong text-white"
  } ${isCurrent ? "ring-4 ring-accent/40 ring-offset-2 ring-offset-bg" : ""}`;
  const body = (
    <>
      <span className={circle} aria-hidden="true">
        {n.done ? "✓" : k.glyph}
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-muted">{k.label}{isCurrent ? ": start here" : ""}</span>
        <span className="block font-semibold leading-snug">{title}</span>
        <span className="block text-xs text-muted">{n.locked ? "Locked: finish the step before" : n.progress}</span>
      </span>
    </>
  );
  if (n.locked)
    return (
      <div className="flex items-center gap-3 opacity-70">
        {body}
      </div>
    );
  return (
    <Link href={`/journey/?step=${n.node.id}`} className="flex items-center gap-3 rounded-2xl p-1 no-underline hover:bg-raised">
      {body}
    </Link>
  );
}

function Overview() {
  const j = useJourney();
  const profile = useStore((s) => s.profile)!;
  const repertoire = useStore((s) => s.repertoire);
  const [shown, setShown] = useState<number | null>(null);
  if (!j) return <p role="status">Building your journey…</p>;
  const view = j.levels[shown ?? j.currentIndex];
  const goal = profile.goalRating ? `${profile.goalRating}` : GOAL_TEXT[profile.goal] ?? "your goal";
  const days = Math.ceil(j.estimate / Math.max(5, profile.minutesPerDay));
  const next = j.next;

  return (
    <>
      <PageHeader title={`Your journey to ${goal}`} lead={`Built from your goal and your results so far. You start at ${j.levels[j.startIndex].level.title} because of your measured tactics level; every level ends with a short test you must pass to move on.`}>
        <Link href="/onboarding/" className="btn btn-quiet">
          Change goal
        </Link>
      </PageHeader>

      <section className="card mb-8 grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center" aria-labelledby="next">
        <div>
          <h2 id="next" className="text-2xl">
            {next ? "Next step" : "Level complete"}
          </h2>
          {next ? (
            <p className="mt-1">
              <strong>{nodeTitle(next.node.node, next.level.id, repertoire)}</strong> <span className="text-muted">in {next.level.title}. {next.node.progress}.</span>
            </p>
          ) : (
            <p className="mt-1 text-muted">Every step in {j.levels[j.currentIndex].level.title} is done. Take the level test to move up.</p>
          )}
          <p className="mt-2 text-sm text-muted">
            Training left to reach your goal level: about {Math.round(j.estimate / 60)} hours, roughly {days} day{days === 1 ? "" : "s"} at your {profile.minutesPerDay} minutes a day. This counts the steps on this path only; how fast your rating moves depends on you and on playing real games.
          </p>
        </div>
        <Link className="btn btn-primary px-6 text-lg" href={next ? `/journey/?step=${next.node.node.id}` : `/journey/?test=${j.levels[j.currentIndex].level.id}`}>
          {next ? "Continue" : "Take the level test"}
        </Link>
      </section>

      <section aria-labelledby="road" className="mb-8">
        <h2 id="road" className="text-2xl">
          Steps to your goal
        </h2>
        <ol className="mt-3 flex gap-3 overflow-x-auto pb-2">
          {j.levels.map((l) => {
            const pct = Math.round((l.nodesDone / l.nodesTotal) * 100);
            const active = l.index === view.index;
            return (
              <li key={l.level.id} className="min-w-44" ref={l.index === j.currentIndex ? (el) => el?.scrollIntoView({ block: "nearest", inline: "center" }) : undefined}>
                <button className={`card w-full p-3 text-left ${active ? "border-accent" : ""} ${l.status === "beyond-goal" ? "opacity-60" : ""}`} aria-pressed={active} onClick={() => setShown(l.index)}>
                  <span className="block text-sm text-muted">{l.status === "passed" ? "Passed" : l.status === "placed-above" ? "Placed above" : l.status === "current" ? "You are here" : l.index === j.goalIndex ? "Your goal" : l.status === "beyond-goal" ? "Beyond your goal" : "Ahead"}</span>
                  <span className="block font-semibold">{l.level.title}</span>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-raised" aria-hidden="true">
                    <span className="block h-full bg-accent" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="num mt-1 block text-xs text-muted">
                    {l.nodesDone}/{l.nodesTotal} steps{l.checkpointPassed ? ", test passed" : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="path">
          <h2 id="path" className="mb-4 text-2xl">
            {view.level.title}
          </h2>
          {view.status === "placed-above" && <p className="mb-4 text-muted">Your results placed you above this level. Everything here is open for review, or take its test to mark it passed.</p>}
          {view.status === "ahead" || view.status === "beyond-goal" ? <p className="mb-4 text-muted">This level opens when you pass the test of the level before it. You can also try its test now if you think you are ready.</p> : null}
          <Path level={view} repertoire={repertoire} current={next?.node.node.id ?? null} />
          <div className="mt-10 flex flex-col items-center gap-2">
            <Link href={`/journey/?test=${view.level.id}`} className={`grid h-20 w-20 place-items-center rounded-full border-4 text-3xl no-underline ${view.checkpointPassed ? "border-good bg-good text-bg" : "border-brass bg-raised text-brass"}`} aria-label={`Level test for ${view.level.title}`}>
              {view.checkpointPassed ? "✓" : "★"}
            </Link>
            <p className="font-semibold">Level test</p>
            <p className="text-sm text-muted">{view.level.guide.leaveWhen}</p>
          </div>
        </section>

        <aside aria-labelledby="guide" className="card h-fit p-5 lg:sticky lg:top-6">
          <h2 id="guide" className="text-xl">
            How to get past {view.level.title}
          </h2>
          <p className="mt-2">{view.level.guide.summary}</p>
          <h3 className="mt-4 font-semibold">What to master</h3>
          <ul className="prose-lesson mt-1 text-sm">
            {view.level.guide.focus.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <h3 className="mt-4 font-semibold">Habits to build</h3>
          <ul className="prose-lesson mt-1 text-sm">
            {view.level.guide.habits.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <h3 className="mt-4 font-semibold">Typical mistakes at this level</h3>
          <ul className="prose-lesson mt-1 text-sm">
            {view.level.guide.mistakes.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <h3 className="mt-4 font-semibold">To move on</h3>
          <p className="mt-1 text-sm">{view.level.guide.leaveWhen} Steps left here: about {view.remainingMinutes} minutes of training.</p>
          <p className="mt-4 text-xs text-muted">Level numbers use this site&apos;s training score on the Lichess puzzle scale. They mark training milestones, not an official rating.</p>
        </aside>
      </div>
    </>
  );
}

function Step({ id }: { id: string }) {
  const j = useJourney();
  const repertoire = useStore((s) => s.repertoire);
  const found = findNode(id);
  if (!found) return <p>That step does not exist.</p>;
  const state = j?.levels.flatMap((l) => l.units.flatMap((u) => u.nodes)).find((n) => n.node.id === id);
  const order = j?.levels.find((l) => l.level.id === found.level.id)?.units.flatMap((u) => u.nodes) ?? [];
  const after = order[order.findIndex((n) => n.node.id === id) + 1];
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-2 text-sm text-muted">
        <Link href="/journey/" className="underline">
          Journey
        </Link>{" "}
        / {found.level.title} / {found.unit.title}
      </nav>
      <PageHeader title={nodeTitle(found.node, found.level.id, repertoire)} lead={state ? (state.done ? `Done: ${state.progress}.` : `${KIND[found.node.kind].label}. To complete: ${state.progress}.`) : undefined} />
      {state?.locked && <p className="mb-4 text-muted">This step is not open yet in your path, but you can still practise it.</p>}
      <StepView node={found.node} level={found.level} unit={found.unit} />
      <div className="mt-10 flex flex-wrap gap-2 border-t border-line pt-6">
        <Link href="/journey/" className="btn">
          Back to the path
        </Link>
        {state?.done && after && (
          <Link href={`/journey/?step=${after.node.id}`} className="btn btn-primary">
            Next step: {nodeTitle(after.node, found.level.id, repertoire)}
          </Link>
        )}
        {state?.done && !after && (
          <Link href={`/journey/?test=${found.level.id}`} className="btn btn-primary">
            Take the level test
          </Link>
        )}
      </div>
    </>
  );
}

function Test({ levelId }: { levelId: string }) {
  const level = LEVEL_BY_ID[levelId];
  const j = useJourney();
  if (!level) return <p>That level does not exist.</p>;
  const passed = j?.levels.find((l) => l.level.id === levelId)?.checkpointPassed;
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-2 text-sm text-muted">
        <Link href="/journey/" className="underline">
          Journey
        </Link>{" "}
        / {level.title}
      </nav>
      <PageHeader title={`Level test: ${level.title}`} lead={`Pass to unlock the next level. ${CHECKPOINT.need} of ${CHECKPOINT.size} without help.`} />
      {passed && (
        <p className="mb-4">
          <span className="chip border-good text-good">Passed</span>{" "}
          <Link className="underline" href="/journey/">
            Back to your path
          </Link>
        </p>
      )}
      <CheckpointView level={level} />
    </>
  );
}

function Router() {
  const p = useSearchParams();
  const step = p.get("step");
  const test = p.get("test");
  if (step) return <Step key={step} id={step} />;
  if (test) return <Test key={test} levelId={test} />;
  return <Overview />;
}

export default function JourneyPage() {
  return (
    <Ready>
      <NeedsProfile>
        <Suspense>
          <Router />
        </Suspense>
      </NeedsProfile>
    </Ready>
  );
}
