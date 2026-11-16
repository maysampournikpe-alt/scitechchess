"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader, Ready } from "@/components/ui";
import { useStore } from "@/lib/store/store";
import { useNow } from "@/lib/store/derived";
import { dueCards } from "@/lib/learning/srs";
import { OPENING_BY_ID } from "@/content/openings";

/** Training load by days left: heavy new work far from the event, light review and sharpness close to it. */
function phase(days: number) {
  if (days <= 1) return { name: "Event eve", minutes: 20, note: "Only light, familiar work: easy puzzles to feel sharp and a quick look at your repertoire. No new openings, no long sessions, sleep early." };
  if (days <= 7) return { name: "Final week", minutes: 40, note: "Review what you already know. Keep tactics daily but easier than usual, play one clocked training game, and stop learning new opening lines." };
  if (days <= 21) return { name: "Build-up", minutes: 60, note: "Fix the leaks in your repertoire, practise endgames you are likely to reach, and play clocked games at the time control of the event." };
  return { name: "Base training", minutes: 60, note: "Normal training. Work on weaknesses and new material while there is time for it to settle." };
}

function Prep() {
  const repertoire = useStore((s) => s.repertoire);
  const cards = useStore((s) => s.cards);
  const now = useNow();
  const [date, setDate] = useState("");
  const days = date && now ? Math.ceil((new Date(date).getTime() - now) / 86_400_000) : null;
  const p = days !== null && days >= 0 ? phase(days) : null;
  const due = useMemo(() => (now ? dueCards(Object.values(cards), now) : []), [cards, now]);
  const dueOpenings = due.filter((c) => c.kind === "opening");
  const dueEndgames = due.filter((c) => c.kind === "endgame");

  return (
    <div className="grid max-w-3xl gap-6">
      <div className="card grid gap-3 p-5">
        <label htmlFor="event" className="font-semibold">
          When is your event?
        </label>
        <input id="event" type="date" className="input max-w-xs" value={date} onChange={(e) => setDate(e.target.value)} />
        {days !== null && days < 0 && <p className="text-bad">That date is in the past.</p>}
        {p && (
          <p>
            <strong>
              {days} day{days === 1 ? "" : "s"} to go: {p.name}.
            </strong>{" "}
            {p.note} Suggested daily time: about {p.minutes} minutes.
          </p>
        )}
      </div>
      <ol className="grid gap-3">
        <li className="card p-4">
          <h2 className="text-lg">1. Opening review</h2>
          <p className="mt-1 text-muted">
            {repertoire.length ? `Your repertoire: ${repertoire.map((id) => OPENING_BY_ID[id]?.name).join(", ")}.` : "You have no repertoire saved yet."} {dueOpenings.length} opening line{dueOpenings.length === 1 ? " is" : "s are"} due for review.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {repertoire.map((id) => (
              <Link key={id} className="btn" href={`/openings/?id=${id}&tab=memory`}>
                {OPENING_BY_ID[id]?.name} from memory
              </Link>
            ))}
            {!repertoire.length && (
              <Link className="btn" href="/openings/">
                Choose openings
              </Link>
            )}
          </div>
        </li>
        <li className="card p-4">
          <h2 className="text-lg">2. Tactical warm-up</h2>
          <p className="mt-1 text-muted">Easier puzzles, solved quickly and cleanly, to get pattern recognition going.</p>
          <Link className="btn mt-2" href="/puzzles/?mode=warmup">
            Warm-up puzzles
          </Link>
        </li>
        <li className="card p-4">
          <h2 className="text-lg">3. Blunder check</h2>
          <p className="mt-1 text-muted">Real positions where someone went wrong. Practise checking every check, capture and threat before you move.</p>
          <Link className="btn mt-2" href="/blunder-check/">
            Blunder check
          </Link>
        </li>
        <li className="card p-4">
          <h2 className="text-lg">4. Endgame review</h2>
          <p className="mt-1 text-muted">{dueEndgames.length} endgame{dueEndgames.length === 1 ? " is" : "s are"} due. The Lucena and Philidor positions come up in real games more than any other.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link className="btn" href="/endgames/?id=lucena">
              Lucena
            </Link>
            <Link className="btn" href="/endgames/?id=philidor">
              Philidor
            </Link>
            <Link className="btn" href="/endgames/">
              All endgames
            </Link>
          </div>
        </li>
        <li className="card p-4">
          <h2 className="text-lg">5. Calculation</h2>
          <Link className="btn mt-2" href="/calculation/">
            Calculation lines
          </Link>
        </li>
        <li className="card p-4">
          <h2 className="text-lg">6. A clocked game</h2>
          <p className="mt-1 text-muted">Play with a clock, then read the review. The time-management score compares your moves with plenty of time against your moves when short of it.</p>
          <Link className="btn mt-2" href="/play/?clock=1">
            Clocked game
          </Link>
        </li>
      </ol>
    </div>
  );
}

export default function TournamentPage() {
  return (
    <Ready>
      <PageHeader title="Tournament preparation" lead="A checklist for the days before an event, with the amount of work scaled to how much time is left." />
      <Prep />
    </Ready>
  );
}
