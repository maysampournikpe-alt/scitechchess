---
name: chess-learning-integrity
description: Use when changing how ChessMastery scores attempts, updates skills, decides mastery, schedules reviews, builds plans or writes any progress text, chart or report. Lists the invariants that keep every number honest (no invented ratings, no fake progress, hints never count as solo) and the tests that pin them.
---

# Learning integrity

Users trust the dashboard to tell them the truth about their chess. These invariants are
enforced by tests; keep them when you change anything in `src/lib/learning/` or the store.

## Invariants

1. **Training scores are not ratings.** Scores use the Lichess puzzle-difficulty scale and
   Glicko-1 (`skills.ts`). Never label one as FIDE, US Chess, Chess.com or Lichess, and never
   convert a bot result into Elo. Bot levels are engine settings, not calibrated strengths.
2. **Uncertainty is always shown.** Any displayed score carries its range (score ± 2·RD) or
   its confidence, and RD grows while a skill is not practised.
3. **Help is never credited as independent success.** `outcome` is `solo` only with no hint
   and no wrong try; `assisted` with one hint scores 0.5, more hints score 0
   (`attemptResult`). A wrong try is `failed` even if the puzzle is finished later.
4. **Mastery needs new positions and a delay.** `demonstrated` = 3 unassisted first-time
   solves of different items and 4 of the last 5 first-time attempts clean; `retention
   verified` = another clean solve ≥ 3 days later. Repeats of a seen item never count
   (`firstSeen`). Watching a video or opening a lesson only reaches `introduced`.
5. **Every sentence in a report cites counts from the attempt log.** `buildReport` refuses to
   diagnose with fewer than 4 attempts per skill and says the ordering is provisional when
   ranges overlap.
6. **Every plan block says why**, using the learner's own numbers (`priorities()`).
7. **Charts plot recorded data only.** Accuracy charts use first-time attempts and leave out
   weeks with fewer than 3; no smoothing, no projections.
8. **Anything not solved cleanly becomes a review card**; a clean solve of a due card pushes
   it further out (SM-2 in `srs.ts`).

## Tests that pin these

`tests/learning.test.ts` (scores, SRS, mastery, plan, report, weekly stats),
`tests/store.test.ts` (recording, review cards, persistence, export/import, delete),
`e2e/foundation.spec.ts` (hinted solve stored as `assisted` and scheduled).

## Checklist for a change

- Does any new text state a number? Trace it to the attempt log or a skill state.
- Could a learner reach a higher state by repeating one position or by using hints? Add a test
  that they cannot.
- Does a new module record attempts with the right `skill`, `concept`, `difficulty` and
  `itemRd` (80 for database puzzles, 150–250 for authored items)?
