import { useEffect, useEffectEvent, useState } from "react";
import { type IntentEntry } from "./IntentArrows";
import { type TurnView } from "./battleView";
import { useT } from "./i18n";
import { abilityReach, enemyIntent, type Run } from "./game";
import { pace } from "./storage";

/** How long a resting cursor waits to outline a skill's targets once the threat preview ends. */
const AIM_DELAY = 800;

/**
 * The threat preview, hover and skill-aim state of a battle: which enemy's
 * threat shows, what hovering reveals and which units the skill under the
 * cursor can reach. The selected target and the turn come in.
 */
export function useThreatPreview(
  run: Run,
  target: string,
  { current, selectedEnemy, currentId }: TurnView,
  phasing: boolean,
) {
  const { t } = useT();
  // Once the enemy turns have played, each enemy's threat shows alone, one after another.
  const [preview, setPreview] = useState({ key: "", step: 0 });
  // Hovering (or keyboard-focusing) a unit shows who threatens or helps whom.
  const [hovered, setHovered] = useState("");
  // Skill under the mouse or keyboard focus: its possible targets are outlined in yellow.
  // `live` is false for a cursor that was already resting there during the preview.
  const [aim, setAimState] = useState({ id: "", live: false });

  const turnKey =
    run.status === "combat"
      ? `${run.id}:${run.room}:${run.round}:${currentId}`
      : "";
  // Enemies that threaten someone, in the order they will act (next one first).
  const threatening =
    run.status === "combat"
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
  const hoveredEnemy = run.enemies.find(
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
  if (run.status === "combat")
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
  const hoverProps = (id: string) => ({
    onMouseEnter: () => !previewing && setHovered(id),
    onMouseLeave: () => setHovered(""),
    onFocus: () => !previewing && setHovered(id),
    onBlur: () => setHovered(""),
  });
  // Who the hovered skill can reach.
  const aimedIds = new Set<string>();
  const aimAbility = current?.abilities.find(
    (ability) => ability.id === (previewing || !aim.live ? "" : aim.id),
  );
  if (run.status === "combat" && current && aimAbility)
    abilityReach(run, aimAbility, target).forEach((unit) =>
      aimedIds.add(unit.id),
    );
  return {
    previewing,
    hoverProps,
    noteEnemy,
    noteIntent,
    arrowEntries,
    markedIds,
    aimedIds,
    setAim,
  };
}
