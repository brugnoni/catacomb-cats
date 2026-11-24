import { CRIT_MULTIPLIER } from "../progression";
import {
  type Unit,
  type Run,
  type EnemyPlanKind,
  type EnemyPlan,
  type EnemyIntent,
} from "./model";
import {
  units,
  rollCrit,
  pickLiving,
  markTarget,
  currentUnit,
  check,
  advance,
  guard,
  fury,
} from "./state";
import {
  abilityUnavailableReason,
  abilityTargetUnavailableReason,
} from "./abilities";
import { hurt } from "./damage";

export const weakestCat = (run: Run) =>
  run.party
    .filter((u) => u.hp > 0)
    .sort((a, b) => a.hp - b.hp || a.id.localeCompare(b.id))[0];

/** Single source of truth for what an enemy does in a given round. */
export function planEnemyAction(
  run: Run,
  actor: Unit,
  round: number,
): EnemyPlan {
  const allies = run.enemies.filter((u) => u.hp > 0);
  const ally = allies
    .filter((u) => u.id !== actor.id)
    .sort((a, b) => b.maxHp - a.maxHp)[0];
  const wounded = allies
    .filter((u) => u.hp < u.maxHp)
    .sort((a, b) => b.maxHp - b.hp - (a.maxHp - a.hp))[0];
  const phase = round % 3;
  if (
    actor.name === "Royal wisp" &&
    wounded &&
    phase === 1 &&
    (run.roomUses[actor.id + ":heal"] ?? 0) < 2
  )
    return { kind: "heal", allyId: wounded.id };
  if (actor.name === "Moss slime" && ally && phase === 1)
    return { kind: "inspire", allyId: ally.id };
  if (actor.name === "Spore imp" && ally && phase === 2)
    return { kind: "ward", allyId: ally.id };
  if (actor.name === "Spore imp" && phase === 0) return { kind: "mirror" };
  if (
    (actor.name === "Spore imp" || actor.name === "The Hollow King") &&
    phase === 1
  )
    return { kind: "curse", targetId: weakestCat(run)?.id };
  if (actor.name === "Bone squire" && phase === 1) return { kind: "rally" };
  return { kind: "attack" };
}

export const INTENT_LABELS: Record<EnemyPlanKind, string> = {
  attack: "Attack",
  curse: "Curse",
  heal: "Heal an ally",
  inspire: "Inspire an ally",
  ward: "Shield an ally",
  mirror: "Raise Mirror spores",
  rally: "Rally",
};

/** What this enemy will do on its next turn and whom it has marked. */
export function enemyIntent(run: Run, enemy: Unit): EnemyIntent | undefined {
  if (run.status !== "combat" || enemy.hp <= 0) return undefined;
  const index = run.order.indexOf(enemy.id);
  if (index < 0) return undefined;
  const plan = planEnemyAction(
    run,
    enemy,
    index > run.turn ? run.round : run.round + 1,
  );
  const intent: EnemyIntent = {
    kind: plan.kind,
    label: INTENT_LABELS[plan.kind],
    allyId: plan.allyId,
    targetId: plan.targetId,
  };
  if (plan.kind !== "attack") return intent;
  const nextTurn = (id: string) => {
    const i = run.order.indexOf(id);
    return i < 0 ? Infinity : i > run.turn ? i : i + run.order.length;
  };
  const taunter = run.party.find((u) => u.hp > 0 && u.id === run.tauntId);
  if (taunter && nextTurn(enemy.id) < nextTurn(taunter.id)) {
    intent.targetId = taunter.id;
    intent.redirected = true;
  } else {
    intent.targetId = run.party.find(
      (u) => u.hp > 0 && u.id === enemy.mark,
    )?.id;
  }
  return intent;
}

/** True if the current cat can still use at least one skill on some valid target. */
export function canAct(run: Run, actor: Unit): boolean {
  const targets = [actor.id, ...units(run).map((u) => u.id)];
  return actor.abilities.some(
    (ability) =>
      !abilityUnavailableReason(run, ability) &&
      targets.some((id) => !abilityTargetUnavailableReason(run, ability, id)),
  );
}

export function resolveEnemies(run: Run) {
  if (run.party.every((u) => u.hp <= 0)) {
    check(run);
    return;
  }
  let safety = 0;
  while (run.status === "combat" && safety++ < 100) {
    const actor = currentUnit(run);
    if (!actor || actor.hp <= 0) {
      advance(run);
      continue;
    }
    const isCat = run.party.some((u) => u.id === actor.id);
    if (isCat && run.ap > 0 && canAct(run, actor)) return;
    if (isCat)
      run.log.push(
        run.ap > 0
          ? `${actor.name} passes: no usable skills left this turn.`
          : `${actor.name} automatically passes: no shared AP remain.`,
      );
    if (run.enemies.some((u) => u.id === actor.id)) {
      const firstEvent = run.events.length;
      const plan = planEnemyAction(run, actor, run.round);
      if (plan.kind === "heal") {
        const wounded = run.enemies.find((u) => u.id === plan.allyId)!;
        run.roomUses[actor.id + ":heal"] =
          (run.roomUses[actor.id + ":heal"] ?? 0) + 1;
        const crit = rollCrit(run, actor);
        const base = Math.max(0, 6 + actor.fury - actor.curse);
        const healed = Math.min(
          wounded.maxHp - wounded.hp,
          crit ? Math.ceil(base * CRIT_MULTIPLIER) : base,
        );
        wounded.hp += healed;
        run.events.push({
          type: "heal",
          targetId: wounded.id,
          amount: healed,
          ...(crit ? { crit } : {}),
        });
        if (crit)
          run.log.push(
            `${actor.name} lands a critical heal on ${wounded.name}!`,
          );
        run.log.push(
          `${actor.name} heals ${wounded.name}: +${healed} HP (${wounded.hp}/${wounded.maxHp}).`,
        );
      } else if (plan.kind === "inspire") {
        fury(
          run,
          run.enemies.find((u) => u.id === plan.allyId)!,
          Math.max(0, 2 - actor.curse),
          2,
        );
      } else if (plan.kind === "ward") {
        guard(
          run,
          run.enemies.find((u) => u.id === plan.allyId)!,
          Math.max(0, 5 + actor.fury - actor.curse),
          2,
        );
      } else if (plan.kind === "mirror") {
        if (actor.reflectTurns === 0) actor.reflect = 2;
        actor.reflectTurns = 2;
        run.log.push(
          `${actor.name} raises Mirror spores: reflect ${actor.reflect} damage for 2 turns (does not stack).`,
        );
      } else if (plan.kind === "curse") {
        const victim = run.party.find((u) => u.id === plan.targetId)!;
        const power = Math.max(
          0,
          (actor.name === "The Hollow King" ? 2 : 1) - actor.curse,
        );
        victim.curse = Math.max(victim.curse, power);
        victim.curseTurns = 2;
        run.log.push(
          `${actor.name} curses ${victim.name}: -${power} to all skill output for 2 turns (active -${victim.curse}).`,
        );
      } else if (plan.kind === "rally") {
        fury(run, actor, Math.max(0, 2 - actor.curse), 3);
      } else {
        // Taunt overrides the mark; a mark whose cat has fallen is re-rolled.
        const target =
          run.party.find((u) => u.hp > 0 && u.id === run.tauntId) ??
          run.party.find((u) => u.hp > 0 && u.id === actor.mark) ??
          pickLiving(run, run.party)!;
        hurt(run, actor, target, actor.abilities[0]!);
      }
      if (run.events.length === firstEvent)
        run.events.push({ type: "act", targetId: actor.id });
      for (const event of run.events.slice(firstEvent)) {
        event.actorId = actor.id;
        event.round = run.round;
      }
      // Every enemy turn ends by marking a new random cat for the next one.
      if (actor.hp > 0) markTarget(run, actor);
      if (check(run)) return;
    }
    advance(run);
  }
}
