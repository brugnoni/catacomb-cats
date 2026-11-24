import { useEffect, useEffectEvent, useState, type CSSProperties } from "react";
import { type IntentEntry } from "./IntentArrows";
import { useT } from "./i18n";
import { abilityReach, enemyIntent, type Run, type Unit } from "./game";
import { pace } from "./storage";
import type { useEnemyPhase } from "./useEnemyPhase";

/** How long a resting cursor waits to outline a skill's targets once the threat preview ends. */
const AIM_DELAY = 800;

/**
 * Everything the battle screen derives from a run: whose turn it is, the threat
 * preview and hover, the skill-target outline, flashes and pops over units.
 * It owns the preview, hover and aim state; the selected target comes in.
 */
export function useBattleView(
  run: Run,
  target: string,
  phase: ReturnType<typeof useEnemyPhase>,
) {
  const { phasing, eventView } = phase;
  const { t } = useT();
  // Once the enemy turns have played, each enemy's threat shows alone, one after another.
  const [preview, setPreview] = useState({ key: "", step: 0 });
  // Hovering (or keyboard-focusing) a unit shows who threatens or helps whom.
  const [hovered, setHovered] = useState("");
  // Skill under the mouse or keyboard focus: its possible targets are outlined in yellow.
  // `live` is false for a cursor that was already resting there during the preview.
  const [aim, setAimState] = useState({ id: "", live: false });

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
  const previewSlot = pace(
    Math.min(800, Math.floor(3000 / Math.max(1, threatening.length))),
  );
  const previewStep = preview.key === turnKey ? preview.step : 0;
  const previewId = turnKey ? threatening[previewStep] : undefined;
  // While the enemy turns or the threat preview play, hovering shows nothing.
  const previewing =
    phasing || (turnKey !== "" && previewStep < threatening.length);
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
    if (!turnKey || phasing) return;
    return startPreview();
  }, [turnKey, phasing]);
  // A cursor resting on a skill when the preview ends outlines after a short delay;
  // entering a skill later is immediate.
  useEffect(() => {
    if (previewing) return;
    const timer = setTimeout(
      () => setAimState((a) => ({ ...a, live: true })),
      pace(AIM_DELAY),
    );
    return () => clearTimeout(timer);
  }, [previewing]);
  const setAim = (id: string) => setAimState({ id, live: !previewing });
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
      if ((enemy.id === previewId && !phasing) || related) {
        const cat = run.party.find((unit) => unit.id === intent.targetId);
        const ally = run.enemies.find((unit) => unit.id === intent.allyId);
        const tag = cat
          ? {
              text: t("Next target: {name}", { name: t(cat.name) }),
              friendly: false,
            }
          : ally
            ? {
                text: t("Next: supports {name}", { name: t(ally.name) }),
                friendly: true,
              }
            : undefined;
        arrowEntries.push({ enemyId: enemy.id, intent, tag });
      }
    }
  const markedIds = new Set(
    arrowEntries.flatMap(({ intent }) =>
      intent.targetId ? [intent.targetId] : [],
    ),
  );
  // Units hit or healed by the last action, in order, so each flash starts in turn.
  const flashes = new Map<
    string,
    { kind: "hit" | "heal"; index: number; salt: number; crit: boolean }
  >();
  const pops = new Map<
    string,
    { text: string; kind: string; index: number; order: number }[]
  >();
  const addPop = (
    id: string,
    text: string,
    kind: string,
    index: number,
    order: number,
  ) => pops.set(id, [...(pops.get(id) ?? []), { text, kind, index, order }]);
  run?.events.forEach((event, index) => {
    const view = eventView(index);
    if (view.hidden) return;
    const order = view.offset;
    if (event.type === "hit" || event.type === "heal") {
      if (view.flash)
        flashes.set(event.targetId, {
          kind: event.type,
          index: order,
          salt: view.salt,
          crit: Boolean(event.crit),
        });
      if (event.crit)
        addPop(event.targetId, t("CRITICAL!"), "crit", index, order);
    } else if (event.type === "avoid")
      addPop(
        event.targetId,
        event.kind === "miss" ? t("MISS!") : t("EVADED!"),
        "avoid",
        index,
        order,
      );
    else if (event.type === "ready")
      addPop(
        event.targetId,
        t("{name} ready!", { name: t(event.name) }),
        "ready",
        index,
        order,
      );
  });
  const flashProps = (id: string) => {
    const flash = flashes.get(id);
    return flash
      ? {
          "data-flash": `${flash.kind}-${run!.eventId}-${flash.salt}`,
          style: { "--flash-delay": `${flash.index * 0.35}s` } as CSSProperties,
        }
      : {};
  };
  const flashClass = (id: string) => {
    const flash = flashes.get(id);
    return flash
      ? `${flash.kind} ${flash.kind}-${(run!.eventId + flash.salt) % 2} ${flash.crit ? "crit" : ""}`
      : "";
  };
  const critPop = (id: string) =>
    (pops.get(id) ?? []).map((pop) => (
      <span
        className={`pop pop-${pop.kind} ${pop.kind === "crit" ? "crit-pop" : ""}`}
        key={`${run!.eventId}-${pop.index}`}
        style={{ "--flash-delay": `${pop.order * 0.35}s` } as CSSProperties}
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
  // HP shown while some hits of the enemy turns have not landed yet.
  const shownHp = (unit: Unit) => {
    if (!phasing || !run) return unit.hp;
    const back = run.events.reduce(
      (sum, event, index) =>
        event.targetId !== unit.id || !eventView(index).hidden
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
  const aimAbility = current?.abilities.find(
    (ability) => ability.id === (previewing || !aim.live ? "" : aim.id),
  );
  if (run?.status === "combat" && current && aimAbility)
    abilityReach(run, aimAbility, target).forEach((unit) =>
      aimedIds.add(unit.id),
    );
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
  return {
    currentId,
    current,
    units,
    selectedEnemy,
    turnKey,
    threatening,
    previewSlot,
    previewStep,
    previewId,
    previewing,
    hoverId,
    hoveredEnemy,
    noteEnemy,
    noteIntent,
    arrowEntries,
    markedIds,
    flashes,
    pops,
    addPop,
    flashProps,
    flashClass,
    critPop,
    hoverProps,
    shownHp,
    canSelectFallen,
    aimedIds,
    aimAbility,
    nextCat,
    targetUnit,
    setHovered,
    setAim,
  };
}
