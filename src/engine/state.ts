import {
  CRIT_MULTIPLIER,
  GUARD_TURNS,
  MISS_CHANCE,
  evadeChance,
} from "../progression";
import { type Unit, type Run } from "./model";

export const clone = <T>(value: T): T => structuredClone(value);

export function units(run: Run): Unit[] {
  return [...run.party, ...run.enemies];
}

/** Seeded mulberry32 step: advances `seed` and returns a number in [0, 1). */
function mulberry32(seed: number): [next: number, value: number] {
  const next = (seed + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [next, ((t ^ (t >>> 14)) >>> 0) / 4294967296];
}

/** Seeded generator: the same seed always gives the same marks. */
export function random(run: Run): number {
  const [next, value] = mulberry32(run.rng);
  run.rng = next;
  return value;
}

/** A separate stream for crits, misses and evasion, so they never disturb the marks. */
export function critRandom(run: Run): number {
  const [next, value] = mulberry32(run.critRng);
  run.critRng = next;
  return value;
}

export function rollCrit(run: Run, actor: Unit): boolean {
  const chance = run.party.some((u) => u.id === actor.id)
    ? run.critChance
    : run.enemyCritChance;
  return chance > 0 && critRandom(run) * 100 < chance;
}

/** Rolls a miss (attacker) and then an evasion (target); undefined if the hit lands. */
export function rollAvoid(
  run: Run,
  target: Unit,
): "miss" | "evade" | undefined {
  if (!run.luck) return undefined;
  if (critRandom(run) * 100 < MISS_CHANCE) return "miss";
  if (critRandom(run) * 100 < evadeChance(target.initiative)) return "evade";
  return undefined;
}

export function pickLiving(run: Run, group: Unit[]): Unit | undefined {
  const living = group.filter((u) => u.hp > 0);
  return living[Math.floor(random(run) * living.length)];
}

export function markTarget(run: Run, enemy: Unit) {
  // While Taunt lasts, every enemy marks the taunting cat for its attacks.
  const taunter = run.party.find((u) => u.hp > 0 && u.id === run.tauntId);
  const cat = taunter ?? pickLiving(run, run.party);
  if (cat) enemy.mark = cat.id;
  else delete enemy.mark;
}

export function markAll(run: Run) {
  for (const e of run.enemies) if (e.hp > 0) markTarget(run, e);
}

export function setOrder(run: Run) {
  run.order = units(run)
    .filter((u) => u.hp > 0)
    .sort((a, b) => b.initiative - a.initiative || a.id.localeCompare(b.id))
    .map((u) => u.id);
  run.turn = 0;
}

/** Fallen enemies leave the initiative queue at once; cats stay so they can be revived. */
export function dropFallenEnemies(run: Run) {
  const fallen = new Set(run.enemies.filter((u) => u.hp <= 0).map((u) => u.id));
  const before = run.turn;
  run.turn -= run.order.filter((id, i) => i < before && fallen.has(id)).length;
  run.order = run.order.filter((id) => !fallen.has(id));
}

export function currentUnit(run: Run) {
  return units(run).find((u) => u.id === run.order[run.turn]);
}

export function clearEffects(unit: Unit) {
  unit.guard =
    unit.guardTurns =
    unit.fury =
    unit.furyTurns =
    unit.curse =
    unit.curseTurns =
    unit.reflect =
    unit.reflectTurns =
      0;
}

export function prepareRoom(unit: Unit) {
  clearEffects(unit);
  unit.cooldowns = {};
  const p = unit.passives;
  unit.guard = p.openingGuard;
  unit.guardTurns = p.openingGuard > 0 ? 2 : 0;
  unit.iceArmor = p.iceArmor;
  unit.iceCharges = p.iceCharges;
  unit.reactiveHeal = p.reactiveHeal;
  unit.reactiveHealCharges = p.reactiveHealCharges;
  unit.openingAttack = p.openingAttack;
}

export function beginTurn(run: Run) {
  const actor = currentUnit(run);
  if (!actor || actor.hp <= 0) return;
  for (const key of Object.keys(actor.cooldowns)) {
    actor.cooldowns[key] = Math.max(0, actor.cooldowns[key]! - 1);
    if (actor.cooldowns[key] === 0) {
      delete actor.cooldowns[key];
      const ability = actor.abilities.find(
        (a) => (a.cooldownGroup ?? a.id) === key,
      );
      if (ability)
        run.events.push({
          type: "ready",
          targetId: actor.id,
          name: ability.name,
        });
    }
  }
  // Each duration advances only when the affected unit begins a turn.
  if (actor.guardTurns > 0 && --actor.guardTurns === 0) {
    actor.guard = 0;
    run.log.push(`${actor.name}'s Guard fades.`);
  }
  if (actor.furyTurns > 0 && --actor.furyTurns === 0) actor.fury = 0;
  if (actor.curseTurns > 0 && --actor.curseTurns === 0) {
    actor.curse = 0;
    run.log.push(`${actor.name} is no longer cursed.`);
  }
  if (actor.reflectTurns > 0 && --actor.reflectTurns === 0) actor.reflect = 0;
  if (run.tauntId === actor.id) {
    delete run.tauntId;
    run.log.push(`${actor.name}'s taunt ends at the start of their turn.`);
    // Marks forced by Taunt are rolled again once it is over.
    markAll(run);
  }
}

export function advance(run: Run) {
  run.uses = {};
  run.turn++;
  if (run.turn >= run.order.length) {
    run.round++;
    run.ap = run.maxAp;
    setOrder(run);
  }
  beginTurn(run);
}

export function guard(
  run: Run,
  target: Unit,
  power: number,
  turns = GUARD_TURNS,
) {
  const active = target.guard > 0 && target.guardTurns > 0;
  // A curse lowers the shields a cat receives, too.
  // Shields replace each other, never add: the stronger one stays.
  target.guard = Math.max(active ? target.guard : 0, power - target.curse, 0);
  target.guardTurns = turns;
  run.log.push(
    `${target.name} ${active ? "restores" : "gains"} a ${target.guard} shield for ${turns} turns.`,
  );
}

export function fury(run: Run, target: Unit, power: number, turns = 3) {
  const active = target.furyTurns > 0;
  if (!active) target.fury = power;
  target.furyTurns = turns;
  run.log.push(
    `${target.name} ${active ? "renews" : "gains"} Inspired +${target.fury} for ${turns} turns.`,
  );
}

/**
 * `actor` heals `target` with `power` (a curse on the target lowers it): rolls a
 * critical, restores HP up to the maximum and records the event. Returns the HP
 * restored and the healing power after crit and curse.
 */
export function healUnit(run: Run, actor: Unit, target: Unit, power: number) {
  const crit = rollCrit(run, actor);
  const amount = Math.max(
    0,
    (crit ? Math.ceil(power * CRIT_MULTIPLIER) : power) - target.curse,
  );
  const healed = Math.min(target.maxHp - target.hp, amount);
  target.hp += healed;
  run.events.push({
    type: "heal",
    targetId: target.id,
    amount: healed,
    ...(crit ? { crit } : {}),
  });
  if (crit)
    run.log.push(`${actor.name} lands a critical heal on ${target.name}!`);
  return { healed, amount };
}
