"use client";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Chess } from "chess.js";
import { Board } from "@/components/Board";
import { EndgamePractice } from "@/components/EndgamePractice";
import { Feedback, PageHeader, Ready } from "@/components/ui";
import { ENDGAMES, ENDGAME_BY_ID, type Endgame } from "@/content/endgames";
import { applyUci } from "@/lib/chess/rules";
import { mastery, MASTERY_LABEL } from "@/lib/learning/mastery";
import { useStore } from "@/lib/store/store";
import { useNow } from "@/lib/store/derived";

function FindTheMove({ endgame }: { endgame: Endgame }) {
  const record = useStore((s) => s.record);
  const [answer, setAnswer] = useState<{ san: string; right: boolean } | null>(null);
  const [rev, setRev] = useState(0);
  const [start] = useState(() => Date.now());

  function onMove(uci: string) {
    if (answer) return;
    const c = new Chess(endgame.fen);
    const m = applyUci(c, uci);
    if (!m) return;
    const right = endgame.keyMoves.includes(m.san);
    setAnswer({ san: m.san, right });
    setRev((r) => r + 1);
    record({ itemId: `endgame-q:${endgame.id}`, module: "endgame", skill: "endgameKnowledge", concept: `endgame:${endgame.id}`, difficulty: endgame.difficulty, itemRd: 200, outcome: right ? "solo" : "failed", hints: 0, ms: Date.now() - start, card: { label: endgame.name, href: `/endgames/?id=${endgame.id}`, kind: "endgame" } });
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,32rem)_1fr]">
      <Board fen={endgame.fen} orientation={endgame.side} movable={answer ? null : endgame.side} onMove={onMove} resetKey={rev} label="Find the move" />
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-xl">Find the move</h3>
          <p className="mt-1 text-muted">
            {endgame.side === "w" ? "White" : "Black"} to move. Play the move that {endgame.goal === "win" ? "keeps the win" : "holds the draw"}. You get one try.
          </p>
        </div>
        {answer && (
          <Feedback tone={answer.right ? "good" : "bad"}>
            <p className="font-semibold">{answer.right ? `${answer.san} is correct.` : `${answer.san} is not it. The move is ${endgame.keyMoves.join(" or ")}.`}</p>
            <p className="mt-1">{endgame.why}</p>
          </Feedback>
        )}
      </div>
    </div>
  );
}

function Lesson({ endgame }: { endgame: Endgame }) {
  const introduce = useStore((s) => s.introduce);
  const [tab, setTab] = useState<"learn" | "find" | "play">("learn");
  useEffect(() => {
    introduce(`endgame:${endgame.id}`);
    setTab("learn");
  }, [endgame, introduce]);
  const tabs = [["learn", "1. Learn"], ...(endgame.keyMoves.length ? [["find", "2. Find the move"]] : []), ["play", `${endgame.keyMoves.length ? 3 : 2}. Play it out`]] as const;

  return (
    <>
      <PageHeader title={endgame.name} lead={endgame.principle}>
        <Link href="/endgames/" className="btn btn-quiet">
          All endgames
        </Link>
      </PageHeader>
      <div role="tablist" aria-label="Lesson steps" className="mb-6 flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`btn ${tab === id ? "btn-primary" : ""}`} onClick={() => setTab(id as typeof tab)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "learn" && (
        <div className="grid gap-6 md:grid-cols-[minmax(0,26rem)_1fr]">
          <Board fen={endgame.fen} orientation={endgame.side} label={`${endgame.name} starting position`} />
          <div className="prose-lesson grid content-start gap-4">
            <p>{endgame.why}</p>
            <div>
              <h3 className="text-lg">The method</h3>
              <ol className="mt-2 list-decimal pl-5">
                {endgame.method.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ol>
            </div>
            <div>
              <h3 className="text-lg">What goes wrong</h3>
              <ul className="mt-2">
                {endgame.pitfalls.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
            <button className="btn btn-primary justify-self-start" onClick={() => setTab(endgame.keyMoves.length ? "find" : "play")}>
              Now try it
            </button>
          </div>
        </div>
      )}
      {tab === "find" && <FindTheMove endgame={endgame} />}
      {tab === "play" && <EndgamePractice endgame={endgame} />}
    </>
  );
}

function Index() {
  const attempts = useStore((s) => s.attempts);
  const introduced = useStore((s) => s.introduced);
  const now = useNow();
  const tiers = useMemo(() => ["Beginner", "Intermediate", "Advanced"] as const, []);
  return (
    <>
      <PageHeader title="Endgame academy" lead="Each endgame is tracked on its own: knowing the basic mates says nothing about rook endings. Read the idea, find the key move, then play the position out against Stockfish." />
      {tiers.map((tier) => (
        <section key={tier} aria-labelledby={tier} className="mb-8">
          <h2 id={tier} className="text-2xl">
            {tier}
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {ENDGAMES.filter((e) => e.tier === tier).map((e) => {
              const m = mastery(attempts, `endgame:${e.id}`, introduced.includes(`endgame:${e.id}`), now);
              return (
                <li key={e.id}>
                  <Link href={`/endgames/?id=${e.id}`} className="card block h-full p-4 no-underline transition-colors hover:border-accent">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg">{e.name}</h3>
                      <span className={`chip ${m.state === "retention_verified" ? "border-good text-good" : m.state === "needs_review" ? "border-brass text-brass" : ""}`}>{MASTERY_LABEL[m.state]}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {e.family}. {e.goal === "win" ? "You win." : "You hold the draw."} {m.attempts > 0 && `${m.solo} of ${m.attempts} attempts clean.`}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}

function Router() {
  const id = useSearchParams().get("id");
  const endgame = id ? ENDGAME_BY_ID[id] : null;
  return endgame ? <Lesson endgame={endgame} /> : <Index />;
}

export default function EndgamesPage() {
  return (
    <Ready>
      <Suspense>
        <Router />
      </Suspense>
    </Ready>
  );
}
