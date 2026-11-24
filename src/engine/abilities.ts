import { GUARD_TURNS } from "../progression";
import { isDamaging, type Ability, type Unit, type Run } from "./model";
import { currentUnit } from "./state";

export function abilityLimit(ability: Ability): number {
  return (
    ability.turnLimit ??
    (ability.cost === 1 ? 3 : ability.cost === 2 ? 2 : Infinity)
  );
}

export function abilityUses(run: Run, abilityId: string): number {
  return run.uses[abilityId] ?? 0;
}

export function cooldownRemaining(unit: Unit, ability: Ability): number {
  return unit.cooldowns[ability.cooldownGroup ?? ability.id] ?? 0;
}

export function abilityUnavailableReason(
  run: Run,
  ability: Ability,
): string | undefined {
  const actor = currentUnit(run);
  if (
    run.status !== "combat" ||
    !actor ||
    actor.hp <= 0 ||
    !run.party.some((u) => u.id === actor.id)
  )
    return "Not your turn";
  const remaining = cooldownRemaining(actor, ability);
  if (remaining > 0)
    return `Cooldown: ready in ${remaining} turn${remaining === 1 ? "" : "s"}`;
  if (ability.cost > run.ap) return "Not enough shared AP";
  if (abilityUses(run, ability.id) >= abilityLimit(ability))
    return "Turn limit reached";
  if (
    ability.roomLimit &&
    (run.roomUses[`${actor.id}:${ability.id}`] ?? 0) >= ability.roomLimit
  )
    return "Already used this room";
  return undefined;
}

export function abilityPower(run: Run, actor: Unit, ability: Ability): number {
  if (
    ability.effect === "taunt" ||
    ability.effect === "ap" ||
    ability.effect === "revive"
  )
    return ability.power;
  const damaging = isDamaging(ability);
  // Inspiration does not amplify other blessings: avoid recursive power inflation.
  const inspired = ability.effect === "fury" ? 0 : actor.fury;
  const bonus =
    inspired +
    (damaging ? actor.openingAttack : 0) +
    (damaging && run.party.some((u) => u.id === actor.id) ? run.bonus : 0);
  return Math.max(0, ability.power + bonus - actor.curse);
}

export function abilityTargetUnavailableReason(
  run: Run,
  ability: Ability,
  targetId: string,
): string | undefined {
  const actor = currentUnit(run);
  if (!actor || actor.hp <= 0) return "No living caster";
  if (
    ability.target === "self" ||
    ability.target === "all-allies" ||
    ability.target === "all-enemies"
  ) {
    if (actor.id !== targetId)
      return "This skill targets the caster or whole group";
    if (
      ability.effect === "heal-all" &&
      !run.party.some((u) => u.hp > 0 && (u.hp < u.maxHp || u.curse > 0))
    )
      return "All living allies are already at full HP";
    return undefined;
  }
  if (ability.target === "fallen-ally") {
    return run.party.some((u) => u.id === targetId && u.hp <= 0)
      ? undefined
      : "Choose a fallen ally to revive";
  }
  const group = ability.target === "enemy" ? run.enemies : run.party;
  const target = group.find((u) => u.id === targetId && u.hp > 0);
  if (!target) return "Choose a living " + ability.target;
  // A cursed ally can still be targeted: healing also lifts the curse.
  if (ability.effect === "heal" && target.hp >= target.maxHp && !target.curse)
    return "Already at full HP";
  if (
    ability.effect === "guard" &&
    target.guard > 0 &&
    target.guardTurns >= GUARD_TURNS &&
    // A stronger shield can still replace a weaker one at full duration.
    Math.max(0, abilityPower(run, actor, ability) - target.curse) <=
      target.guard
  )
    return "Guard is already at full duration";
  if (ability.effect === "fury" && target.furyTurns >= 3)
    return "Inspired is already at full duration";
  return undefined;
}

export function abilityTargets(
  run: Run,
  ability: Ability,
  targetId: string,
): boolean {
  return abilityTargetUnavailableReason(run, ability, targetId) === undefined;
}
