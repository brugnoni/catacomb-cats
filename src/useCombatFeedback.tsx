import { type CSSProperties } from "react";
import { useT } from "./i18n";
import type { Run, Unit } from "./game";
import type { useEnemyPhase } from "./useEnemyPhase";

/**
 * What the last action looks like on screen: the flash over each unit hit or
 * healed, the pops (critical, miss, ready) and the HP shown while some hits of
 * the enemy phase have not landed yet.
 */
export function useCombatFeedback(
  run: Run,
  { phasing, eventView }: ReturnType<typeof useEnemyPhase>,
) {
  const { t } = useT();
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
  run.events.forEach((event, index) => {
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
          "data-flash": `${flash.kind}-${run.eventId}-${flash.salt}`,
          style: { "--flash-delay": `${flash.index * 0.35}s` } as CSSProperties,
        }
      : {};
  };
  const flashClass = (id: string) => {
    const flash = flashes.get(id);
    return flash
      ? `${flash.kind} ${flash.kind}-${(run.eventId + flash.salt) % 2} ${flash.crit ? "crit" : ""}`
      : "";
  };
  const critPop = (id: string) =>
    (pops.get(id) ?? []).map((pop) => (
      <span
        className={`pop pop-${pop.kind} ${pop.kind === "crit" ? "crit-pop" : ""}`}
        key={`${run.eventId}-${pop.index}`}
        style={{ "--flash-delay": `${pop.order * 0.35}s` } as CSSProperties}
      >
        {pop.text}
      </span>
    ));
  // HP shown while some hits of the enemy turns have not landed yet.
  const shownHp = (unit: Unit) => {
    if (!phasing) return unit.hp;
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
  return { flashProps, flashClass, critPop, shownHp };
}
