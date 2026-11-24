import { translateEngine } from "./engineText";
import { useT } from "./i18n";
import { ROOM_HEAL } from "./progression";
import { roomReward } from "./expeditions";
import type { Run } from "./game";
import type { IntentEntry } from "./IntentArrows";

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
              {t("Room reward: +{gold} gold, +{xp} XP and {item}.", {
                gold: roomReward(run.room, run.expedition).gold,
                xp: roomReward(run.room, run.expedition).xp,
                item: t(run.items[run.items.length - 1] ?? ""),
              })}
            </p>
            <p>
              {t(
                "Added to expedition loot. Gold, XP and items are banked after defeating the boss and returning to the lobby.",
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
          <button className="primary" onClick={onContinue}>
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
          {run.status === "victory" && (
            <p>
              {t(
                "All companions are fully healed and combat effects are cleared. Your next expedition starts at full HP.",
              )}
            </p>
          )}
          <button className="primary" onClick={onLeave}>
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

/** Tells who an enemy's visible thread points at, so it is not read as the hit just seen. */
export function NextTarget({
  run,
  entries,
  enemyId,
}: {
  run: Run;
  entries: IntentEntry[];
  enemyId: string;
}) {
  const { t } = useT();
  const intent = entries.find((entry) => entry.enemyId === enemyId)?.intent;
  const cat = run.party.find((unit) => unit.id === intent?.targetId);
  const ally = run.enemies.find((unit) => unit.id === intent?.allyId);
  if (cat)
    return (
      <span className="next-target">
        {t("Next target: {name}", { name: t(cat.name) })}
      </span>
    );
  if (ally)
    return (
      <span className="next-target friendly">
        {t("Next: supports {name}", { name: t(ally.name) })}
      </span>
    );
  return null;
}
