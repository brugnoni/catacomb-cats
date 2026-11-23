import {
  trainingCost,
  trainingBonuses,
  masteryBonuses,
  hearthBonuses,
  getDifficulty,
  MAX_TRAINING_RANK,
  trainingPassives,
  BASE_CRIT_CHANCE,
  CRIT_MULTIPLIER,
} from "./progression";
export interface Ability {
  id: string;
  name: string;
  cost: number;
  power: number;
  target:
    "enemy" | "ally" | "self" | "all-allies" | "all-enemies" | "fallen-ally";
  effect?:
    | "guard"
    | "fury"
    | "heal"
    | "taunt"
    | "ap"
    | "heal-all"
    | "cleave"
    | "pierce"
    | "line"
    | "revive";
  turnLimit?: number;
  roomLimit?: number;
  cooldownTurns?: number;
  cooldownGroup?: string;
}
/** Attacks that hurt enemies: every skill without a support effect. */
export const isDamaging = (ability: Ability): boolean =>
  !ability.effect ||
  ability.effect === "pierce" ||
  ability.effect === "cleave" ||
  ability.effect === "line";
/** Damage shares of Dagger line: the target, the enemy behind it, and the next one. */
export const LINE_FALLOFF = [1, 0.5, 0.35] as const;
export interface Cat {
  id: string;
  name: string;
  role: string;
  color: string;
  hp: number;
  initiative: number;
  abilities: Ability[];
}
const strike: Ability = {
  id: "strike",
  name: "Claw strike",
  cost: 1,
  power: 4,
  target: "enemy",
};
export const CATS: Cat[] = [
  {
    id: "miso",
    name: "Miso",
    role: "Vanguard",
    color: "#f4ae68",
    hp: 35,
    initiative: 12,
    abilities: [
      { ...strike, name: "Valiant slash" },
      {
        id: "guard",
        name: "Nine lives",
        cost: 2,
        power: 6,
        target: "ally",
        effect: "guard",
      },
    ],
  },
  {
    id: "luna",
    name: "Luna",
    role: "Mystic",
    color: "#a99bea",
    hp: 25,
    initiative: 15,
    abilities: [
      { ...strike, name: "Moon bolt", power: 5 },
      {
        id: "fury",
        name: "Moon blessing",
        cost: 2,
        power: 2,
        target: "ally",
        effect: "fury",
      },
    ],
  },
  {
    id: "pip",
    name: "Pip",
    role: "Scout",
    color: "#88ceb3",
    hp: 27,
    initiative: 20,
    abilities: [
      strike,
      {
        id: "line",
        name: "Dagger line",
        cost: 2,
        power: 8,
        target: "enemy",
        effect: "line",
        turnLimit: 1,
        cooldownTurns: 1,
      },
    ],
  },
  {
    id: "clover",
    name: "Mei",
    role: "Healer",
    color: "#d2d98d",
    hp: 29,
    initiative: 10,
    abilities: [
      { ...strike, name: "Thorn swipe" },
      {
        id: "heal",
        name: "Healing purr",
        cost: 2,
        power: 7,
        target: "ally",
        effect: "heal",
      },
    ],
  },
  {
    id: "ember",
    name: "Ember",
    role: "Brawler",
    color: "#e98e91",
    hp: 32,
    initiative: 8,
    abilities: [
      { ...strike, name: "Cinder jab", power: 5 },
      {
        id: "slam",
        name: "Flame paw",
        cost: 3,
        power: 20,
        target: "enemy",
        cooldownTurns: 2,
      },
    ],
  },
];
export const SIGNATURE_ABILITIES: Record<string, Ability> = {
  miso: {
    id: "taunt",
    name: "Stand behind me",
    cost: 2,
    power: 0,
    target: "self",
    effect: "taunt",
    turnLimit: 1,
  },
  luna: {
    id: "surge",
    name: "Moonwell",
    cost: 1,
    power: 2,
    target: "self",
    effect: "ap",
    roomLimit: 1,
    turnLimit: 1,
  },
  clover: {
    id: "renewal",
    name: "Circle of renewal",
    cost: 3,
    power: 5,
    target: "all-allies",
    effect: "heal-all",
    turnLimit: 1,
  },
  pip: {
    id: "pierce",
    name: "Needle strike",
    cost: 2,
    power: 8,
    target: "enemy",
    effect: "pierce",
    turnLimit: 1,
  },
  ember: {
    id: "cleave",
    name: "Sweeping embers",
    cost: 3,
    power: 6,
    target: "all-enemies",
    effect: "cleave",
    turnLimit: 1,
    cooldownTurns: 1,
  },
};
export const REVIVE_ABILITY: Ability = {
  id: "revive",
  name: "Return to the hearth",
  cost: 3,
  power: 60,
  target: "fallen-ally",
  effect: "revive",
  turnLimit: 1,
  cooldownTurns: 2,
};
export interface Progress {
  version: 1;
  gold: number;
  xp: number;
  generalLevel: number;
  catLevels: Record<string, number>;
  equipment: Record<string, string>;
  inventory: string[];
  claimedRuns: string[];
  wins: number;
  spentGold: number;
}
export const ITEMS = ["Iron bell", "Silk ribbon", "Lucky fang"];
export function initialProgress(): Progress {
  return {
    version: 1,
    gold: 30,
    xp: 0,
    generalLevel: 0,
    catLevels: {},
    equipment: {},
    inventory: [ITEMS[0]!],
    claimedRuns: [],
    wins: 0,
    spentGold: 0,
  };
}
export interface Unit {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  initiative: number;
  abilities: Ability[];
  guard: number;
  guardTurns: number;
  fury: number;
  furyTurns: number;
  curse: number;
  curseTurns: number;
  armor: number;
  reflect: number;
  reflectTurns: number;
  color: string;
  cooldowns: Record<string, number>;
  iceArmor: number;
  iceCharges: number;
  reactiveHeal: number;
  reactiveHealCharges: number;
  openingAttack: number;
  passives: ReturnType<typeof trainingPassives>;
  /** Enemy only: the cat this enemy has marked for its next hostile action. */
  mark?: string;
}
/** What just happened in the last action; the interface replays these. */
export type CombatEvent =
  | {
      type: "hit";
      targetId: string;
      damage: number;
      absorbed: number;
      crit?: boolean;
    }
  | { type: "heal"; targetId: string; amount: number; crit?: boolean };
export interface Run {
  id: string;
  /** State of the seeded random generator used for enemy target marks. */
  rng: number;
  events: CombatEvent[];
  /** Increases on every state transition so the interface can restart animations. */
  eventId: number;
  party: Unit[];
  enemies: Unit[];
  order: string[];
  turn: number;
  round: number;
  ap: number;
  maxAp: number;
  room: number;
  status: "combat" | "reward" | "victory" | "defeat";
  log: string[];
  gold: number;
  xp: number;
  items: string[];
  bonus: number;
  uses: Record<string, number>;
  roomUses: Record<string, number>;
  tauntId?: string;
  difficulty: ReturnType<typeof getDifficulty>;
  /** Hearth Second Wind: percent of max HP restored to the first cat to fall; 0 = unused or locked. */
  secondWind: number;
  /** Hearth: extra shared AP in the first round of every room. */
  hearthAp: number;
  /** Percent chance that a cat's hit or heal is critical. */
  critChance: number;
  /** Percent chance that an enemy's hit or heal is critical. */
  enemyCritChance: number;
  /** Separate generator for critical rolls, so marks never depend on them. */
  critRng: number;
}
const clone = <T>(value: T): T => structuredClone(value);
function statusFields() {
  return {
    guard: 0,
    guardTurns: 0,
    fury: 0,
    furyTurns: 0,
    curse: 0,
    curseTurns: 0,
    armor: 0,
    reflect: 0,
    reflectTurns: 0,
    cooldowns: {},
    iceArmor: 0,
    iceCharges: 0,
    reactiveHeal: 0,
    reactiveHealCharges: 0,
    openingAttack: 0,
    passives: {
      openingGuard: 0,
      iceArmor: 0,
      iceCharges: 0,
      reactiveHeal: 0,
      reactiveHealCharges: 0,
      openingAttack: 0,
    },
  };
}
export function buildCat(progress: Progress, id: string): Unit {
  const c = CATS.find((c) => c.id === id);
  if (!c) throw new Error("Unknown companion.");
  const rank = progress.catLevels[id] ?? 0;
  const growth = trainingBonuses(id, rank);
  const mastery = masteryBonuses(progress.xp);
  const hearth = hearthBonuses(progress.generalLevel);
  const gear = progress.equipment[id];
  const hp =
    c.hp + growth.hp + mastery.hp + hearth.hp + (gear === "Iron bell" ? 6 : 0);
  const abilities = [
    ...c.abilities,
    ...(rank >= 3
      ? [SIGNATURE_ABILITIES[id]!, ...(id === "clover" ? [REVIVE_ABILITY] : [])]
      : []),
  ].map((a) => {
    let bonus = 0;
    if (a.effect === "heal" || a.effect === "heal-all")
      bonus = growth.healing + mastery.power + hearth.support;
    else if (a.effect === "guard")
      bonus = growth.guard + mastery.power + hearth.support;
    else if (a.effect === "fury")
      bonus = growth.fury + mastery.power + hearth.support;
    else if (isDamaging(a))
      bonus =
        growth.attack +
        mastery.power +
        hearth.attack +
        (gear === "Lucky fang" ? 1 : 0);
    return { ...a, power: a.power + bonus };
  });
  return {
    id,
    name: c.name,
    hp,
    maxHp: hp,
    initiative:
      c.initiative +
      growth.initiative +
      hearth.initiative +
      (gear === "Silk ribbon" ? 3 : 0),
    abilities,
    ...statusFields(),
    passives: trainingPassives(id, rank),
    color: c.color,
  };
}
function enemy(
  id: string,
  name: string,
  hp: number,
  initiative: number,
  power: number,
): Unit {
  return {
    id,
    name,
    hp,
    maxHp: hp,
    initiative,
    abilities: [
      { id: "strike", name: "Attack", cost: 1, power, target: "enemy" },
    ],
    ...statusFields(),
    color: "#b282b8",
  };
}
function roomEnemies(room: number, d: Run["difficulty"]): Unit[] {
  const team =
    room === 0
      ? [
          enemy("e0", "Crypt rat", 24, 14, 5),
          enemy("e1", "Moss slime", 29, 7, 5),
        ]
      : room === 1
        ? [
            enemy("e0", "Bone sentry", 32, 13, 6),
            enemy("e1", "Cave bat", 24, 22, 5),
            enemy("e2", "Spore imp", 27, 9, 5),
          ]
        : [
            enemy("e0", "The Hollow King", 74, 11, 8),
            enemy("e1", "Royal wisp", 29, 17, 5),
            enemy("e2", "Bone squire", 36, 8, 6),
          ];
  for (let i = 0; i < d.extraEnemies; i++)
    team.push(
      enemy(
        `e${team.length}`,
        i === 0 ? "Cave bat" : "Bone squire",
        i === 0 ? 20 : 26,
        i === 0 ? 21 : 8,
        4,
      ),
    );
  for (const u of team) {
    u.hp = u.maxHp = Math.round(u.hp * d.hpMultiplier);
    u.initiative += d.initiativeBonus;
    u.abilities[0]!.power += d.damageBonus;
    if (u.name === "Bone sentry" || u.name === "Bone squire") {
      u.armor = 2 + d.armorBonus;
      u.guard = 6;
      u.guardTurns = 2;
    } else if (u.name === "The Hollow King") u.armor = 1 + d.armorBonus;
  }
  return team;
}
function units(run: Run): Unit[] {
  return [...run.party, ...run.enemies];
}
/** Seeded generator (mulberry32): the same seed always gives the same marks. */
function random(run: Run): number {
  run.rng = (run.rng + 0x6d2b79f5) >>> 0;
  let t = run.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function critRandom(run: Run): number {
  run.critRng = (run.critRng + 0x6d2b79f5) >>> 0;
  let t = run.critRng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rollCrit(run: Run, actor: Unit): boolean {
  const chance = run.party.some((u) => u.id === actor.id)
    ? run.critChance
    : run.enemyCritChance;
  return chance > 0 && critRandom(run) * 100 < chance;
}
function pickLiving(run: Run, group: Unit[]): Unit | undefined {
  const living = group.filter((u) => u.hp > 0);
  return living[Math.floor(random(run) * living.length)];
}
function markTarget(run: Run, enemy: Unit) {
  // While Taunt lasts, every enemy marks the taunting cat for its attacks.
  const taunter = run.party.find((u) => u.hp > 0 && u.id === run.tauntId);
  const cat = taunter ?? pickLiving(run, run.party);
  if (cat) enemy.mark = cat.id;
  else delete enemy.mark;
}
function markAll(run: Run) {
  for (const e of run.enemies) if (e.hp > 0) markTarget(run, e);
}
function setOrder(run: Run) {
  run.order = units(run)
    .filter((u) => u.hp > 0)
    .sort((a, b) => b.initiative - a.initiative || a.id.localeCompare(b.id))
    .map((u) => u.id);
  run.turn = 0;
}
export function currentUnit(run: Run) {
  return units(run).find((u) => u.id === run.order[run.turn]);
}
function clearEffects(unit: Unit) {
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
function prepareRoom(unit: Unit) {
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
function beginTurn(run: Run) {
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
export interface RunOptions {
  /** "off" (default) disables critical hits; "on" uses the base chance plus Hearth; a number fixes the chance. */
  crit?: "off" | "on" | number;
}
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
function check(run: Run): boolean {
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
function advance(run: Run) {
  run.uses = {};
  run.turn++;
  if (run.turn >= run.order.length) {
    run.round++;
    run.ap = run.maxAp;
    setOrder(run);
  }
  beginTurn(run);
}
function guard(run: Run, target: Unit, power: number, turns = 2) {
  const active = target.guard > 0 && target.guardTurns > 0;
  target.guard = power;
  target.guardTurns = turns;
  run.log.push(
    `${target.name} ${active ? "restores" : "gains"} a ${target.guard} shield for ${turns} turns.`,
  );
}
function fury(run: Run, target: Unit, power: number, turns = 3) {
  const active = target.furyTurns > 0;
  if (!active) target.fury = power;
  target.furyTurns = turns;
  run.log.push(
    `${target.name} ${active ? "renews" : "gains"} Inspired +${target.fury} for ${turns} turns.`,
  );
}
export interface DamagePreview {
  power: number;
  armor: number;
  blocked: number;
  iceBlocked: number;
  reactiveHealing: number;
  damage: number;
  remainingHp: number;
}
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
): DamagePreview {
  const base = abilityPower(run, actor, ability);
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
function rescue(run: Run, unit: Unit) {
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
function hurt(
  run: Run,
  actor: Unit,
  target: Unit,
  ability: Ability,
  scale = 1,
) {
  const crit = rollCrit(run, actor);
  const {
    power,
    armor,
    blocked,
    iceBlocked,
    reactiveHealing,
    damage: dealt,
    remainingHp,
  } = damagePreview(run, actor, ability, target, scale, crit);
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
  if (
    dealt > 0 &&
    target.reflect > 0 &&
    target.reflectTurns > 0 &&
    actor.hp > 0
  ) {
    const reflected = Math.min(actor.hp, target.reflect);
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
type EnemyPlanKind =
  "attack" | "curse" | "heal" | "inspire" | "ward" | "mirror" | "rally";
interface EnemyPlan {
  kind: EnemyPlanKind;
  /** Hostile target: the weakest cat for a curse. Attacks use the mark. */
  targetId?: string;
  /** Friendly target of a support action. */
  allyId?: string;
}
const weakestCat = (run: Run) =>
  run.party
    .filter((u) => u.hp > 0)
    .sort((a, b) => a.hp - b.hp || a.id.localeCompare(b.id))[0];
/** Single source of truth for what an enemy does in a given round. */
function planEnemyAction(run: Run, actor: Unit, round: number): EnemyPlan {
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
export interface EnemyIntent {
  kind: EnemyPlanKind;
  label: string;
  /** Cat that will be attacked or cursed. Undefined if it must be re-rolled. */
  targetId?: string;
  /** Enemy that will receive help. */
  allyId?: string;
  /** True when Taunt will redirect the attack away from the mark. */
  redirected?: boolean;
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
function canAct(run: Run, actor: Unit): boolean {
  const targets = [actor.id, ...units(run).map((u) => u.id)];
  return actor.abilities.some(
    (ability) =>
      !abilityUnavailableReason(run, ability) &&
      targets.some((id) => !abilityTargetUnavailableReason(run, ability, id)),
  );
}
function resolveEnemies(run: Run) {
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
      // Every enemy turn ends by marking a new random cat for the next one.
      if (actor.hp > 0) markTarget(run, actor);
      if (check(run)) return;
    }
    advance(run);
  }
}
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
      !run.party.some((u) => u.hp > 0 && u.hp < u.maxHp)
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
  if (ability.effect === "heal" && target.hp >= target.maxHp)
    return "Already at full HP";
  if (ability.effect === "guard" && target.guard > 0 && target.guardTurns >= 2)
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
function applyAbility(run: Run, actor: Unit, ability: Ability, target: Unit) {
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
  } else if (ability.effect === "guard") guard(run, target, power, 2);
  else if (ability.effect === "fury") fury(run, target, power);
  else if (ability.effect === "taunt") {
    run.tauntId = actor.id;
    for (const enemy of run.enemies) if (enemy.hp > 0) enemy.mark = actor.id;
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
export function claimRewards(progress: Progress, run: Run): Progress {
  if (run.status !== "victory" || progress.claimedRuns.includes(run.id))
    return progress;
  return {
    ...progress,
    claimedRuns: [...progress.claimedRuns, run.id].slice(-100),
    gold: progress.gold + run.gold,
    xp: progress.xp + run.xp,
    inventory: [...new Set([...progress.inventory, ...run.items])],
    wins: progress.wins + 1,
  };
}
export function upgradeCost(progress: Progress, catId?: string): number {
  return catId
    ? trainingCost(progress.catLevels[catId] ?? 0)
    : 20 + 20 * progress.generalLevel;
}
export function buyUpgrade(progress: Progress, catId?: string): Progress {
  if (catId && !CATS.some((c) => c.id === catId)) return progress;
  const rank = catId ? (progress.catLevels[catId] ?? 0) : progress.generalLevel;
  if (rank >= MAX_TRAINING_RANK) return progress;
  const cost = upgradeCost(progress, catId);
  if (progress.gold < cost) return progress;
  return {
    ...progress,
    gold: progress.gold - cost,
    spentGold: progress.spentGold + cost,
    generalLevel: progress.generalLevel + (catId ? 0 : 1),
    catLevels: catId
      ? { ...progress.catLevels, [catId]: rank + 1 }
      : progress.catLevels,
  };
}
export function equip(
  progress: Progress,
  catId: string,
  itemId: string,
): Progress {
  if (!CATS.some((c) => c.id === catId)) return progress;
  const equipment = { ...progress.equipment };
  if (itemId === "") {
    delete equipment[catId];
    return { ...progress, equipment };
  }
  if (!progress.inventory.includes(itemId)) return progress;
  for (const id of Object.keys(equipment))
    if (equipment[id] === itemId) delete equipment[id];
  equipment[catId] = itemId;
  return { ...progress, equipment };
}
export function parseProgress(raw: string | null): Progress {
  try {
    const parsed: unknown = JSON.parse(raw ?? "null");
    if (!parsed || typeof parsed !== "object") return initialProgress();
    const x = parsed as Progress;
    const num = (n: unknown) =>
      typeof n === "number" &&
      Number.isSafeInteger(n) &&
      n >= 0 &&
      n <= 1000000;
    if (
      x.version !== 1 ||
      !Array.isArray(x.claimedRuns) ||
      x.claimedRuns.length > 100 ||
      x.claimedRuns.some((id) => typeof id !== "string" || id.length > 100) ||
      Array.isArray(x.catLevels) ||
      Array.isArray(x.equipment) ||
      !num(x.gold) ||
      !num(x.xp) ||
      !num(x.generalLevel) ||
      !x.catLevels ||
      typeof x.catLevels !== "object" ||
      !x.equipment ||
      typeof x.equipment !== "object" ||
      !Array.isArray(x.inventory) ||
      x.inventory.some((i) => !ITEMS.includes(i)) ||
      Object.keys(x.catLevels).some(
        (id) => !CATS.some((c) => c.id === id) || !num(x.catLevels[id]),
      ) ||
      Object.keys(x.equipment).some(
        (id) =>
          !CATS.some((c) => c.id === id) ||
          !x.inventory.includes(x.equipment[id]!),
      ) ||
      new Set(Object.values(x.equipment)).size !==
        Object.values(x.equipment).length ||
      (x.wins !== undefined && !num(x.wins)) ||
      (x.spentGold !== undefined && !num(x.spentGold))
    )
      return initialProgress();
    const legacySpend =
      Object.values(x.catLevels).reduce(
        (sum, rank) => sum + 20 * rank + 10 * rank * (rank - 1),
        0,
      ) +
      20 * x.generalLevel +
      10 * x.generalLevel * (x.generalLevel - 1);
    return {
      version: 1,
      gold: x.gold,
      xp: x.xp,
      generalLevel: x.generalLevel,
      catLevels: { ...x.catLevels },
      equipment: { ...x.equipment },
      inventory: [...new Set(x.inventory)],
      claimedRuns: [...x.claimedRuns],
      wins: x.wins ?? x.claimedRuns.length,
      spentGold: x.spentGold ?? Math.min(1000000, legacySpend),
    };
  } catch {
    return initialProgress();
  }
}
