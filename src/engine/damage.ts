import { CRIT_MULTIPLIER } from "../progression";
import { type Ability, type Unit, type Run, type DamagePreview } from "./model";
import { rollCrit, rollAvoid, clearEffects } from "./state";
import { abilityPower } from "./abilities";

/**
 * What a hit would do. `scale` shrinks the hit (Dagger line) and `crit` makes it
 * critical. Piercing hits ignore armor, Ice Ward and Guard shields entirely.
 */
export function damagePreview(
  run: Run,
  actor: Unit,
  ability: Ability,
  target: Unit,
  scale = 1,
  crit = false,
  base = abilityPower(run, actor, ability),
): DamagePreview {
  const scaled = scale === 1 ? base : Math.round(base * scale);
  const power = crit ? Math.ceil(scaled * CRIT_MULTIPLIER) : scaled;
  const pierce = ability.effect === "pierce";
  const armor = pierce ? 0 : Math.min(target.armor, power);
  const afterArmor = Math.max(0, power - armor);
  const iceBlocked =
    !pierce && target.iceCharges > 0
      ? Math.min(target.iceArmor, afterArmor)
      : 0;
  const afterIce = afterArmor - iceBlocked;
  const blocked = pierce ? 0 : Math.min(target.guard, afterIce);
  const damage = Math.min(target.hp, Math.max(0, afterIce - blocked));
  const healthAfterDamage = Math.max(0, target.hp - damage);
  const reactiveHealing =
    damage > 0 && healthAfterDamage > 0 && target.reactiveHealCharges > 0
      ? Math.min(target.maxHp - healthAfterDamage, target.reactiveHeal)
      : 0;
  return {
    power,
    armor,
    blocked,
    iceBlocked,
    reactiveHealing,
    damage,
    remainingHp: healthAfterDamage + reactiveHealing,
  };
}

/** Hearth Second Wind: the first cat to fall in an expedition rises at once. */
export function rescue(run: Run, unit: Unit) {
  if (unit.hp > 0 || run.secondWind <= 0) return;
  if (!run.party.some((u) => u.id === unit.id)) return;
  unit.hp = Math.min(
    unit.maxHp,
    Math.max(1, Math.ceil((unit.maxHp * run.secondWind) / 100)),
  );
  clearEffects(unit);
  if (run.tauntId === unit.id) delete run.tauntId;
  run.log.push(
    `Second Wind! ${unit.name} rises at ${run.secondWind}% HP (${unit.hp}/${unit.maxHp}). It works once per expedition.`,
  );
  run.secondWind = 0;
}

export function hurt(
  run: Run,
  actor: Unit,
  target: Unit,
  ability: Ability,
  scale = 1,
  base?: number,
) {
  const avoided = rollAvoid(run, target);
  if (avoided) {
    run.events.push({ type: "avoid", targetId: target.id, kind: avoided });
    run.log.push(
      avoided === "miss"
        ? `${actor.name} misses ${target.name}!`
        : `${target.name} evades ${actor.name}'s attack!`,
    );
    return;
  }
  const crit = rollCrit(run, actor);
  const {
    power,
    armor,
    blocked,
    iceBlocked,
    reactiveHealing,
    damage: dealt,
    remainingHp,
  } = damagePreview(run, actor, ability, target, scale, crit, base);
  if (ability.effect !== "pierce" && target.iceCharges > 0 && power - armor > 0)
    target.iceCharges--;
  target.guard -= blocked;
  if (target.guard === 0) {
    target.guardTurns = 0;
  }
  target.hp = remainingHp;
  run.events.push({
    type: "hit",
    targetId: target.id,
    damage: dealt,
    absorbed: armor + blocked + iceBlocked,
    ...(crit ? { crit } : {}),
  });
  if (crit)
    run.log.push(`${actor.name} scores a critical hit on ${target.name}!`);
  if (ability.lifesteal && dealt > 0 && actor.hp > 0) {
    // Only real HP damage drains; critical hits do not raise the percentage.
    const drained = Math.min(
      actor.maxHp - actor.hp,
      Math.ceil((dealt * ability.lifesteal) / 100),
    );
    if (drained > 0) {
      actor.hp += drained;
      run.events.push({ type: "heal", targetId: actor.id, amount: drained });
      run.log.push(`${actor.name} drains ${drained} HP from ${target.name}.`);
    }
  }
  run.log.push(
    `${actor.name} hits ${target.name}: ${dealt} damage (${power} attack power, ${armor} armor, ${blocked} Guard blocked, ${iceBlocked} Ice Ward blocked; ${target.hp}/${target.maxHp} HP).`,
  );
  if (reactiveHealing > 0) {
    target.reactiveHealCharges--;
    run.log.push(
      `${target.name} triggers Soothing Spirit: +${reactiveHealing} HP (${target.reactiveHealCharges} charges left; ${target.hp}/${target.maxHp} HP).`,
    );
  }
  rescue(run, target);
  const returned =
    target.thorns + (target.reflectTurns > 0 ? target.reflect : 0);
  // Returned damage is applied directly, so it can never be returned again.
  if (dealt > 0 && returned > 0 && actor.hp > 0) {
    const reflected = Math.min(actor.hp, returned);
    actor.hp -= reflected;
    run.events.push({
      type: "hit",
      targetId: actor.id,
      damage: reflected,
      absorbed: 0,
    });
    run.log.push(
      `${target.name} reflects ${reflected} damage to ${actor.name} (${actor.hp}/${actor.maxHp} HP).`,
    );
    rescue(run, actor);
  }
}
