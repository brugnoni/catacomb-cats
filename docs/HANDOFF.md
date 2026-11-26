# Catacomb Cats: accepted decisions and behavior

Checked against the code on 2026-11-26. If a note here disagrees with the code, the code wins; fix the note. Working rules are in `CLAUDE.md`, the code layout in `docs/ARCHITECTURE.md`, vocabulary in `GLOSSARY.md`.

## The game

A party of cats explores a dungeon turn by turn, brings back loot and spends it at camp. The tone mixes a cosy shelter (**The Burrow**) with dark catacombs. Desktop browser game, English and Spanish. The generic dashboard look and cats drawn with CSS were explicitly rejected.

There are five cats and the player picks three: Miso (Vanguard), Luna (Mystic), Pursian (Scout), Mei (Healer) and Tuntun (Brawler). **Internal ids do not follow the visible names** (Mei is `clover`, Pursian is `pip`, Tuntun is `ember`); never rename them, since training, equipment and saves depend on them.

Flow: camp → three rooms → victory or defeat → camp. In The Catacombs the first room has two enemies, the second three, and the last The Hollow King with two companions. Ascension can add reinforcements.

## Combat rules to preserve

- One initiative queue with living cats and enemies. The party shares 6 AP per round.
- A 1 AP skill can be used up to three times per own turn, a 2 AP skill up to twice. Some skills have tighter limits (Moon blessing: once per turn).
- At 0 AP the turn ends, cats without AP are skipped, enemies act and control returns to the next playable turn. A new round refills AP.
- **Auto pass:** a cat with AP but no usable skill ends its turn by itself (`canAct()`).
- Invalid attempts consume no AP, uses or cooldowns. The engine validates and the UI explains.
- Timed effects tick at the **start of the affected unit's turn**, never per End turn click of others. Guard on Mei follows Mei's turns even when Miso casts it.
- **Guard** lasts 3 turns (`GUARD_TURNS`). It does not stack; an allowed refresh restores its **full power and duration**, and a fully consumed shield can be applied again.
- **Inspired** (Moon blessing; internally `fury`, never shown as "Fury") improves damage, healing and Guard, not AP, taunt or another blessing. Refreshing renews duration only. A full-duration effect blocks an accidental repeat.
- Single-target healing is refused on a full-HP cat; group healing when every living ally is full.
- **Curse** lowers the damage, healing and shields the cursed cat gives **and** the healing and shields it receives (minimum 0).
- **Mei lifts curses:** Healing purr and Circle of renewal clear the curse on whom they heal, and can be cast on a cursed ally at full HP.
- **Lifesteal:** Flame paw, Sweeping embers and Dagger line heal the caster for 30% of the damage that reaches HP, per target, rounded up, never from armor or shields nor above maximum HP. Critical hits do not raise the percentage.
- **Piercing (Needle strike)** ignores armor, Guard and Ice Ward and spends no charges or shield.
- **Dagger line** (1 AP, power 5, once per turn, cooldown 1): hits the target for 100%, the next living enemy to its right for 50% and the one after for 35% (`LINE_FALLOFF`). Armor and shields reduce each hit. It never hits enemies in front of the target.
- Damage order, shared by resolution and preview (`damagePreview()`): modified power → armor → Ice Ward → Guard → HP lost, including reactive healing.
- An attack keeps its living enemy target during the same cat turn.

### Enemy marks, Taunt and intent

- When a room starts and after each of its own turns, every enemy marks a random living cat (seeded by `Run.rng`). Its next attack goes to that mark; if the marked cat fell, another is drawn.
- **Taunt** (Stand behind me, which also gives Miso a 5 shield) makes every living enemy mark Miso while it lasts, and ends at Miso's next turn start, when marks are drawn again. Support skills ignore Taunt.
- A curse goes to the marked cat, or to the weakest one if the mark fell.
- **Open question:** the field guide says Taunt does not redirect curses, but casting Taunt rewrites every mark to Miso and curses follow the mark.
- `enemyIntent()` previews the next action. Threads are red toward an attacked cat, green toward a helped ally and violet for a curse.
- Enemy behavior is data in `ENEMY_TRAITS` (`src/engine/data.ts`): a cycle by `round % 3`, armor, opening shield and curse power. Roles include armored tanks, fast attackers, attack buffs, curses, protection, reflection (fixed return damage, never reflected again) and limited ally healing.

### Luck

- Every hit and heal (cats and enemies) has a 10% critical chance (`BASE_CRIT_CHANCE`), ×1.5, rounded up, before armor. Hearth ranks 6 and 8 add +5% each for cats; some Relics and Trinkets add more. Each target of an area attack rolls separately.
- In the real game each hit also has a 5% miss chance (`MISS_CHANCE`), and the target evades 1% per initiative point above 12, at most 12%. Healing, shields and blessings never miss.
- Luck uses `Run.critRng`, so it never disturbs marks. The engine, tests and simulator run with luck off or fixed, so **measured balance does not include misses or evasion**.

## Skills

| Cat     | Theme            | Skills                                                             |
| ------- | ---------------- | ------------------------------------------------------------------ |
| Miso    | Knight           | Valiant slash, Nine lives, Stand behind me                         |
| Luna    | Moon             | Moon bolt, Moon blessing, Moonwell                                 |
| Pursian | Rogue            | Claw strike, Dagger line, Needle strike                            |
| Mei     | Herbs and hearth | Thorn swipe, Healing purr, Circle of renewal, Return to the hearth |
| Tuntun  | Fire             | Cinder jab, Flame paw, Sweeping embers                             |

Rank 3 unlocks:

| Cat     | Unlock and limits                                                                                                                                           |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Miso    | Stand behind me: Taunt, 2 AP, once per turn.                                                                                                                |
| Luna    | Moonwell: 1 AP, +2 current AP and +2 maximum per round for that room, once per room.                                                                        |
| Mei     | Circle of renewal: heals all living allies, 3 AP, once per turn, no cooldown. Also Return to the hearth: revives a fallen ally at 60% HP, rounded up, 3 AP. |
| Pursian | Needle strike: 2 AP, ignores armor and shields, once per turn.                                                                                              |
| Tuntun  | Sweeping embers: 3 AP, power 8, all living enemies, once per turn, cooldown 1.                                                                              |

- **Only Mei's revive has a two-turn cooldown**, not shared with her heals. Used on turn N, it is blocked on N+1 and N+2. The revived cat acts from the next round.
- **Tuntun:** Cinder jab has no cooldown. Flame paw (power 24, 3 AP) has cooldown 1 and must deal more damage per AP than repeating Cinder jab (tested).
- Cooldowns count the owner's turn starts and reset between rooms.
- Nine lives costs 1 AP.

Base HP: Miso 40, Luna 30, Pursian 40, Mei 36, Tuntun 42. Tuntun's initiative is 12.

## Progression

`src/progression.ts` is the single source for the engine, FAQ and camp texts.

- **Training:** eight ranks per cat costing 20, 30, 50, 70, 90, 110, 130 and 150 gold. Rank 3 unlocks the signature skill, rank 5 a passive and rank 8 improves it. The camp shows only the next rank ("Next rank N · …"); the FAQ shows all eight.
- **Passives:** Miso and Tuntun start each room with a shield (4 → 6 and 3 → 5). Luna's Ice Ward reduces the next 3 incoming attacks by 2 (4 charges at rank 8). Mei's Soothing Spirit recovers 2 HP when an attack hurts her, 3 times per room (5 at rank 8). Pursian's first damaging skill of each room gets +2 power (+3 at rank 8).
- **Mastery:** every 150 banked XP is one level for all cats: +2 HP, and every third level +1 power of attacks, healing, Guard and blessings. Maximum 10. It does not change AP, taunt, revive percentage or passive values.
- **Hearth blessing:** eight ranks costing 20 + 20 × current rank. R1 +2 HP and +1 initiative; R2 +1 attack; R3 Second Wind (once per Run the first fallen cat rises at 40% HP); R4 +3 HP and +1 initiative; R5 +1 healing, Guard and Inspired; R6 +1 attack and +5% critical; R7 Second Wind at 60% and +3 HP; R8 +1 AP in the first round of each room and +5% critical.

## Trinkets and Relics

- **Trinkets:** 20, permanent, one per cat, equipped from the Bag. A cleared room before the boss drops one 50% of the time, the boss always; never a duplicate; once all are owned the drop is 20 gold. Never rename one: an unknown name invalidates the save. The camp marks a Trinket that does nothing for its wearer. Rules that need care: Brave bell works strictly below half HP; Thorn ring only if the hit removes HP; Warm milk adds to skill healing, not lifesteal or room recovery.
- **Relics** (`src/engine/relics.ts`): 14, five with a drawback. Before each room up to three are offered and one must be picked. They last for that Run and never count toward Power. Companion Relics appear only with that cat in the party; Warm broth is never offered before the boss. Own generator (`Run.relicRng`).
- Offers and drops use a loot seed saved per Expedition until a Run there is won or lost, so retreating or reloading cannot re-roll them.

## Rooms, rewards and saves

- Room rewards: 40/30, 60/45 and 80/60 gold/XP (`ROOM_REWARD`), multiplied by the Expedition.
- Gold, XP and Trinkets are **carried loot**, banked the moment the boss falls. Trinkets found mid-Run cannot be equipped yet. Defeat, retreat or reload loses unbanked loot.
- After rooms one and two, surviving cats recover 33% of maximum HP (at least 8, `ROOM_HEAL`; Warm broth adds 20 points), the party gains +1 damage for the Run, and fallen cats rise at 25% HP without the extra recovery.
- Beating the boss heals and revives everyone and clears effects. A full-party defeat revives no one.
- Permanent progress is in `localStorage` under `catacomb-cats.progress.v1`. The active Run is never saved. It depends on origin, port and browser profile.
- An unreadable save is copied to `catacomb-cats.progress.backup`. The camp can **export and import** progress as a file. Keep migrations and validation.
- A local Run record (`catacomb-cats.runs`, last 1000) travels in the export. It has no screen and nothing is sent anywhere.
- **Burrow lantern easter egg:** ten quick clicks give +1000 gold and +1000 XP, at most five times. It is a testing shortcut.
- Skins: two extra color variants per cat, cosmetic only.

## Difficulty

- After the first boss victory, Ascension is fixed on entering from **Power** (`powerPoints()`): training ranks of the chosen party, plus Hearth rank, plus mastery level. Gold held does not change it.
- `tier = min(14, floor(Power / 3))`, 0 before the first victory. Enemy HP × (1 + 0.13 × tier); power + ceil(tier / 2); initiative + floor(tier / 4); one reinforcement per room from tier 10; armor + floor(tier / 8), at most 2. Numbers live in `DIFFICULTY_TUNING` and `tierFacts()`.
- Target: medium bot wins 75–85%, optimal bot 92–97%. Measurements are in `outputs/BALANCE_REPORT.md`; the simulator is `src/sim.ts`.

## Expeditions

Rank cap decision: `docs/adr/0001-rank-cap-per-expedition.md`.

- Three Expeditions of three rooms (`src/expeditions.ts`): The Catacombs, Moss Warrens and Bone Vault. The last two reuse sprites and enemy types with their own stats.
- **Unlock:** Moss Warrens after 3 wins in The Catacombs; Bone Vault after 5 in Moss Warrens. `Progress.expeditionWins` is the only source; the old `wins` field is read only to migrate.
- **Rank cap:** training and Hearth 4/6/8 and mastery 4/7/10 by the highest unlocked Expedition. Ranks already bought stay; spare gold and XP stay banked; effective mastery (so Power) is held to the cap.
- **Rewards:** ×1, ×1.5, ×2 per room. Repeating never pays less.
- **Ascension** is global, with no floor per Expedition. The picker shows Recommended Power (31 and 42 for the later two) as a warning, never a block.

## Battle interface

- A loading screen preloads battle art before a Run or practice (0.9 s minimum, 5 s maximum).
- After an action, play is replayed step by step: a round banner, then each enemy attacking on its own. A room where enemies act first shows "The enemies strike first!". Hover is locked meanwhile.
- Threads are not always on: the Threats button shows every enemy's plan (hover, focus or click to pin), and hovering or focusing a unit shows only what concerns it.
- Hovering or focusing a skill outlines its reachable targets in yellow, after a short delay if the cursor was already resting there.
- The turn button says "Pass to {next cat}", or "End turn" for the last one. AP is explained as shared. The chosen party and Expedition are remembered.
- Hits flash red and heals green on the card; a shield keeps a silver border; status icons show tooltips on hover or focus; cooldown badges sit above each cat; "ready", "MISS!" and "EVADED!" are announced.
- `src/abilityText.ts` writes each skill's type, target and a short sentence; durations are stated in turns.
- Accessibility (`tests/a11y.spec.ts`): named controls and 4.5 contrast in camp, offer and battle (background images are not measured); targets describe their HP; the latest log line is announced; focus moves to the Relic offer and the result.

## Tutorial and languages

- **Tutorial:** 12 steps, 4 in camp and 8 in a practice battle (first room, enemies at 60% HP and power 3, never saved). Steps with a `gate` advance when the player does the action. Offered on first visit after the language choice; the top-bar button replays it except during a real Run.
- **Languages:** the first visit asks for English or Spanish (`catacomb-cats.lang`, separate from progress); the top-bar menu changes it any time. Spanish terms: PV (HP), PA (AP), Guardia, Barrera de hielo, Hogar (Hearth), Madriguera (Burrow). How translation works: `docs/ARCHITECTURE.md`.

## Balance notes

Historical measurements, not re-measured for this document.

- **Last balance round:** enemies +15% HP and +1 base power (Bone Vault +10% more HP). Saving AP between rounds was tried and dropped: no better decisions and 13% longer fights.
- At the Rank cap the medium bot won about 58% in Moss Warrens and 60% in Bone Vault. The goal "under 30% with the previous cap" was not met (about 71% and 52%) because Ascension rises with Power. The Catacombs at its cap is almost always won: it is the starting route.
- Rounds per room, level 1 without Ascension: about 3.3 / 5.2 / 6.9; at the cap with Ascension 10: about 5.2 / 7.4 / 9.7.
- **How to measure:** luck off and a greedy bot exaggerate differences between parties. Compare parties with luck on, 12 or more seeds and a width-3 planner (`optimalPlan(run, 3)`). Bots almost always win; absolute difficulty needs human games.
- **Not measured:** balance with Relics and the new Trinkets (the simulator picks no Relics). Long thread, Warm milk and Four-leaf clover looked weak.

## Visual state and limits

Backgrounds and atlases are generated raster pixel art, reviewed and integrated; art direction is in `public/art/ART_DIRECTION.md`. Pixel fonts are bundled. No accounts, server, telemetry or cloud. Mobile is not a target.

## Next work

1. Playtest balance with humans and tune absolute difficulty step by step. Mei still spends about half her turns idle with the competent bot.
2. Recalibrate bots, enemies, the boss and `outputs/BALANCE_REPORT.md` for Relics and Trinkets.
3. Decide whether the jump between Expeditions needs hardening, without touching the Ascension formula.
4. Own sprites and backgrounds for Moss Warrens and Bone Vault; more rooms per Expedition; optional unlock goals.
