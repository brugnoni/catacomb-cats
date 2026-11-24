import { AbilityButton } from "./AbilityButton";
import { BattleResult, FieldNotes } from "./BattleParts";
import { Combatant } from "./Combatant";
import { turnView } from "./battleView";
import { useCombatFeedback } from "./useCombatFeedback";
import { useThreatPreview } from "./useThreatPreview";
import { useEffect, useRef, useState } from "react";
import { IntentArrows } from "./IntentArrows";
import { useEnemyPhase } from "./useEnemyPhase";
import { pace } from "./storage";

import { useT } from "./i18n";
import { ROOM_NAMES as roomNames, ROOM_PATH, difficultyLabel } from "./uiText";

import { endTurn, isDamaging, type Ability, type Run } from "./game";

/** How long the controls stay locked after an action, so its effects can be read. */
const ACTION_MS = 700;

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
  // The round the screen showed before the last action, so a new round gets its banner.
  const [fromRound, setFromRound] = useState(0);
  const phase = useEnemyPhase(run, fromRound);
  const { phasing, bannerRound, actingId, introShown } = phase;
  const view = turnView(run, target);
  const { currentId, current, units, canSelectFallen, nextCat, targetUnit } =
    view;
  const {
    previewing,
    noteEnemy,
    noteIntent,
    arrowEntries,
    markedIds,
    aimedIds,
    hoverProps,
    setAim,
  } = useThreatPreview(run, target, view, phasing);
  const feedback = useCombatFeedback(run, phase);
  // A short pause after each action so its animations can be followed.
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => setBusy(false), pace(ACTION_MS));
    return () => clearTimeout(timer);
  }, [busy, run]);
  const applyCombatAction = (next: Run, ability?: Ability) => {
    if (next === run) return;
    setBusy(true);
    setFromRound(run.round);
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
            {introShown && (
              <div className="intro-banner" role="status">
                {t("The enemies strike first!")}
              </div>
            )}
            {bannerRound > 0 && (
              <div className="round-banner" role="status" key={bannerRound}>
                <span>{t("ROUND {n}", { n: bannerRound })}</span>
              </div>
            )}
            <div className="battle-team allies">
              {run.party.map((unit) => (
                <Combatant
                  key={unit.id}
                  unit={unit}
                  units={units}
                  taunting={run.tauntId === unit.id}
                  sprite={unit.id}
                  turn={unit.id === currentId ? "active" : ""}
                  targeted={unit.id === target}
                  marked={markedIds.has(unit.id)}
                  aimed={aimedIds.has(unit.id)}
                  feedback={feedback}
                  hover={hoverProps}
                  disabled={unit.hp <= 0 && !canSelectFallen}
                  onTarget={() => setTarget(unit.id)}
                >
                  {unit.id === currentId &&
                    run.status === "combat" &&
                    !phasing && (
                      <span
                        className="turn-banner"
                        key={`${run.round}:${run.turn}`}
                      >
                        {t("Your turn!")}
                      </span>
                    )}
                </Combatant>
              ))}
            </div>
            <div className="battle-team enemies">
              {run.enemies.map((unit) => (
                <Combatant
                  key={unit.id}
                  unit={unit}
                  units={units}
                  taunting={run.tauntId === unit.id}
                  sprite={unit.name}
                  turn={unit.id === actingId ? "acting" : ""}
                  targeted={unit.id === target}
                  marked={markedIds.has(unit.id)}
                  aimed={aimedIds.has(unit.id)}
                  feedback={feedback}
                  hover={hoverProps}
                  disabled={unit.hp <= 0}
                  onTarget={() => setTarget(unit.id)}
                />
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
                      / {Math.max(run.ap, run.maxAp)} {t("AP")}
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
                    locked={phasing || busy}
                    onAim={setAim}
                    onAct={applyCombatAction}
                  />
                ))}
                <button
                  className="quiet end-turn"
                  data-testid="end-turn"
                  disabled={phasing || busy}
                  onClick={() => applyCombatAction(endTurn(run))}
                >
                  {nextCat
                    ? t("Pass to {name}", { name: nextCat.name })
                    : t("End turn")}
                </button>
              </div>
            </section>
          )}
          {!phasing && (
            <BattleResult
              run={run}
              practice={practice}
              onContinue={onContinue}
              onLeave={onLeave}
            />
          )}
        </main>
        <FieldNotes run={run} onLeave={onLeave} />
      </div>
    </>
  );
}
