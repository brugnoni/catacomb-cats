import { AbilityButton } from "./AbilityButton";
import { BattleResult, FieldNotes } from "./BattleParts";
import { useBattleView } from "./useBattleView";
import { useEffect, useRef, useState } from "react";
import { Sprite } from "./Sprite";
import { UnitEffects } from "./UnitEffects";
import { IntentArrows } from "./IntentArrows";

import { useT } from "./i18n";
import { ROOM_NAMES as roomNames, ROOM_PATH, difficultyLabel } from "./uiText";

import { endTurn, isDamaging, type Ability, type Run } from "./game";

/** How long the opening enemy hits wait before they are shown. */
const INTRO_MS = 1600;

/**
 * One battle: the field, the skills panel, results and the log. It owns the
 * purely visual state (selection, hover, previews) and remounts for every new
 * run or room, so none of that state leaks between fights.
 */
export function Battle({
  run,
  practice,
  onRun,
  onLeave,
  onContinue,
}: {
  run: Run;
  practice: boolean;
  onRun: (next: Run) => void;
  onLeave: () => void;
  onContinue: () => void;
}) {
  const { t } = useT();
  const [target, setTarget] = useState("");
  const battlefieldRef = useRef<HTMLDivElement>(null);
  // The enemies that strike first are shown after a short pause, so the hit is understood.
  const [intro, setIntro] = useState(() =>
    run.events.some((event) => event.type === "hit"),
  );
  useEffect(() => {
    if (!intro) return;
    const timer = setTimeout(() => setIntro(false), INTRO_MS);
    return () => clearTimeout(timer);
    // The pause only runs once, when the battle appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const {
    currentId,
    current,
    units,
    previewing,
    noteEnemy,
    noteIntent,
    arrowEntries,
    markedIds,
    flashProps,
    flashClass,
    critPop,
    hoverProps,
    shownHp,
    canSelectFallen,
    aimedIds,
    nextCat,
    targetUnit,
    setAim,
  } = useBattleView(run, target, intro);
  const applyCombatAction = (next: Run, ability?: Ability) => {
    if (next === run) return;
    const attacking = ability && isDamaging(ability);
    const sameTurn =
      next.status === "combat" &&
      next.room === run.room &&
      next.round === run.round &&
      next.turn === run.turn &&
      next.order[next.turn] === run.order[run.turn];
    const keepTarget =
      attacking &&
      sameTurn &&
      next.enemies.some((unit) => unit.id === target && unit.hp > 0);
    onRun(next);
    if (!keepTarget) setTarget("");
  };
  return (
    <>
      <header className="battle-header">
        <div>
          <span className="eyebrow">
            {t("THE HOLLOW BELOW / CHAMBER 0{n}", { n: run.room + 1 })}
          </span>
          <h1>{t(roomNames[run.room]!)}</h1>
          {practice && (
            <span className="practice-badge">
              {t("PRACTICE BATTLE · nothing is saved")}
            </span>
          )}
        </div>
      </header>
      <div
        className="difficulty-banner"
        aria-label={t("Active expedition difficulty")}
      >
        {difficultyLabel(run.difficulty, t)} · {t("Threat")}{" "}
        {run.difficulty.tier} · {t("Fixed for this expedition")} ·{" "}
        <strong className="expedition-strength">
          {t("Expedition Strength +{n} (+{n} damage to all cats)", {
            n: run.bonus,
          })}
        </strong>
      </div>
      <nav className="room-path" aria-label={t("Expedition progress")}>
        {ROOM_PATH.map((room, index) => (
          <span
            key={room}
            className={
              index === run.room ? "current" : index < run.room ? "cleared" : ""
            }
          >
            {index < run.room ? "×" : `0${index + 1}`} {t(room)}
          </span>
        ))}
      </nav>
      <div className="battle-layout">
        <main>
          <div
            className="battlefield"
            ref={battlefieldRef}
            data-previewing={previewing ? "true" : "false"}
          >
            {intro && (
              <div className="intro-banner" role="status">
                {t("The enemies strike first!")}
              </div>
            )}
            <div className="battle-team allies">
              {run.party.map((unit) => (
                <article
                  key={unit.id}
                  data-unit={unit.id}
                  className={`combatant ${unit.id === currentId ? "active" : ""} ${unit.hp <= 0 ? "dead" : ""} ${unit.id === target ? "targeted" : ""} ${markedIds.has(unit.id) ? "marked" : ""} ${unit.guard > 0 && unit.hp > 0 ? "guarded" : ""} ${aimedIds.has(unit.id) ? "aimed" : ""} ${flashClass(unit.id)}`}
                  {...flashProps(unit.id)}
                  {...hoverProps(unit.id)}
                >
                  {critPop(unit.id)}
                  <UnitEffects
                    unit={unit}
                    units={units}
                    taunting={run.tauntId === unit.id}
                  />
                  <button
                    className="unit-target"
                    aria-label={t("Target {name}", {
                      name: t(unit.name),
                    })}
                    aria-pressed={target === unit.id}
                    onClick={() => setTarget(unit.id)}
                    disabled={unit.hp <= 0 && !canSelectFallen}
                  >
                    <Sprite id={unit.id} />
                  </button>
                  <h3>{t(unit.name)}</h3>
                  <div className="health">
                    <span
                      style={{
                        width: `${(shownHp(unit) / unit.maxHp) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="health-value">
                    {shownHp(unit)} / {unit.maxHp} {t("HP")}
                  </span>
                </article>
              ))}
            </div>
            <div className="battle-team enemies">
              {run.enemies.map((unit) => (
                <article
                  key={unit.id}
                  data-unit={unit.id}
                  className={`combatant ${unit.hp <= 0 ? "dead" : ""} ${unit.id === target ? "targeted" : ""} ${markedIds.has(unit.id) ? "marked" : ""} ${unit.guard > 0 && unit.hp > 0 ? "guarded" : ""} ${aimedIds.has(unit.id) ? "aimed" : ""} ${flashClass(unit.id)}`}
                  {...flashProps(unit.id)}
                  {...hoverProps(unit.id)}
                >
                  {critPop(unit.id)}
                  <UnitEffects
                    unit={unit}
                    units={units}
                    taunting={run.tauntId === unit.id}
                  />
                  <button
                    className="unit-target"
                    aria-label={t("Target {name}", {
                      name: t(unit.name),
                    })}
                    aria-pressed={target === unit.id}
                    onClick={() => setTarget(unit.id)}
                    disabled={unit.hp <= 0}
                  >
                    <Sprite id={unit.name} />
                  </button>
                  <h3>{t(unit.name)}</h3>
                  <div className="health">
                    <span
                      style={{
                        width: `${(unit.hp / unit.maxHp) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="health-value">
                    {unit.hp} / {unit.maxHp} {t("HP")}
                  </span>
                </article>
              ))}
            </div>
            <IntentArrows
              containerRef={battlefieldRef}
              entries={arrowEntries}
              version={run.eventId}
            />
          </div>
          <div className="initiative" aria-label={t("Initiative order")}>
            <span className="queue-label">{t("TURN ORDER")}</span>
            {run.order.map((id) => (
              <span
                className={`${id === currentId ? "current" : ""} ${units.find((unit) => unit.id === id)?.hp === 0 ? "fallen" : ""}`}
                key={id}
              >
                {t(units.find((unit) => unit.id === id)?.name ?? id)}
              </span>
            ))}
          </div>
          {run.status === "combat" && (
            <section className="command-deck">
              <div className="command-heading">
                <span className="eyebrow">{t("YOUR MOVE")}</span>
                <h2>{current?.name ?? t("Enemy")}</h2>
                <p>
                  {canSelectFallen
                    ? t("Heal your team or select a fallen ally to revive.")
                    : targetUnit
                      ? t("Target: {name}", { name: t(targetUnit.name) })
                      : t("Click a character to target, then pick an action.")}
                </p>
                {noteEnemy && noteIntent && (
                  <p className="intent-note" data-testid="intent-note">
                    {t("{name} next turn:", { name: t(noteEnemy.name) })}{" "}
                    <strong>{t(noteIntent.label)}</strong>
                    {noteIntent.targetId &&
                      ` → ${run.party.find((u) => u.id === noteIntent.targetId)?.name}${noteIntent.redirected ? ` (${t("Taunt")})` : ""}`}
                    {noteIntent.allyId &&
                      ` → ${t(run.enemies.find((u) => u.id === noteIntent.allyId)?.name ?? "")}`}
                    {!noteIntent.targetId &&
                      !noteIntent.allyId &&
                      noteIntent.kind === "attack" &&
                      ` → ${t("a new random cat")}`}
                  </p>
                )}
              </div>
              <div className="actions">
                <div
                  className="round-counter"
                  aria-label={t("Shared AP")}
                  title={t(
                    "Ability points are shared by the whole party, not owned by one cat.",
                  )}
                >
                  <span className="ap-label">{t("SHARED AP")}</span>
                  <span>{t("ROUND {n}", { n: run.round })}</span>
                  <strong>
                    {run.ap}
                    <small>
                      {" "}
                      / {run.maxAp} {t("AP")}
                    </small>
                  </strong>
                  <span className="ap-note">
                    {t("Shared by all your cats")}
                  </span>
                  <span className="ap-pips" aria-hidden="true">
                    {Array.from(
                      { length: Math.max(run.ap, run.maxAp) },
                      (_, index) => (
                        <i key={index} className={index < run.ap ? "on" : ""} />
                      ),
                    )}
                  </span>
                </div>
                {current?.abilities.map((ability) => (
                  <AbilityButton
                    key={ability.id}
                    run={run}
                    current={current}
                    ability={ability}
                    target={target}
                    locked={intro}
                    onAim={setAim}
                    onAct={applyCombatAction}
                  />
                ))}
                <button
                  className="quiet end-turn"
                  data-testid="end-turn"
                  disabled={intro}
                  onClick={() => applyCombatAction(endTurn(run))}
                >
                  {nextCat
                    ? t("Pass to {name}", { name: nextCat.name })
                    : t("End turn")}
                </button>
              </div>
            </section>
          )}
          <BattleResult
            run={run}
            practice={practice}
            onContinue={onContinue}
            onLeave={onLeave}
          />
        </main>
        <FieldNotes run={run} onLeave={onLeave} />
      </div>
    </>
  );
}
