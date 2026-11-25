import type { Translate } from "./i18n";

/**
 * The rules engine writes its log lines and refusal reasons in English. Each rule
 * matches one message shape and names the English template whose Spanish version
 * lives in the dictionary; captured groups fill {1}, {2}... and are translated
 * themselves when they are names (enemies, skills, items, labels).
 */
export const RULES: [RegExp, string][] = [
  [/^The descent begins\. (.+)\.$/, "The descent begins. {1}."],
  [
    /^Room rewards: \+(\d+) gold, \+(\d+) XP\. Spoils are banked when the boss is defeated\.$/,
    "Room rewards: +{1} gold, +{2} XP. Spoils are banked when the boss is defeated.",
  ],
  [/^Trinket found: (.+)\.$/, "Trinket found: {1}."],
  [
    /^No new Trinket to find: \+(\d+) gold\.$/,
    "No new Trinket to find: +{1} gold.",
  ],
  [
    /^Expedition Strength \+1: all damage is now \+(\d+) for the rest of this run\.$/,
    "Expedition Strength +1: all damage is now +{1} for the rest of this run.",
  ],
  [
    /^(.+) fully recovers after expedition victory \((\d+)\/(\d+) HP\)\.$/,
    "{1} fully recovers after expedition victory ({2}/{3} HP).",
  ],
  [
    /^(.+) resurrects at 25% HP \((\d+)\/(\d+)\); no additional room recovery\.$/,
    "{1} resurrects at 25% HP ({2}/{3}); no additional room recovery.",
  ],
  [
    /^(.+) recovers (\d+) HP \((\d+)\/(\d+)\)\.$/,
    "{1} recovers {2} HP ({3}/{4}).",
  ],
  [/^The Hollow King is defeated!$/, "The Hollow King is defeated!"],
  [
    /^Room cleared\. Choose your next descent\.$/,
    "Room cleared. Choose your next descent.",
  ],
  [
    /^Your expedition has fallen\. Permanent upgrades remain\.$/,
    "Your expedition has fallen. Permanent upgrades remain.",
  ],
  [/^(.+)'s Guard fades\.$/, "{1}'s Guard fades."],
  [/^(.+) is no longer cursed\.$/, "{1} is no longer cursed."],
  [/^(.+) lifts the curse on (.+)\.$/, "{1} lifts the curse on {2}."],
  [
    /^(.+)'s taunt ends at the start of their turn\.$/,
    "{1}'s taunt ends at the start of their turn.",
  ],
  [
    /^(.+) restores a (\d+) shield for (\d+) turns\.$/,
    "{1} restores a {2} shield for {3} turns.",
  ],
  [
    /^(.+) gains a (\d+) shield for (\d+) turns\.$/,
    "{1} gains a {2} shield for {3} turns.",
  ],
  [
    /^(.+) renews Inspired \+(\d+) for (\d+) turns\.$/,
    "{1} renews Inspired +{2} for {3} turns.",
  ],
  [
    /^(.+) gains Inspired \+(\d+) for (\d+) turns\.$/,
    "{1} gains Inspired +{2} for {3} turns.",
  ],
  [
    /^(.+) hits (.+): (\d+) damage \((\d+) attack power, (\d+) armor, (\d+) Guard blocked, (\d+) Ice Ward blocked; (\d+)\/(\d+) HP\)\.$/,
    "{1} hits {2}: {3} damage ({4} attack power, {5} armor, {6} Guard blocked, {7} Ice Ward blocked; {8}/{9} HP).",
  ],
  [
    /^(.+) triggers Soothing Spirit: \+(\d+) HP \((\d+) charges left; (\d+)\/(\d+) HP\)\.$/,
    "{1} triggers Soothing Spirit: +{2} HP ({3} charges left; {4}/{5} HP).",
  ],
  [
    /^(.+) reflects (\d+) damage to (.+) \((\d+)\/(\d+) HP\)\.$/,
    "{1} reflects {2} damage to {3} ({4}/{5} HP).",
  ],
  [
    /^(.+) heals (.+): \+(\d+) HP \((\d+) healing power; (\d+)\/(\d+) HP\)\.$/,
    "{1} heals {2}: +{3} HP ({4} healing power; {5}/{6} HP).",
  ],
  [
    /^(.+) heals (.+): \+(\d+) HP \((\d+)\/(\d+)\)\.$/,
    "{1} heals {2}: +{3} HP ({4}/{5}).",
  ],
  [
    /^(.+) raises Mirror spores: reflect (\d+) damage for 2 turns \(does not stack\)\.$/,
    "{1} raises Mirror spores: reflect {2} damage for 2 turns (does not stack).",
  ],
  [
    /^(.+) curses (.+): -(\d+) to all skill output for 2 turns \(active -(\d+)\)\.$/,
    "{1} curses {2}: -{3} to all skill output for 2 turns (active -{4}).",
  ],
  [
    /^(.+) revives (.+) at 60% HP \((\d+)\/(\d+)\)\. They act next round\.$/,
    "{1} revives {2} at 60% HP ({3}/{4}). They act next round.",
  ],
  [
    /^(.+) taunts: enemies attack this cat until its next turn\.$/,
    "{1} taunts: enemies attack this cat until its next turn.",
  ],
  [
    /^(.+) expands the reservoir: \+2 current and maximum shared AP for this room \((\d+)\/(\d+) AP after the 1 AP cost\)\.$/,
    "{1} expands the reservoir: +2 current and maximum shared AP for this room ({2}/{3} AP after the 1 AP cost).",
  ],
  [
    /^Entering room (\d+)\. Expedition Strength remains \+(\d+) damage\.$/,
    "Entering room {1}. Expedition Strength remains +{2} damage.",
  ],
  [
    /^(.+) passes: no usable skills left this turn\.$/,
    "{1} passes: no usable skills left this turn.",
  ],
  [
    /^(.+) automatically passes: no shared AP remain\.$/,
    "{1} automatically passes: no shared AP remain.",
  ],
  [
    /^(.+) has no usable skills left and passes\.$/,
    "{1} has no usable skills left and passes.",
  ],
  [
    /^Second Wind! (.+) rises at (\d+)% HP \((\d+)\/(\d+)\)\. It works once per expedition\.$/,
    "Second Wind! {1} rises at {2}% HP ({3}/{4}). It works once per expedition.",
  ],
  [
    /^(.+) scores a critical hit on (.+)!$/,
    "{1} scores a critical hit on {2}!",
  ],
  [
    /^(.+) lands a critical heal on (.+)!$/,
    "{1} lands a critical heal on {2}!",
  ],
  [/^(.+) misses (.+)!$/, "{1} misses {2}!"],
  [/^(.+) evades (.+)'s attack!$/, "{1} evades {2}'s attack!"],
  [/^(.+) drains (\d+) HP from (.+)\.$/, "{1} drains {2} HP from {3}."],
  [/^(.+) uses (.+)\.$/, "{1} uses {2}."],
  // Refusal reasons shown on skill buttons.
  [/^Not your turn$/, "Not your turn"],
  [/^Not enough shared AP$/, "Not enough shared AP"],
  [/^Turn limit reached$/, "Turn limit reached"],
  [/^Already used this room$/, "Already used this room"],
  [/^No living caster$/, "No living caster"],
  [
    /^This skill targets the caster or whole group$/,
    "This skill targets the caster or whole group",
  ],
  [
    /^All living allies are already at full HP$/,
    "All living allies are already at full HP",
  ],
  [/^Choose a fallen ally to revive$/, "Choose a fallen ally to revive"],
  [/^Choose a living (enemy|ally)$/, "Choose a living {1}"],
  [/^Already at full HP$/, "Already at full HP"],
  [/^Guard is already at full duration$/, "Guard is already at full duration"],
  [
    /^Inspired is already at full duration$/,
    "Inspired is already at full duration",
  ],
  [/^Cooldown: ready in (\d+) turn$/, "Cooldown: ready in {1} turn"],
  [/^Cooldown: ready in (\d+) turns$/, "Cooldown: ready in {1} turns"],
];
function name(t: Translate, text: string): string {
  const ascension = /^Ascension (\d+)$/.exec(text);
  return ascension ? t("Ascension {n}", { n: ascension[1]! }) : t(text);
}
/** The English template for a message, or undefined if no rule covers it. */
export function engineTemplate(text: string): string | undefined {
  for (const [pattern, template] of RULES)
    if (pattern.test(text)) return template;
  return undefined;
}
export function translateEngine(t: Translate, text: string): string {
  for (const [pattern, template] of RULES) {
    const match = pattern.exec(text);
    if (!match) continue;
    const params: Record<string, string> = {};
    match.slice(1).forEach((group, index) => {
      params[String(index + 1)] = name(t, group);
    });
    return t(template, params);
  }
  return text;
}
