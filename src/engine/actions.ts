import { hearthBonuses, getDifficulty, BASE_CRIT_CHANCE } from "../progression";
import {
  EXPEDITIONS,
  expeditionById,
  expeditionUnlocked,
} from "../expeditions";
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
  healUnit,
  markAll,
  setOrder,
  dropFallenEnemies,
  currentUnit,
  clearEffects,
  prepareRoom,
  roomSnack,
  beginTurn,
  advance,
  guard,
  fury,
} from "./state";
import {
  abilityUses,
  abilityCost,
  abilityUnavailableReason,
  abilityTargetUnavailableReason,
  abilityPower,
  abilityReach,
} from "./abilities";
import { hurt } from "./damage";
import { canAct, resolveEnemies } from "./enemyAI";
import { settleRoom } from "./room";
import { RELICS, rollOffer } from "./relics";

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
  const chosen = expeditionById(options.expedition ?? EXPEDITIONS[0]!.id);
  if (!expeditionUnlocked(progress, chosen))
    throw new Error("That expedition is still locked.");
  const difficulty = getDifficulty(progress, party);
  const hearth = hearthBonuses(progress.generalLevel);
  const crit = options.crit ?? "off";
  const run: Run = {
    id: `${seed}-${Date.now().toString(36)}`,
    rng: seed >>> 0,
    critRng: (seed ^ 0x9e3779b9) >>> 0,
    luck: crit === "on",
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
    enemies: roomEnemies(0, difficulty, chosen.id),
    order: [],
    turn: 0,
    round: 1,
    ap: 6 + hearth.openingAp,
    maxAp: 6,
    room: 0,
    expedition: chosen.id,
    status: "combat",
    log: [`The descent begins. ${difficulty.label}.`],
    gold: 0,
    xp: 0,
    items: [],
    owned: [...progress.inventory],
    dropRng: ((options.lootSeed ?? seed) ^ 0x5bd1e995) >>> 0,
    bonus: 0,
    uses: {},
    roomUses: {},
    difficulty,
    secondWind: hearth.secondWind,
    hearthAp: hearth.openingAp,
    relics: [],
    offer: [],
    useRelics: options.relics ?? false,
    relicRng: ((options.lootSeed ?? seed) ^ 0x2545f491) >>> 0,
  };
  offerOrEnter(run);
  return run;
}

/** Holds the room until a Relic is picked, when there is one to offer. */
function offerOrEnter(run: Run) {
  const last = expeditionById(run.expedition).rooms.length - 1;
  if (run.useRelics) run.offer = rollOffer(run, run.room === last);
  if (run.offer.length) run.status = "relic";
  else enterRoom(run);
}

export function pickRelic(state: Run, name: string): Run {
  if (state.status !== "relic" || !state.offer.includes(name)) return state;
  return transition(state, (run) => {
    run.relics.push(name);
    run.offer = [];
    run.status = "combat";
    RELICS[name]!.apply?.(run);
    run.log.push(`Relic chosen: ${name}.`);
    enterRoom(run);
  });
}

/** Starts the room already set up in `run`: fresh cats, turn order, marks, then the enemies that act first. */
function enterRoom(run: Run) {
  for (const cat of run.party) {
    prepareRoom(cat);
    roomSnack(run, cat);
  }
  if (run.relics.includes("Reckless torch"))
    for (const e of run.enemies) e.abilities[0]!.power += 2;
  setOrder(run);
  markAll(run);
  beginTurn(run);
  resolveEnemies(run);
  dropFallenEnemies(run);
}

/** Runs one public action on a copy of `state`: events restart and the log stays bounded. */
function transition(state: Run, apply: (run: Run) => void): Run {
  const run = clone(state);
  run.events = [];
  run.eventId++;
  apply(run);
  dropFallenEnemies(run);
  run.log = run.log.slice(-60);
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
    target.hp = Math.max(1, Math.ceil((target.maxHp * power) / 100));
    clearEffects(target);
    if (run.tauntId === target.id) delete run.tauntId;
    // A revived ally joins the initiative queue at the next round only.
    run.order = run.order.filter(
      (id, index) => id !== target.id || index <= run.turn,
    );
    run.events.push({ type: "heal", targetId: target.id, amount: target.hp });
    run.log.push(
      `${actor.name} revives ${target.name} at ${power}% HP (${target.hp}/${target.maxHp}). They act next round.`,
    );
  } else if (ability.effect === "heal" || ability.effect === "heal-all") {
    for (const t of abilityReach(run, ability, target.id)) {
      // A curse lowers what a cat receives: healing as well as shields.
      const { healed, amount } = healUnit(run, actor, t, power);
      run.log.push(
        `${actor.name} heals ${t.name}: +${healed} HP (${amount} healing power; ${t.hp}/${t.maxHp} HP).`,
      );
      if (t.curse > 0) {
        t.curse = 0;
        t.curseTurns = 0;
        run.log.push(`${actor.name} lifts the curse on ${t.name}.`);
      }
    }
  } else if (ability.effect === "guard")
    guard(run, target, power, ability.duration);
  else if (ability.effect === "fury") fury(run, target, power);
  else if (ability.effect === "taunt") {
    run.tauntId = actor.id;
    for (const enemy of run.enemies) if (enemy.hp > 0) enemy.mark = actor.id;
    if (power > 0) guard(run, actor, power, ability.duration);
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
    for (const t of abilityReach(run, ability, target.id)) {
      if (actor.hp <= 0) break;
      hurt(run, actor, t, ability, 1, power);
    }
  } else if (ability.effect === "line") {
    // The target takes the full hit; the enemies behind it (to its right) take less.
    abilityReach(run, ability, target.id).forEach((t, index) => {
      if (actor.hp > 0)
        hurt(
          run,
          actor,
          t,
          ability,
          (ability.falloff ?? LINE_FALLOFF)[index],
          power,
        );
    });
  } else hurt(run, actor, target, ability, 1, power);
  relicAftermath(run, actor, ability);
}

/** Relics that add to a skill once it has landed. */
function relicAftermath(run: Run, actor: Unit, ability: Ability) {
  const has = (name: string, cat: string, id: string) =>
    run.relics.includes(name) &&
    actor.id === cat &&
    ability.id === id &&
    actor.hp > 0;
  if (has("Healing thorns", "clover", "strike")) {
    const hurtMost = run.party
      .filter((u) => u.hp > 0 && u.hp < u.maxHp)
      .sort((x, y) => y.maxHp - y.hp - (x.maxHp - x.hp))[0];
    if (hurtMost) {
      const { healed, amount } = healUnit(run, actor, hurtMost, 3);
      run.log.push(
        `${actor.name} heals ${hurtMost.name}: +${healed} HP (${amount} healing power; ${hurtMost.hp}/${hurtMost.maxHp} HP).`,
      );
    }
  }
  // Its shield is a Guard shield, so Stone den strengthens it too.
  const stance = run.relics.includes("Stone den") ? 6 : 3;
  if (has("Shield stance", "miso", "strike") && actor.guard < stance)
    guard(
      run,
      actor,
      stance,
      actor.abilities.find((a) => a.id === "guard")?.duration,
    );
  if (has("Overheat", "ember", "slam")) {
    const lost = Math.min(5, actor.hp - 1);
    actor.hp -= lost;
    run.events.push({
      type: "hit",
      targetId: actor.id,
      damage: lost,
      absorbed: 0,
    });
    run.log.push(
      `${actor.name} overheats: -${lost} HP (${actor.hp}/${actor.maxHp} HP).`,
    );
  }
}

export function act(state: Run, abilityId: string, targetId: string): Run {
  const actor = currentUnit(state);
  const ability = actor?.abilities.find((a) => a.id === abilityId);
  if (
    !actor ||
    !ability ||
    abilityUnavailableReason(state, ability) ||
    abilityTargetUnavailableReason(state, ability, targetId)
  )
    return state;
  return transition(state, (run) => {
    const a = currentUnit(run)!;
    const t = units(run).find((u) => u.id === targetId)!;
    run.ap -= abilityCost(run, ability);
    run.uses[ability.id] = abilityUses(run, ability.id) + 1;
    const key = `${a.id}:${ability.id}`;
    run.roomUses[key] = (run.roomUses[key] ?? 0) + 1;
    if (ability.cooldownTurns)
      a.cooldowns[ability.cooldownGroup ?? ability.id] =
        ability.cooldownTurns + 1;
    applyAbility(run, a, ability, t);
    if (isDamaging(ability)) a.openingAttack = 0;
    // The turn ends by itself when nothing usable is left (Kindling casts at 0 AP).
    if (!settleRoom(run) && !canAct(run, currentUnit(run)!)) {
      if (run.ap > 0)
        run.log.push(`${a.name} has no usable skills left and passes.`);
      advance(run);
      resolveEnemies(run);
    }
  });
}

export function endTurn(state: Run): Run {
  if (state.status !== "combat") return state;
  return transition(state, (run) => {
    advance(run);
    resolveEnemies(run);
  });
}

export function nextRoom(state: Run): Run {
  if (state.status !== "reward") return state;
  return transition(state, (run) => {
    run.room++;
    run.enemies = roomEnemies(run.room, run.difficulty, run.expedition);
    run.round = 1;
    run.maxAp = 6;
    run.ap = 6 + run.hearthAp;
    run.status = "combat";
    run.uses = {};
    run.roomUses = {};
    delete run.tauntId;
    run.log.push(
      `Entering room ${run.room + 1}. Expedition Strength remains +${run.bonus} damage.`,
    );
    offerOrEnter(run);
  });
}
