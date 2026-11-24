import { CatCard } from "./CatCard";
import { ExpeditionPicker } from "./ExpeditionPicker";
import { Sprite } from "./Sprite";
import { useT } from "./i18n";
import { CATS, buyUpgrade, upgradeCost, type Progress } from "./game";
import {
  MAX_TRAINING_RANK,
  XP_PER_MASTERY,
  getDifficulty,
  masteryOf,
  powerPoints,
} from "./progression";
import {
  EXPEDITIONS,
  expeditionById,
  masteryCap,
  nextLockedExpedition,
  rankCap,
  totalWins,
} from "./expeditions";
import {
  difficultyDescription,
  difficultyLabel,
  nextHearthText,
} from "./uiText";

/** The camp: choose the party, train, equip, bless the Hearth and enter the dungeon. */
export function Lobby({
  progress,
  party,
  expedition,
  onExpedition,
  entering,
  onChoose,
  onStore,
  onNotice,
  onEnter,
}: {
  progress: Progress;
  party: string[];
  /** Id of the Expedition the next Run will enter. */
  expedition: string;
  onExpedition: (id: string) => void;
  /** True while the battle art loads, so the entrance is locked. */
  entering: boolean;
  onChoose: (catId: string) => void;
  onStore: (next: Progress) => void;
  onNotice: (message: string) => void;
  onEnter: () => void;
}) {
  const { t } = useT();
  const difficulty = getDifficulty(progress);
  const chosen = expeditionById(expedition);
  const mastery = masteryOf(progress);
  const masteryDone = mastery >= masteryCap(progress);
  const trainCap = rankCap(progress);
  const heldBack = nextLockedExpedition(progress);
  /** Button text that explains the Rank cap once `rank` has reached it. */
  const capLabel = (rank: number) =>
    heldBack && rank >= trainCap
      ? t("Unlock {name} to train further", { name: t(heldBack.name) })
      : undefined;
  return (
    <>
      <section
        className="burrow-scene"
        aria-label={t("The Burrow, your underground camp")}
      >
        <div className="scene-caption">
          <span className="eyebrow">{t("A fire worth coming home to")}</span>
          <h1>{t("The Burrow")}</h1>
          <p>{t("Pack light. Stay together.")}</p>
        </div>
        <div
          className="scene-party"
          aria-label={t("Selected expedition companions")}
        >
          {party.map((id) => (
            <div className="scene-companion" key={id}>
              <Sprite id={id} />
              <span>{CATS.find((cat) => cat.id === id)?.name}</span>
            </div>
          ))}
        </div>
        <div className="expedition-gate">
          <span className="eyebrow">
            {t("EXPEDITION 0{n}", { n: EXPEDITIONS.indexOf(chosen) + 1 })}
          </span>
          <h2>{t(chosen.name)}</h2>
          <p>{t("3 chambers · 1 crown")}</p>
          <ExpeditionPicker
            progress={progress}
            selected={expedition}
            onSelect={onExpedition}
          />
          <p className="difficulty-preview">
            {difficultyLabel(difficulty, t)} · {t("Threat")} {difficulty.tier}
          </p>
          <button
            className="primary"
            disabled={party.length !== 3 || entering}
            onClick={onEnter}
          >
            {t("Enter the dungeon →")}
          </button>
          <span className="gate-note">
            {party.length === 3
              ? t("Your party is ready.")
              : t(
                  party.length === 2
                    ? "Choose 1 more companion."
                    : "Choose {n} more companions.",
                  { n: 3 - party.length },
                )}
          </span>
        </div>
        <div className="scene-coordinate" aria-hidden="true">
          {t("SAFE HAVEN · NO ENEMIES DETECTED")}
        </div>
      </section>
      <div className="camp-desk">
        <section className="roster-dock" aria-labelledby="companions-heading">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t("Prepare your expedition")}</span>
              <h2 id="companions-heading">{t("The company")}</h2>
            </div>
            <span className="party-count">
              {party.length}
              <span> {t("/ 3 READY")}</span>
            </span>
          </div>
          <div className="xp-summary">
            <strong>
              {t("Company mastery · Rank {n}", {
                n: mastery,
              })}
            </strong>
            <span>
              {masteryDone
                ? t("Mastery cap reached")
                : t("{xp} / {max} XP to next level", {
                    xp: progress.xp % XP_PER_MASTERY,
                    max: XP_PER_MASTERY,
                  })}
            </span>
            <progress
              className="xp-progress"
              aria-label={t("Experience toward next level")}
              max={150}
              value={
                masteryDone ? XP_PER_MASTERY : progress.xp % XP_PER_MASTERY
              }
            />
            <p>
              {t(
                "Every 150 banked XP grants +2 max HP to all cats. Every third mastery level adds +1 power to attacks, healing, Guard and blessings. Mastery bonuses stop at level 10.",
              )}
            </p>
          </div>
          <div className="roster">
            {CATS.map((cat) => (
              <CatCard
                key={cat.id}
                cat={cat}
                progress={progress}
                party={party}
                trainCap={trainCap}
                capLabel={capLabel}
                onChoose={onChoose}
                onStore={onStore}
                onNotice={onNotice}
              />
            ))}
          </div>
        </section>
        <aside className="camp-upgrades">
          <span className="eyebrow">{t("At the hearth")}</span>
          <h2>{t("Leave a light on.")}</h2>
          <div className="hearth-symbol" aria-hidden="true">
            ♜
          </div>
          <p className="blessing-rank">
            {t("Hearth blessing · Rank {n}", {
              n: progress.generalLevel,
            })}
          </p>
          <p className="hearth-next">
            {nextHearthText(progress.generalLevel, t)}
          </p>
          <div
            className="difficulty-details"
            aria-label={t("Expedition difficulty")}
          >
            <h3>
              {difficultyLabel(difficulty, t)} · {t("Threat")} {difficulty.tier}
            </h3>
            <p>{difficultyDescription(difficulty, t)}</p>
            <p>
              {t("{wins} victories · Power {points} · Mastery {level}", {
                wins: totalWins(progress),
                points: powerPoints(progress),
                level: mastery,
              })}
            </p>
            <p>
              {t(
                "Difficulty is fixed when you enter. Future victories and permanent investment strengthen the next expedition.",
              )}
            </p>
          </div>
          <button
            onClick={() => onStore(buyUpgrade(progress))}
            disabled={
              progress.generalLevel >= trainCap ||
              progress.gold < upgradeCost(progress)
            }
          >
            {progress.generalLevel >= MAX_TRAINING_RANK
              ? t("Blessing complete")
              : (capLabel(progress.generalLevel) ??
                t("Improve blessing · {cost} gold", {
                  cost: upgradeCost(progress),
                }))}
          </button>
          <div className="camp-rule">
            {t("Upgrades stay.")}
            <br />
            {t("Dungeon spoils must make it home.")}
          </div>
        </aside>
      </div>
    </>
  );
}
