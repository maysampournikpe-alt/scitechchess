/**
 * Spaced repetition. A simplified SM-2 scheduler (Wozniak, 1990): each successful review
 * multiplies the interval by the card's ease; a failure resets the interval and lowers the
 * ease, so difficult and forgotten items come back sooner and more often.
 */
export type CardKind = "puzzle" | "opening" | "endgame" | "concept";

export type Card = {
  id: string;
  kind: CardKind;
  /** Concept this card belongs to (puzzle theme, opening line, endgame technique). */
  concept: string;
  label: string;
  /** Where to practise it. */
  href: string;
  due: number;
  /** Current interval in days. */
  interval: number;
  ease: number;
  reps: number;
  lapses: number;
  created: number;
  lastReviewed: number | null;
};

export type Grade = "fail" | "hard" | "good";

const DAY = 86_400_000;
export const FIRST_INTERVALS = [1, 3];

export function newCard(init: Pick<Card, "id" | "kind" | "concept" | "label" | "href">, now: number, firstDueInDays = 1): Card {
  return { ...init, due: now + firstDueInDays * DAY, interval: 0, ease: 2.5, reps: 0, lapses: 0, created: now, lastReviewed: null };
}

export function review(card: Card, grade: Grade, now: number): Card {
  if (grade === "fail") {
    return { ...card, reps: 0, lapses: card.lapses + 1, ease: Math.max(1.3, card.ease - 0.2), interval: 1, due: now + DAY, lastReviewed: now };
  }
  const ease = grade === "hard" ? Math.max(1.3, card.ease - 0.15) : card.ease;
  let interval: number;
  if (card.reps < FIRST_INTERVALS.length) interval = FIRST_INTERVALS[card.reps];
  else interval = Math.round(card.interval * (grade === "hard" ? 1.2 : ease));
  interval = Math.max(1, Math.min(interval, 365));
  return { ...card, ease, reps: card.reps + 1, interval, due: now + interval * DAY, lastReviewed: now };
}

/** Cards due now, most overdue and most-lapsed first. */
export function dueCards(cards: Card[], now: number): Card[] {
  return cards
    .filter((c) => c.due <= now)
    .sort((a, b) => b.lapses - a.lapses || a.due - b.due);
}
