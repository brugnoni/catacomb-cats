# Game health audit: Catacomb Cats

Date: 2026-11-24. Read-only: no code changed. Scope: design (economy, progression, difficulty, mechanics, enemies) and code risks. No human playtest, no FPS or bundle review. Historical record: several findings were addressed later.

## Summary

The engine is solid and well tested (37 balance, progression and expedition tests pass). The problem is **design**: the game is completed in about 11–14 victories, almost all the challenge is in the boss, and real difficulty is above the documented target. Before adding content, decide where progression ends, add pressure to rooms 1–2 and protect the save.

## Measured data

Simulator `src/sim.ts`, medium bot, 16 seeds × 10 parties, tier from `playerAfter`; optimal bot, 4 seeds.

| Victories | Tier | Medium | HP after room 1 / 2 | Losses (room 1/2/boss) |
| --------- | ---- | ------ | ------------------- | ---------------------- |
| 0         | 0    | 92%    | 97 / 81             | 0 / 0 / 13             |
| 1         | 2    | 83%    | 98 / 80             | 0 / 0 / 27             |
| 2         | 4    | 88%    | 98 / 82             | 0 / 0 / 19             |
| 3         | 5    | 89%    | 97 / 80             | 0 / 2 / 16             |
| 4         | 6    | 98%    | 98 / 85             | 0 / 0 / 3              |
| 6         | 8    | 98%    | 96 / 85             | 0 / 0 / 4              |
| 9 and 12  | 9    | 98%    | 99 / 86             | 0 / 0 / 3              |

Optimal bot: 100% at every stage, with 96–100% HP after room 1 and 92–97% after room 2.

Economy (computed from `progression.ts` and `expeditions.ts`):

- Training per cat: 170 / 370 / 650 gold up to rank 4 / 6 / 8. Hearth: 200 / 420 / 720.
- Buying everything (5 cats + Hearth) = 3,970 gold; only the 3 best cats + Hearth = 2,670.
- Gold per victory: 180 / 270 / 360 (×1 / 1.5 / 2). Fastest route: 3 Catacombs + 5 Warrens + 6 Vault victories = **14** (11 if only 3 cats are upgraded). Mastery 10 (1,500 XP) arrives with the first Vault victory.
- Power at cap: 20 / 31 / 42, that is tier 6 / 10 / 14 (enemy HP ×1.78 / ×2.30 / ×2.82; power +3 / +5 / +7).

## Findings (by priority)

### High

1. **No endgame.** After about 11–14 victories everything is bought: gold and XP have no use, Power caps at 42 and there is no more content. Decide first whether progression should last longer or new content is the endgame.
2. **The save can be lost silently** (`src/engine/save.ts`, `parseProgress`). Any invalid field returns `initialProgress()` and the next `storeProgress` (`App.tsx`) overwrites the real save. Cases: renaming an item in `ITEMS`, gold > 1,000,000, a change of save shape. No backup or export/import (already noted in `HANDOFF.md`). Minimum: keep the old JSON under another key before resetting.
3. **Measured difficulty beats the target.** Documented target: medium 75–85%, optimal 92–97%. Measured: medium 83–98% (98% from victory 4) and optimal 100%. With attentive play the game is almost impossible to lose.
4. **Rooms 1 and 2 apply no pressure; all the risk is in the boss.** In 1,280 medium-bot games: 0 losses in room 1, 2 in room 2 and 88 in the boss. Rooms cost about 3% and 15–20% HP, then 33% is healed. Tension is flat until the boss.

### Medium

5. **Uneven parties.** At 0 victories `luna+clover+ember` wins 31% against 100% for most; `pip+clover+ember` 50–56% at victories 1–3. Per `outputs/BALANCE_REPORT.md`, without a healer Warrens and Vault are almost always lost (0%). Luna is in nearly every strong party; Miso contributes little.
6. **Power raises the tier, cancelling part of each purchase.** `tier = floor(Power/3)` with +13% HP and +1 power every 2 tiers: buying 3 Power raises enemies one tier. Catacombs at cap (tier 6) is won about 100%, so the penalty is invisible there, but it blurs the sense of improvement and explains the Catacombs → Warrens jump (known limit: about 71% with the previous cap, not under 30%).
7. **The simulator has blind spots.** `playerAfter` only adds Catacombs victories: stages 9 and 12 give identical results (tier 9) and never measure Warrens or Vault; only `playerAtCap` covers that, with 3 parties. It also simulates no crits, misses (5%) or evasion (up to 12%), so real variance is higher. The comment in `sim.ts` ("90 gold") is stale: it is 180.
8. **Little variety in enemies and routes.** The same 6 enemy types in all 3 Expeditions, with a single attack skill; behavior depends on `actor.name` and `round % 3` (`enemyAI.ts`), and setup by name in `units.ts`. Reinforcements (tier 10+) are fixed (Cave bat / Bone squire). Each route is 3 fixed rooms with no choices between them, although the log says "Choose your next descent". Low replayability.
9. **The item system is exhausted by the first victory.** There are 3 items, one per room (`ITEMS[run.room]` in `state.ts`); after one win you own them all. One per cat, with small effects (+6 HP, +3 initiative, +1 attack).
10. **Rewards are lost if you close the tab on the victory screen.** "Return to lobby" is what banks gold and XP (`leave()` in `App.tsx`); 180–360 gold of a full Run depend on that click. A documented design decision, but a loss risk; banking when the boss falls is enough.

### Low

11. **Two tabs overwrite each other's save** (no `storage` event).
12. **Stale documentation:** `HANDOFF.md` says +12% HP per tier and 71 + 21 tests; the code uses 13% (`DIFFICULTY_TUNING`).
13. **`game.test.ts` is 1,698 lines.** Well covered but hard to navigate; split by topic when adding content.

## Proposed difficulty target

Casual with spikes of challenge, measured with the medium bot per Expedition **at its Rank cap**:

- Medium: 70–80% per Expedition (today 100% in Catacombs, about 58–60% in Warrens and Vault with 3 parties).
- Optimal: 90–95% (today 100%).
- Room 1: 85–90% HP left; room 2: 60–70%; boss: most losses, but not all (today about 100%, 0 in rooms 1–2).
- Any 3-cat party, even without a healer, at least 50% at its route's cap.

## Suggested backlog before adding content

1. Save: backup before reset and export/import (findings 2, 10).
2. Decide progression length and the use of spare gold and XP (findings 1, 6).
3. Add pressure to rooms 1–2 and recalibrate the boss (findings 3, 4), measured with the simulator.
4. Extend the simulator: victories per Expedition, 5 more parties, and a crit/miss mode (finding 7).
5. Balance Miso, Tuntun and Pursian against Luna plus healer (finding 5).
6. Enemy data (skills and patterns as data, not by name) before creating new enemies (finding 8).
7. Redesign items or add per-Run choices (finding 9).

## Addendum (same day): real luck and a competent player

The tables above use crits and misses off and a greedy bot. Repeated with crits and misses on (as in the real game) and a width-3 planner (12 seeds, 10 parties):

- Every setup gives 97–100% victories: starting Catacombs, Catacombs at cap, Warrens at cap (97%) and Vault at cap (100%). The spread between parties is at most 7 points.
- With luck off, the same bot wins 78% in Warrens with a 39-point spread: parties with Pursian and without Luna fell to 0–13%. Much of the party imbalance (finding 5) came from luck off and the greedy bot, not the real design.
- What does persist: turns without action per cat (Miso about 52%, Mei about 47%, Tuntun about 52% with the competent bot; Luna 11%, Pursian 3%), and very low absolute difficulty for an attentive player (finding 3 confirmed).
- The AP-saving model was dropped (no benefit; fights 13% longer).
- Win rates with luck off are nearly all or nothing (a party wins or loses by threshold), so they cannot compare parties precisely; use luck on and 12+ seeds.

## Not verified

- No human or UX playtest (clarity, pace, pause lengths).
- Optimal with 4 seeds and only 4 stages; the previous report's Warrens/Vault table was not re-measured, only its tests were checked to pass.
- `Lobby.tsx`, `Battle.tsx`, `Faq.tsx` and `i18n` were not read; test coverage of `parseProgress` with corrupt saves was not audited.
- No FPS, load or asset size review.
