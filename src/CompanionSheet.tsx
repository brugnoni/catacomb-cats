import { useState } from "react";
import { AbilityHead } from "./AbilityCard";
import { cooldownText } from "./abilityText";
import { plural, useT, type Translate } from "./i18n";
import { Sprite } from "./Sprite";
import {
  CATS,
  SIGNATURE_ABILITIES,
  REVIVE_ABILITY,
  abilityLimit,
  type Ability,
} from "./game";
import { trainingTrack, trainingCost } from "./progression";

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

/** The Field Guide's Companions section: pick a cat, see its skills and the eight training ranks. */
export function CompanionSheet() {
  const { t } = useT();
  const [catId, setCatId] = useState("miso");
  const cat = CATS.find((c) => c.id === catId)!;
  return (
    <>
      <div
        className="guide-cats"
        role="tablist"
        aria-label={t("Choose a companion")}
      >
        {CATS.map(({ id, name }) => (
          <button
            key={id}
            role="tab"
            id={`cat-tab-${id}`}
            aria-selected={cat.id === id}
            aria-controls="guide-cat-sheet"
            className={cat.id === id ? "guide-tab active" : "guide-tab"}
            onClick={() => setCatId(id)}
          >
            <Sprite id={id} />
            {name}
          </button>
        ))}
      </div>
      <article
        role="tabpanel"
        id="guide-cat-sheet"
        aria-labelledby={`cat-tab-${cat.id}`}
        className="guide-cat"
      >
        <h3>
          {cat.name} · {t(cat.role)}
        </h3>
        <div className="cat-sheet">
          <Sprite id={cat.id} name={cat.name} className="guide-sprite" />
          <div>
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
                  <span className="ability-usage">{usageText(ability, t)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <h4 className="skills-heading">{t("Training ranks")}</h4>
        <ol
          className="rank-track guide-ranks"
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
      </article>
    </>
  );
}
