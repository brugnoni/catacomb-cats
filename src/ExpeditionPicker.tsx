import { useT } from "./i18n";
import type { Progress } from "./game";
import { powerPoints } from "./progression";
import {
  EXPEDITIONS,
  expeditionById,
  expeditionReward,
  expeditionUnlocked,
  type Expedition,
} from "./expeditions";

/** The camp's list of Expeditions: reward, recommended Power and what keeps one locked. */
export function ExpeditionPicker({
  progress,
  selected,
  onSelect,
}: {
  progress: Progress;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useT();
  const power = powerPoints(progress);
  /** What a player still needs to know about an Expedition: how to open it, or how ready they are. */
  const note = (e: Expedition) => {
    if (e.unlock && !expeditionUnlocked(progress, e))
      return (
        <span className="locked-note">
          {t("Locked · win {name} {need} times ({have}/{need})", {
            name: t(expeditionById(e.unlock.from).name),
            need: e.unlock.wins,
            have: progress.expeditionWins[e.unlock.from] ?? 0,
          })}
        </span>
      );
    if (e.recommendedPower > power)
      return (
        <span className="power-warning">
          {t("Recommended Power {n}, you have {have}", {
            n: e.recommendedPower,
            have: power,
          })}
        </span>
      );
    return e.recommendedPower > 0 ? (
      <span>{t("Recommended Power {n}", { n: e.recommendedPower })}</span>
    ) : null;
  };
  return (
    <details className="expedition-picker">
      <summary>{t("Choose expedition")}</summary>
      <ul>
        {EXPEDITIONS.map((e) => {
          const open = expeditionUnlocked(progress, e);
          const loot = expeditionReward(e.id);
          return (
            <li key={e.id} data-expedition={e.id} data-locked={!open}>
              <button
                aria-pressed={e.id === selected}
                disabled={!open}
                onClick={() => onSelect(e.id)}
              >
                <strong>{t(e.name)}</strong>
                <span>{t(e.theme)}</span>
                <span>
                  {t("3 chambers · {gold} gold · {xp} XP", {
                    gold: loot.gold,
                    xp: loot.xp,
                  })}
                </span>
                {note(e)}
              </button>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
