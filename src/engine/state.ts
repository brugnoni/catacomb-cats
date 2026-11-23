import { type Unit, type Run } from "./model";
import { ITEMS } from "./data";

export const clone = <T>(value: T): T => structuredClone(value);

export function units(run: Run): Unit[] {
  return [...run.party, ...run.enemies];
}

/** Seeded generator (mulberry32): the same seed always gives the same marks. */
export function random(run: Run): number {
  run.rng = (run.rng + 0x6d2b79f5) >>> 0;
  let t = run.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function critRandom(run: Run): number {
  run.critRng = (run.critRng + 0x6d2b79f5) >>> 0;
  let t = run.critRng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function rollCrit(run: Run, actor: Unit): boolean {
  const chance = run.party.some((u) => u.id === actor.id)
    ? run.critChance
    : run.enemyCritChance;
  return chance > 0 && critRandom(run) * 100 < chance;
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
    if (actor.cooldowns[key] === 0) delete actor.cooldowns[key];
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

export function check(run: Run): boolean {
  if (run.party.every((u) => u.hp <= 0)) {
    run.status = "defeat";
    run.log.push("Your expedition has fallen. Permanent upgrades remain.");
    return true;
  }
  if (run.enemies.every((u) => u.hp <= 0)) {
    run.gold += 20 + run.room * 10;
    run.xp += 30 + run.room * 15;
    run.status = run.room === 2 ? "victory" : "reward";
    run.items = [...new Set([...run.items, ITEMS[run.room]!])];
    run.log.push(
      `Room rewards: +${20 + run.room * 10} gold, +${30 + run.room * 15} XP and ${ITEMS[run.room]}. Spoils are banked only after defeating the boss and returning to the lobby.`,
    );
    if (run.room < 2) {
      run.bonus++;
      run.log.push(
        `Expedition Strength +1: all damage is now +${run.bonus} for the rest of this run.`,
      );
    }
    for (const c of run.party) {
      if (run.status === "victory") {
        c.hp = c.maxHp;
        clearEffects(c);
        c.cooldowns = {};
        c.iceCharges = c.reactiveHealCharges = c.openingAttack = 0;
        run.log.push(
          `${c.name} fully recovers after expedition victory (${c.hp}/${c.maxHp} HP).`,
        );
      } else if (c.hp <= 0) {
        c.hp = Math.max(1, Math.ceil(c.maxHp * 0.25));
        clearEffects(c);
        if (run.tauntId === c.id) delete run.tauntId;
        run.log.push(
          `${c.name} resurrects at 25% HP (${c.hp}/${c.maxHp}); no additional room recovery.`,
        );
      } else if (run.room < 2) {
        const healed = Math.min(8, c.maxHp - c.hp);
        c.hp += healed;
        run.log.push(`${c.name} recovers ${healed} HP (${c.hp}/${c.maxHp}).`);
      }
    }
    if (run.status === "victory") delete run.tauntId;
    run.log.push(
      run.status === "victory"
        ? "The Hollow King is defeated!"
        : "Room cleared. Choose your next descent.",
    );
    return true;
  }
  return false;
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

export function guard(run: Run, target: Unit, power: number, turns = 2) {
  const active = target.guard > 0 && target.guardTurns > 0;
  target.guard = power;
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
