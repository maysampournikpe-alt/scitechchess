# ChessMastery AI: architecture, costs and status

## Design decisions

**Static, browser-only.** The app is a Next.js static export. Stockfish 19 (lite,
single-threaded WebAssembly, 1.9 MB, loaded only on pages that need it) runs in a Web Worker,
so analysis never blocks the page. Progress lives in `localStorage`; export, import and
delete are in Settings. This is what makes it free to run for any number of users.

**Every chess statement is computed or tested.** Feedback sentences are assembled from
facts computed with chess.js (`src/lib/chess/features.ts`) and engine lines. Authored lessons
are verified by `tests/content.test.ts`: lines must be legal and match the Lichess opening
names; endgame results and "only move" claims are checked by Stockfish; specific sentences
in the text have board assertions. Endgame practice uses the Lichess tablebase when it can
be reached and labels engine-only verdicts as such.

**Scores are training scores, not ratings.** Skills use Glicko-1 on the Lichess
puzzle-difficulty scale with a visible ± 2·RD range. Bot levels are engine settings
(`UCI_Elo` 1320–2200 and three weaker levels) and are not converted into ratings.
Move quality uses our own documented thresholds on expected-score loss
(`src/lib/engine/classify.ts`).

**Mastery needs evidence.** Not started → introduced → practicing → demonstrated →
retention verified → needs review, with the rules in `src/lib/learning/mastery.ts`. Hints and
wrong tries are recorded separately and never count as independent solves.

**Rule-based coach.** The coach answers a fixed set of questions from the learner's own
data. No language model is called, so there are no API costs and no invented variations.

## Data sources

| Data | Source | Licence | Notes |
|---|---|---|---|
| Puzzles | A selection from the full Lichess puzzle database (6.19M puzzles): popularity ≥ 85, ≥ 1,000 plays, rating deviation ≤ 80; a reproducible spread of up to 600 per 100-point rating band plus at least 150 per trained theme; every puzzle re-checked with chess.js. Built by `scripts/build-puzzles.mjs` (`PUZZLES_DOWNLOAD=1`). | CC0 | The download and filtering take about 7 minutes, so it is run on demand, not on every deploy. |
| Opening names | lichess-org/chess-openings, 3,865 lines | CC0 | Names and moves only; no game statistics. |
| Endgame results | tablebase.lichess.ovh | Free public API | Queried live, ≤ 7 pieces, falls back to Stockfish. |
| Opening statistics | explorer.lichess.ovh | Free, but requires a Lichess API token since 2025 | The learner pastes their own token in Settings; it is sent only to the explorer and never exported. Untested against the live service from the build environment, which has no token. |
| Videos | Candidates in `src/content/video-candidates.ts`, found by web search | Embedded through YouTube's own player | `scripts/verify-videos.mjs` checks every ID with YouTube's oEmbed during the Vercel build and publishes only confirmed videos, with YouTube's own title and channel. |
| Engine | Stockfish 19 via stockfish.js | GPL-3.0 | Licence served at `/engine/COPYING.txt`. |
| Board | Chessground (Lichess) | GPL-3.0-or-later | The reason the whole app is GPL. |

## Running costs

| Item | Cost | Limit |
|---|---|---|
| Hosting the static site (about 5 MB in total, of which the engine is 1.9 MB and the puzzle and opening data 0.9 MB) | Free on GitHub Pages, Cloudflare Pages or Netlify free tiers | Bandwidth caps of those tiers (Cloudflare Pages: unlimited requests; GitHub Pages: about 100 GB/month soft limit) |
| Engine analysis, bot games, reviews | Free: runs on the user's device | Slow on very old phones; depth is adjustable in Settings |
| Tablebase lookups | Free public Lichess API | Rate-limited per IP; the app falls back to Stockfish |
| Optional cloud sync (Supabase, schema in `supabase/`) | Free tier: 500 MB database, 50k monthly active users | Beyond that, about $25/month. Not enabled. |
| An LLM coach | Not used | Would cost per question; deliberately left out |
| Opening explorer with game statistics (Lichess explorer API) | Free API | Rate-limited; unlimited scale would need a self-hosted explorer, which needs a server and funding |

## Skills used while building

| Skill | Used for | Evidence |
|---|---|---|
| superpowers: writing-plans, test-driven development, verification | Plan, test-first core logic, no claim without a passing test | 116 unit tests, 28 browser tests |
| frontend-design | Visual direction: navy and brass palette, Fraunces + Figtree, one hero board instead of a stat block | `src/app/globals.css`, `src/app/page.tsx` |
| ui-ux-pro-max | Generated a design-system recommendation; its "claymorphism, Comic Neue, no dark mode" output was rejected because the brief asks for dark navy and a serious tone; its checklist (focus states, 44px targets, reduced motion, 375px layouts) was applied | `docs/design/ui-ux-pro-max-output.txt` |
| webapp-testing, Playwright | Browser tests on desktop and a Pixel 7 profile, plus screenshots during design | `e2e/` |
| react-best-practices | Engine and data loaded lazily; static pages; no client data fetching except the two JSON files | `src/lib/data.ts`, `src/lib/engine/browser.ts` |
| web-design-guidelines | Labels, focus, skip link, live regions, typed-move input as the keyboard path for the board | `src/components/Board.tsx` |
| dataviz | Single-series charts, colour validated with its script (`#5b93f0` dark, `#1d5ccc` light), tooltips, table view | `src/app/progress/page.tsx` |
| supabase-postgres-best-practices | RLS on every table, `(select auth.uid())`, indexed `user_id`, identity keys, `timestamptz` | `supabase/migrations/0001_training_sync.sql`, isolation test passes on Postgres 16 |
| skill-creator | Two project skills: content verification and learning integrity | `.claude/skills/` |
| differential-review | Not run as a full workflow (there is no auth or server code yet); a manual review covered PGN and file import (size limits, parse errors, known keys only) | see Status |

## Status

Working and tested: onboarding; assessment (22 tasks across six skills, adaptive tactics);
skill profile with ranges; daily and weekly plans with reasons; adaptive and themed puzzles
with four-step hints; calculation mode with blindfold option; board-vision drills; 19 opening
lessons with guided and from-memory drills, idea questions, repertoire and name lookup;
6 middlegame plan exercises and structure notes; 10 endgame lessons with find-the-move and
play-out against Stockfish; bot games with nine levels, custom FEN, clock and draw claims;
game review that turns your worst moves into exercises; blunder-check trainer on real game positions; conversion trainer (winning positions played out against full-strength Stockfish); three annotated model games with replay and guess-the-move; Weakness DNA (recurring error patterns with their evidence); tournament preparation by days to the event; move sounds and three board colour sets; PGN import; analysis board;
mistakes queue with spaced repetition; progress charts, mastery map and journal; coach;
settings with export, import and delete; light and dark themes.

Not done yet:
- No accounts or sync (schema ready, not wired).
- Only three model games.
- Internationalisation: texts are in English inside components; no i18n layer yet.
- Accessibility: the board supports arrow-key navigation, Enter to move, typed moves and a
  spoken position description; no automated axe audit has been run.
- Three Vercel projects are linked to this repository and all build every push.
