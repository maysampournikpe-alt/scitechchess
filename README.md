# ChessMastery AI

A free chess training site that adapts to the learner: an assessment, a daily plan built from
measured results, adaptive puzzles, opening, middlegame and endgame lessons with real board
practice, games against Stockfish with move-by-move review, and spaced review of every mistake.

There is no multiplayer, no account, no paid tier and no server. Everything runs in the
browser and progress is saved on the device.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm test           # 110 unit, content and engine tests (Vitest)
npm run build      # static site in out/
npm run e2e        # 20 browser tests on desktop and phone (Playwright), after a build
```

`out/` can be served by any static host (GitHub Pages, Cloudflare Pages, Netlify). The
engine files need the `application/wasm` MIME type, which all of these send.

## Where things are

| Path | What |
|---|---|
| `src/lib/chess/` | Rules helpers, puzzle runner, position facts used for feedback text, tablebase client |
| `src/lib/engine/` | UCI client, move classification, bot levels, game review |
| `src/lib/learning/` | Skill scores (Glicko-1), spaced repetition, mastery rules, plans, reports, coach |
| `src/lib/store/` | Local progress store (localStorage), export, import, delete |
| `src/content/` | Opening, endgame and middlegame lessons (all checked by tests) |
| `src/app/` | One folder per page |
| `supabase/` | Optional cloud-sync schema with row-level security, and its isolation test (not used yet) |
| `docs/ARCHITECTURE.md` | Design, data sources, running costs, what is finished and what is not |

## Licence

GPL-3.0-or-later, because it ships Stockfish and Chessground, which are GPL. Data: Lichess
puzzle and opening-name databases (CC0). See Settings → Licences in the app.
