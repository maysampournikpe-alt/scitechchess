"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PlanExerciseView } from "@/components/PlanExerciseView";
import { PageHeader, Ready } from "@/components/ui";
import { PLAN_EXERCISES, PLAN_BY_ID } from "@/content/middlegame";
import { OPENING_BY_ID } from "@/content/openings";
import { mastery, MASTERY_LABEL } from "@/lib/learning/mastery";
import { useStore } from "@/lib/store/store";
import { useNow } from "@/lib/store/derived";

function Index() {
  const attempts = useStore((s) => s.attempts);
  const now = useNow();
  return (
    <>
      <PageHeader title="Middlegame academy" lead="Tactics win games, but most moves are decided by plans. Each lesson starts from a real opening, shows the pawn structure it leads to, and asks what you would do." />
      <ul className="grid gap-4 lg:grid-cols-2">
        {PLAN_EXERCISES.map((p) => {
          const m = mastery(attempts, `plan:${p.id}`, false, now);
          return (
            <li key={p.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl">{p.structure}</h2>
                <span className="chip">{MASTERY_LABEL[m.state]}</span>
              </div>
              <p className="mt-1 text-muted">{p.concept}</p>
              <details className="mt-3">
                <summary className="text-sm font-semibold">Plans in this structure</summary>
                <div className="mt-2 grid gap-2 text-sm">
                  <p>
                    <strong>White:</strong> {p.whitePlans.join(" ")}
                  </p>
                  <p>
                    <strong>Black:</strong> {p.blackPlans.join(" ")}
                  </p>
                  <p>
                    <strong>Typical endgame:</strong> {p.typicalEndgame}
                  </p>
                  <p>
                    <strong>Arises from:</strong>{" "}
                    {p.fromOpenings.map((o, i) => (
                      <span key={o}>
                        {i > 0 && ", "}
                        <Link className="underline" href={`/openings/?id=${o}`}>
                          {OPENING_BY_ID[o]?.name}
                        </Link>
                      </span>
                    ))}
                  </p>
                </div>
              </details>
              <Link href={`/middlegame/?id=${p.id}`} className="btn btn-primary mt-4">
                Find the plan
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Router() {
  const id = useSearchParams().get("id");
  const ex = id ? PLAN_BY_ID[id] : null;
  if (!ex) return <Index />;
  const i = PLAN_EXERCISES.indexOf(ex);
  const next = PLAN_EXERCISES[(i + 1) % PLAN_EXERCISES.length];
  return (
    <>
      <PageHeader title={`${ex.structure}: ${ex.title.toLowerCase()}`}>
        <Link href="/middlegame/" className="btn btn-quiet">
          All lessons
        </Link>
      </PageHeader>
      <PlanExerciseView key={ex.id} ex={ex} />
      <Link href={`/middlegame/?id=${next.id}`} className="btn mt-6">
        Next lesson: {next.structure}
      </Link>
    </>
  );
}

export default function MiddlegamePage() {
  return (
    <Ready>
      <Suspense>
        <Router />
      </Suspense>
    </Ready>
  );
}
