import { useEffect, useEffectEvent, useState, type CSSProperties } from "react";
import { type IntentEntry } from "./IntentArrows";
import { useT } from "./i18n";
import { enemyIntent, type Run, type Unit } from "./game";

/**
 * Everything the battle screen derives from a run: whose turn it is, the threat
 * preview and hover, the skill-target outline, flashes and pops over units.
 * It owns the preview, hover and aim state; the selected target comes in.
 */
export function useBattleView(run: Run, target: string, intro: boolean) {
  const { t } = useT();
  // At the start of every turn each enemy's threat shows alone, one after another.
  const [preview, setPreview] = useState({ key: "", step: 0 });
  // Hovering (or keyboard-focusing) a unit shows who threatens or helps whom.
  const [hovered, setHovered] = useState("");
  // Skill under the mouse or keyboard focus: its possible targets are outlined in yellow.
  const [aim, setAim] = useState("");

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
    else if (aimAbility.target === "ally")
      // The chosen cat, or the caster when nobody is chosen.
      ids = livingCats.filter(
        (unit) =>
          unit.id ===
          (livingCats.some((u) => u.id === chosen) ? chosen : current.id),
      );
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
