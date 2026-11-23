import type { Ability } from "./game";

export type AbilityKind = "damage" | "heal" | "shield" | "buff" | "utility";
export interface AbilityDescription {
  kind: AbilityKind;
  /** Short label for the kind chip, e.g. "Damage". */
  kindLabel: string;
  /** Short label for who it affects, e.g. "1 enemy". */
  targetLabel: string;
  /** One plain sentence saying what the ability does. */
  text: string;
  /** Optional second sentence for the one rule players must know. */
  note?: string;
}
const KIND_LABELS: Record<AbilityKind, string> = {
  damage: "Damage",
  heal: "Heal",
  shield: "Shield",
  buff: "Buff",
  utility: "Utility",
};
export const GUARD_TURNS = 2;
export const INSPIRED_TURNS = 3;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function kindOf(ability: Ability): AbilityKind {
  switch (ability.effect) {
    case "heal":
    case "heal-all":
    case "revive":
      return "heal";
    case "guard":
      return "shield";
    case "fury":
      return "buff";
    case "taunt":
    case "ap":
      return "utility";
    default:
      return "damage";
  }
}
function targetOf(ability: Ability): string {
  if (ability.effect === "heal-all") return "All allies";
  if (ability.effect === "cleave") return "All enemies";
  switch (ability.target) {
    case "enemy":
      return "1 enemy";
    case "ally":
      return "1 ally";
    case "fallen-ally":
      return "1 fallen ally";
    case "all-allies":
      return "All allies";
    case "all-enemies":
      return "All enemies";
    default:
      return "Self";
  }
}
function textOf(
  ability: Ability,
  power: number,
): Pick<AbilityDescription, "text" | "note"> {
  switch (ability.effect) {
    case "pierce":
      return { text: `Deal ${power} damage to 1 enemy. Ignores armor.` };
    case "cleave":
      return { text: `Deal ${power} damage to all enemies.` };
    case "heal":
      return { text: `Heal 1 ally for ${power} HP.` };
    case "heal-all":
      return { text: `Heal all living allies for ${power} HP each.` };
    case "revive":
      return {
        text: "Revive a fallen ally at 60% max HP.",
        note: "They act next round.",
      };
    case "guard":
      return {
        text: `Shield 1 ally for ${power}. Lasts ${plural(GUARD_TURNS, "turn")}.`,
        note: "Refreshing this ability restores full shield and duration (does not stack).",
      };
    case "fury":
      return {
        text: `Inspire 1 ally: +${power} to damage, healing and shields. Lasts ${plural(INSPIRED_TURNS, "turn")}.`,
        note: "Refreshing this ability restores the duration (does not stack).",
      };
    case "taunt":
      return { text: "Enemies attack this cat until its next turn." };
    case "ap":
      return {
        text: `Gain +${power} AP now and each round in this room.`,
        note: "Once per room.",
      };
    default:
      return { text: `Deal ${power} damage to 1 enemy.` };
  }
}
export function describeAbility(
  ability: Ability,
  power: number,
): AbilityDescription {
  const kind = kindOf(ability);
  return {
    kind,
    kindLabel: KIND_LABELS[kind],
    targetLabel: targetOf(ability),
    ...textOf(ability, power),
  };
}
/** "Ready in 3 turns" while cooling down, "Cooldown: 2 turns" when ready. */
export function cooldownText(cooldownTurns: number, remaining: number) {
  return remaining > 0
    ? `Ready in ${plural(remaining, "turn")}`
    : `Cooldown: ${plural(cooldownTurns, "turn")}`;
}
export { plural };
