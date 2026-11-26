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
- Cats: Miso HP 40 (35), Valiant slash 5 (4), Nine lives 8 (6); Pursian HP 30 (27); Tuntun HP 35 (32).

## After

| Stage (wins) | Tier  | Medium win rate      |
| ------------ | ----- | -------------------- |
| 0            | 0     | ~80% (teams 25-100%) |
| 1-5          | 2-7   | 80-95%               |
| 6-8          | 8-9   | 83-98%               |
| 10-12        | 11-12 | 86-91%               |

Average about 88%; optimal bot 100% at stages 0-12 (measured before the final cat and recovery adjustments, so it is a lower bound).

## Known gaps (not tuned further)

- Teams without a healer and without Luna (for example Miso + Pursian + Tuntun) still win only about 25-70% of first descents.
- The optimal bot is above its 92-97% target (100%): the game is fully winnable with perfect play, but there is little margin at the top. Raising enemy HP and power by about 10% at high tiers is the first lever if the endgame feels easy.
- The Hearth is capped by `playerAfter` at half the training rank, so endgame stages are modelled with Hearth 4.
- Critical hits were off in every measurement (10% base in the real game adds variance but no average change).

## Round 2: sustain without a healer (lifesteal, 3-turn Guard, Miso's shield)

Changes: Tuntun's Flame paw and Sweeping embers heal the caster for 30% of the HP damage they deal; Pursian's Dagger line 15% (per target, rounded up, only damage that reaches HP, critical hits do not raise it). Nine lives lasts 3 turns (was 2). Stand behind me also gives Miso a 5 point shield for 3 turns. Enemy HP per tier 13% (was 12%).

Medium bot, 16 seeds, 10 teams, stages 0 / 3 / 6 / 10:

| Setup                      | Overall win rate                   | Weakest teams (average)                                       |
| -------------------------- | ---------------------------------- | ------------------------------------------------------------- |
| Before round 2             | about 88%                          | Miso + Pursian + Tuntun 37-69%, Pursian + Clover + Tuntun 68% |
| Round 2 at 12% HP per tier | 85 / 95 / 96 / 99% (too easy)      | all teams 85% or more                                         |
| 17%                        | 85 / 88 / 86 / 59% (too hard late) | Miso + Pursian + Tuntun 50%                                   |
| 14.5%                      | 85 / 81 / 87 / 63%                 | Miso + Pursian + Tuntun 53%                                   |
| **13% (kept)**             | **85 / 89 / 96 / 86%**             | Miso + Pursian + Tuntun 77%, Miso + Pursian + Clover 80%      |

Per-team averages now range 77-99% (Luna teams 85-99%, Miso + Clover + Tuntun 99%). Lifesteal lifted the healer-less teams without making them better than the healer teams. Remaining gap: at tier 11+ Miso + Pursian + Clover and Miso + Pursian + Tuntun fall to about 38%. Not tuned further.

## Expeditions and Rank caps

Each Expedition is tuned for a party at its own Rank cap (`playerAtCap` in `src/sim.ts`): training and Hearth at the cap, mastery at its cap, all trinkets, the three reference teams (Miso + Luna + Clover, Luna + Pursian + Clover, Miso + Pursian + Tuntun), 16 seeds, medium bot. Cap Power is 20, 31 and 42.

| Party at the cap of | Plays         | Ascension | Win rate | Per team    |
| ------------------- | ------------- | --------- | -------- | ----------- |
| The Catacombs       | The Catacombs | 6         | 100%     | 100/100/100 |
| Moss Warrens        | Moss Warrens  | 10        | 58%      | 94/81/0     |
| Bone Vault          | Bone Vault    | 14        | 60%      | 100/81/0    |
| The Catacombs       | Moss Warrens  | 6         | 71%      | 100/100/13  |
| Moss Warrens        | Bone Vault    | 10        | 52%      | 56/100/0    |

Enemy stats of the two new Expeditions were tuned by scaling their base teams until the capped rows landed between 50% and 70% (tested in `src/balance.test.ts`). The Ascension formula was not touched.

**Known gap:** the target "under 30% with the previous cap" is not met. Ascension follows Power, so a party at the previous cap meets proportionally weaker enemies; going up a cap also crosses the tier 10 reinforcement and costs as much as it gives. The Rank cap, not enemy strength, is what stops farming The Catacombs to the maximum. The team without a healer (Miso + Pursian + Tuntun) loses almost every Moss Warrens boss fight and Bone Vault run.

## Round 3: audit of 24 November 2026

Full findings in `docs/AUDIT.md`. Measured with luck on (crits, misses, evasion), 12 seeds, 10 teams, and a width-3 planner as the competent player (`optimalPlan(run, 3)`).

**What changed** (data only): Nine lives 1 AP; Dagger line 1 AP, power 5, lifesteal 30%; Pursian HP 40, Mei 36, Luna 30, Tuntun 42 (initiative 12); Flame paw power 24 with a 1-turn cooldown; Sweeping embers power 8; Healing purr and Circle of renewal lift curses; every enemy +15% HP and +1 power, Bone Vault +10% HP more.

**Why:** with luck off, the same bot lost 0-13% with Pursian teams without Luna (sd 39 points between teams). That was mostly the luck setting and the greedy bot. With luck on the spread is already small, so the goals became relevance (turns without action per cat) and difficulty.

| Setting (competent bot, luck on) | Win  | Spread between teams |
| -------------------------------- | ---- | -------------------- |
| Catacombs first descent          | 100% | 0                    |
| Catacombs at cap                 | 100% | 0                    |
| Moss Warrens at cap              | 100% | 0                    |
| Bone Vault at cap                | 100% | 0                    |

Turns without action (percent of turns, same bot): Miso 36-56, Luna 5-9, Pursian 4-10, Mei 49-84, Tuntun 27-42. Mei is still high: heals are rarely needed.

**Dropped idea:** carrying unspent AP into the next round (bank of 3). With a width-24 planner, fights took 13% longer (26.6 to 30.1 rounds at the Warrens cap) and the idle turns of Tuntun rose from 26% to 69%.

**Rounds per room** (win-only means, crits on, 3 teams x 12 seeds, Catacombs enemies): fresh party Ascension 0 competent bot 3.3 / 5.2 / 6.9 (21 / 34 / 45% of rounds); capped party Ascension 10 5.2 / 7.4 / 9.7 (23 / 33 / 43%); Ascension 15 (formula beyond the current max tier 14) 6.4 / 9.3 / 12.5, 22% wins.

**Open:** the bots win almost everything, so absolute difficulty needs human play. The greedy bot with luck off still passes the capped-party targets in `src/balance.test.ts`.
