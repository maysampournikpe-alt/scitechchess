"use client";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Chess } from "chess.js";
import { Board } from "@/components/Board";
import { OpeningTrainer } from "@/components/OpeningTrainer";
import { Quiz } from "@/components/Quiz";
import { PageHeader, Ready } from "@/components/ui";
import { OPENINGS, OPENING_BY_ID, type Opening } from "@/content/openings";
import { PLAN_EXERCISES } from "@/content/middlegame";
import { loadOpeningNames, type OpeningRow } from "@/lib/data";
import { mastery, MASTERY_LABEL } from "@/lib/learning/mastery";
import { useStore } from "@/lib/store/store";
import { useNow } from "@/lib/store/derived";

const WORKLOAD = { 1: "Little theory", 2: "Moderate theory", 3: "Heavy theory" } as const;
/** Heaviest workload suggested for each experience level. A suggestion only; every opening can be chosen. */
const MAX_WORKLOAD: Record<string, number> = { beginner: 1, knowsMoves: 1, casual: 1, intermediate: 2, tournament: 3, advanced: 3 };

function finalFen(o: Opening) {
  const c = new Chess();
  for (const m of o.moves) c.move(m);
  return c.fen();
}
const numbered = (moves: string[]) => moves.map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${m}` : m)).join(" ");

function Lesson({ opening }: { opening: Opening }) {
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get("tab") ?? "ideas";
  const introduce = useStore((s) => s.introduce);
  const repertoire = useStore((s) => s.repertoire);
  const toggle = useStore((s) => s.toggleRepertoire);
  useEffect(() => introduce(`opening:${opening.id}`), [opening, introduce]);
  const fen = useMemo(() => finalFen(opening), [opening]);
  const bridges = PLAN_EXERCISES.filter((p) => p.fromOpenings.includes(opening.id));
  const inRep = repertoire.includes(opening.id);
  const tabs = [["ideas", "Ideas"], ["guided", "Guided line"], ["memory", "From memory"], ...(opening.questions.length ? [["questions", "Check understanding"]] : [])] as const;

  return (
    <>
      <PageHeader title={opening.name} lead={opening.why}>
        <div className="flex flex-wrap gap-2">
          <button className={`btn ${inRep ? "" : "btn-primary"}`} aria-pressed={inRep} onClick={() => toggle(opening.id)}>
            {inRep ? "In my repertoire. Remove" : "Add to my repertoire"}
          </button>
          <Link href="/openings/" className="btn btn-quiet">
            All openings
          </Link>
        </div>
      </PageHeader>
      <div role="tablist" aria-label="Lesson parts" className="mb-6 flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`btn ${tab === id ? "btn-primary" : ""}`} onClick={() => router.replace(`/openings/?id=${opening.id}&tab=${id}`)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "ideas" && (
        <div className="grid gap-6 md:grid-cols-[minmax(0,26rem)_1fr]">
          <div>
            <Board fen={fen} orientation={opening.color === "white" ? "w" : "b"} label={`${opening.name}, position after the main line`} />
            <p className="num mt-2 text-sm text-muted">{numbered(opening.moves)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link className="btn" href={`/play/?fen=${encodeURIComponent(fen)}&color=${opening.color === "white" ? "w" : "b"}`}>
                Play this position against the computer
              </Link>
              <Link className="btn btn-quiet" href={`/analysis/?fen=${encodeURIComponent(fen)}`}>
                Analyse
              </Link>
            </div>
          </div>
          <div className="prose-lesson grid content-start gap-5">
            <p className="flex flex-wrap gap-2">
              <span className="chip">You play {opening.color}</span>
              <span className="chip">{WORKLOAD[opening.workload]}</span>
              <span className="chip">{opening.style}</span>
            </p>
            {(
              [
                ["Main ideas", opening.ideas],
                ["Typical plans", opening.plans],
                ["Pawn breaks", opening.breaks],
                ["Common mistakes", opening.mistakes],
              ] as const
            ).map(([h, items]) => (
              <div key={h}>
                <h2 className="text-xl">{h}</h2>
                <ul className="mt-2">
                  {items.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <h2 className="text-xl">Pawn structure and endgames</h2>
              <p className="mt-2">{opening.structure}. {opening.endgames}</p>
            </div>
            {bridges.length > 0 && (
              <div>
                <h2 className="text-xl">From this opening to the middlegame</h2>
                <ul className="mt-2">
                  {bridges.map((b) => (
                    <li key={b.id}>
                      <Link className="underline" href={`/middlegame/?id=${b.id}`}>
                        {b.structure}: {b.title.toLowerCase()}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button className="btn btn-primary justify-self-start" onClick={() => router.replace(`/openings/?id=${opening.id}&tab=guided`)}>
              Walk through the line
            </button>
          </div>
        </div>
      )}
      {tab === "guided" && <OpeningTrainer opening={opening} guided />}
      {tab === "memory" && <OpeningTrainer opening={opening} guided={false} />}
      {tab === "questions" && (
        <div className="grid gap-10">
          {opening.questions.map((q) => {
            const c = new Chess();
            for (const m of opening.moves.slice(0, q.afterPly)) c.move(m);
            return (
              <div key={q.id} className="grid gap-6 md:grid-cols-[minmax(0,24rem)_1fr]">
                <Board fen={c.fen()} orientation={opening.color === "white" ? "w" : "b"} label="Question position" />
                <Quiz prompt={q.prompt} options={q.options} attempt={{ itemId: `opening-q:${q.id}`, module: "quiz", skill: "openingUnderstanding", concept: `opening:${opening.id}`, difficulty: 900 + opening.workload * 200, itemRd: 200, card: { label: `${opening.name}: idea question`, href: `/openings/?id=${opening.id}&tab=questions`, kind: "opening" } }} />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function NamesExplorer() {
  const [rows, setRows] = useState<OpeningRow[] | null>(null);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<OpeningRow | null>(null);
  useEffect(() => {
    loadOpeningNames().then(setRows, () => setRows([]));
  }, []);
  const hits = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!rows || t.length < 2) return [];
    return rows.filter((r) => r[1].toLowerCase().includes(t) || r[0].toLowerCase() === t).slice(0, 40);
  }, [rows, q]);
  const fen = useMemo(() => {
    if (!picked) return null;
    const c = new Chess();
    try {
      c.loadPgn(picked[2]);
      return c.fen();
    } catch {
      return null;
    }
  }, [picked]);

  return (
    <section aria-labelledby="names" className="card mt-10 p-5">
      <h2 id="names" className="text-2xl">
        Look up any opening by name
      </h2>
      <p className="mt-1 max-w-[65ch] text-muted">
        {rows ? rows.length.toLocaleString("en") : "3,800+"} named lines from the Lichess opening database (public domain). These are names and moves only: no lesson, no statistics and no recommendation.
      </p>
      <label htmlFor="opening-search" className="mb-1 mt-4 block text-sm text-muted">
        Opening name or ECO code
      </label>
      <input id="opening-search" className="input max-w-md" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Benoni, Catalan, B90" />
      <div className="mt-4 grid gap-6 md:grid-cols-[1fr_minmax(0,22rem)]">
        <ul className="grid max-h-96 content-start gap-1 overflow-y-auto" aria-live="polite">
          {q.trim().length >= 2 && hits.length === 0 && rows && <li className="text-muted">No opening with that name.</li>}
          {hits.map((r) => (
            <li key={r[1] + r[2]}>
              <button className="choice" aria-pressed={picked === r} onClick={() => setPicked(r)}>
                <span className="chip num mr-2">{r[0]}</span>
                {r[1]}
              </button>
            </li>
          ))}
        </ul>
        {picked && fen && (
          <div>
            <Board fen={fen} label={picked[1]} />
            <p className="mt-2 font-semibold">{picked[1]}</p>
            <p className="num text-sm text-muted">{picked[2]}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link className="btn" href={`/play/?fen=${encodeURIComponent(fen)}`}>
                Play from here
              </Link>
              <Link className="btn btn-quiet" href={`/analysis/?fen=${encodeURIComponent(fen)}`}>
                Analyse
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Index() {
  const attempts = useStore((s) => s.attempts);
  const introduced = useStore((s) => s.introduced);
  const repertoire = useStore((s) => s.repertoire);
  const profile = useStore((s) => s.profile);
  const now = useNow();
  const [style, setStyle] = useState("");
  const maxLoad = MAX_WORKLOAD[profile?.experience ?? "casual"] ?? 2;
  const groups = ["White", "Black against 1.e4", "Black against 1.d4"] as const;

  return (
    <>
      <PageHeader title="Openings" lead="Learn what each opening is trying to do, walk through the main line with explanations, then play it from memory. Lines you get wrong come back for review.">
        <div>
          <label htmlFor="style" className="mb-1 block text-sm text-muted">
            Kind of position
          </label>
          <select id="style" className="input" value={style} onChange={(e) => setStyle(e.target.value)}>
            <option value="">Any</option>
            <option>open and tactical</option>
            <option>balanced</option>
            <option>closed and strategic</option>
          </select>
        </div>
      </PageHeader>
      <p className="mb-6 max-w-[70ch] text-muted">
        {repertoire.length > 0 ? `Your repertoire: ${repertoire.map((id) => OPENING_BY_ID[id]?.name).filter(Boolean).join(", ")}.` : "You have not chosen a repertoire yet. Pick one opening for White, one against 1.e4 and one against 1.d4."} “Suggested” marks openings whose amount of theory fits the experience you told us about. It is a
        suggestion about workload, not a claim that the opening is better.
      </p>
      {groups.map((g) => (
        <section key={g} aria-labelledby={g} className="mb-8">
          <h2 id={g} className="text-2xl">
            {g}
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {OPENINGS.filter((o) => o.group === g && (!style || o.style === style)).map((o) => {
              const m = mastery(attempts, `opening:${o.id}`, introduced.includes(`opening:${o.id}`), now);
              return (
                <li key={o.id}>
                  <Link href={`/openings/?id=${o.id}`} className="card block h-full p-4 no-underline transition-colors hover:border-accent">
                    <h3 className="text-lg">{o.name}</h3>
                    <p className="mt-2 flex flex-wrap gap-1.5">
                      <span className="chip">{WORKLOAD[o.workload]}</span>
                      <span className="chip">{o.style}</span>
                      {o.workload <= maxLoad && <span className="chip border-accent text-accent">Suggested</span>}
                      {repertoire.includes(o.id) && <span className="chip border-brass text-brass">In repertoire</span>}
                    </p>
                    <p className="mt-2 text-sm text-muted">{MASTERY_LABEL[m.state]}{m.attempts > 0 ? `: ${m.solo} of ${m.attempts} attempts clean` : ""}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <NamesExplorer />
    </>
  );
}

function Router() {
  const id = useSearchParams().get("id");
  const opening = id ? OPENING_BY_ID[id] : null;
  return opening ? <Lesson opening={opening} /> : <Index />;
}

export default function OpeningsPage() {
  return (
    <Ready>
      <Suspense>
        <Router />
      </Suspense>
    </Ready>
  );
}
