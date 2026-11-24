import { useState } from "react";
import { AbilityHead } from "./AbilityCard";
import { cooldownText } from "./abilityText";
import { plural, useT, type Translate } from "./i18n";
import {
  CATS,
  SIGNATURE_ABILITIES,
  REVIVE_ABILITY,
  abilityLimit,
  type Ability,
} from "./game";
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
  trainingTrack,
  trainingCost,
} from "./progression";
import { EXPEDITIONS, EXPEDITION_REWARD, roomReward } from "./expeditions";
function buildEntries(t: Translate): [string, string][] {
  return [
    [
      t("How do turns and AP work?"),
      t(
        "All living cats and monsters act in initiative order. Your team normally shares 6 AP each round: AP belong to the whole party, not to one cat, and any cat can spend them on its turn. The turn button says Pass to the next cat in the order; on the last cat it says End turn and the enemies act. Each cat can use each 1 AP skill at most 3 times and each 2 AP skill at most twice during its own turn. Signature skills can have stricter limits, shown on the button. End turn leaves AP for later cats. Moonwell raises the team's AP ceiling for the current room only.",
      ),
    ],
    [
      t("How do I equip or remove a trinket?"),
      t(
        "Choose an owned item in a cat's TRINKET selector. Choose Empty slot to remove it; it stays in your inventory. Each item can belong to only one equipped cat at a time. Iron bell adds 6 maximum HP, Silk ribbon adds 3 initiative, and Lucky fang adds 1 attack damage.",
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
      t("What does Miso's taunt do?"),
      t(
        "At training rank 3, Miso learns a taunt. It costs 2 AP and can be used once per turn. Enemy damaging attacks target Miso while he is alive, until the start of his next turn. It does not redirect enemy support spells or curses. It also gives Miso a shield, but it adds no permanent armor and cannot protect the party after Miso falls.",
      ),
    ],
    [
      t("How does Luna's AP skill work?"),
      t(
        "At training rank 3, Luna learns an AP skill costing 1 AP, usable only once per room. It grants 2 current AP and raises the team's round AP maximum by 2 until that room ends. Casting therefore gives a net +1 current AP after the cost. Later rounds refill to 8 AP. Entering the next room resets the maximum to 6 and restores the skill's one room use. It cannot be repeated to generate unlimited AP.",
      ),
    ],
    [
      t("What do the other signature skills do?"),
      t(
        "Mei’s rank-3 unlock offers two actions: heal all living allies, or revive one fallen ally at 60% of maximum HP (rounded up). Both cost 3 AP. Only revival has a two-turn cooldown; party healing remains available within its AP and per-turn limits. Click a fallen cat before reviving. A revived cat rejoins the initiative queue next round. Pip unlocks a 2 AP attack that ignores armor, shields and Ice Ward. Ember unlocks a 3 AP attack against every living enemy. The skill buttons show current power, usage limits and cooldowns.",
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
      t("When can I refresh Inspired or a shield?"),
      t(
        "Inspired and shields do not stack. A target with a full-duration effect cannot receive the same effect again, preventing accidental duplicate casts. Once that target's next turn begins and its duration decreases, you may refresh it. Refreshing a shield restores both its full effective shield points and its duration; it replaces the shield rather than adding to it. Inspired refreshes duration only and keeps its active potency. A completely depleted or expired shield can be applied anew. Full-health cats cannot receive a single-target heal; a party heal is blocked if no living ally needs healing. Invalid casts spend no AP or skill uses.",
      ),
    ],
    [
      t("What does Inspired improve?"),
      t(
        "Moon Blessing grants Inspired: its displayed bonus (normally +2) increases damage, healing and Guard for every class. Luna gains stronger spells, Mei stronger heals and Miso stronger shields. It also improves area damage and party healing. It does not increase AP generation, taunt, or the potency of another Inspired blessing, which prevents an endless chain of stronger blessings. Training can improve the native blessing amount. The effect counts down at the beginning of the affected cat’s next three turns; other units ending their turns do not reduce it.",
      ),
    ],
    [
      t("How do Mei and Ember cooldowns work?"),
      t(
        "Only Mei’s revival has a two-turn cooldown: revive on turn N, revival is unavailable on N+1 and N+2, and ready on N+3. Her rank-3 party heal and regular single-target heal have no multi-turn cooldown and remain available subject to AP and per-turn use limits. Using them does not change revival’s cooldown. Ember’s Cinder jab has no cooldown. Flame paw has a two-turn cooldown: use it on turn N, it is unavailable on N+1 and N+2, and ready on N+3. Sweeping embers keeps a one-turn cooldown. Each attack has its own cooldown, so another ready attack can still be used. Cooldowns count only that cat’s turn starts, never other characters’ End turn clicks, and reset when entering a new room. Invalid casts do not start cooldowns or spend AP.",
      ),
    ],
    [
      t("What do the new rank passives do?"),
      t(
        "At rank 5, Miso and Ember gain an opening shield each room; Luna gains Ice Ward, reducing the next three incoming attacks by 2; Mei can recover 2 HP when an attack damages her and she survives, up to three times per room; Pip’s first damaging skill each room gains +2 power. Rank 8 improves these passives. Charges do not grow back mid-room, reflected damage cannot trigger healing loops, and healing response cannot revive a fallen cat. See each cat’s complete rank list below for exact changes and prices.",
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
      t("What defenses and support do enemies have?"),
      t(
        "Tank enemies can reduce damage with armor and absorb it with timed shields. Agile enemies act earlier. Warriors can strengthen their attacks; casters can protect allies or reflect damage, and healers can restore injured allies. Support actions replace that enemy's attack for the turn. Armor reduces incoming damage before shields; reflected damage is fixed return damage that bypasses armor and shields and cannot reflect again. Field Notes records the numerical result. Watch defenses and choose targets rather than spending every AP on the nearest enemy.",
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
    [
      t("When exactly do I receive Expedition Loot?"),
      t(
        "Room rewards are provisional, carried loot. Clearing a room DOES NOT add its gold, XP or items to your permanent lobby inventory. Room 1 adds {g1} gold and {x1} XP, room 2 adds {g2} gold and {x2} XP, and the boss adds {g3} gold and {x3} XP to the expedition's carried total. To keep the loot, defeat the final boss AND choose Return to lobby. Only then are the full {gt} gold, {xt} XP and discovered items banked. Defeat, retreat or reloading during a run loses carried loot; previously banked progress is preserved. Carried items cannot be equipped mid-run.",
        {
          g1: roomReward(0).gold,
          x1: roomReward(0).xp,
          g2: roomReward(1).gold,
          x2: roomReward(1).xp,
          g3: roomReward(2).gold,
          x3: roomReward(2).xp,
          gt: EXPEDITION_REWARD.gold,
          xt: EXPEDITION_REWARD.xp,
        },
      ),
    ],
    [
      t("What applies immediately after a room?"),
      t(
        "Room recovery and Expedition Strength are separate from carried loot. Clearing either of the first two rooms immediately restores {pct}% of maximum HP (at least {flat}) to each surviving cat and grants +1 damage to all cat attacks for the rest of that run. They are already active on the reward screen. After either of the first two rooms, fallen cats revive at 25% maximum HP (rounded up, minimum 1 HP), without the extra heal. Defeating the final boss fully heals and revives the whole party and clears combat effects, so the next expedition begins at full HP. If all cats fall before victory, the run is defeated and nobody revives. The strength stacks to +2 after room 2 and disappears when the run ends. Field Notes shows the actual HP restored.",
        { pct: ROOM_HEAL.percent, flat: ROOM_HEAL.flat },
      ),
    ],
    [
      t("What do the skill and Field Notes numbers mean?"),
      t(
        "Previews show current skill power and, for a selected enemy, the actual expected HP damage after armor and remaining Guard. For example, 6 attack power against 2 armor deals 4 damage before Guard: an enemy at 1 HP dies if it has no shield. A shield with at least 4 points can absorb that hit completely. Damage is never reduced by the target’s low remaining HP before armor is calculated. Field Notes records actual HP lost and every defense applied. Healing is capped by missing HP.",
      ),
    ],
    [
      t("Why does my target selection clear?"),
      t(
        "Attacks keep the selected living enemy while the same cat can still act, so you can repeat attacks without reselecting. Healing, shields, blessings and other support actions clear selection. End turn and automatic turn changes also clear it. A defeated target or a room result clears the highlight too. Self and area skills need no target selection. Invalid actions preserve your choice.",
      ),
    ],
    [
      t("When do timed effects lose a turn?"),
      t(
        "Guard, Inspired, curses and reflection each count the affected unit’s turn starts, not End turn clicks by other units. A 3-turn Guard drops to 2 when the protected cat begins its next turn, to 1 at the turn after, and expires at the beginning of the third turn (1 to 0). Guard can also be depleted by damage. Taunt ends exactly when Miso’s next turn begins or he is no longer alive. Hover or keyboard-focus an effect icon above a character to inspect its rules, value and remaining turn starts.",
      ),
    ],
    [
      t("What happens when shared AP reaches zero?"),
      t(
        "The current cat’s turn ends automatically. Other cats with zero shared AP are skipped; enemies still take their turns in initiative order. A cat that still has AP but no usable skill (all at their limits, cooling down or too expensive) also passes its turn automatically. When a new round begins, shared AP refills to its current maximum (normally 6, or 8 with Moonwell), and control returns at the next living cat’s turn. This can change status durations when those particular units’ turns begin. Room victory or defeat stops the turn sequence immediately.",
      ),
    ],
    [
      t("How do critical hits work?"),
      t(
        "Every hit and every heal, from cats and from enemies, has a {base}% chance to be critical and deal 50% more damage or healing (rounded up). The chance is fixed: attack, healing and mastery bonuses do not change it. The Hearth blessing adds +5% critical chance for your cats at rank 6 and another +5% at rank 8. Area attacks and Dagger line roll separately for each target. A critical hit shows CRITICAL! over its target and is written in Field Notes.",
        { base: BASE_CRIT_CHANCE },
      ),
    ],
    [
      t("Can attacks miss or be evaded?"),
      t(
        "Every hit, from cats and from enemies, has a {miss}% chance to miss. Fast units can also evade: 1% for each point of initiative above 12, at most {max}% (for example Pip with 20 initiative evades 8% of hits). A miss or an evasion deals no damage, is announced over the target, and its skill still costs AP. Healing, shields and blessings never miss. Area attacks and Dagger line roll for each target.",
        { miss: MISS_CHANCE, max: evadeChance(99) },
      ),
    ],
    [
      t("How do I change the language?"),
      t(
        "Use the Language menu in the top bar, next to FAQ, to switch between English and Spanish at any time, even in the middle of an expedition. Your choice is remembered in this browser. The first time you open the game you pick it on a short start screen.",
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
      t("What happens to my existing save?"),
      t(
        "Existing gold, XP, training ranks, Hearth ranks and equipment are kept. Their effects follow the new class and balance rules. Old boss-clear history and upgrade spending are migrated where they can be inferred; older saves did not record every historical purchase exactly. Progress stays in this browser; active expeditions still are not saved.",
      ),
    ],
  ];
}
type GuideTab = "faq" | "companions";
function skillsOf(catId: string): { ability: Ability; locked: boolean }[] {
  const cat = CATS.find((c) => c.id === catId)!;
  return [
    ...cat.abilities.map((ability) => ({ ability, locked: false })),
    { ability: SIGNATURE_ABILITIES[catId]!, locked: true },
    ...(catId === "clover" ? [{ ability: REVIVE_ABILITY, locked: true }] : []),
  ];
}
function usageText(ability: Ability, t: Translate): string {
  if (ability.roomLimit)
    return t("{uses} per room", { uses: plural(t, ability.roomLimit, "use") });
  const limit = abilityLimit(ability);
  return Number.isFinite(limit)
    ? t("Up to {uses} per turn", { uses: plural(t, limit, "use") })
    : t("Limited by shared AP");
}
export function Faq({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const [tab, setTab] = useState<GuideTab>("faq");
  const entries = buildEntries(t);
  const tabs: { id: GuideTab; label: string }[] = [
    { id: "faq", label: t("Frequently Asked Questions") },
    { id: "companions", label: t("Companions") },
  ];
  return (
    <main className="field-guide">
      <header className="guide-heading">
        <div>
          <span className="eyebrow">
            {t("THE BURROW ARCHIVES / RULES & ANSWERS")}
          </span>
          <h1>{t("Field Guide")}</h1>
          <p>{t("Know your claws. Know your odds.")}</p>
        </div>
        <button onClick={onClose}>{t("Back to game")}</button>
      </header>
      <div
        className="guide-tabs"
        role="tablist"
        aria-label={t("Field guide sections")}
      >
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            id={`guide-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`guide-panel-${id}`}
            className={tab === id ? "guide-tab active" : "guide-tab"}
            onClick={() => setTab(id)}
          >
            {label}
            <span aria-hidden="true">{tab === id ? "▾" : "▸"}</span>
          </button>
        ))}
      </div>
      {tab === "faq" && (
        <section
          role="tabpanel"
          id="guide-panel-faq"
          aria-labelledby="guide-tab-faq"
          aria-label={t("Frequently asked questions")}
          className="faq-entries"
        >
          {entries.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </section>
      )}
      {tab === "companions" && (
        <section
          role="tabpanel"
          id="guide-panel-companions"
          aria-labelledby="guide-tab-companions"
          className="guide-companions"
        >
          <h2>{t("Companion training & skills")}</h2>
          {CATS.map((cat) => (
            <article key={cat.id}>
              <h3>
                {cat.name} · {t(cat.role)}
              </h3>
              <ol
                className="rank-track"
                aria-label={t("{name} training ranks", { name: cat.name })}
              >
                {trainingTrack(cat.id).map((row) => (
                  <li key={row.rank}>
                    <strong>{t("Rank {n}", { n: row.rank })}</strong>
                    <h4>{t(row.title)}</h4>
                    <p>{t(row.description)}</p>
                    <span className="rank-cost">
                      {t("{cost} gold · permanent training", {
                        cost: trainingCost(row.rank - 1),
                      })}
                    </span>
                  </li>
                ))}
              </ol>
              <h4 className="skills-heading">{t("Skills")}</h4>
              <ul
                className="skill-cards"
                aria-label={t("{name} skills", { name: cat.name })}
              >
                {skillsOf(cat.id).map(({ ability, locked }) => (
                  <li className="ability-card" key={ability.id}>
                    <AbilityHead ability={ability} power={ability.power} />
                    {locked && (
                      <span className="ability-unlock">
                        {t("Unlocks at rank 3")}
                      </span>
                    )}
                    {ability.cooldownTurns ? (
                      <span className="ability-cooldown">
                        {cooldownText(ability.cooldownTurns, 0, t)}
                      </span>
                    ) : null}
                    <span className="ability-usage">
                      {usageText(ability, t)}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
