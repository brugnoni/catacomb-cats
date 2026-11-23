import { LINE_FALLOFF, type Ability } from "./game";
import { GUARD_TURNS } from "./progression";
import { identityT, plural, type Translate } from "./i18n";

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
export const INSPIRED_TURNS = 3;

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
function kindLabel(kind: AbilityKind, t: Translate): string {
  switch (kind) {
    case "damage":
      return t("Damage");
    case "heal":
      return t("Heal");
    case "shield":
      return t("Shield");
    case "buff":
      return t("Buff");
    default:
      return t("Utility");
  }
}
function targetOf(ability: Ability, t: Translate): string {
  if (ability.effect === "heal-all") return t("All allies");
  if (ability.effect === "cleave") return t("All enemies");
  if (ability.effect === "line") return t("Line of enemies");
  switch (ability.target) {
    case "enemy":
      return t("1 enemy");
    case "ally":
      return t("1 ally");
    case "fallen-ally":
      return t("1 fallen ally");
    case "all-allies":
      return t("All allies");
    case "all-enemies":
      return t("All enemies");
    default:
      return t("Self");
  }
}
function textOf(
  ability: Ability,
  power: number,
  t: Translate,
): Pick<AbilityDescription, "text" | "note"> {
  switch (ability.effect) {
    case "pierce":
      return {
        text: t("Deal {power} damage to 1 enemy.", { power }),
        note: t("Ignores armor, shields and Ice Ward."),
      };
    case "line":
      return {
        text: t(
          "Hit 1 enemy for {power}, the one behind it for {second} and the next for {third}.",
          {
            power,
            second: Math.round(power * LINE_FALLOFF[1]),
            third: Math.round(power * LINE_FALLOFF[2]),
          },
        ),
      };
    case "cleave":
      return { text: t("Deal {power} damage to all enemies.", { power }) };
    case "heal":
      return { text: t("Heal 1 ally for {power} HP.", { power }) };
    case "heal-all":
      return {
        text: t("Heal all living allies for {power} HP each.", { power }),
      };
    case "revive":
      return {
        text: t("Revive a fallen ally at 60% max HP."),
        note: t("They act next round."),
      };
    case "guard":
      return {
        text: t("Shield 1 ally for {power}. Lasts {turns}.", {
          power,
          turns: plural(t, GUARD_TURNS, "turn"),
        }),
        note: t(
          "Refreshing this ability restores full shield and duration (does not stack).",
        ),
      };
    case "fury":
      return {
        text: t(
          "Inspire 1 ally: +{power} to damage, healing and shields. Lasts {turns}.",
          { power, turns: plural(t, INSPIRED_TURNS, "turn") },
        ),
        note: t(
          "Refreshing this ability restores the duration (does not stack).",
        ),
      };
    case "taunt":
      return {
        text: t("Enemies attack this cat until its next turn."),
        note: t("Also gives it a {power} shield. Lasts {turns}.", {
          power,
          turns: plural(t, GUARD_TURNS, "turn"),
        }),
      };
    case "ap":
      return {
        text: t("Gain +{power} AP now and each round in this room.", { power }),
        note: t("Once per room."),
      };
    default:
      return { text: t("Deal {power} damage to 1 enemy.", { power }) };
  }
}
function withLifesteal(
  d: Pick<AbilityDescription, "text" | "note">,
  ability: Ability,
  t: Translate,
) {
  if (!ability.lifesteal) return d;
  const drain = t("Heals the caster for {pct}% of the damage dealt.", {
    pct: ability.lifesteal,
  });
  return { ...d, note: d.note ? `${d.note} ${drain}` : drain };
}
export function describeAbility(
  ability: Ability,
  power: number,
  t: Translate = identityT,
): AbilityDescription {
  const kind = kindOf(ability);
  return {
    kind,
    kindLabel: kindLabel(kind, t),
    targetLabel: targetOf(ability, t),
    ...withLifesteal(textOf(ability, power, t), ability, t),
  };
}
/** "Ready in 3 turns" while cooling down, "Cooldown: 2 turns" when ready. */
export function cooldownText(
  cooldownTurns: number,
  remaining: number,
  t: Translate = identityT,
) {
  return remaining > 0
    ? t("Ready in {turns}", { turns: plural(t, remaining, "turn") })
    : t("Cooldown: {turns}", { turns: plural(t, cooldownTurns, "turn") });
}
