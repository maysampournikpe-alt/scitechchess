"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { attemptResult, type Attempt } from "@/lib/learning/mastery";
import { EXPERIENCE_PRIOR, newSkill, SKILLS, update, type SkillId, type SkillState } from "@/lib/learning/skills";
import { newCard, review, type Card } from "@/lib/learning/srs";
import type { Profile } from "@/lib/learning/plan";

/**
 * All progress lives in the browser (localStorage), so the app works with no account and no
 * server. Nothing leaves the device unless the learner exports it.
 */
export type GameRecord = {
  id: string;
  t: number;
  pgn: string;
  level: number;
  color: "w" | "b";
  result: "win" | "draw" | "loss";
  /** Filled in after the game has been analysed. */
  summary?: { moves: number; inaccuracies: number; mistakes: number; blunders: number; avgLoss: number };
};

export type SavedPosition = { id: string; fen: string; note: string; t: number; best?: string };
export type JournalEntry = { id: string; t: number; text: string };
export type Settings = { theme: "dark" | "light"; board: "blue" | "green" | "wood"; lichessToken: string; sound: boolean; engineDepth: number; explain: "simple" | "intermediate" | "advanced" };

export type NewAttempt = Omit<Attempt, "t" | "firstSeen"> & {
  /** Uncertainty of the item's difficulty: 80 for database puzzles, 200 for authored items. */
  itemRd?: number;
  /** Label and link used if this attempt creates a review card. */
  card?: { label: string; href: string; kind: Card["kind"] };
  /** Whole games are not review cards; their mistakes are saved as separate positions instead. */
  noCard?: boolean;
};

type State = {
  hydrated: boolean;
  profile: Profile | null;
  skills: Record<SkillId, SkillState>;
  attempts: Attempt[];
  seen: Record<string, number>;
  cards: Record<string, Card>;
  introduced: string[];
  games: GameRecord[];
  positions: SavedPosition[];
  journal: JournalEntry[];
  repertoire: string[];
  assessmentDoneAt: number | null;
  settings: Settings;
};

type Actions = {
  setProfile(p: Profile): void;
  record(a: NewAttempt): Attempt;
  introduce(concept: string): void;
  addCard(c: Pick<Card, "id" | "kind" | "concept" | "label" | "href">): void;
  removeCard(id: string): void;
  saveGame(g: GameRecord): void;
  savePosition(p: Omit<SavedPosition, "id" | "t">): string;
  removePosition(id: string): void;
  addJournal(text: string): void;
  toggleRepertoire(id: string): void;
  setAssessmentDone(): void;
  setSettings(s: Partial<Settings>): void;
  exportData(): string;
  importData(json: string): boolean;
  reset(): void;
};

const MAX_ATTEMPTS = 6000;
const freshSkills = (prior = 1200) => Object.fromEntries(SKILLS.map((s) => [s.id, newSkill(prior)])) as Record<SkillId, SkillState>;

const initial: State = {
  hydrated: false,
  profile: null,
  skills: freshSkills(),
  attempts: [],
  seen: {},
  cards: {},
  introduced: [],
  games: [],
  positions: [],
  journal: [],
  repertoire: [],
  assessmentDoneAt: null,
  settings: { theme: "dark", board: "blue", lichessToken: "", sound: true, engineDepth: 14, explain: "simple" },
};

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initial,

      setProfile(p) {
        const hadData = get().attempts.length > 0;
        set({ profile: p, skills: hadData ? get().skills : freshSkills(EXPERIENCE_PRIOR[p.experience] ?? 1200) });
      },

      record(a) {
        const now = Date.now();
        const s = get();
        const { itemRd, card, noCard, ...rest } = a;
        const attempt: Attempt = { ...rest, t: now, firstSeen: !(a.itemId in s.seen) };
        const skills = { ...s.skills, [a.skill]: update(s.skills[a.skill], a.difficulty, attemptResult(attempt), now, itemRd ?? 80) };

        // Spaced repetition: anything not solved cleanly becomes (or stays) a review card;
        // a clean solve of an existing card pushes its next review further out.
        const cards = { ...s.cards };
        const existing = cards[a.itemId];
        if (noCard) {
          /* no review card for this kind of attempt */
        } else if (attempt.outcome !== "solo") {
          cards[a.itemId] = existing
            ? review(existing, "fail", now)
            : newCard({ id: a.itemId, kind: card?.kind ?? "concept", concept: a.concept, label: card?.label ?? a.concept, href: card?.href ?? "/train/" }, now);
        } else if (existing && existing.due <= now) {
          cards[a.itemId] = review(existing, "good", now);
        }

        set({ skills, cards, attempts: [...s.attempts, attempt].slice(-MAX_ATTEMPTS), seen: { ...s.seen, [a.itemId]: now } });
        return attempt;
      },

      introduce(concept) {
        if (!get().introduced.includes(concept)) set({ introduced: [...get().introduced, concept] });
      },
      addCard(c) {
        if (!get().cards[c.id]) set({ cards: { ...get().cards, [c.id]: newCard(c, Date.now()) } });
      },
      removeCard(id) {
        const cards = { ...get().cards };
        delete cards[id];
        set({ cards });
      },
      saveGame(g) {
        set({ games: [...get().games.filter((x) => x.id !== g.id), g].slice(-200) });
      },
      savePosition(p) {
        const existing = get().positions.find((x) => x.fen === p.fen);
        if (existing) return existing.id;
        const id = uid();
        set({ positions: [...get().positions, { ...p, id, t: Date.now() }].slice(-500) });
        return id;
      },
      removePosition(id) {
        set({ positions: get().positions.filter((p) => p.id !== id) });
      },
      addJournal(text) {
        set({ journal: [...get().journal, { id: uid(), t: Date.now(), text }].slice(-1000) });
      },
      toggleRepertoire(id) {
        const r = get().repertoire;
        set({ repertoire: r.includes(id) ? r.filter((x) => x !== id) : [...r, id] });
      },
      setAssessmentDone() {
        set({ assessmentDoneAt: Date.now() });
      },
      setSettings(s) {
        set({ settings: { ...get().settings, ...s } });
      },
      exportData() {
        const { hydrated: _h, ...rest } = get();
        void _h;
        const data = Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== "function"));
        // The Lichess token is a credential: it never goes into a backup file.
        data.settings = { ...(data.settings as Settings), lichessToken: "" };
        return JSON.stringify({ app: "chessmastery-ai", version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
      },
      importData(json) {
        try {
          const parsed = JSON.parse(json);
          const d = parsed?.data;
          if (parsed?.app !== "chessmastery-ai" || typeof d !== "object" || !d || !Array.isArray(d.attempts) || typeof d.skills !== "object" || !d.skills) return false;
          // Every record must have the fields the pages read; a damaged file is refused as a whole.
          const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
          const str = (v: unknown) => typeof v === "string";
          const okAttempt = (a: Attempt) => a && num(a.t) && str(a.itemId) && str(a.skill) && str(a.concept) && num(a.difficulty) && ["solo", "assisted", "failed"].includes(a.outcome) && num(a.hints) && num(a.ms) && typeof a.firstSeen === "boolean" && (a.context === undefined || str(a.context));
          const okSkill = (k: SkillState) => k && num(k.score) && num(k.rd) && k.rd > 0 && num(k.n) && Array.isArray(k.history);
          const okCard = (c: Card) => c && str(c.id) && str(c.label) && str(c.href) && c.href.startsWith("/") && num(c.due) && num(c.interval) && num(c.ease);
          if (!d.attempts.every(okAttempt)) return false;
          if (!Object.values(d.skills as Record<string, SkillState>).every(okSkill)) return false;
          if (d.cards !== undefined && (typeof d.cards !== "object" || !Object.values(d.cards as Record<string, Card>).every(okCard))) return false;
          for (const k of ["games", "positions", "journal", "introduced", "repertoire"]) if (d[k] !== undefined && !Array.isArray(d[k])) return false;
          // Only known keys are taken from the file; anything else in it is ignored.
          const next: Partial<State> = {};
          for (const key of Object.keys(initial) as (keyof State)[]) if (key !== "hydrated" && key in d) (next as Record<string, unknown>)[key] = d[key];
          set({ ...next, skills: { ...freshSkills(), ...(d.skills as Record<SkillId, SkillState>) } });
          return true;
        } catch {
          return false;
        }
      },
      reset() {
        set({ ...initial, hydrated: true });
      },
    }),
    {
      name: "chessmastery-v1",
      version: 1,
      skipHydration: true,
      partialize: (s) => Object.fromEntries(Object.entries(s).filter(([k, v]) => k !== "hydrated" && typeof v !== "function")),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return { ...current, ...p, skills: { ...current.skills, ...(p.skills ?? {}) }, settings: { ...current.settings, ...(p.settings ?? {}) } };
      },
      onRehydrateStorage: () => () => useStore.setState({ hydrated: true }),
    },
  ),
);
