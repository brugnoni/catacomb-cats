import { useState } from "react";
import { useT } from "./i18n";
import { CATS, ITEMS, ITEM_BONUS, equip, type Progress } from "./game";
import { itemBonusText } from "./uiText";

/** The one Companion whose skills a Trinket improves; undefined when anyone gains. */
function bestOn(item: string): string | undefined {
  const bonus = ITEM_BONUS[item] ?? {};
  if (bonus.healing) return "Mei";
  if (bonus.guard) return "Miso";
  if (bonus.fury) return "Luna";
  return undefined;
}

/** Every Trinket in the camp: pick one, then the Companion who wears it. */
export function Bag({
  progress,
  onStore,
}: {
  progress: Progress;
  onStore: (next: Progress) => void;
}) {
  const { t } = useT();
  const [picked, setPicked] = useState("");
  const wearer = CATS.find((cat) => progress.equipment[cat.id] === picked);
  const owned = ITEMS.filter((item) => progress.inventory.includes(item));
  return (
    <section className="bag" aria-labelledby="bag-heading">
      <h3 id="bag-heading">
        {t("Bag · {n}/{max} Trinkets", { n: owned.length, max: ITEMS.length })}
      </h3>
      <ul className="bag-grid">
        {ITEMS.map((item) => {
          if (!progress.inventory.includes(item))
            return (
              <li key={item}>
                <button disabled aria-label={t("Undiscovered Trinket")}>
                  ?
                </button>
              </li>
            );
          const on = CATS.find((cat) => progress.equipment[cat.id] === item);
          const best = bestOn(item);
          return (
            <li key={item}>
              <button
                aria-pressed={picked === item}
                onClick={() => setPicked(picked === item ? "" : item)}
              >
                <strong>{t(item)}</strong>
                <span>{itemBonusText(item, t)}</span>
                <small>
                  {best ? t("Best on {name}", { name: best }) : t("Anyone")}
                  {on && ` · ${t("Worn by {name}", { name: on.name })}`}
                </small>
              </button>
            </li>
          );
        })}
      </ul>
      {picked ? (
        <div className="bag-actions">
          {CATS.map((cat) => (
            <button
              key={cat.id}
              disabled={wearer === cat}
              onClick={() => {
                onStore(equip(progress, cat.id, picked));
                setPicked("");
              }}
            >
              {t("Give to {name}", { name: cat.name })}
            </button>
          ))}
          <button
            className="quiet"
            disabled={!wearer}
            onClick={() => {
              onStore(equip(progress, wearer!.id, ""));
              setPicked("");
            }}
          >
            {t("Take off")}
          </button>
        </div>
      ) : (
        <p className="muted">{t("Pick a Trinket, then who wears it.")}</p>
      )}
    </section>
  );
}
