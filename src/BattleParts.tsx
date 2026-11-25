import { translateEngine } from "./engineText";
import { RelicText } from "./RelicPick";
import { useT } from "./i18n";
import { ROOM_HEAL } from "./progression";
import { roomReward } from "./expeditions";
import type { Run } from "./game";

/** Puts keyboard and screen reader users on a screen that just appeared. */
export const focusOnShow = (element: HTMLElement | null) =>
  element?.focus({ preventScroll: true });

/** The Trinket the room just dropped, if any. */
function DropLine({ run }: { run: Run }) {
  const { t } = useT();
  if (run.drop === undefined) return null;
  return (
    <p className="trinket-drop">
      {typeof run.drop === "number"
        ? t("No new Trinket to find: +{1} gold.", { 1: run.drop })
        : t("Trinket found: {1}.", { 1: t(run.drop) })}
    </p>
  );
}

/** What follows a fight: the room reward, the victory or the defeat. */
export function BattleResult({
  run,
  practice,
  onContinue,
  onLeave,
}: {
  run: Run;
  practice: boolean;
  onContinue: () => void;
  onLeave: () => void;
}) {
  const { t } = useT();
  return (
    <>
      {run.status === "reward" && (
        <section className="result">
          <span className="eyebrow">{t("CHAMBER CLEARED")}</span>
          <h2>{t("The way opens.")}</h2>
          <div className="reward-details">
            <p>
              {t("Room reward: +{gold} gold, +{xp} XP.", {
                gold: roomReward(run.room, run.expedition).gold,
                xp: roomReward(run.room, run.expedition).xp,
              })}
            </p>
            <DropLine run={run} />
            <p>
              {t(
                "Added to expedition loot. Gold, XP and items are banked when the boss is defeated.",
              )}
            </p>
            <p>
              {t(
                "Applied now: surviving cats recovered {pct}% of their max HP (at least {flat}). Fallen cats returned at 25% max HP, rounded up, without extra recovery. Expedition Strength increased by +1 to +{n} damage.",
                {
                  n: run.bonus,
                  pct: ROOM_HEAL.percent,
                  flat: ROOM_HEAL.flat,
                },
              )}
            </p>
            <p>
              {run.party
                .map((cat) => `${cat.name}: ${cat.hp}/${cat.maxHp} ${t("HP")}`)
                .join(" · ")}
            </p>
          </div>
          {practice && <p>{t("Practice rewards are not kept.")}</p>}
          <button className="primary" ref={focusOnShow} onClick={onContinue}>
            {practice ? t("Finish tutorial") : t("Continue to next room →")}
          </button>
        </section>
      )}
      {(run.status === "victory" || run.status === "defeat") && (
        <section className="result">
          <span className="eyebrow">
            {run.status === "victory"
              ? t("THE CROWN HAS FALLEN")
              : t("THE DARK TAKES ITS DUE")}
          </span>
          <h2>
            {run.status === "victory"
              ? t("The burrow has its heroes.")
              : t("Even brave cats need another try.")}
          </h2>
          <p>
            {run.status === "victory"
              ? t("Bring home {gold} gold, {xp} XP and your discoveries.", {
                  gold: run.gold,
                  xp: run.xp,
                })
              : t(
                  "Your permanent upgrades remain. Return home and choose a new team.",
                )}
          </p>
          {run.status === "victory" && <DropLine run={run} />}
          {run.status === "victory" && (
            <p>
              {t(
                "All companions are fully healed and combat effects are cleared. Your next expedition starts at full HP.",
              )}
            </p>
          )}
          <button className="primary" ref={focusOnShow} onClick={onLeave}>
            {t("Return to lobby")}
          </button>
        </section>
      )}
    </>
  );
}

/** The side journal: loot carried so far, the combat log and the retreat button. */
export function FieldNotes({
  run,
  onLeave,
}: {
  run: Run;
  onLeave: () => void;
}) {
  const { t } = useT();
  return (
    <aside className="journal">
      <span className="eyebrow">{t("FIELD NOTES")}</span>
      <h2>{t("The descent")}</h2>
      <div className="run-loot">
        {run.gold} {t("gold")} <span>/</span> {run.xp} XP
        <p>{t("Unbanked expedition loot · secured after boss victory.")}</p>
        <p>
          {t("Items: {list}", {
            list: run.items.map((item) => t(item)).join(", ") || t("None yet"),
          })}
        </p>
      </div>
      {run.relics.length > 0 && (
        <ul className="held-relics" aria-label={t("Relics")}>
          {run.relics.map((name) => (
            <li key={name}>
              <RelicText name={name} />
            </li>
          ))}
        </ul>
      )}
      {/* Screen readers hear the newest line; the list below is the history. */}
      <p className="sr-only" aria-live="polite" data-testid="announcer">
        {translateEngine(t, run.log.at(-1) ?? "")}
      </p>
      <ol className="log" aria-label={t("Combat log")}>
        {run.log.slice(-12).map((line, index) => (
          <li key={`${index}-${line}`}>{translateEngine(t, line)}</li>
        ))}
      </ol>
      <button className="quiet" onClick={onLeave}>
        {t("Retreat to lobby")}
      </button>
      <p className="muted">{t("Leave the expedition's spoils behind.")}</p>
    </aside>
  );
}
