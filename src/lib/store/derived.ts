"use client";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "./store";
import { dueCards } from "@/lib/learning/srs";
import { conceptLabel, recurringMisses } from "@/lib/learning/report";
import type { PlanInput } from "@/lib/learning/plan";

/** Current time, read after mount so server-rendered and client HTML agree. */
export function useNow(): number {
  const [now, setNow] = useState(0);
  useEffect(() => setNow(Date.now()), []);
  return now;
}

export function conceptHref(concept: string): string {
  const [kind, id] = concept.split(":");
  if (kind === "theme") return `/puzzles/?theme=${id}`;
  if (kind === "opening") return `/openings/?id=${id}`;
  if (kind === "endgame") return `/endgames/?id=${id}`;
  if (kind === "plan") return `/middlegame/?id=${id}`;
  if (kind === "vision") return "/vision/";
  return "/train/";
}

/** Everything the plan generator needs, taken from saved progress. Null until there is a profile. */
export function usePlanInput(): PlanInput | null {
  const profile = useStore((s) => s.profile);
  const skills = useStore((s) => s.skills);
  const attempts = useStore((s) => s.attempts);
  const cards = useStore((s) => s.cards);
  const now = useNow();
  return useMemo(() => {
    if (!profile || !now) return null;
    const recurring = recurringMisses(attempts, now).map((s) => ({ label: conceptLabel(s.concept), href: conceptHref(s.concept), skill: s.skill, misses: s.attempts - s.solo, of: s.attempts }));
    return { profile, skills, dueReviews: dueCards(Object.values(cards), now).length, recurring, now };
  }, [profile, skills, attempts, cards, now]);
}
