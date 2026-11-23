import {
  hearthBonuses,
  getDifficulty,
  BASE_CRIT_CHANCE,
  GUARD_TURNS,
  CRIT_MULTIPLIER,
} from "../progression";
import {
  isDamaging,
  LINE_FALLOFF,
  type Ability,
  type Progress,
  type Unit,
  type Run,
  type RunOptions,
} from "./model";
import { CATS } from "./data";
import { buildCat, roomEnemies } from "./units";
import {
  clone,
  units,
  rollCrit,
  markAll,
  setOrder,
  currentUnit,
  clearEffects,
  prepareRoom,
  beginTurn,
  check,
  advance,
  guard,
  fury,
} from "./state";
import {
  abilityUses,
  abilityUnavailableReason,
  abilityPower,
  abilityTargets,
} from "./abilities";
import { hurt } from "./damage";
import { canAct, resolveEnemies } from "./enemyAI";

export function createRun(
  progress: Progress,
  party: string[],
  seed = 1,
  options: RunOptions = {},
): Run {
  if (
    party.length !== 3 ||
    new Set(party).size !== 3 ||
    party.some((id) => !CATS.some((c) => c.id === id))
  )
    throw new Error("Choose three different cats.");
  const difficulty = getDifficulty(progress);
  const hearth = hearthBonuses(progress.generalLevel);
  const crit = options.crit ?? "off";
  const run: Run = {
    id: crypto.randomUUID(),
    rng: seed >>> 0,
    critRng: (seed ^ 0x9e3779b9) >>> 0,
    critChance:
      crit === "off"
        ? 0
        : typeof crit === "number"
          ? crit
          : BASE_CRIT_CHANCE + hearth.crit,
    enemyCritChance:
      crit === "off" ? 0 : typeof crit === "number" ? crit : BASE_CRIT_CHANCE,
    events: [],
    eventId: 0,
    party: party.map((id) => buildCat(progress, id)),
    enemies: roomEnemies(0, difficulty),
    order: [],
    turn: 0,
    round: 1,
    ap: 6 + hearth.openingAp,
    maxAp: 6,
    room: 0,
    status: "combat",
    log: [`The descent begins. ${difficulty.label}.`],
    gold: 0,
    xp: 0,
    items: [],
    bonus: 0,
    uses: {},
    roomUses: {},
    difficulty,
    secondWind: hearth.secondWind,
    hearthAp: hearth.openingAp,
  };
  for (const cat of run.party) prepareRoom(cat);
  setOrder(run);
  markAll(run);
  beginTurn(run);
  resolveEnemies(run);
  return run;
}

export function applyAbility(
  run: Run,
  actor: Unit,
  ability: Ability,
  target: Unit,
) {
  const power = abilityPower(run, actor, ability);
  run.log.push(`${actor.name} uses ${ability.name}.`);
  if (ability.effect === "revive") {
    target.hp = Math.max(1, Math.ceil(target.maxHp * 0.6));
    clearEffects(target);
    if (run.tauntId === target.id) delete run.tauntId;
    // A revived ally joins the initiative queue at the next round only.
    run.order = run.order.filter(
      (id, index) => id !== target.id || index <= run.turn,
    );
    run.events.push({ type: "heal", targetId: target.id, amount: target.hp });
    run.log.push(
      `${actor.name} revives ${target.name} at 60% HP (${target.hp}/${target.maxHp}). They act next round.`,
    );
  } else if (ability.effect === "heal" || ability.effect === "heal-all") {
    const targets =
      ability.effect === "heal-all"
        ? run.party.filter((u) => u.hp > 0)
        : [target];
    for (const t of targets) {
      const crit = rollCrit(run, actor);
      const amount = crit ? Math.ceil(power * CRIT_MULTIPLIER) : power;
      const healed = Math.min(t.maxHp - t.hp, amount);
      t.hp += healed;
      run.events.push({
        type: "heal",
        targetId: t.id,
        amount: healed,
        ...(crit ? { crit } : {}),
      });
      if (crit)
        run.log.push(`${actor.name} lands a critical heal on ${t.name}!`);
      run.log.push(
        `${actor.name} heals ${t.name}: +${healed} HP (${amount} healing power; ${t.hp}/${t.maxHp} HP).`,
      );
    }
  } else if (ability.effect === "guard") guard(run, target, power, GUARD_TURNS);
  else if (ability.effect === "fury") fury(run, target, power);
  else if (ability.effect === "taunt") {
    run.tauntId = actor.id;
    for (const enemy of run.enemies) if (enemy.hp > 0) enemy.mark = actor.id;
    if (power > 0) guard(run, actor, power, GUARD_TURNS);
    run.log.push(
      `${actor.name} taunts: enemies attack this cat until its next turn.`,
    );
  } else if (ability.effect === "ap") {
    run.maxAp += 2;
    run.ap += 2;
    run.log.push(
      `${actor.name} expands the reservoir: +2 current and maximum shared AP for this room (${run.ap}/${run.maxAp} AP after the 1 AP cost).`,
    );
  } else if (ability.effect === "cleave") {
    for (const t of run.enemies.filter((u) => u.hp > 0)) {
      if (actor.hp <= 0) break;
      hurt(run, actor, t, ability);
    }
  } else if (ability.effect === "line") {
    // The target takes the full hit; the enemies behind it (to its right) take less.
    const alive = run.enemies.filter((u) => u.hp > 0);
    const start = alive.findIndex((u) => u.id === target.id);
    alive.slice(start, start + LINE_FALLOFF.length).forEach((t, index) => {
      if (actor.hp > 0) hurt(run, actor, t, ability, LINE_FALLOFF[index]);
    });
  } else hurt(run, actor, target, ability);
}

export function act(state: Run, abilityId: string, targetId: string): Run {
  const actor = currentUnit(state);
  const ability = actor?.abilities.find((a) => a.id === abilityId);
  if (
    !actor ||
    !ability ||
    abilityUnavailableReason(state, ability) ||
    !abilityTargets(state, ability, targetId)
  )
    return state;
  const run = clone(state);
  run.events = [];
  run.eventId++;
  const a = currentUnit(run)!;
  const t = units(run).find((u) => u.id === targetId)!;
  run.ap -= ability.cost;
  run.uses[ability.id] = abilityUses(run, ability.id) + 1;
  const key = `${a.id}:${ability.id}`;
  run.roomUses[key] = (run.roomUses[key] ?? 0) + 1;
  if (ability.cooldownTurns)
    a.cooldowns[ability.cooldownGroup ?? ability.id] =
      ability.cooldownTurns + 1;
  applyAbility(run, a, ability, t);
  if (isDamaging(ability)) a.openingAttack = 0;
  // The turn ends by itself when no AP remain or nothing usable is left.
  if (!check(run) && (run.ap === 0 || !canAct(run, currentUnit(run)!))) {
    if (run.ap > 0)
      run.log.push(`${a.name} has no usable skills left and passes.`);
    advance(run);
    resolveEnemies(run);
  }
  run.log = run.log.slice(-60);
  return run;
}

export function endTurn(state: Run): Run {
  if (state.status !== "combat") return state;
  const run = clone(state);
  run.events = [];
  run.eventId++;
  advance(run);
  resolveEnemies(run);
  run.log = run.log.slice(-60);
  return run;
}

export function nextRoom(state: Run): Run {
  if (state.status !== "reward") return state;
  const run = clone(state);
  run.events = [];
  run.eventId++;
  run.room++;
  run.enemies = roomEnemies(run.room, run.difficulty);
  run.round = 1;
  run.maxAp = 6;
  run.ap = 6 + run.hearthAp;
  run.status = "combat";
  run.uses = {};
  run.roomUses = {};
  delete run.tauntId;
  for (const c of run.party) prepareRoom(c);
  run.log.push(
    `Entering room ${run.room + 1}. Expedition Strength remains +${run.bonus} damage.`,
  );
  setOrder(run);
  markAll(run);
  beginTurn(run);
  resolveEnemies(run);
  return run;
}
