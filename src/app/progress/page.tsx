"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Empty, PageHeader, Ready } from "@/components/ui";
import { useStore } from "@/lib/store/store";
import { useNow } from "@/lib/store/derived";
import { confidence, currentRd, range, SKILLS, type SkillId } from "@/lib/learning/skills";
import { mastery, MASTERY_LABEL, RULES } from "@/lib/learning/mastery";
import { weeklyStats } from "@/lib/learning/stats";
import { weaknessDna } from "@/lib/learning/report";
import { conceptHref } from "@/lib/store/derived";
import { ENDGAMES } from "@/content/endgames";
import { OPENINGS } from "@/content/openings";
import { PLAN_EXERCISES } from "@/content/middlegame";

const SCALE: [number, number] = [200, 2800];
const x = (v: number, w: number) => ((Math.min(SCALE[1], Math.max(SCALE[0], v)) - SCALE[0]) / (SCALE[1] - SCALE[0])) * w;
const shortDate = (t: number) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Each measured skill as a dot with its plausible range (score ± 2 RD). One series, so no legend. */
function SkillChart({ ids, now }: { ids: SkillId[]; now: number }) {
  const skills = useStore((s) => s.skills);
  const W = 560;
  const row = 34;
  const left = 150;
  const ticks = [400, 800, 1200, 1600, 2000, 2400];
  return (
    <svg viewBox={`0 0 ${W + left + 10} ${ids.length * row + 30}`} className="w-full" role="img" aria-label="Training score for each measured skill with its uncertainty range. The same numbers are in the table below.">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={left + x(t, W)} x2={left + x(t, W)} y1={0} y2={ids.length * row} stroke="var(--line)" strokeWidth="1" />
          <text x={left + x(t, W)} y={ids.length * row + 18} textAnchor="middle" fontSize="12" fill="var(--muted)">
            {t}
          </text>
        </g>
      ))}
      {ids.map((id, i) => {
        const s = skills[id];
        const r = range(s, now);
        const y = i * row + row / 2;
        const def = SKILLS.find((d) => d.id === id)!;
        return (
          <g key={id}>
            <title>{`${def.name}: ${Math.round(s.score)}, plausible range ${r.low} to ${r.high}, ${s.n} attempts`}</title>
            <text x={left - 10} y={y + 4} textAnchor="end" fontSize="13" fill="var(--text)">
              {def.short}
            </text>
            <rect x={left + x(r.low, W)} y={y - 5} width={Math.max(4, x(r.high, W) - x(r.low, W))} height={10} rx={4} fill="var(--chart-soft)" />
            <circle cx={left + x(s.score, W)} cy={y} r={6} fill="var(--chart)" stroke="var(--surface)" strokeWidth="2" />
            <rect x={left} y={y - row / 2} width={W} height={row} fill="transparent" />
          </g>
        );
      })}
    </svg>
  );
}

function Bars({ values, labels, unit, label }: { values: number[]; labels: string[]; unit: string; label: string }) {
  const max = Math.max(1, ...values);
  const W = 560;
  const H = 140;
  const bw = W / values.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full" role="img" aria-label={label}>
      <line x1={0} x2={W} y1={H} y2={H} stroke="var(--line)" />
      {values.map((v, i) => {
        const h = (v / max) * (H - 18);
        return (
          <g key={labels[i]}>
            <title>{`Week of ${labels[i]}: ${v} ${unit}`}</title>
            <rect x={i * bw + 6} y={H - h} width={bw - 12} height={h} rx={4} fill="var(--chart)" />
            {v > 0 && (
              <text x={i * bw + bw / 2} y={H - h - 5} textAnchor="middle" fontSize="12" fill="var(--text)">
                {v}
              </text>
            )}
            <text x={i * bw + bw / 2} y={H + 16} textAnchor="middle" fontSize="11" fill="var(--muted)">
              {labels[i]}
            </text>
            <rect x={i * bw} y={0} width={bw} height={H} fill="transparent" />
          </g>
        );
      })}
    </svg>
  );
}

function Line({ points, labels, label }: { points: (number | null)[]; labels: string[]; label: string }) {
  const W = 560;
  const H = 140;
  const step = W / points.length;
  const y = (v: number) => H - (v / 100) * (H - 10);
  const coords = points.map((v, i) => (v === null ? null : ([i * step + step / 2, y(v)] as const)));
  const path = coords.reduce((acc, c, i) => (c ? acc + `${acc && coords[i - 1] ? "L" : "M"}${c[0]},${c[1]} ` : acc), "");
  return (
    <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full" role="img" aria-label={label}>
      {[0, 50, 100].map((t) => (
        <g key={t}>
          <line x1={0} x2={W} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray={t === 0 ? undefined : "3 4"} />
          <text x={2} y={y(t) - 3} fontSize="11" fill="var(--muted)">
            {t}%
          </text>
        </g>
      ))}
      <path d={path} fill="none" stroke="var(--chart)" strokeWidth="2" />
      {coords.map((c, i) =>
        c ? (
          <g key={labels[i]}>
            <title>{`Week of ${labels[i]}: ${points[i]}% of first-time puzzles solved without help`}</title>
            <circle cx={c[0]} cy={c[1]} r={5} fill="var(--chart)" stroke="var(--surface)" strokeWidth="2" />
            <circle cx={c[0]} cy={c[1]} r={14} fill="transparent" />
          </g>
        ) : null,
      )}
      {labels.map((l, i) => (
        <text key={l} x={i * step + step / 2} y={H + 16} textAnchor="middle" fontSize="11" fill="var(--muted)">
          {l}
        </text>
      ))}
    </svg>
  );
}

/** Recurring errors, each shown with the counts behind it and the positions where it happened. */
function WeaknessDna() {
  const attempts = useStore((s) => s.attempts);
  const cards = useStore((s) => s.cards);
  const dna = useMemo(() => weaknessDna(attempts), [attempts]);
  return (
    <section className="card p-5" aria-labelledby="dna">
      <h2 id="dna" className="text-2xl">
        Weakness DNA
      </h2>
      <p className="mt-1 max-w-[70ch] text-sm text-muted">Patterns you have met on at least four new positions and got wrong, or needed help with, at least 40% of the time.</p>
      {dna.length === 0 ? (
        <p className="mt-3 text-muted">No recurring weakness has enough evidence yet.</p>
      ) : (
        <ul className="mt-3 grid gap-3">
          {dna.map((d) => {
            const examples = Object.values(cards).filter((c) => c.concept === d.concept).slice(0, 3);
            return (
              <li key={d.concept} className="rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">{d.label}</p>
                  <p className="num text-sm text-muted">
                    {d.misses} of {d.attempts} new positions missed or helped
                  </p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-raised" aria-hidden="true">
                  <div className="h-full rounded-full bg-[var(--chart)]" style={{ width: `${Math.round(d.rate * 100)}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link className="btn" href={conceptHref(d.concept)}>
                    Practise this
                  </Link>
                  {examples.map((c, i) => (
                    <Link key={c.id} className="btn btn-quiet" href={c.href}>
                      Example {i + 1}
                    </Link>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Journal() {
  const journal = useStore((s) => s.journal);
  const add = useStore((s) => s.addJournal);
  const [text, setText] = useState("");
  return (
    <section className="card p-5" aria-labelledby="journal">
      <h2 id="journal" className="text-2xl">
        Improvement journal
      </h2>
      <p className="mt-1 text-muted">What did you learn, what was hard, what do you want to practise next?</p>
      <form
        className="mt-3 grid gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          add(text.trim().slice(0, 2000));
          setText("");
        }}
      >
        <label htmlFor="entry" className="sr-only">
          New journal entry
        </label>
        <textarea id="entry" className="input min-h-24" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
        <button className="btn justify-self-start" disabled={!text.trim()}>
          Save entry
        </button>
      </form>
      <ul className="mt-4 grid gap-3">
        {[...journal].reverse().slice(0, 20).map((j) => (
          <li key={j.id}>
            <p className="text-sm text-muted">{new Date(j.t).toLocaleDateString()}</p>
            <p className="whitespace-pre-wrap">{j.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Progress() {
  const skills = useStore((s) => s.skills);
  const attempts = useStore((s) => s.attempts);
  const introduced = useStore((s) => s.introduced);
  const now = useNow();
  const weeks = useMemo(() => (now ? weeklyStats(attempts, now) : []), [attempts, now]);
  const tactics = useMemo(() => (now ? weeklyStats(attempts, now, 8, (a) => a.skill === "tactics") : []), [attempts, now]);
  if (!now) return null;
  if (attempts.length === 0)
    return (
      <Empty title="No results yet" href="/assessment/" action="Take the assessment">
        Charts here are drawn only from exercises you have done. Take the assessment or solve a few puzzles and they will start to fill in.
      </Empty>
    );

  const measured = SKILLS.filter((s) => skills[s.id].n > 0).map((s) => s.id);
  const labels = weeks.map((w) => shortDate(w.start));
  const accuracy = tactics.map((w) => (w.firstTime >= 3 ? Math.round((w.firstTimeSolo / w.firstTime) * 100) : null));
  const change = (id: SkillId) => {
    const h = skills[id].history;
    const before = [...h].reverse().find((p) => p.t <= now - 7 * 86_400_000);
    return before ? Math.round(skills[id].score - before.score) : null;
  };
  const conceptRows = [
    { group: "Openings", items: OPENINGS.map((o) => ({ id: `opening:${o.id}`, name: o.name })) },
    { group: "Endgames", items: ENDGAMES.map((e) => ({ id: `endgame:${e.id}`, name: e.name })) },
    { group: "Middlegame", items: PLAN_EXERCISES.map((p) => ({ id: `plan:${p.id}`, name: p.structure })) },
  ];

  return (
    <div className="grid gap-6">
      <section className="card p-5" aria-labelledby="profile">
        <h2 id="profile" className="text-2xl">
          Skill profile
        </h2>
        <p className="mt-1 max-w-[70ch] text-sm text-muted">
          Dot: your training score. Band: the plausible range (score ± 2 rating deviations). Scores use the difficulty scale of the Lichess puzzle database and are updated with the Glicko-1 formulas after every scored attempt. They are not official ratings.
        </p>
        {measured.length ? <SkillChart ids={measured} now={now} /> : <p className="mt-3 text-muted">No skill measured yet.</p>}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                {["Skill", "Score", "Range", "Attempts", "Confidence", "Last", "7-day change", "How it is measured"].map((h) => (
                  <th key={h} scope="col" className="py-2 pr-3 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="num">
              {SKILLS.map((d) => {
                const s = skills[d.id];
                const r = range(s, now);
                const ch = change(d.id);
                return (
                  <tr key={d.id} className="border-b border-line/60 align-top">
                    <th scope="row" className="py-2 pr-3 font-semibold">
                      {d.name}
                    </th>
                    <td className="py-2 pr-3">{s.n ? Math.round(s.score) : "–"}</td>
                    <td className="py-2 pr-3">{s.n ? `${r.low}–${r.high}` : "–"}</td>
                    <td className="py-2 pr-3">{s.n}</td>
                    <td className="py-2 pr-3">{confidence(s, now)}</td>
                    <td className="py-2 pr-3">{s.last ? shortDate(s.last) : "–"}</td>
                    <td className="py-2 pr-3">{ch === null ? "–" : ch > 0 ? `+${ch}` : ch}</td>
                    <td className="py-2 font-sans text-muted">{d.measuredBy}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted">Range width today includes uncertainty that grows while a skill is not practised (±{Math.round(2 * currentRd(skills.tactics, now))} for tactics now).</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="activity">
          <h2 id="activity" className="text-2xl">
            Exercises per week
          </h2>
          <Bars values={weeks.map((w) => w.attempts)} labels={labels} unit="exercises" label={`Exercises per week for the last 8 weeks: ${weeks.map((w, i) => `${labels[i]} ${w.attempts}`).join(", ")}`} />
        </section>
        <section className="card p-5" aria-labelledby="accuracy">
          <h2 id="accuracy" className="text-2xl">
            Tactical accuracy on new puzzles
          </h2>
          <p className="text-sm text-muted">Share of puzzles seen for the first time and solved without help. Weeks with fewer than 3 are left out.</p>
          <Line points={accuracy} labels={labels} label={`Weekly tactical accuracy: ${accuracy.map((a, i) => `${labels[i]} ${a === null ? "not enough data" : a + "%"}`).join(", ")}`} />
        </section>
      </div>

      <section className="card p-5" aria-labelledby="mastery">
        <h2 id="mastery" className="text-2xl">
          Mastery map
        </h2>
        <p className="mt-1 max-w-[75ch] text-sm text-muted">
          “Demonstrated” needs {RULES.soloOnNewItems} unassisted first-time solves of different positions and at least {RULES.recentSolo} of your last {RULES.recentWindow} new attempts clean. “Retention verified” needs another clean solve at least {RULES.retentionDelayDays} days later.
        </p>
        <div className="mt-4 grid gap-6 md:grid-cols-3">
          {conceptRows.map((g) => (
            <div key={g.group}>
              <h3 className="text-lg">{g.group}</h3>
              <ul className="mt-2 grid gap-1 text-sm">
                {g.items.map((it) => {
                  const m = mastery(attempts, it.id, introduced.includes(it.id), now);
                  return (
                    <li key={it.id} className="flex justify-between gap-2">
                      <span>{it.name}</span>
                      <span className={m.state === "retention_verified" || m.state === "demonstrated" ? "text-good" : m.state === "needs_review" ? "text-brass" : "text-muted"}>{MASTERY_LABEL[m.state]}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <WeaknessDna />

      <Journal />
      <p className="text-sm text-muted">
        Want the raw data? <Link href="/settings/" className="underline">Export everything</Link> as a file.
      </p>
    </div>
  );
}

export default function ProgressPage() {
  return (
    <Ready>
      <PageHeader title="My progress" lead="Every number here comes from exercises you have done on this device." />
      <Progress />
    </Ready>
  );
}
