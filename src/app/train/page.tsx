"use client";
import Link from "next/link";
import { useMemo } from "react";
import { NeedsProfile, PageHeader, Ready } from "@/components/ui";
import { useStore } from "@/lib/store/store";
import { usePlanInput, useNow } from "@/lib/store/derived";
import { dailyPlan, weeklyPlan } from "@/lib/learning/plan";
import { buildReport } from "@/lib/learning/report";
import { confidence, currentRd, SKILLS, SKILL_BY_ID } from "@/lib/learning/skills";

const GOAL_TEXT: Record<string, string> = { learn: "Learn chess", title: "Become a titled player", tournament: "Improve tournament results", tactics: "Stronger tactics", openings: "Better opening knowledge", positional: "Better positional understanding", endgame: "Better endgame technique" };

function Dashboard() {
  const profile = useStore((s) => s.profile)!;
  const skills = useStore((s) => s.skills);
  const attempts = useStore((s) => s.attempts);
  const assessed = useStore((s) => s.assessmentDoneAt);
  const input = usePlanInput();
  const now = useNow();

  const plan = useMemo(() => (input ? dailyPlan(input) : null), [input]);
  const week = useMemo(() => (input ? weeklyPlan(input) : null), [input]);
  const report = useMemo(() => (now ? buildReport(skills, attempts, now) : null), [skills, attempts, now]);
  const today = useMemo(() => {
    if (!now) return { count: 0, minutes: 0, solo: 0 };
    const start = new Date(now).setHours(0, 0, 0, 0);
    const list = attempts.filter((a) => a.t >= start);
    return { count: list.length, minutes: Math.round(list.reduce((s, a) => s + Math.min(a.ms, 600_000), 0) / 60_000), solo: list.filter((a) => a.outcome === "solo").length };
  }, [attempts, now]);

  const measured = SKILLS.filter((s) => skills[s.id].n >= 4).sort((a, b) => skills[b.id].score - skills[a.id].score);
  const goal = profile.goalRating ? `Reach ${profile.goalRating}` : (GOAL_TEXT[profile.goal] ?? "Improve");

  return (
    <>
      <PageHeader title="Welcome back" lead={`Goal: ${goal}. ${profile.rating ? `Your rating: ${profile.rating} (${profile.ratingSource}, self-reported).` : "No rating entered."}`}>
        <Link href="/onboarding/" className="btn btn-quiet">
          Change my answers
        </Link>
      </PageHeader>

      {!assessed && (
        <div className="card mb-6 flex flex-wrap items-center justify-between gap-4 border-brass p-5">
          <div>
            <h2 className="text-xl">Your plan is based on your answers so far</h2>
            <p className="mt-1 max-w-[60ch] text-muted">Take the 15-minute assessment and the plan below will be rebuilt from measured results.</p>
          </div>
          <Link href="/assessment/" className="btn btn-primary">
            Take the assessment
          </Link>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section aria-labelledby="today" className="card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="today" className="text-2xl">
              Today&apos;s training
            </h2>
            <p className="num text-muted">{plan ? `${plan.totalMinutes} minutes planned` : ""}</p>
          </div>
          <ol className="mt-4 grid gap-3">
            {plan?.blocks.map((b) => (
              <li key={b.id} className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-[4.5rem_1fr_auto] sm:items-center">
                <p className="num font-[family-name:var(--font-display)] text-2xl">
                  {b.minutes}
                  <span className="ml-1 text-sm text-muted">min</span>
                </p>
                <div>
                  <h3 className="text-lg">{b.title}</h3>
                  <p className="mt-1 text-sm text-muted">{b.why}</p>
                </div>
                <Link href={b.href} className="btn btn-primary">
                  Start
                </Link>
              </li>
            ))}
          </ol>
          <p className="num mt-4 text-sm text-muted">
            Done today: {today.count} exercise{today.count === 1 ? "" : "s"}, {today.solo} solved without help, about {today.minutes} active minute{today.minutes === 1 ? "" : "s"}.
          </p>
        </section>

        <div className="grid content-start gap-6">
          <section aria-labelledby="diagnosis" className="card p-5">
            <h2 id="diagnosis" className="text-2xl">
              What your results say
            </h2>
            <ul className="mt-3 grid gap-2 text-muted">
              {report?.sentences.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <Link href="/progress/" className="btn btn-quiet mt-4">
              See all skills
            </Link>
          </section>

          <section aria-labelledby="skills" className="card p-5">
            <h2 id="skills" className="text-2xl">
              Strongest and weakest
            </h2>
            {measured.length < 2 ? (
              <p className="mt-3 text-muted">A skill needs at least four scored attempts before it is ranked. {measured.length === 1 ? `Measured so far: ${measured[0].short.toLowerCase()}.` : "Nothing is measured yet."}</p>
            ) : (
              <dl className="mt-3 grid gap-3">
                {[measured[0], measured.at(-1)!].map((s, i) => (
                  <div key={s.id} className="flex items-baseline justify-between gap-3">
                    <dt>
                      <span className="text-sm text-muted">{i === 0 ? "Strongest" : "Needs most work"}</span>
                      <br />
                      {SKILL_BY_ID[s.id].name}
                    </dt>
                    <dd className="num text-right">
                      {Math.round(skills[s.id].score)} <span className="text-muted">±{Math.round(2 * currentRd(skills[s.id], now))}</span>
                      <br />
                      <span className="text-sm text-muted">{confidence(skills[s.id], now)} confidence</span>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        </div>
      </div>

      {week && (
        <section aria-labelledby="week" className="card mt-6 p-5">
          <h2 id="week" className="text-2xl">
            This week
          </h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h3 className="text-lg">Objectives</h3>
              <ul className="mt-2 grid gap-3">
                {week.objectives.map((o) => (
                  <li key={o.skill}>
                    <p>{o.text}</p>
                    <p className="text-sm text-muted">{o.criterion}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <caption className="sr-only">Weekly schedule</caption>
                <thead>
                  <tr className="border-b border-line text-sm text-muted">
                    <th scope="col" className="py-2 pr-4 font-normal">
                      Day
                    </th>
                    <th scope="col" className="py-2 font-normal">
                      Focus
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {week.days.map((d) => (
                    <tr key={d.day} className="border-b border-line/60 align-top">
                      <th scope="row" className="py-2 pr-4 font-semibold">
                        {d.day}
                      </th>
                      <td className="py-2">{d.title}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-sm text-muted">The week is a guide. Each day&apos;s plan is recalculated from your latest results, so missing a day changes nothing.</p>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

export default function TrainPage() {
  return (
    <Ready>
      <NeedsProfile>
        <Dashboard />
      </NeedsProfile>
    </Ready>
  );
}
