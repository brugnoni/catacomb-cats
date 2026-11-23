import {
  CATS,
  SIGNATURE_ABILITIES,
  REVIVE_ABILITY,
  abilityLimit,
  type Ability,
} from "./game";
import {
  MAX_TRAINING_RANK,
  masteryLevel,
  trainingTrack,
  trainingCost,
} from "./progression";
function describeSkill(a: Ability): string {
  switch (a.effect) {
    case "heal":
      return `Restore up to ${a.power} HP to a living ally.`;
    case "heal-all":
      return `Restore up to ${a.power} HP to every living ally. No multi-turn cooldown.`;
    case "revive":
      return "Revive one fallen ally at 60% maximum HP. Only revival has a two-turn cooldown.";
    case "guard":
      return `Apply a ${a.power}-point shield. Eligible refreshes restore its full strength and duration.`;
    case "fury":
      return `Grant Inspired +${a.power} power to damage, healing and shields for three target turn starts.`;
    case "taunt":
      return "Draw enemy attacks until Miso’s next turn begins.";
    case "ap":
      return "Add 2 current and maximum shared AP for this room. Costs 1 AP; once per room.";
    case "pierce":
      return `Deal ${a.power} power to one enemy, ignoring armor but not shields.`;
    case "cleave":
      return `Deal ${a.power} power to every living enemy.`;
    default:
      return `Deal ${a.power} power to one enemy.`;
  }
}
const entries = [
  [
    "How do turns and AP work?",
    "All living cats and monsters act in initiative order. Your team normally shares 6 AP each round. Each cat can use each 1 AP skill at most 3 times and each 2 AP skill at most twice during its own turn. Signature skills can have stricter limits, shown on the button. End turn leaves AP for later cats. Moonwell raises the team's AP ceiling for the current room only.",
  ],
  [
    "How do I equip or remove a trinket?",
    "Choose an owned item in a cat's TRINKET selector. Choose Empty slot to remove it; it stays in your inventory. Each item can belong to only one equipped cat at a time. Iron bell adds 6 maximum HP, Silk ribbon adds 3 initiative, and Lucky fang adds 1 attack damage.",
  ],
  [
    "What does Train buy now?",
    `Training develops each cat's role instead of adding the same stats to everyone. The lobby shows the next rank's exact gains before purchase. The first three ranks cost ${trainingCost(0)}, ${trainingCost(1)} and ${trainingCost(2)} gold: 100 gold total to unlock that cat's signature skill at rank 3. Later ranks improve statistics gradually; training stops at rank ${MAX_TRAINING_RANK}. Unlocks depend only on individual training, not XP or Hearth ranks. Changes apply to the next expedition.`,
  ],
  [
    "What does Miso's taunt do?",
    "At training rank 3, Miso learns a taunt. It costs 2 AP and can be used once per turn. Enemy damaging attacks target Miso while he is alive, until the start of his next turn. It does not redirect enemy support spells or curses. It adds no permanent armor and cannot protect the party after Miso falls.",
  ],
  [
    "How does Luna's AP skill work?",
    "At training rank 3, Luna learns an AP skill costing 1 AP, usable only once per room. It grants 2 current AP and raises the team's round AP maximum by 2 until that room ends. Casting therefore gives a net +1 current AP after the cost. Later rounds refill to 8 AP. Entering the next room resets the maximum to 6 and restores the skill's one room use. It cannot be repeated to generate unlimited AP.",
  ],
  [
    "What do the other signature skills do?",
    "Mei’s rank-3 unlock offers two actions: heal all living allies, or revive one fallen ally at 60% of maximum HP (rounded up). Both cost 3 AP. Only revival has a two-turn cooldown; party healing remains available within its AP and per-turn limits. Select a fallen cat directly or through the target selector before reviving. A revived cat rejoins the initiative queue next round. Pip unlocks a 2 AP armor-piercing attack. Ember unlocks a 3 AP attack against every living enemy. The skill buttons show current power, usage limits and cooldowns.",
  ],
  [
    "What does the Hearth blessing buy?",
    "Each Hearth rank adds 2 maximum HP to all cats in future expeditions, capped at rank 8. The lobby states the current gain and price. They do not unlock signature skills or boost attack damage. Hearth investment also counts toward future difficulty after a boss victory.",
  ],
  [
    "What is XP for?",
    `XP is permanent shared mastery, not a currency to spend. Every 150 total XP gives one mastery level, capped at 10. Each mastery level grants every cat +2 maximum HP. Every three mastery levels also grant +1 base power to attacks, healing, Guard and Inspired blessings. It does not alter AP generation, taunt, the fixed 60% resurrection amount or fixed training-passive values, and never unlocks a signature skill. For example, 135 XP is still mastery level ${masteryLevel(135)} with 135 / 150 progress. This slower growth keeps individual training meaningful.`,
  ],
  [
    "When can I refresh Inspired or a shield?",
    "Inspired and shields do not stack. A target with a full-duration effect cannot receive the same effect again, preventing accidental duplicate casts. Once that target's next turn begins and its duration decreases, you may refresh it. Refreshing a shield restores both its full effective shield points and its duration; it replaces the shield rather than adding to it. Inspired refreshes duration only and keeps its active potency. A completely depleted or expired shield can be applied anew. Full-health cats cannot receive a single-target heal; a party heal is blocked if no living ally needs healing. Invalid casts spend no AP or skill uses.",
  ],
  [
    "What does Inspired improve?",
    "Moon Blessing grants Inspired: its displayed bonus (normally +2) increases damage, healing and Guard for every class. Luna gains stronger spells, Mei stronger heals and Miso stronger shields. It also improves area damage and party healing. It does not increase AP generation, taunt, or the potency of another Inspired blessing, which prevents an endless chain of stronger blessings. Training can improve the native blessing amount. The effect counts down at the beginning of the affected cat’s next three turns; other units ending their turns do not reduce it.",
  ],
  [
    "How do Mei and Ember cooldowns work?",
    "Only Mei’s revival has a two-turn cooldown: revive on turn N, revival is unavailable on N+1 and N+2, and ready on N+3. Her rank-3 party heal and regular single-target heal have no multi-turn cooldown and remain available subject to AP and per-turn use limits. Using them does not change revival’s cooldown. Every Ember attack, including Claw strike, blocks that particular attack during his next turn and returns on the following turn. His attacks have separate cooldowns, so another ready attack can still be used. Cooldowns count only that cat’s turn starts, never other characters’ End turn clicks, and reset when entering a new room. Invalid casts do not start cooldowns or spend AP.",
  ],
  [
    "What do the new rank passives do?",
    "At rank 5, Miso and Ember gain an opening shield each room; Luna gains Ice Ward, reducing the next three incoming attacks by 2; Mei can recover 2 HP when an attack damages her and she survives, up to three times per room; Pip’s first damaging skill each room gains +2 power. Rank 8 improves these passives. Charges do not grow back mid-room, reflected damage cannot trigger healing loops, and healing response cannot revive a fallen cat. See each cat’s complete rank list below for exact changes and prices.",
  ],
  [
    "How do curses work?",
    "Some enemies reduce a cat's damage, healing or protection output by 1 or 2 for two turns of that cat. Output cannot go below zero. Reapplying a curse refreshes its duration without adding together penalties. Unit labels and Field Notes report the amount and duration.",
  ],
  [
    "What defenses and support do enemies have?",
    "Tank enemies can reduce damage with armor and absorb it with timed shields. Agile enemies act earlier. Warriors can strengthen their attacks; casters can protect allies or reflect damage, and healers can restore injured allies. Support actions replace that enemy's attack for the turn. Armor reduces incoming damage before shields; reflected damage is fixed return damage that bypasses armor and shields and cannot reflect again. Field Notes records the numerical result. Watch defenses and choose targets rather than spending every AP on the nearest enemy.",
  ],
  [
    "How does repeat-expedition difficulty work?",
    "Your first expedition has a fixed introductory difficulty. After your first boss victory, future expeditions become stronger based on recorded boss victories, total gold spent on upgrades and banked XP mastery. Buying upgrades or losing a run never lowers those recorded values. After the first victory, each boss win adds one tier, each 200 spent gold adds another, and each two mastery levels add another, up to tier 12. Enemy HP increases by 8% per tier; attack bonus is +1 for tiers 1–4, +2 for 5–8, and +3 for 9–12. Every four tiers add +1 initiative. Tier 5 adds one reinforcement per room and tier 10 adds a second; armored foes gain +1 armor at tiers 6 and 12. The lobby shows the next expedition's tier and modifiers; they are fixed when you enter and never change during combat. Each individual upgrade can still help within a tier. This is initial balance, not a promise that every team or strategy wins.",
  ],
  [
    "When exactly do I receive Expedition Loot?",
    "Room rewards are provisional, carried loot. Clearing a room DOES NOT add its gold, XP or items to your permanent lobby inventory. Room 1 adds 20 gold and 30 XP, room 2 adds 30 gold and 45 XP, and the boss adds 40 gold and 60 XP to the expedition's carried total. To keep the loot, defeat the final boss AND choose Return to lobby. Only then are the full 90 gold, 135 XP and discovered items banked. Defeat, retreat or reloading during a run loses carried loot; previously banked progress is preserved. Carried items cannot be equipped mid-run.",
  ],
  [
    "What applies immediately after a room?",
    "Room recovery and Expedition Strength are separate from carried loot. Clearing either of the first two rooms immediately restores up to 8 HP per surviving cat, capped at maximum HP, and grants +1 damage to all cat attacks for the rest of that run. They are already active on the reward screen. After either of the first two rooms, fallen cats revive at 25% maximum HP (rounded up, minimum 1 HP), without the extra +8 heal. Defeating the final boss fully heals and revives the whole party and clears combat effects, so the next expedition begins at full HP. If all cats fall before victory, the run is defeated and nobody revives. The strength stacks to +2 after room 2 and disappears when the run ends. Field Notes shows the actual HP restored.",
  ],
  [
    "What do the skill and Field Notes numbers mean?",
    "Previews show current skill power and, for a selected enemy, the actual expected HP damage after armor and remaining Guard. For example, 6 attack power against 2 armor deals 4 damage before Guard: an enemy at 1 HP dies if it has no shield. A shield with at least 4 points can absorb that hit completely. Damage is never reduced by the target’s low remaining HP before armor is calculated. Field Notes records actual HP lost and every defense applied. Healing is capped by missing HP.",
  ],
  [
    "Why does my target selection clear?",
    "Attacks keep the selected living enemy while the same cat can still act, so you can repeat attacks without reselecting. Healing, shields, blessings and other support actions clear selection. End turn and automatic turn changes also clear it. A defeated target or a room result clears the highlight too. Self and area skills need no target selection. Invalid actions preserve your choice.",
  ],
  [
    "When do timed effects lose a turn?",
    "Guard, Inspired, curses and reflection each count the affected unit’s turn starts, not End turn clicks by other units. A 2-turn Guard lasts until the protected cat begins its next turn (2 to 1), then expires at the beginning of that cat’s following turn (1 to 0). Guard can also be depleted by damage. Taunt ends exactly when Miso’s next turn begins or he is no longer alive. Hover or keyboard-focus an effect icon above a character to inspect its rules, value and remaining turn starts.",
  ],
  [
    "What happens when shared AP reaches zero?",
    "The current cat’s turn ends automatically. Other cats with zero shared AP are skipped; enemies still take their turns in initiative order. When a new round begins, shared AP refills to its current maximum (normally 6, or 8 with Moonwell), and control returns at the next living cat’s turn. This can change status durations when those particular units’ turns begin. Room victory or defeat stops the turn sequence immediately.",
  ],
  [
    "Will there be more expeditions?",
    "More rooms, selectable expeditions and objective-based unlocks are planned for a later iteration. For now The Hollow Below remains a three-room expedition with repeat-clear difficulty. No additional expedition is currently selectable or unlockable.",
  ],
  [
    "What happens to my existing save?",
    "Existing gold, XP, training ranks, Hearth ranks and equipment are kept. Their effects follow the new class and balance rules. Old boss-clear history and upgrade spending are migrated where they can be inferred; older saves did not record every historical purchase exactly. Progress stays in this browser; active expeditions still are not saved.",
  ],
];
export function Faq({ onClose }: { onClose: () => void }) {
  return (
    <main className="field-guide">
      <header className="guide-heading">
        <div>
          <span className="eyebrow">THE BURROW ARCHIVES / RULES & ANSWERS</span>
          <h1>Field Guide</h1>
          <p>Know your claws. Know your odds.</p>
        </div>
        <button onClick={onClose}>Back to game</button>
      </header>
      <section aria-label="Frequently asked questions" className="faq-entries">
        {entries.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </section>
      <section className="guide-companions">
        <h2>Companion training & skills</h2>
        {CATS.map((cat) => (
          <article key={cat.id}>
            <h3>
              {cat.name} · {cat.role}
            </h3>
            <ol
              className="rank-track"
              aria-label={`${cat.name} training ranks`}
            >
              {trainingTrack(cat.id).map((row) => (
                <li key={row.rank}>
                  <strong>Rank {row.rank}</strong>
                  <h4>{row.title}</h4>
                  <p>{row.description}</p>
                  <span className="rank-cost">
                    {trainingCost(row.rank - 1)} gold · permanent training
                  </span>
                </li>
              ))}
            </ol>
            {[
              ...cat.abilities,
              SIGNATURE_ABILITIES[cat.id]!,
              ...(cat.id === "clover" ? [REVIVE_ABILITY] : []),
            ].map((a) => (
              <p key={a.id}>
                <strong>{a.name}</strong> · {a.cost} AP. {describeSkill(a)}{" "}
                {a.cooldownTurns
                  ? `After use, skip the next ${a.cooldownTurns} own turn${a.cooldownTurns === 1 ? "" : "s"} before reuse. `
                  : ""}
                {a.roomLimit
                  ? `${a.roomLimit} use per room. `
                  : Number.isFinite(abilityLimit(a))
                    ? `Up to ${abilityLimit(a)} uses per turn when ready.`
                    : "Limited by shared AP."}
              </p>
            ))}
          </article>
        ))}
      </section>
    </main>
  );
}
