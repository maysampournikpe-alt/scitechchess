"use client";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader, Ready } from "@/components/ui";
import { PuzzlePlayer } from "@/components/PuzzlePlayer";
import { loadPuzzles } from "@/lib/data";
import type { Puzzle } from "@/lib/chess/puzzle";
import { pickPuzzle, THEMES, THEME_BY_ID } from "@/lib/learning/select";
import { useStore } from "@/lib/store/store";
import type { Attempt } from "@/lib/learning/mastery";

function Trainer() {
  const params = useSearchParams();
  const router = useRouter();
  const theme = params.get("theme") ?? "";
  const mode = params.get("mode") ?? "";
  const id = params.get("id");
  const skills = useStore((s) => s.skills);
  const [all, setAll] = useState<Puzzle[] | null>(null);
  const [error, setError] = useState("");
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [session, setSession] = useState({ done: 0, solo: 0, streak: 0, best: 0 });

  useEffect(() => {
    loadPuzzles().then(setAll, (e) => setError(String(e.message ?? e)));
  }, []);

  const skillId = THEME_BY_ID[theme]?.skill ?? "tactics";
  const next = useCallback(() => {
    if (!all) return;
    const s = useStore.getState();
    const score = s.skills[skillId].score;
    // Warm-up puzzles sit clearly below the learner's level; adaptive ones at it.
    const target = mode === "warmup" ? score - 250 : mode === "hard" ? score + 200 : score;
    const exclude = new Set(Object.keys(s.seen).filter((k) => k.startsWith("puzzle:")).map((k) => k.slice(7)));
    setPuzzle(pickPuzzle(all, { target, theme: theme || undefined, exclude }));
  }, [all, theme, mode, skillId]);

  useEffect(() => {
    if (!all) return;
    if (id) {
      const found = all.find((p) => p.id === id);
      if (found) return setPuzzle(found);
    }
    next();
  }, [all, id, next]);

  const onDone = useCallback((outcome: Attempt["outcome"]) => {
    setSession((s) => {
      const streak = outcome === "solo" ? s.streak + 1 : 0;
      return { done: s.done + 1, solo: s.solo + (outcome === "solo" ? 1 : 0), streak, best: Math.max(s.best, streak) };
    });
  }, []);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of all ?? []) for (const t of p.themes) m.set(t, (m.get(t) ?? 0) + 1);
    return m;
  }, [all]);

  function goNext() {
    if (id) router.replace(theme ? `/puzzles/?theme=${theme}` : "/puzzles/");
    else next();
  }

  return (
    <>
      <PageHeader
        title={mode === "warmup" ? "Tactical warm-up" : theme ? (THEME_BY_ID[theme]?.label ?? theme) : "Adaptive puzzles"}
        lead={
          mode === "warmup"
            ? "Easier puzzles, chosen below your level, to get patterns flowing before the main work."
            : "Each puzzle is picked near your current score for this kind of position. Solve it on the first try and the next one gets harder."
        }
      >
        <div>
          <label htmlFor="theme" className="mb-1 block text-sm text-muted">
            Theme
          </label>
          <select id="theme" className="input" value={theme} onChange={(e) => router.replace(e.target.value ? `/puzzles/?theme=${e.target.value}` : "/puzzles/")}>
            <option value="">All themes (adaptive)</option>
            {THEMES.filter((t) => (counts.get(t.id) ?? 0) > 0).map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} ({counts.get(t.id)})
              </option>
            ))}
          </select>
        </div>
      </PageHeader>

      <p className="num mb-4 text-sm text-muted" aria-live="polite">
        This session: {session.done} done, {session.solo} without help, streak {session.streak} (best {session.best}). Your {skillId === "tactics" ? "tactics" : skillId} score: {Math.round(skills[skillId].score)}.
      </p>

      {error && (
        <div className="card p-5" role="alert">
          <p>The puzzles could not be loaded: {error}</p>
          <button className="btn mt-3" onClick={() => location.reload()}>
            Try again
          </button>
        </div>
      )}
      {!all && !error && (
        <div className="card p-6 text-muted" role="status">
          Loading puzzles…
        </div>
      )}
      {all && !puzzle && <div className="card p-6">No puzzles match this theme. Choose another theme above.</div>}
      {puzzle && <PuzzlePlayer key={puzzle.id} puzzle={puzzle} theme={theme || undefined} onDone={onDone} onNext={goNext} />}
    </>
  );
}

export default function PuzzlesPage() {
  return (
    <Ready>
      <Suspense>
        <Trainer />
      </Suspense>
    </Ready>
  );
}
