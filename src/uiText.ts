import { HEARTH_TRACK, MAX_TRAINING_RANK, trainingTrack } from "./progression";
import type { Difficulty } from "./progression";
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
  const armor = Math.min(2, Math.floor(tier / 6));
  return t(
    "Enemies have +{hp}% HP, +{power} power and +{init} initiative. {extra}{armor}Based on victories, gold spent and mastery; fixed for this expedition.",
    {
      hp: tier * 8,
      power: Math.ceil(tier / 4),
      init: Math.floor(tier / 4),
      extra:
        tier >= 10
          ? t("2 extra reinforcements per room; ")
          : tier >= 5
            ? t("1 extra reinforcement per room; ")
            : "",
      armor: armor > 0 ? t("armored foes gain +{n} armor. ", { n: armor }) : "",
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
    ? t("Rank {n} · {title}: {desc}", {
        n: next.rank,
        title: t(next.title),
        desc: t(next.description),
      })
    : t("No training available.");
}
export function nextHearthText(rank: number, t: Translate): string {
  if (rank >= MAX_TRAINING_RANK) return t("Maximum Hearth rank reached.");
  const next = HEARTH_TRACK[rank]!;
  return t("Rank {n} · {title}: {desc}", {
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
