import { Sprite } from "./Sprite";
import { useT } from "./i18n";
import {
  SIGNATURE_ABILITIES,
  buildCat,
  buyUpgrade,
  setSkin,
  SKINS,
  upgradeCost,
  trinketIdle,
  type Cat,
  type Progress,
} from "./game";
import { nextTrainingText } from "./uiText";

/** One companion in the camp: party toggle, trinket and training. */
export function CatCard({
  cat,
  progress,
  party,
  trainCap,
  capLabel,
  onChoose,
  onStore,
  onNotice,
}: {
  cat: Cat;
  progress: Progress;
  party: string[];
  /** Highest rank the unlocked Expeditions allow. */
  trainCap: number;
  /** Button text that explains the Rank cap once a rank has reached it. */
  capLabel: (rank: number) => string | undefined;
  onChoose: (catId: string) => void;
  onStore: (next: Progress) => void;
  onNotice: (message: string) => void;
}) {
  const { t } = useT();
  const rank = progress.catLevels[cat.id] ?? 0;
  const unit = buildCat(progress, cat.id);
  const nextTraining = nextTrainingText(cat.id, rank, t);
  return (
    <article
      className={`cat-card ${party.includes(cat.id) ? "selected" : "reserve"}`}
      key={cat.id}
    >
      <div className="portrait-stage">
        <Sprite id={cat.id} />
        <span className="selected-badge">
          {party.includes(cat.id) ? `0${party.indexOf(cat.id) + 1}` : "—"}
        </span>
      </div>
      <div className="cat-info">
        <div className="cat-name-line">
          <h3>{cat.name}</h3>
          <span className="cat-level">
            {t("RANK")} {rank}
          </span>
        </div>
        <div className="role">{t(cat.role)}</div>
        <div className="stats">
          <span>
            {unit.maxHp} <small>{t("HP")}</small>
          </span>
          <span>
            {unit.initiative} <small>{t("INIT")}</small>
          </span>
        </div>
        <div
          className="milestone-progress"
          aria-label={t("{name} skill unlock", {
            name: cat.name,
          })}
        >
          {rank >= 3
            ? t("New skill unlocked: {name}", {
                name: t(unit.abilities[2]?.name ?? ""),
              })
            : t("Rank 3 unlocks {name} · now {rank}/3", {
                name: t(SIGNATURE_ABILITIES[cat.id]!.name),
                rank,
              })}
        </div>
        <div className="card-actions">
          <button
            className={
              party.includes(cat.id) ? "party-toggle enrolled" : "party-toggle"
            }
            aria-pressed={party.includes(cat.id)}
            onClick={() => onChoose(cat.id)}
            disabled={!party.includes(cat.id) && party.length === 3}
          >
            {party.includes(cat.id)
              ? t("Remove from party")
              : t("Add to party")}
          </button>
          <div className="equipment-label trinket-worn" data-worn={cat.id}>
            <span>{t("TRINKET")}</span>
            <strong>
              {progress.equipment[cat.id]
                ? t(progress.equipment[cat.id]!)
                : t("Empty slot")}
            </strong>
            {trinketIdle(
              progress,
              cat.id,
              progress.equipment[cat.id] ?? "",
            ) && <small>{t("No effect on {name}", { name: cat.name })}</small>}
          </div>
          <label className="equipment-label">
            <span>{t("SKIN")}</span>
            <select
              aria-label={t("Skin for {name}", { name: cat.name })}
              value={progress.skins[cat.id] ?? 0}
              onChange={(event) =>
                onStore(setSkin(progress, cat.id, Number(event.target.value)))
              }
            >
              <option value={0}>{t("Original look")}</option>
              {SKINS[cat.id]!.map((name, i) => (
                <option value={i + 1} key={name}>
                  {t(name)}
                </option>
              ))}
            </select>
          </label>
          <p className="training-description" id={`training-${cat.id}`}>
            {nextTraining}
          </p>
          <button
            aria-describedby={`training-${cat.id}`}
            className="train-button quiet"
            onClick={() => {
              onNotice(
                t("{name} trained. {next} Ready for the next expedition.", {
                  name: cat.name,
                  next: nextTraining,
                }),
              );
              onStore(buyUpgrade(progress, cat.id));
            }}
            disabled={
              rank >= trainCap || progress.gold < upgradeCost(progress, cat.id)
            }
          >
            {capLabel(rank) ??
              t("Train {name} · {cost} gold", {
                name: cat.name,
                cost: upgradeCost(progress, cat.id),
              })}
          </button>
        </div>
      </div>
    </article>
  );
}
