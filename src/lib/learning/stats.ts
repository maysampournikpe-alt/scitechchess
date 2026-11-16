import type { Attempt } from "./mastery";

const WEEK = 7 * 86_400_000;

/** Monday 00:00 (local time) of the week containing t. */
export function weekStart(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

export type WeekStat = { start: number; attempts: number; firstTime: number; firstTimeSolo: number; minutes: number };

/** The last `weeks` weeks, oldest first, including empty weeks. Only first-time attempts count toward accuracy, so repeats cannot inflate it. */
export function weeklyStats(attempts: Attempt[], now: number, weeks = 8, filter: (a: Attempt) => boolean = () => true): WeekStat[] {
  const first = weekStart(now) - (weeks - 1) * WEEK;
  const out: WeekStat[] = Array.from({ length: weeks }, (_, i) => ({ start: first + i * WEEK, attempts: 0, firstTime: 0, firstTimeSolo: 0, minutes: 0 }));
  for (const a of attempts) {
    if (!filter(a) || a.t < first) continue;
    const w = out[Math.min(weeks - 1, Math.floor((weekStart(a.t) - first) / WEEK))];
    w.attempts += 1;
    w.minutes += Math.min(a.ms, 600_000) / 60_000;
    if (a.firstSeen) {
      w.firstTime += 1;
      if (a.outcome === "solo") w.firstTimeSolo += 1;
    }
  }
  for (const w of out) w.minutes = Math.round(w.minutes);
  return out;
}
