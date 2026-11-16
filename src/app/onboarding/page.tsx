"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/AppShell";
import { useStore } from "@/lib/store/store";
import type { Profile } from "@/lib/learning/plan";

const EXPERIENCE = [
  ["beginner", "Complete beginner"],
  ["knowsMoves", "I know how the pieces move"],
  ["casual", "Casual player"],
  ["intermediate", "Intermediate player"],
  ["tournament", "Experienced tournament player"],
  ["advanced", "Advanced or expert player"],
] as const;
const SOURCES = ["Chess.com Rapid", "Chess.com Blitz", "Lichess Rapid", "Lichess Blitz", "USCF / US Chess", "FIDE", "Other", "Unrated / I don't know"];
const GOALS = [
  ["learn", "Learn chess", null],
  ["r1000", "Reach 1000", 1000],
  ["r1200", "Reach 1200", 1200],
  ["r1500", "Reach 1500", 1500],
  ["r1800", "Reach 1800", 1800],
  ["r2000", "Reach 2000", 2000],
  ["r2200", "Reach 2200", 2200],
  ["title", "Become a titled player", null],
  ["tournament", "Improve tournament results", null],
  ["tactics", "Become stronger at tactics", null],
  ["openings", "Improve my opening knowledge", null],
  ["positional", "Improve my positional understanding", null],
  ["endgame", "Improve my endgame technique", null],
  ["custom", "A different rating target", null],
] as const;
const MINUTES = [10, 20, 30, 45, 60, 90, 120];
const WEAKNESSES = [
  ["blunders", "I blunder pieces"],
  ["tactics", "I miss tactics"],
  ["openings", "I don't understand openings"],
  ["positional", "I struggle with positional chess"],
  ["middlegame", "I don't know what to do in the middlegame"],
  ["endgames", "I lose winning endgames"],
  ["calculation", "I struggle with calculation"],
  ["time", "I manage my time poorly"],
  ["specificOpenings", "I struggle against specific openings"],
  ["unsure", "I'm not sure"],
] as const;
const PREFS = [
  ["exercises", "Interactive exercises"],
  ["short", "Short explanations"],
  ["videos", "Videos"],
  ["lessons", "Longer structured lessons"],
  ["mix", "A balanced mixture"],
] as const;

const STEPS = ["Experience", "Rating", "Goal", "Time", "Weaknesses", "Learning style", "Assessment"];

export default function Onboarding() {
  const router = useRouter();
  const setProfile = useStore((s) => s.setProfile);
  const existing = useStore((s) => s.profile);
  const [step, setStep] = useState(0);
  const [experience, setExperience] = useState("");
  const [rating, setRating] = useState("");
  const [source, setSource] = useState(SOURCES[7]);
  const [goal, setGoal] = useState("");
  const [customGoal, setCustomGoal] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [customMinutes, setCustomMinutes] = useState("");
  const [weak, setWeak] = useState<string[]>([]);
  const [pref, setPref] = useState<Profile["preference"]>("mix");
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    void useStore.persist.rehydrate();
  }, []);
  useEffect(() => {
    if (!existing) return;
    setExperience(existing.experience);
    setRating(existing.rating ? String(existing.rating) : "");
    setSource(existing.ratingSource);
    setGoal(existing.goal);
    setCustomGoal(existing.goal === "custom" && existing.goalRating ? String(existing.goalRating) : "");
    setMinutes(existing.minutesPerDay);
    setWeak(existing.weaknesses);
    setPref(existing.preference);
  }, [existing]);
  useEffect(() => heading.current?.focus(), [step]);

  const unrated = source === SOURCES[7];
  const ratingNum = Number(rating);
  const ratingValid = unrated || (rating !== "" && Number.isInteger(ratingNum) && ratingNum >= 100 && ratingNum <= 3500);
  const customGoalNum = Number(customGoal);
  const goalValid = goal !== "" && (goal !== "custom" || (Number.isInteger(customGoalNum) && customGoalNum >= 400 && customGoalNum <= 3000));
  const mins = customMinutes !== "" ? Number(customMinutes) : minutes;
  const minutesValid = Number.isInteger(mins) && mins >= 5 && mins <= 480;
  const canNext = [experience !== "", ratingValid, goalValid, minutesValid, weak.length > 0, true, true][step];

  function finish(assess: boolean) {
    const g = GOALS.find((x) => x[0] === goal);
    setProfile({
      experience,
      rating: unrated ? null : ratingNum,
      ratingSource: source,
      goal,
      goalRating: goal === "custom" ? customGoalNum : (g?.[2] ?? null),
      minutesPerDay: mins,
      weaknesses: weak.filter((w) => w !== "unsure"),
      preference: pref,
      createdAt: existing?.createdAt ?? Date.now(),
    });
    router.push(assess ? "/assessment/" : "/train/");
  }

  const radio = (name: string, value: string, current: string, set: (v: string) => void, label: string) => (
    <label key={value} className="choice flex items-center gap-3">
      <input type="radio" name={name} value={value} checked={current === value} onChange={() => set(value)} className="h-4 w-4 accent-[var(--accent)]" />
      {label}
    </label>
  );

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="no-underline" aria-label="ChessMastery home">
          <Logo />
        </Link>
        <p className="num text-sm text-muted" aria-live="polite">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
      </header>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-label="Setup progress">
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      <form
        className="mt-8 flex flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          if (canNext && step < STEPS.length - 1) setStep(step + 1);
        }}
      >
        {step === 0 && (
          <fieldset>
            <legend>
              <h1 ref={heading} tabIndex={-1} className="text-3xl outline-none">
                What is your chess experience?
              </h1>
            </legend>
            <div className="mt-5 grid gap-2">{EXPERIENCE.map(([v, l]) => radio("experience", v, experience, setExperience, l))}</div>
          </fieldset>
        )}

        {step === 1 && (
          <fieldset>
            <legend>
              <h1 ref={heading} tabIndex={-1} className="text-3xl outline-none">
                What is your current chess rating?
              </h1>
            </legend>
            <p className="mt-2 text-muted">Ratings from different sites and federations are not interchangeable, so we store yours together with where it comes from. It is shown as self-reported and is never mixed with your training scores.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="source" className="mb-1 block text-sm text-muted">
                  Where is the rating from?
                </label>
                <select id="source" className="input" value={source} onChange={(e) => setSource(e.target.value)}>
                  {SOURCES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              {!unrated && (
                <div>
                  <label htmlFor="rating" className="mb-1 block text-sm text-muted">
                    Rating
                  </label>
                  <input id="rating" className="input num" inputMode="numeric" value={rating} onChange={(e) => setRating(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 1150" aria-invalid={rating !== "" && !ratingValid} aria-describedby="rating-help" />
                  <p id="rating-help" className={`mt-1 text-sm ${rating !== "" && !ratingValid ? "text-bad" : "text-muted"}`}>
                    A whole number between 100 and 3500.
                  </p>
                </div>
              )}
            </div>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset>
            <legend>
              <h1 ref={heading} tabIndex={-1} className="text-3xl outline-none">
                What is your goal?
              </h1>
            </legend>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">{GOALS.map(([v, l]) => radio("goal", v, goal, setGoal, l))}</div>
            {goal === "custom" && (
              <div className="mt-4 max-w-xs">
                <label htmlFor="custom-goal" className="mb-1 block text-sm text-muted">
                  Target rating
                </label>
                <input id="custom-goal" className="input num" inputMode="numeric" value={customGoal} onChange={(e) => setCustomGoal(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 1650" aria-describedby="goal-help" />
                <p id="goal-help" className="mt-1 text-sm text-muted">
                  Between 400 and 3000.
                </p>
              </div>
            )}
          </fieldset>
        )}

        {step === 3 && (
          <fieldset>
            <legend>
              <h1 ref={heading} tabIndex={-1} className="text-3xl outline-none">
                How much time can you train each day?
              </h1>
            </legend>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {MINUTES.map((m) => (
                <label key={m} className="choice flex items-center gap-3">
                  <input type="radio" name="minutes" checked={customMinutes === "" && minutes === m} onChange={() => (setMinutes(m), setCustomMinutes(""))} className="h-4 w-4 accent-[var(--accent)]" />
                  {m === 120 ? "2+ hours" : `${m} minutes`}
                </label>
              ))}
            </div>
            <div className="mt-4 max-w-xs">
              <label htmlFor="custom-min" className="mb-1 block text-sm text-muted">
                Or enter your own number of minutes
              </label>
              <input id="custom-min" className="input num" inputMode="numeric" value={customMinutes} onChange={(e) => setCustomMinutes(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 25" aria-invalid={!minutesValid} />
              {!minutesValid && <p className="mt-1 text-sm text-bad">Enter between 5 and 480 minutes.</p>}
            </div>
          </fieldset>
        )}

        {step === 4 && (
          <fieldset>
            <legend>
              <h1 ref={heading} tabIndex={-1} className="text-3xl outline-none">
                What do you think your weaknesses are?
              </h1>
            </legend>
            <p className="mt-2 text-muted">Choose all that apply. Your plan starts from these and then follows your results, which may show something different.</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {WEAKNESSES.map(([v, l]) => {
                const on = weak.includes(v);
                return (
                  <label key={v} className="choice flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => setWeak(v === "unsure" ? (on ? [] : ["unsure"]) : on ? weak.filter((x) => x !== v) : [...weak.filter((x) => x !== "unsure"), v])}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                    {l}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {step === 5 && (
          <fieldset>
            <legend>
              <h1 ref={heading} tabIndex={-1} className="text-3xl outline-none">
                How do you prefer to learn?
              </h1>
            </legend>
            <p className="mt-2 text-muted">You can change this later in Settings.</p>
            <div className="mt-5 grid gap-2">{PREFS.map(([v, l]) => radio("pref", v, pref, (x) => setPref(x as Profile["preference"]), l))}</div>
          </fieldset>
        )}

        {step === 6 && (
          <div>
            <h1 ref={heading} tabIndex={-1} className="text-3xl outline-none">
              How should we find your starting level?
            </h1>
            <p className="mt-3 max-w-[60ch] text-muted">
              The assessment takes about 15 minutes. It measures how you do on this site&apos;s own tasks, skill by skill. It cannot establish an official USCF, FIDE, Chess.com or Lichess rating, and it does not try to.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" className="btn btn-primary h-auto flex-col items-start gap-1 p-4 text-left" onClick={() => finish(true)}>
                <span className="text-lg">Take my chess assessment</span>
                <span className="text-sm font-normal opacity-90">Recommended. Your first plan is built from measured results.</span>
              </button>
              <button type="button" className="btn h-auto flex-col items-start gap-1 p-4 text-left" onClick={() => finish(false)}>
                <span className="text-lg">Start with my existing rating</span>
                <span className="text-sm font-normal text-muted">Your plan starts from your answers and adapts as you train.</span>
              </button>
            </div>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-10">
          <button type="button" className="btn btn-quiet" onClick={() => setStep(step - 1)} disabled={step === 0}>
            Back
          </button>
          {step < STEPS.length - 1 && (
            <button type="submit" className="btn btn-primary" disabled={!canNext}>
              Continue
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
