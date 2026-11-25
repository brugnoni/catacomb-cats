import type { Translate } from "./i18n";
import {
  BASE_CRIT_CHANCE,
  MISS_CHANCE,
  evadeChance,
  DIFFICULTY_TUNING,
  ROOM_HEAL,
  tierFacts,
  HEARTH_TRACK,
  MAX_TRAINING_RANK,
  masteryLevel,
  trainingCost,
} from "./progression";
import { TRINKET_DROP_CHANCE, TRINKET_DROP_GOLD } from "./game";
import { EXPEDITIONS, EXPEDITION_REWARD, roomReward } from "./expeditions";

/** The Field Guide's frequently asked questions, as [question, answer] pairs. */
export function buildEntries(t: Translate): [string, string][] {
  return [
    [
      t("How do turns and AP work?"),
      t(
        "All living cats and monsters act in initiative order. Your team normally shares 6 AP each round: AP belong to the whole party, not to one cat, and any cat can spend them on its turn. The turn button says Pass to the next cat in the order; on the last cat it says End turn and the enemies act. Each cat can use each 1 AP skill at most 3 times and each 2 AP skill at most twice during its own turn. Signature skills can have stricter limits, shown on the button. End turn leaves AP for later cats. Moonwell raises the team's AP ceiling for the current room only.",
      ),
    ],
    [
      t("What do the signature skills do?"),
      t(
        "At training rank 3, each cat unlocks a signature skill. Miso's taunt costs 2 AP, once per turn: enemy damaging attacks target Miso while he is alive, until the start of his next turn, and he gains a shield; support spells and curses are not redirected. Luna's AP skill costs 1 AP, once per room: it grants 2 current AP and raises the team's round AP maximum by 2 until that room ends. Mei's unlock offers two actions costing 3 AP: heal all living allies, or revive one fallen ally at 60% of maximum HP (rounded up); click a fallen cat before reviving. Pursian unlocks a 2 AP attack that ignores armor, shields and Ice Ward. Tuntun unlocks a 3 AP attack against every living enemy. The Companions section lists every skill with its limits and cooldowns.",
      ),
    ],
    [
      t("How do cooldowns work?"),
      t(
        "Some skills rest after use. A two-turn cooldown means: use it on turn N, it is unavailable on N+1 and N+2, and ready on N+3. Mei's revival and Tuntun's Flame paw have two turns; Sweeping embers has one. Each attack has its own cooldown, so another ready skill can still be used. Cooldowns count only that cat's own turn starts, never other characters' End turn clicks, and reset when entering a new room. Invalid casts do not start cooldowns or spend AP.",
      ),
    ],
    [
      t("How do Guard, Inspired and other timed effects work?"),
      t(
        "Guard, Inspired, curses and reflection count the affected unit’s own turn starts, not End turn clicks by other units. A 3-turn Guard drops to 2 when the protected cat begins its next turn, to 1 at the turn after, and expires at the beginning of the third turn. Guard can also be depleted by damage. Taunt ends when Miso’s next turn begins or he is no longer alive. Inspired and shields do not stack: a target with a full-duration effect cannot receive it again, but once its next turn begins you may refresh it. Refreshing a shield restores its full points and duration; Inspired refreshes duration only. Inspired’s bonus (normally +2) raises damage, healing and Guard for every class, but not AP generation, taunt or another Inspired. Hover or keyboard-focus an effect icon above a character to see its rules and remaining turn starts.",
      ),
    ],
    [
      t("How do enemies choose who to attack?"),
      t(
        "At the start of a room and at the end of each of its turns, every enemy marks one living cat at random. On its next turn it attacks that cat. If the marked cat has fallen, it picks another living cat. Taunt overrides the mark while it lasts. At the start of each turn a red thread under the cards briefly connects each enemy to its marked cat, one enemy at a time. Hover an enemy to see its thread again, or the green thread to the ally it will help, plus a note with its next action. Hover a cat to see which enemies will attack it. Curses still go to the cat with the least HP.",
      ),
    ],
    [
      t("How do curses work?"),
      t(
        "Some enemies reduce a cat's damage, healing or protection output by 1 or 2 for two turns of that cat. Output cannot go below zero. A cursed cat also receives that much less healing and shielding. Reapplying a curse refreshes its duration without adding together penalties. Healing purr and Circle of renewal also lift a curse from whoever they heal, even at full HP. Unit labels and Field Notes report the amount and duration.",
      ),
    ],
    [
      t("How do critical hits, misses and evasion work?"),
      t(
        "Every hit and every heal, from cats and from enemies, has a {base}% chance to be critical and deal 50% more damage or healing (rounded up). The chance is fixed: attack, healing and mastery bonuses do not change it. The Hearth blessing adds +5% critical chance for your cats at rank 6 and another +5% at rank 8. Every hit also has a {miss}% chance to miss, and fast units can evade: 1% for each point of initiative above 12, at most {max}% (for example Pursian with 20 initiative evades 8% of hits). A miss or an evasion deals no damage and its skill still costs AP; healing, shields and blessings never miss. Area attacks and Dagger line roll separately for each target. CRITICAL!, MISS! and EVADED! show over the target and are written in Field Notes.",
        { base: BASE_CRIT_CHANCE, miss: MISS_CHANCE, max: evadeChance(99) },
      ),
    ],
    [
      t("How do I equip or remove a trinket?"),
      t(
        "Choose an owned item in a cat's TRINKET selector. Choose Empty slot to remove it; it stays in your inventory. Each item can belong to only one equipped cat at a time. Trinkets are found at random: each room before the boss has a {pct}% chance to drop one you do not own, and the boss always drops one. Once you own them all, a drop gives {gold} gold instead.",
        { pct: TRINKET_DROP_CHANCE, gold: TRINKET_DROP_GOLD },
      ),
    ],
    [
      t("What does Train buy now?"),
      t(
        t(
          "Training develops each cat's role instead of adding the same stats to everyone. The lobby shows the next rank's exact gains before purchase. The first three ranks cost {a}, {b} and {c} gold: 100 gold total to unlock that cat's signature skill at rank 3. Later ranks improve statistics gradually; training stops at rank {max}. Unlocks depend only on individual training, not XP or Hearth ranks. Changes apply to the next expedition.",
        ),
        {
          a: trainingCost(0),
          b: trainingCost(1),
          c: trainingCost(2),
          max: MAX_TRAINING_RANK,
        },
      ),
    ],
    [
      t("What does the Hearth blessing buy?"),
      t(
        t(
          "The Hearth is a global blessing: each rank helps every cat in future expeditions, up to rank {max}. {ranks} Second Wind works once per expedition and raises the first cat to fall. Hearth does not unlock signature skills. Its investment also counts toward future difficulty after a boss victory.",
        ),
        {
          max: MAX_TRAINING_RANK,
          ranks: HEARTH_TRACK.map((row) =>
            t("Rank {n}, {title}: {desc}", {
              n: row.rank,
              title: t(row.title),
              desc: t(row.description),
            }),
          ).join(" "),
        },
      ),
    ],
    [
      t("What is XP for?"),
      t(
        t(
          "XP is permanent shared mastery, not a currency to spend. Every 150 total XP gives one mastery level, capped at 10. Each mastery level grants every cat +2 maximum HP. Every three mastery levels also grant +1 base power to attacks, healing, Guard and Inspired blessings. It does not alter AP generation, taunt, the fixed 60% resurrection amount or fixed training-passive values, and never unlocks a signature skill. For example, 135 XP is still mastery level {level} with 135 / 150 progress. This slower growth keeps individual training meaningful.",
        ),
        { level: masteryLevel(135) },
      ),
    ],
    [
      t("When do I receive loot, and what applies after a room?"),
      t(
        "Room rewards are provisional, carried loot. Clearing a room DOES NOT add its gold, XP or items to your permanent lobby inventory. Room 1 adds {g1} gold and {x1} XP, room 2 adds {g2} gold and {x2} XP, and the boss adds {g3} gold and {x3} XP to the expedition's carried total. To keep the loot, defeat the final boss: the full {gt} gold, {xt} XP and discovered items are banked the moment it falls. Defeat, retreat or reloading during a run loses carried loot; previously banked progress is preserved. Separately, clearing either of the first two rooms immediately restores {pct}% of maximum HP (at least {flat}) to each surviving cat, revives fallen cats at 25% maximum HP (rounded up, minimum 1 HP) and grants +1 damage to all cat attacks for the rest of the run, stacking to +2 after room 2. Defeating the final boss fully heals and revives the whole party.",
        {
          g1: roomReward(0).gold,
          x1: roomReward(0).xp,
          g2: roomReward(1).gold,
          x2: roomReward(1).xp,
          g3: roomReward(2).gold,
          x3: roomReward(2).xp,
          gt: EXPEDITION_REWARD.gold,
          xt: EXPEDITION_REWARD.xp,
          pct: ROOM_HEAL.percent,
          flat: ROOM_HEAL.flat,
        },
      ),
    ],
    [
      t("How do expeditions, unlocks and rank caps work?"),
      t(
        "There are {n} expeditions of three rooms each; pick one in the camp before you enter. After {w1} victories in {a}, {b} opens, and after {w2} victories in {b}, {c} opens. Later expeditions pay more (x{m1} and x{m2}) and are tuned for a stronger party: the list shows a recommended Power, and a warning if yours is lower, but you may always try. Training, Hearth blessings and mastery can only grow up to the cap of the highest expedition you have opened: ranks {c1}, {c2} and {c3}, and mastery levels {k1}, {k2} and {k3}. Extra gold and XP stay banked. Ascension still follows your Power in every expedition.",
        {
          n: EXPEDITIONS.length,
          a: t(EXPEDITIONS[0]!.name),
          b: t(EXPEDITIONS[1]!.name),
          c: t(EXPEDITIONS[2]!.name),
          w1: EXPEDITIONS[1]!.unlock!.wins,
          w2: EXPEDITIONS[2]!.unlock!.wins,
          m1: EXPEDITIONS[1]!.rewardMultiplier,
          m2: EXPEDITIONS[2]!.rewardMultiplier,
          c1: EXPEDITIONS[0]!.rankCap,
          c2: EXPEDITIONS[1]!.rankCap,
          c3: EXPEDITIONS[2]!.rankCap,
          k1: EXPEDITIONS[0]!.masteryCap,
          k2: EXPEDITIONS[1]!.masteryCap,
          k3: EXPEDITIONS[2]!.masteryCap,
        },
      ),
    ],
    [
      t("How does repeat-expedition difficulty work?"),
      t(
        "Your first expedition has a fixed introductory difficulty. Afterwards, difficulty follows the permanent power you have bought: the ranks of your three best cats, the Hearth blessing and your mastery level add up to Power, and every {per} Power adds one Ascension tier, up to tier {max}. Winning, spending gold or losing never change it on their own. Each tier gives enemies +{hp}% HP, +1 power every {pe} tiers and +1 initiative every {ie} tiers; from tier {r} there is one extra reinforcement per room and from tier {a} armored foes gain +1 armor. The lobby shows the next expedition's tier and modifiers; they are fixed when you enter and never change during combat. The balance aims for a careful player to win about four out of five expeditions, so some teams will find it harder than others.",
        {
          per: DIFFICULTY_TUNING.pointsPerTier,
          max: DIFFICULTY_TUNING.maxTier,
          hp: tierFacts(1).hpPercent,
          pe: DIFFICULTY_TUNING.powerEveryTiers,
          ie: DIFFICULTY_TUNING.initiativeEveryTiers,
          r: DIFFICULTY_TUNING.reinforcementTiers[0],
          a: DIFFICULTY_TUNING.armorEveryTiers,
        },
      ),
    ],
  ];
}
