# Progression and encounter balance

The current rules use explicit class ranks, shared mastery, cooldowns and limited-use room passives. These deterministic scenarios are examples, not general win rates or a substitute for human playtesting.

## Growth budget

Each cat has eight explicit ranks in `src/progression.ts`; `trainingTrack()` supplies the same descriptions to the FAQ and `nextTrainingDescription()` supplies the next lobby benefit. Rank 3 remains the signature unlock. Prices are 20, 30, 50, 70, 90, 110, 130 and 150 gold: 100 total to unlock a signature, with training capped at rank 8.

| Cat   | Stats from all eight ranks                   | Rank 5 passive                                                            | Rank 8 passive improvement            |
| ----- | -------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------- |
| Miso  | +16 HP, +1 attack, +3 Guard, +1 initiative   | Starts each room with 4 Guard                                             | Opening Guard becomes 6               |
| Luna  | +7 HP, +2 attack, +2 Inspired, +2 initiative | Ice Ward reduces damage by 2 for 3 incoming attacks per room              | Ice Ward gains a fourth charge        |
| Mei   | +10 HP, +4 healing, +2 initiative            | After a nonlethal attack damages HP, recover 2 HP, up to 3 times per room | Reactive recovery can trigger 5 times |
| Pip   | +10 HP, +3 attack, +3 initiative             | First damaging skill in each room gains +2 power                          | Opening bonus becomes +3              |
| Ember | +14 HP, +3 attack, +2 initiative             | Starts each room with 3 Guard                                             | Opening Guard becomes 5               |

Shared mastery grants one level per 150 banked XP: +2 HP per level and +1 native numerical skill power every third level, capped at mastery 10. This improves damage, healing, Guard and Inspired potency. It does not increase AP generation, taunt, revival percentage or the numerical values of passive charges. Inspired during combat improves damage/healing/Guard but does not amplify another Inspired blessing; this prevents recursive blessing inflation.

## Active skills, cooldowns and shields

Mei's rank-three special offers party healing or a 60%-HP single-target revival. Only revival has a cooldown: when used at turn T, revival is unavailable at T+1 and T+2 and returns at T+3. Party healing, her regular single-target heal and her basic attack are not placed on that cooldown; they remain limited by AP and per-turn uses. Ember's Cinder jab has no cooldown, Flame paw has a two-turn cooldown, and Sweeping embers a one-turn cooldown; each becomes available on the next. Rejected actions spend no AP, use counts or cooldowns. Cooldowns reset on room entry.

Guard and Inspired cannot stack. A full-duration effect blocks a redundant player cast; once its affected unit's turn starts reduce its duration, it can be refreshed. Guard now restores full current shield power and duration. Inspired only restores duration, preserving current potency. Ice Ward and reactive recovery have finite charges per room and cannot be replenished by Guard refresh. Reactive recovery requires actual HP damage and does not trigger on lethal blows or reflected damage.

After ordinary room victories, dead cats revive at 25% maximum HP and surviving cats recover up to 8 HP. Boss victory fully restores the entire party. A combat revival returns an ally at 60% HP and they act beginning with the next round. Full-party defeat still ends the run.

## Ascension snapshot

Before the first recorded boss victory, tier is zero. Afterwards:

`tier = min(12, victories + floor(goldSpent / 200) + floor(masteryLevel / 2))`

Enemy HP scales by `1 + 0.08 * tier`; power adds `ceil(tier / 4)` and initiative adds `floor(tier / 4)`. Tier 5 adds one reinforcement per room, and tier 10 adds a second (two total). Armored enemies gain `min(2, floor(tier / 6))` extra armor. Unspent gold does not affect difficulty. The snapshot is frozen on entry.

## Measured scenarios

The policy selects legal actions and targets using the engine's cooldown and target validators. It prioritizes a legal combat revival when a companion is fallen, uses Moonwell, heals wounded allies, applies Inspired to unblessed allies, then chooses damage per AP with a kill preference. It does not reserve AP, plan future rounds, or intentionally use Taunt/Guard. Measured HP is captured before the decision that finishes the boss, distinct from automatic victory healing.

| Scenario                                           | Party              | Result                | Room rounds | HP before finishing decision | Combat revivals | Final HP |
| -------------------------------------------------- | ------------------ | --------------------- | ----------- | ---------------------------- | --------------- | -------- |
| Fresh save, offensive actions only                 | Miso / Luna / Mei  | Victory, Ascension 0  | 3 / 4 / 5   | 35/35, 0/25, 1/29            | 0               | All full |
| Fresh save, support policy                         | Miso / Luna / Mei  | Victory, Ascension 0  | 3 / 6 / 8   | 35/35, 0/25, 13/29           | 0               | All full |
| One victory, 135 XP, Mei rank 3, Iron bell on Miso | Miso / Luna / Mei  | Victory, Ascension 1  | 3 / 6 / 9   | 41/41, 6/25, 24/32           | 4               | All full |
| All training and mastery capped, Hearth rank 8     | Luna / Ember / Mei | Victory, Ascension 12 | 4 / 5 / 8   | 38/68, 82/82, 75/75          | 1               | All full |

The fresh support policy finishes with 48 combat HP before the last decision versus 36 for attacks only, but takes more rounds. Both lose a companion temporarily and can still win with room resurrection. At higher ranks, combat revival provides a new recovery option while its two-turn revival-only cooldown prevents reviving on every Mei turn without blocking party healing. The maximum-tier example remains attainable under this policy, but it is substantially healthier than earlier builds because mastery now improves healing, new passives reduce attrition, and combat revival restores allies above room-clear revival HP. No enemy stats were adjusted to hide that increased player strength.

These samples cannot establish fairness for every class combination, equipment choice or spending history. Broad balance remains a playtesting task. The tests enforce legal actions, finite execution, meaningful multi-round encounters, scaled non-one-shot opening enemies and full victory restoration.

Three reproducible policy scenarios live in `src/balance.test.ts`. Print current metrics with:

`BALANCE_REPORT=1 pnpm exec vitest run src/balance.test.ts --reporter verbose --disableConsoleIntercept`
