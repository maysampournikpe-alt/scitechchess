"use client";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Board } from "@/components/Board";
import { EndgamePractice } from "@/components/EndgamePractice";
import { EndgameFind } from "@/components/EndgameFind";
import { PageHeader, Ready } from "@/components/ui";
import { ENDGAMES, ENDGAME_BY_ID, type Endgame } from "@/content/endgames";
import { mastery, MASTERY_LABEL } from "@/lib/learning/mastery";
import { useStore } from "@/lib/store/store";
import { useNow } from "@/lib/store/derived";

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
      {tab === "find" && <EndgameFind endgame={endgame} />}
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
