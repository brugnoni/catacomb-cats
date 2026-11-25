import { useT } from "./i18n";
import { CATS, RELICS, type Run } from "./game";

/** One Relic: who it belongs to, what it gives and what it takes. */
export function RelicText({ name }: { name: string }) {
  const { t } = useT();
  const relic = RELICS[name]!;
  const owner = CATS.find((cat) => cat.id === relic.companion);
  return (
    <>
      <strong>{t(name)}</strong>
      <small>{owner ? owner.name : t("Whole party")}</small>
      <span>{t(relic.text)}</span>
      {relic.drawback && (
        <span className="relic-drawback">{t(relic.drawback)}</span>
      )}
    </>
  );
}

/** The offer before a room: one of three must be picked. */
export function RelicPick({
  run,
  onPick,
  onLeave,
}: {
  run: Run;
  onPick: (name: string) => void;
  onLeave: () => void;
}) {
  const { t } = useT();
  return (
    <section className="relic-pick" aria-labelledby="relic-heading">
      <h2 id="relic-heading">{t("Choose a Relic")}</h2>
      <p>{t("It lasts until this expedition ends.")}</p>
      <div className="relic-cards">
        {run.offer.map((name) => (
          <button key={name} onClick={() => onPick(name)}>
            <RelicText name={name} />
          </button>
        ))}
      </div>
      <button className="quiet" onClick={onLeave}>
        {t("Retreat to lobby")}
      </button>
    </section>
  );
}
