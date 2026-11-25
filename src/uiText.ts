import { ITEM_BONUS } from "./game";
import {
  HEARTH_TRACK,
  MAX_TRAINING_RANK,
  tierFacts,
  trainingTrack,
  type Difficulty,
} from "./progression";
import type { Translate } from "./i18n";

export function difficultyLabel(difficulty: Difficulty, t: Translate): string {
  return difficulty.tier === 0
    ? t("First descent")
    : t("Ascension {n}", { n: difficulty.tier });
}
export function difficultyDescription(
  difficulty: Difficulty,
  t: Translate,
): string {
  const tier = difficulty.tier;
  if (tier === 0)
    return t(
      "Base encounters. Ascension begins after your first boss victory.",
    );
  const facts = tierFacts(tier);
  return t(
    "Enemies have +{hp}% HP, +{power} power and +{init} initiative. {extra}{armor}Based on victories, gold spent and mastery; fixed for this expedition.",
    {
      hp: facts.hpPercent,
      power: facts.power,
      init: facts.initiative,
      extra:
        facts.reinforcements > 1
          ? t("2 extra reinforcements per room; ")
          : facts.reinforcements === 1
            ? t("1 extra reinforcement per room; ")
            : "",
      armor:
        facts.armor > 0
          ? t("armored foes gain +{n} armor. ", { n: facts.armor })
          : "",
    },
  );
}
/** The next training rank for a cat, as one line in the chosen language. */
export function nextTrainingText(
  catId: string,
  rank: number,
  t: Translate,
): string {
  if (rank >= MAX_TRAINING_RANK) return t("Maximum training rank reached.");
  const next = trainingTrack(catId)[rank];
  return next
    ? t("Next rank {n} · {title}: {desc}", {
        n: next.rank,
        title: t(next.title),
        desc: t(next.description),
      })
    : t("No training available.");
}
export function nextHearthText(rank: number, t: Translate): string {
  if (rank >= MAX_TRAINING_RANK) return t("Maximum Hearth rank reached.");
  const next = HEARTH_TRACK[rank]!;
  return t("Next rank {n} · {title}: {desc}", {
    n: next.rank,
    title: t(next.title),
    desc: t(next.description),
  });
}
export const ROOM_NAMES = [
  "Whispering entrance",
  "The forgotten hall",
  "The king beneath",
];
export const ROOM_PATH = ["Entrance", "Forgotten hall", "Boss chamber"];

/** The short stat label of a trinket, like "(+6 HP)". */
export function itemBonusText(item: string, t: Translate): string {
  const bonus = ITEM_BONUS[item] ?? {};
  const parts = [
    bonus.hp && t("+{n} HP", { n: bonus.hp }),
    bonus.initiative && t("+{n} INIT", { n: bonus.initiative }),
    bonus.attack && t("+{n} ATK", { n: bonus.attack }),
    bonus.healing && t("+{n} HEAL", { n: bonus.healing }),
    bonus.guard && t("+{n} GUARD", { n: bonus.guard }),
    bonus.fury && t("+{n} Inspired", { n: bonus.fury }),
  ];
  return `(${parts.filter(Boolean).join(", ")})`;
}
