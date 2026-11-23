import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Sprite } from "./Sprite";
import { Faq } from "./Faq";
import { UnitEffects } from "./UnitEffects";
import { IntentArrows, type IntentEntry } from "./IntentArrows";
import { cooldownText, describeAbility } from "./abilityText";
import {
  CATS,
  cooldownRemaining,
  buildCat,
  abilityUnavailableReason,
  abilityTargetUnavailableReason,
  damagePreview,
  enemyIntent,
  abilityLimit,
  abilityUses,
  abilityPower,
  initialProgress,
  createRun,
  act,
  endTurn,
  nextRoom,
  claimRewards,
  buyUpgrade,
  upgradeCost,
  equip,
  parseProgress,
  type Run,
  type Progress,
  type Ability,
} from "./game";

import {
  getDifficulty,
  masteryLevel,
  nextTrainingDescription,
  nextHearthDescription,
  MAX_TRAINING_RANK,
  MAX_MASTERY_LEVEL,
  XP_PER_MASTERY,
} from "./progression";

declare global {
  interface Window {
    /** Optional fixed seed so browser tests get reproducible enemy marks. */
    __CATACOMB_SEED__?: number;
  }
}
const runSeed = () =>
  window.__CATACOMB_SEED__ ?? crypto.getRandomValues(new Uint32Array(1))[0]!;
const SAVE_KEY = "catacomb-cats.progress.v1";
function loadProgress(): Progress {
  try {
    return parseProgress(localStorage.getItem(SAVE_KEY));
  } catch {
    return initialProgress();
  }
}
const roomNames = [
  "Whispering entrance",
  "The forgotten hall",
  "The king beneath",
];
export default function App() {
  const [progress, setProgress] = useState(loadProgress);
  const [party, setParty] = useState<string[]>(
    CATS.slice(0, 3).map((cat) => cat.id),
  );
  const [run, setRun] = useState<Run | null>(null);
  const [target, setTarget] = useState("");
  const [notice, setNotice] = useState("");
  const [showFaq, setShowFaq] = useState(false);
  const battlefieldRef = useRef<HTMLDivElement>(null);
  // At the start of every turn each enemy's threat shows alone, one after another.
  const [preview, setPreview] = useState({ key: "", step: 0 });
  // Hovering (or keyboard-focusing) a unit shows who threatens or helps whom.
  const [hovered, setHovered] = useState("");
  const storeProgress = (next: Progress) => {
    setProgress(next);
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(next));
    } catch {
      setNotice(
        "Your browser could not save progress. Keep this tab open to continue.",
      );
    }
  };
  const choose = (id: string) =>
    setParty((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : previous.length < 3
          ? [...previous, id]
          : previous,
    );
  const leave = () => {
    if (run?.status === "victory") {
      setNotice(
        "Expedition complete. Your treasures and experience are safely home.",
      );
      storeProgress(claimRewards(progress, run));
    } else
      setNotice("The expedition is over. Your permanent upgrades are safe.");
    setRun(null);
    setTarget("");
  };
  const applyCombatAction = (next: Run, ability?: Ability) => {
    if (next === run) return;
    const attacking =
      ability &&
      (!ability.effect ||
        ability.effect === "pierce" ||
        ability.effect === "cleave");
    const sameTurn =
      run &&
      next.status === "combat" &&
      next.room === run.room &&
      next.round === run.round &&
      next.turn === run.turn &&
      next.order[next.turn] === run.order[run.turn];
    const keepTarget =
      attacking &&
      sameTurn &&
      next.enemies.some((unit) => unit.id === target && unit.hp > 0);
    setRun(next);
    if (!keepTarget) setTarget("");
  };
  const currentId = run?.order[run.turn];
  const current = run?.party.find((unit) => unit.id === currentId);
  const difficulty = getDifficulty(progress);
  const units = run ? [...run.party, ...run.enemies] : [];
  const selectedEnemy = run?.enemies.find(
    (unit) => unit.id === target && unit.hp > 0,
  );
  const hoveredEnemy = run?.enemies.find(
    (unit) => unit.id === hovered && unit.hp > 0,
  );
  const noteEnemy = hoveredEnemy ?? selectedEnemy;
  const noteIntent = run && noteEnemy ? enemyIntent(run, noteEnemy) : undefined;
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
        hovered !== "" &&
        (enemy.id === hovered ||
          intent.targetId === hovered ||
          intent.allyId === hovered);
      if (enemy.id === previewId || related)
        arrowEntries.push({ enemyId: enemy.id, intent });
    }
  const markedIds = new Set(
    arrowEntries.flatMap(({ intent }) =>
      intent.targetId ? [intent.targetId] : [],
    ),
  );
  // Units hit or healed by the last action, in order, so each flash starts in turn.
  const flashes = new Map<string, { kind: "hit" | "heal"; index: number }>();
  run?.events.forEach((event, index) =>
    flashes.set(event.targetId, { kind: event.type, index }),
  );
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
    return flash ? `${flash.kind} ${flash.kind}-${run!.eventId % 2}` : "";
  };
  const hoverProps = (id: string) => ({
    onMouseEnter: () => setHovered(id),
    onMouseLeave: () => setHovered(""),
    onFocus: () => setHovered(id),
    onBlur: () => setHovered(""),
  });
  const canSelectFallen =
    current?.abilities.some((ability) => ability.target === "fallen-ally") ??
    false;
  const targetUnit = units.find(
    (unit) => unit.id === target && (unit.hp > 0 || canSelectFallen),
  );
  return (
    <div className={`app ${run ? "battle-mode" : "lobby-mode"}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ✣
          </span>{" "}
          CATACOMB CATS <small>THE HOLLOW BELOW</small>
        </div>
        <div className="top-meta">
          <span className="location-tag">
            {run ? `DEPTH 0${run.room + 1}` : "CAMP / THE BURROW"}
          </span>
          <span className="currency">{progress.gold} gold</span>
          <span>{progress.xp} XP</span>
          <button
            className="faq-nav quiet"
            aria-expanded={showFaq}
            onClick={() => setShowFaq(!showFaq)}
          >
            FAQ
          </button>
        </div>
      </header>
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      {showFaq ? (
        <Faq onClose={() => setShowFaq(false)} />
      ) : !run ? (
        <>
          <section
            className="burrow-scene"
            aria-label="The Burrow, your underground camp"
          >
            <div className="scene-caption">
              <span className="eyebrow">A fire worth coming home to</span>
              <h1>The Burrow</h1>
              <p>Pack light. Stay together.</p>
            </div>
            <div
              className="scene-party"
              aria-label="Selected expedition companions"
            >
              {party.map((id) => (
                <div className="scene-companion" key={id}>
                  <Sprite id={id} />
                  <span>{CATS.find((cat) => cat.id === id)?.name}</span>
                </div>
              ))}
            </div>
            <div className="expedition-gate">
              <span className="eyebrow">EXPEDITION 01</span>
              <h2>The Hollow Below</h2>
              <p>3 chambers · 1 crown</p>
              <p className="difficulty-preview">
                {difficulty.label} · Threat {difficulty.tier}
              </p>
              <button
                className="primary"
                disabled={party.length !== 3}
                onClick={() => {
                  setRun(createRun(progress, party, runSeed()));
                  setNotice("");
                }}
              >
                Enter the dungeon →
              </button>
              <span className="gate-note">
                {party.length === 3
                  ? "Your party is ready."
                  : `Choose ${3 - party.length} more companion${party.length === 2 ? "" : "s"}.`}
              </span>
            </div>
            <div className="scene-coordinate" aria-hidden="true">
              SAFE HAVEN · NO ENEMIES DETECTED
            </div>
          </section>
          <div className="camp-desk">
            <section
              className="roster-dock"
              aria-labelledby="companions-heading"
            >
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Prepare your expedition</span>
                  <h2 id="companions-heading">The company</h2>
                </div>
                <span className="party-count">
                  {party.length}
                  <span> / 3 READY</span>
                </span>
              </div>
              <div className="xp-summary">
                <strong>
                  Company mastery · Rank {masteryLevel(progress.xp)}
                </strong>
                <span>
                  {masteryLevel(progress.xp) >= MAX_MASTERY_LEVEL
                    ? "Mastery cap reached"
                    : `${progress.xp % XP_PER_MASTERY} / ${XP_PER_MASTERY} XP to next level`}
                </span>
                <progress
                  className="xp-progress"
                  aria-label="Experience toward next level"
                  max={150}
                  value={
                    masteryLevel(progress.xp) >= MAX_MASTERY_LEVEL
                      ? XP_PER_MASTERY
                      : progress.xp % XP_PER_MASTERY
                  }
                />
                <p>
                  Every 150 banked XP grants +2 max HP to all cats. Every third
                  mastery level adds +1 power to attacks, healing, Guard and
                  blessings. Mastery bonuses stop at level 10.
                </p>
              </div>
              <div className="roster">
                {CATS.map((cat) => {
                  const rank = progress.catLevels[cat.id] ?? 0;
                  const unit = buildCat(progress, cat.id);
                  const nextTraining = nextTrainingDescription(cat.id, rank);
                  return (
                    <article
                      className={`cat-card ${party.includes(cat.id) ? "selected" : "reserve"}`}
                      key={cat.id}
                    >
                      <div className="portrait-stage">
                        <Sprite id={cat.id} />
                        <span className="selected-badge">
                          {party.includes(cat.id)
                            ? `0${party.indexOf(cat.id) + 1}`
                            : "—"}
                        </span>
                      </div>
                      <div className="cat-info">
                        <div className="cat-name-line">
                          <h3>{cat.name}</h3>
                          <span className="cat-level">RANK {rank}</span>
                        </div>
                        <div className="role">{cat.role}</div>
                        <div className="stats">
                          <span>
                            {unit.maxHp} <small>HP</small>
                          </span>
                          <span>
                            {unit.initiative} <small>INIT</small>
                          </span>
                        </div>
                        <div
                          className="milestone-progress"
                          aria-label={`${cat.name} skill unlock`}
                        >
                          {rank >= 3
                            ? `Third skill unlocked: ${unit.abilities[2]?.name}`
                            : `Third skill: ${rank}/3 training ranks · first 3 cost 100 gold total`}
                        </div>
                        <div className="card-actions">
                          <button
                            className={
                              party.includes(cat.id)
                                ? "party-toggle enrolled"
                                : "party-toggle"
                            }
                            aria-pressed={party.includes(cat.id)}
                            onClick={() => choose(cat.id)}
                            disabled={
                              !party.includes(cat.id) && party.length === 3
                            }
                          >
                            {party.includes(cat.id)
                              ? "Remove from party"
                              : "Add to party"}
                          </button>
                          <label className="equipment-label">
                            <span>TRINKET</span>
                            <select
                              aria-label={`Equipment for ${cat.name}`}
                              value={progress.equipment[cat.id] ?? ""}
                              onChange={(event) =>
                                storeProgress(
                                  equip(progress, cat.id, event.target.value),
                                )
                              }
                            >
                              <option value="">Empty slot</option>
                              {progress.inventory.map((item) => (
                                <option value={item} key={item}>
                                  {item}{" "}
                                  {item === "Iron bell"
                                    ? "(+6 HP)"
                                    : item === "Silk ribbon"
                                      ? "(+3 INIT)"
                                      : "(+1 ATK)"}
                                </option>
                              ))}
                            </select>
                          </label>
                          <p
                            className="training-description"
                            id={`training-${cat.id}`}
                          >
                            {nextTraining}
                          </p>
                          <button
                            aria-describedby={`training-${cat.id}`}
                            className="train-button quiet"
                            onClick={() => {
                              setNotice(
                                `${cat.name} trained. ${nextTraining} Ready for the next expedition.`,
                              );
                              storeProgress(buyUpgrade(progress, cat.id));
                            }}
                            disabled={
                              rank >= MAX_TRAINING_RANK ||
                              progress.gold < upgradeCost(progress, cat.id)
                            }
                          >
                            Train {cat.name} · {upgradeCost(progress, cat.id)}{" "}
                            gold
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
            <aside className="camp-upgrades">
              <span className="eyebrow">At the hearth</span>
              <h2>Leave a light on.</h2>
              <div className="hearth-symbol" aria-hidden="true">
                ♜
              </div>
              <p className="blessing-rank">
                Hearth blessing · Rank {progress.generalLevel}
              </p>
              <p className="hearth-next">
                {nextHearthDescription(progress.generalLevel)}
              </p>
              <div
                className="difficulty-details"
                aria-label="Expedition difficulty"
              >
                <h3>
                  {difficulty.label} · Threat {difficulty.tier}
                </h3>
                <p>{difficulty.description}</p>
                <p>
                  {progress.wins} victories · {progress.spentGold} gold invested
                  · Mastery {masteryLevel(progress.xp)}
                </p>
                <p>
                  Difficulty is fixed when you enter. Future victories and
                  permanent investment strengthen the next expedition.
                </p>
              </div>
              <button
                onClick={() => storeProgress(buyUpgrade(progress))}
                disabled={
                  progress.generalLevel >= MAX_TRAINING_RANK ||
                  progress.gold < upgradeCost(progress)
                }
              >
                Improve blessing · {upgradeCost(progress)} gold
              </button>
              <div className="camp-rule">
                Upgrades stay.
                <br />
                Dungeon spoils must make it home.
              </div>
            </aside>
          </div>
        </>
      ) : (
        <>
          <header className="battle-header">
            <div>
              <span className="eyebrow">
                THE HOLLOW BELOW / CHAMBER 0{run.room + 1}
              </span>
              <h1>{roomNames[run.room]}</h1>
            </div>
          </header>
          <div
            className="difficulty-banner"
            aria-label="Active expedition difficulty"
          >
            {run.difficulty.label} · Threat {run.difficulty.tier} · Fixed for
            this expedition ·{" "}
            <strong className="expedition-strength">
              Expedition Strength +{run.bonus} (+{run.bonus} damage to all cats)
            </strong>
          </div>
          <nav className="room-path" aria-label="Expedition progress">
            {["Entrance", "Forgotten hall", "Boss chamber"].map(
              (room, index) => (
                <span
                  key={room}
                  className={
                    index === run.room
                      ? "current"
                      : index < run.room
                        ? "cleared"
                        : ""
                  }
                >
                  {index < run.room ? "×" : `0${index + 1}`} {room}
                </span>
              ),
            )}
          </nav>
          <div className="battle-layout">
            <main>
              <div className="battlefield" ref={battlefieldRef}>
                <div className="battle-team allies">
                  {run.party.map((unit) => (
                    <article
                      key={unit.id}
                      data-unit={unit.id}
                      className={`combatant ${unit.id === currentId ? "active" : ""} ${unit.hp <= 0 ? "dead" : ""} ${unit.id === target ? "targeted" : ""} ${markedIds.has(unit.id) ? "marked" : ""} ${unit.guard > 0 && unit.hp > 0 ? "guarded" : ""} ${flashClass(unit.id)}`}
                      {...flashProps(unit.id)}
                      {...hoverProps(unit.id)}
                    >
                      <UnitEffects
                        unit={unit}
                        units={units}
                        taunting={run.tauntId === unit.id}
                      />
                      <button
                        className="unit-target"
                        aria-label={`Target ${unit.name}`}
                        aria-pressed={target === unit.id}
                        onClick={() => setTarget(unit.id)}
                        disabled={unit.hp <= 0 && !canSelectFallen}
                      >
                        <Sprite id={unit.id} />
                      </button>
                      <h3>{unit.name}</h3>
                      <div className="health">
                        <span
                          style={{ width: `${(unit.hp / unit.maxHp) * 100}%` }}
                        />
                      </div>
                      <span className="health-value">
                        {unit.hp} / {unit.maxHp} HP
                      </span>
                    </article>
                  ))}
                </div>
                <div className="battle-team enemies">
                  {run.enemies.map((unit) => (
                    <article
                      key={unit.id}
                      data-unit={unit.id}
                      className={`combatant ${unit.hp <= 0 ? "dead" : ""} ${unit.id === target ? "targeted" : ""} ${markedIds.has(unit.id) ? "marked" : ""} ${unit.guard > 0 && unit.hp > 0 ? "guarded" : ""} ${flashClass(unit.id)}`}
                      {...flashProps(unit.id)}
                      {...hoverProps(unit.id)}
                    >
                      <UnitEffects
                        unit={unit}
                        units={units}
                        taunting={run.tauntId === unit.id}
                      />
                      <button
                        className="unit-target"
                        aria-label={`Target ${unit.name}`}
                        aria-pressed={target === unit.id}
                        onClick={() => setTarget(unit.id)}
                        disabled={unit.hp <= 0}
                      >
                        <Sprite id={unit.name} />
                      </button>
                      <h3>{unit.name}</h3>
                      <div className="health">
                        <span
                          style={{ width: `${(unit.hp / unit.maxHp) * 100}%` }}
                        />
                      </div>
                      <span className="health-value">
                        {unit.hp} / {unit.maxHp} HP
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
              <div className="initiative" aria-label="Initiative order">
                <span className="queue-label">TURN ORDER</span>
                {run.order.map((id) => (
                  <span
                    className={`${id === currentId ? "current" : ""} ${units.find((unit) => unit.id === id)?.hp === 0 ? "fallen" : ""}`}
                    key={id}
                  >
                    {units.find((unit) => unit.id === id)?.name ?? id}
                  </span>
                ))}
              </div>
              {run.status === "combat" && (
                <section className="command-deck">
                  <div className="command-heading">
                    <span className="eyebrow">YOUR MOVE</span>
                    <h2>{current?.name ?? "Enemy"}</h2>
                    <p>
                      {canSelectFallen
                        ? "Heal your team or select a fallen ally to revive."
                        : targetUnit
                          ? `Target: ${targetUnit.name}`
                          : "Click a character to target, then pick an action."}
                    </p>
                    {noteEnemy && noteIntent && (
                      <p className="intent-note" data-testid="intent-note">
                        {noteEnemy.name} next turn:{" "}
                        <strong>{noteIntent.label}</strong>
                        {noteIntent.targetId &&
                          ` → ${run.party.find((u) => u.id === noteIntent.targetId)?.name}${noteIntent.redirected ? " (Taunt)" : ""}`}
                        {noteIntent.allyId &&
                          ` → ${run.enemies.find((u) => u.id === noteIntent.allyId)?.name}`}
                        {!noteIntent.targetId &&
                          !noteIntent.allyId &&
                          noteIntent.kind === "attack" &&
                          " → a new random cat"}
                      </p>
                    )}
                  </div>
                  <div className="actions">
                    <div className="round-counter" aria-label="Shared AP">
                      <span>ROUND {run.round}</span>
                      <strong>
                        {run.ap}
                        <small> / {run.maxAp} AP</small>
                      </strong>
                      <span className="ap-pips" aria-hidden="true">
                        {Array.from(
                          { length: Math.max(run.ap, run.maxAp) },
                          (_, index) => (
                            <i
                              key={index}
                              className={index < run.ap ? "on" : ""}
                            />
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
                        abilityTargetUnavailableReason(
                          run,
                          ability,
                          actionTarget,
                        );
                      const previewEnemy = run.enemies.find(
                        (unit) => unit.id === actionTarget && unit.hp > 0,
                      );
                      const preview =
                        previewEnemy && ability.target === "enemy"
                          ? damagePreview(run, current, ability, previewEnemy)
                          : undefined;
                      const info = describeAbility(ability, power);
                      const usageLabel = ability.roomLimit
                        ? "this room"
                        : "this turn";
                      return (
                        <button
                          data-testid="ability"
                          title={reason ?? info.text}
                          key={ability.id}
                          disabled={Boolean(reason)}
                          onClick={() =>
                            applyCombatAction(
                              act(run, ability.id, actionTarget),
                              ability,
                            )
                          }
                        >
                          <span>
                            {ability.name} · {ability.cost} AP
                          </span>
                          <span className="ability-tags">
                            <span className={`ability-tag kind-${info.kind}`}>
                              {info.kindLabel}
                            </span>
                            <span className="ability-tag">
                              {info.targetLabel}
                            </span>
                          </span>
                          <span className="ability-detail">{info.text}</span>
                          {info.note && (
                            <span className="ability-detail ability-note">
                              {info.note}
                            </span>
                          )}
                          {preview && (
                            <span className="ability-detail damage-preview">
                              {preview.damage > 0
                                ? `Deals ${preview.damage} · ${preview.remainingHp} HP left`
                                : "Deals 0 damage"}
                              {preview.armor +
                                preview.blocked +
                                preview.iceBlocked >
                                0 &&
                                ` (${preview.armor + preview.blocked + preview.iceBlocked} blocked)`}
                            </span>
                          )}
                          {reason && (target || cooldown > 0) && (
                            <span className="ability-detail ability-blocked">
                              {reason}
                            </span>
                          )}
                          {ability.cooldownTurns ? (
                            <span className="ability-cooldown">
                              {cooldownText(ability.cooldownTurns, cooldown)}
                            </span>
                          ) : null}
                          <span className="ability-usage">
                            {Number.isFinite(limit)
                              ? `${Math.max(0, limit - uses)}/${limit} uses left ${usageLabel}`
                              : "AP limited"}
                          </span>
                        </button>
                      );
                    })}
                    <button
                      className="quiet end-turn"
                      onClick={() => applyCombatAction(endTurn(run))}
                    >
                      End turn
                    </button>
                  </div>
                </section>
              )}
              {run.status === "reward" && (
                <section className="result">
                  <span className="eyebrow">CHAMBER CLEARED</span>
                  <h2>The way opens.</h2>
                  <div className="reward-details">
                    <p>
                      Room reward: +{20 + run.room * 10} gold, +
                      {30 + run.room * 15} XP and{" "}
                      {run.items[run.items.length - 1]}.
                    </p>
                    <p>
                      Added to expedition loot. Gold, XP and items are banked
                      after defeating the boss and returning to the lobby.
                    </p>
                    <p>
                      Applied now: surviving cats recovered up to 8 HP (capped
                      at max HP). Fallen cats returned at 25% max HP, rounded
                      up, without extra recovery. Expedition Strength increased
                      by +1 to +{run.bonus} damage.
                    </p>
                    <p>
                      {run.party
                        .map((cat) => `${cat.name}: ${cat.hp}/${cat.maxHp} HP`)
                        .join(" · ")}
                    </p>
                  </div>
                  <button
                    className="primary"
                    onClick={() => {
                      setRun(nextRoom(run));
                      setTarget("");
                    }}
                  >
                    Continue to next room →
                  </button>
                </section>
              )}
              {(run.status === "victory" || run.status === "defeat") && (
                <section className="result">
                  <span className="eyebrow">
                    {run.status === "victory"
                      ? "THE CROWN HAS FALLEN"
                      : "THE DARK TAKES ITS DUE"}
                  </span>
                  <h2>
                    {run.status === "victory"
                      ? "The burrow has its heroes."
                      : "Even brave cats need another try."}
                  </h2>
                  <p>
                    {run.status === "victory"
                      ? `Bring home ${run.gold} gold, ${run.xp} XP and your discoveries.`
                      : "Your permanent upgrades remain. Return home and choose a new team."}
                  </p>
                  {run.status === "victory" && (
                    <p>
                      All companions are fully healed and combat effects are
                      cleared. Your next expedition starts at full HP.
                    </p>
                  )}
                  <button className="primary" onClick={leave}>
                    Return to lobby
                  </button>
                </section>
              )}
            </main>
            <aside className="journal">
              <span className="eyebrow">FIELD NOTES</span>
              <h2>The descent</h2>
              <div className="run-loot">
                {run.gold} gold <span>/</span> {run.xp} XP
                <p>Unbanked expedition loot · secured after boss victory.</p>
                <p>Items: {run.items.join(", ") || "None yet"}</p>
              </div>
              <ol className="log" aria-label="Combat log">
                {run.log.slice(-12).map((line, index) => (
                  <li key={`${index}-${line}`}>{line}</li>
                ))}
              </ol>
              <button className="quiet" onClick={leave}>
                Retreat to lobby
              </button>
              <p className="muted">Leave the expedition's spoils behind.</p>
            </aside>
          </div>
        </>
      )}
      <footer className="footer">
        <span>
          CATACOMB CATS <span className="footer-dot">·</span> CHAPTER I
        </span>
        <span>
          {run ? "NO WAY OUT BUT THROUGH" : "THE FIRE IS STILL BURNING"}
        </span>
        <span>LOCAL SAVE</span>
      </footer>
    </div>
  );
}
