import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Sprite } from "./Sprite";
import { UnitEffects } from "./UnitEffects";
import { IntentArrows, type IntentEntry } from "./IntentArrows";
import { cooldownText, describeAbility } from "./abilityText";
import { AbilityHead } from "./AbilityCard";
import { translateEngine } from "./engineText";
import { useT } from "./i18n";
import { ROOM_NAMES as roomNames, ROOM_PATH, difficultyLabel } from "./uiText";
import { roomReward, ROOM_HEAL } from "./progression";
import {
  abilityLimit,
  abilityPower,
  abilityTargetUnavailableReason,
  abilityUnavailableReason,
  abilityUses,
  act,
  cooldownRemaining,
  damagePreview,
  endTurn,
  enemyIntent,
  isDamaging,
  type Ability,
  type Run,
  type Unit,
} from "./game";

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
  // At the start of every turn each enemy's threat shows alone, one after another.
  const [preview, setPreview] = useState({ key: "", step: 0 });
  // Hovering (or keyboard-focusing) a unit shows who threatens or helps whom.
  const [hovered, setHovered] = useState("");
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
  // Skill under the mouse or keyboard focus: its possible targets are outlined in yellow.
  const [aim, setAim] = useState("");
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
  const currentId = run?.order[run.turn];
  const current = run?.party.find((unit) => unit.id === currentId);
  const units = run ? [...run.party, ...run.enemies] : [];
  const selectedEnemy = run?.enemies.find(
    (unit) => unit.id === target && unit.hp > 0,
  );
  const turnKey =
    run?.status === "combat"
      ? `${run.id}:${run.room}:${run.round}:${currentId}`
      : "";
  // Enemies that threaten someone, in the order they will act (next one first).
  const threatening =
    run?.status === "combat"
      ? [...run.order.slice(run.turn + 1), ...run.order.slice(0, run.turn + 1)]
          .map((id) => run.enemies.find((e) => e.id === id && e.hp > 0))
          .filter((enemy) => {
            const intent = enemy && enemyIntent(run, enemy);
            return Boolean(intent?.targetId || intent?.allyId);
          })
          .map((enemy) => enemy!.id)
      : [];
  const previewSlot = Math.min(
    800,
    Math.floor(3000 / Math.max(1, threatening.length)),
  );
  const previewStep = preview.key === turnKey ? preview.step : 0;
  const previewId = turnKey ? threatening[previewStep] : undefined;
  // While the opening hits or the threat preview play, hovering shows nothing.
  const previewing =
    intro || (turnKey !== "" && previewStep < threatening.length);
  const hoverId = previewing ? "" : hovered;
  const hoveredEnemy = run?.enemies.find(
    (unit) => unit.id === hoverId && unit.hp > 0,
  );
  const noteEnemy = hoveredEnemy ?? selectedEnemy;
  const noteIntent = run && noteEnemy ? enemyIntent(run, noteEnemy) : undefined;
  const startPreview = useEffectEvent(() => {
    const timers = threatening.map((_, index) =>
      setTimeout(
        () => setPreview({ key: turnKey, step: index + 1 }),
        previewSlot * (index + 1),
      ),
    );
    return () => timers.forEach(clearTimeout);
  });
  useEffect(() => {
    if (!turnKey) return;
    return startPreview();
  }, [turnKey]);
  const arrowEntries: IntentEntry[] = [];
  if (run?.status === "combat")
    for (const enemy of run.enemies) {
      if (enemy.hp <= 0) continue;
      const intent = enemyIntent(run, enemy);
      if (!intent) continue;
      // Hovering an enemy shows its own plan; hovering anyone it attacks or helps shows it too.
      const related =
        hoverId !== "" &&
        (enemy.id === hoverId ||
          intent.targetId === hoverId ||
          intent.allyId === hoverId);
      if ((enemy.id === previewId && !intro) || related)
        arrowEntries.push({ enemyId: enemy.id, intent });
    }
  const markedIds = new Set(
    arrowEntries.flatMap(({ intent }) =>
      intent.targetId ? [intent.targetId] : [],
    ),
  );
  // Units hit or healed by the last action, in order, so each flash starts in turn.
  const flashes = new Map<
    string,
    { kind: "hit" | "heal"; index: number; crit: boolean }
  >();
  const pops = new Map<
    string,
    { text: string; kind: string; index: number }[]
  >();
  const addPop = (id: string, text: string, kind: string, index: number) =>
    pops.set(id, [...(pops.get(id) ?? []), { text, kind, index }]);
  if (!intro)
    run?.events.forEach((event, index) => {
      if (event.type === "hit" || event.type === "heal") {
        flashes.set(event.targetId, {
          kind: event.type,
          index,
          crit: Boolean(event.crit),
        });
        if (event.crit) addPop(event.targetId, t("CRITICAL!"), "crit", index);
      } else if (event.type === "avoid")
        addPop(
          event.targetId,
          event.kind === "miss" ? t("MISS!") : t("EVADED!"),
          "avoid",
          index,
        );
      else
        addPop(
          event.targetId,
          t("{name} ready!", { name: t(event.name) }),
          "ready",
          index,
        );
    });
  const flashProps = (id: string) => {
    const flash = flashes.get(id);
    return flash
      ? {
          "data-flash": `${flash.kind}-${run!.eventId}`,
          style: { "--flash-delay": `${flash.index * 0.35}s` } as CSSProperties,
        }
      : {};
  };
  const flashClass = (id: string) => {
    const flash = flashes.get(id);
    return flash
      ? `${flash.kind} ${flash.kind}-${run!.eventId % 2} ${flash.crit ? "crit" : ""}`
      : "";
  };
  const critPop = (id: string) =>
    (pops.get(id) ?? []).map((pop) => (
      <span
        className={`pop pop-${pop.kind} ${pop.kind === "crit" ? "crit-pop" : ""}`}
        key={`${run!.eventId}-${pop.index}`}
        style={{ "--flash-delay": `${pop.index * 0.35}s` } as CSSProperties}
      >
        {pop.text}
      </span>
    ));
  const hoverProps = (id: string) => ({
    onMouseEnter: () => !previewing && setHovered(id),
    onMouseLeave: () => setHovered(""),
    onFocus: () => !previewing && setHovered(id),
    onBlur: () => setHovered(""),
  });
  // HP shown while the opening hits are still hidden.
  const shownHp = (unit: Unit) => {
    if (!intro || !run) return unit.hp;
    const back = run.events.reduce(
      (sum, event) =>
        event.targetId !== unit.id
          ? sum
          : event.type === "hit"
            ? sum + event.damage
            : event.type === "heal"
              ? sum - event.amount
              : sum,
      0,
    );
    return Math.max(0, Math.min(unit.maxHp, unit.hp + back));
  };
  const canSelectFallen =
    current?.abilities.some((ability) => ability.target === "fallen-ally") ??
    false;
  // Who the hovered skill can reach.
  const aimedIds = new Set<string>();
  const aimAbility = current?.abilities.find((ability) => ability.id === aim);
  if (run?.status === "combat" && current && aimAbility) {
    const livingFoes = run.enemies.filter((unit) => unit.hp > 0);
    const livingCats = run.party.filter((unit) => unit.hp > 0);
    const legal = (group: Unit[]) =>
      group.filter(
        (unit) => !abilityTargetUnavailableReason(run, aimAbility, unit.id),
      );
    const chosen = target;
    const pickOne = (group: Unit[]) =>
      group.some((unit) => unit.id === chosen)
        ? group.filter((unit) => unit.id === chosen)
        : group;
    let ids: Unit[];
    if (aimAbility.effect === "line") {
      const from = livingFoes.findIndex((unit) => unit.id === chosen);
      ids = from >= 0 ? livingFoes.slice(from, from + 3) : livingFoes;
    } else if (aimAbility.target === "enemy") ids = pickOne(livingFoes);
    else if (aimAbility.target === "all-enemies") ids = livingFoes;
    else if (aimAbility.target === "all-allies") ids = livingCats;
    else if (aimAbility.target === "ally") ids = pickOne(legal(livingCats));
    else if (aimAbility.target === "fallen-ally")
      ids = run.party.filter((unit) => unit.hp <= 0);
    else ids = [current];
    ids.forEach((unit) => aimedIds.add(unit.id));
  }
  // Who acts after the current cat in this round: the button passes the turn to them.
  const nextCat =
    run?.status === "combat"
      ? run.order
          .slice(run.turn + 1)
          .map((id) => run.party.find((unit) => unit.id === id && unit.hp > 0))
          .find(Boolean)
      : undefined;
  const targetUnit = units.find(
    (unit) => unit.id === target && (unit.hp > 0 || canSelectFallen),
  );
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
                {current?.abilities.map((ability) => {
                  const limit = ability.roomLimit ?? abilityLimit(ability);
                  const uses = ability.roomLimit
                    ? (run.roomUses[`${current.id}:${ability.id}`] ?? 0)
                    : abilityUses(run, ability.id);
                  const power = abilityPower(run, current, ability);
                  const cooldown = cooldownRemaining(current, ability);
                  const actionTarget =
                    ability.target === "enemy" ||
                    ability.target === "ally" ||
                    ability.target === "fallen-ally"
                      ? target
                      : current.id;
                  const reason =
                    abilityUnavailableReason(run, ability) ??
                    abilityTargetUnavailableReason(run, ability, actionTarget);
                  const previewEnemy = run.enemies.find(
                    (unit) => unit.id === actionTarget && unit.hp > 0,
                  );
                  const preview =
                    previewEnemy && ability.target === "enemy"
                      ? damagePreview(run, current, ability, previewEnemy)
                      : undefined;
                  const info = describeAbility(ability, power, t);
                  const usageLabel = ability.roomLimit
                    ? t("this room")
                    : t("this turn");
                  return (
                    <span
                      className="ability-slot"
                      key={ability.id}
                      onMouseEnter={() => setAim(ability.id)}
                      onMouseLeave={() => setAim("")}
                      onFocus={() => setAim(ability.id)}
                      onBlur={() => setAim("")}
                    >
                      <button
                        data-testid="ability"
                        title={reason ? translateEngine(t, reason) : info.text}
                        disabled={Boolean(reason) || intro}
                        onClick={() =>
                          applyCombatAction(
                            act(run, ability.id, actionTarget),
                            ability,
                          )
                        }
                      >
                        <AbilityHead ability={ability} power={power} />
                        {preview && (
                          <span className="ability-detail damage-preview">
                            {preview.damage > 0
                              ? t("Deals {n} · {left} HP left", {
                                  n: preview.damage,
                                  left: preview.remainingHp,
                                })
                              : t("Deals 0 damage")}
                            {preview.armor +
                              preview.blocked +
                              preview.iceBlocked >
                              0 &&
                              ` (${t("{n} blocked", { n: preview.armor + preview.blocked + preview.iceBlocked })})`}
                          </span>
                        )}
                        {reason && (target || cooldown > 0) && (
                          <span className="ability-detail ability-blocked">
                            {translateEngine(t, reason)}
                          </span>
                        )}
                        {ability.cooldownTurns ? (
                          <span className="ability-cooldown">
                            {cooldownText(ability.cooldownTurns, cooldown, t)}
                          </span>
                        ) : null}
                        <span className="ability-usage">
                          {Number.isFinite(limit)
                            ? t("{left}/{limit} uses left {when}", {
                                left: Math.max(0, limit - uses),
                                limit,
                                when: usageLabel,
                              })
                            : t("AP limited")}
                        </span>
                      </button>
                    </span>
                  );
                })}
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
          {run.status === "reward" && (
            <section className="result">
              <span className="eyebrow">{t("CHAMBER CLEARED")}</span>
              <h2>{t("The way opens.")}</h2>
              <div className="reward-details">
                <p>
                  {t("Room reward: +{gold} gold, +{xp} XP and {item}.", {
                    gold: roomReward(run.room).gold,
                    xp: roomReward(run.room).xp,
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
                    .map(
                      (cat) => `${cat.name}: ${cat.hp}/${cat.maxHp} ${t("HP")}`,
                    )
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
        </main>
        <aside className="journal">
          <span className="eyebrow">{t("FIELD NOTES")}</span>
          <h2>{t("The descent")}</h2>
          <div className="run-loot">
            {run.gold} {t("gold")} <span>/</span> {run.xp} XP
            <p>{t("Unbanked expedition loot · secured after boss victory.")}</p>
            <p>
              {t("Items: {list}", {
                list:
                  run.items.map((item) => t(item)).join(", ") || t("None yet"),
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
      </div>
    </>
  );
}
