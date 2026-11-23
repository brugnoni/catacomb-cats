# Balance report

Measured with `src/sim.ts` (two bots, all ten teams, seeded) and checked by `src/balance.test.ts`.
Reproduce a sweep (results go to a file; vitest hides console output):

```
BALANCE_REPORT=1 SIM_OUT=report.txt SIM_SEEDS=16 SIM_STAGES=0,2,4,6,9,12 SIM_BOTS=medium \
  pnpm exec vitest run src/sim.test.ts -t medium
```

## Bots

- **Medium**: attentive casual player. Revives, heals below 60% HP, shields the cat the strongest enemy has marked, blesses, then spends AP on the best damage per AP. Target: **75-85%** wins.
- **Optimal**: beam search over the rest of each round using the deterministic engine (crits off). Target: **92-97%**.
- `playerAfter(wins, team)` builds a typical save: 180 gold and 135 XP per victory, spent round-robin on the team's training, then the Hearth up to half the training rank.

## Before (initial balance)

| Stage (wins) | Tier | Medium win rate | Notes                                                   |
| ------------ | ---- | --------------- | ------------------------------------------------------- |
| 0            | 0    | 100%            | trivial, 14 rounds, almost no deaths                    |
| 1-3          | 1-3  | 99-100%         | trivial                                                 |
| 3            | 5    | 55%             | cliff: tier 5 added a reinforcement to every room       |
| 6            | 10   | 26%             | second reinforcement; difficulty grew faster than power |
| 12           | 12   | 72%             | teams without a healer 0-15%                            |

Optimal bot: 100% everywhere with about 96% HP left, so the game had no pressure at all. All losses happened in the boss room.

## Findings

1. Difficulty counted wins, gold spent and mastery: it double-counted power and rose about 2-3 tiers per victory while the player grew slower, producing the cliff and hard-stuck runs.
2. Tier 0-4 enemies were too weak, tier 5+ reinforcements were a discrete +33% enemy count.
3. The boss room was the only real check (every loss), while rooms 1-2 cost under 10% HP.
4. Team strength varied from 0% to 100%: the healer and Luna's AP skill carried; Miso was the weakest cat.
5. Room recovery (flat 8 HP) was the single biggest lever for teams without sustain.

## Changes

- **Difficulty follows Power**, the permanent power bought: ranks of the three best cats + Hearth + mastery level. One tier per 3 Power, up to tier 14 (full power). Wins, gold and losing never change it. Constants in `DIFFICULTY_TUNING`.
- Per tier: +12% HP (was 8%), +1 power every 2 tiers (was 4), +1 initiative every 4. One reinforcement per room from tier 10 (was two, from 5 and 10), +1 armor from tier 8 (was 6 and 12).
- Enemy base stats raised, rooms 1-2 more than the boss (Crypt rat 31/8, Moss slime 38/8, Bone sentry 43/9, Cave bat 31/8, Spore imp 36/8, Hollow King 80/10, Royal wisp 32/8, Bone squire 40/9; HP/power).
- Room recovery: 33% of max HP (at least 8), was a flat 8.
- Rewards 40/60/80 gold (180 per win, was 90); XP unchanged. Training pays back about twice as fast, matching the faster tier curve.
- Cats: Miso HP 40 (35), Valiant slash 5 (4), Nine lives 8 (6); Pip HP 30 (27); Ember HP 35 (32).

## After

| Stage (wins) | Tier  | Medium win rate      |
| ------------ | ----- | -------------------- |
| 0            | 0     | ~80% (teams 25-100%) |
| 1-5          | 2-7   | 80-95%               |
| 6-8          | 8-9   | 83-98%               |
| 10-12        | 11-12 | 86-91%               |

Average about 88%; optimal bot 100% at stages 0-12 (measured before the final cat and recovery adjustments, so it is a lower bound).

## Known gaps (not tuned further)

- Teams without a healer and without Luna (for example Miso + Pip + Ember) still win only about 25-70% of first descents.
- The optimal bot is above its 92-97% target (100%): the game is fully winnable with perfect play, but there is little margin at the top. Raising enemy HP and power by about 10% at high tiers is the first lever if the endgame feels easy.
- The Hearth is capped by `playerAfter` at half the training rank, so endgame stages are modelled with Hearth 4.
- Critical hits were off in every measurement (10% base in the real game adds variance but no average change).
