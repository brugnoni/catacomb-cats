import {
  trainingBonuses,
  masteryBonuses,
  masteryOf,
  hearthBonuses,
  trainingPassives,
  GUARD_TURNS,
} from "../progression";
import { EXPEDITIONS, expeditionById } from "../expeditions";
import { isDamaging, type Progress, type Unit, type Run } from "./model";
import {
  CATS,
  ENEMY_TRAITS,
  ITEM_BONUS,
  SIGNATURE_ABILITIES,
  REVIVE_ABILITY,
} from "./data";

export function statusFields() {
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
    critBonus: 0,
    lowHpAttack: 0,
    thorns: 0,
    healed: 0,
    roomHeal: 0,
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
  const mastery = masteryBonuses(masteryOf(progress));
  const hearth = hearthBonuses(progress.generalLevel);
  const gear = ITEM_BONUS[progress.equipment[id] ?? ""];
  const hp = c.hp + growth.hp + mastery.hp + hearth.hp + (gear?.hp ?? 0);
  const abilities = [
    ...c.abilities,
    ...(rank >= 3
      ? [SIGNATURE_ABILITIES[id]!, ...(id === "clover" ? [REVIVE_ABILITY] : [])]
      : []),
  ].map((a) => {
    let bonus = 0;
    if (a.effect === "heal" || a.effect === "heal-all")
      bonus =
        growth.healing + mastery.power + hearth.support + (gear?.healing ?? 0);
    else if (a.effect === "guard")
      bonus =
        growth.guard + mastery.power + hearth.support + (gear?.guard ?? 0);
    else if (a.effect === "fury")
      bonus = growth.fury + mastery.power + hearth.support + (gear?.fury ?? 0);
    else if (isDamaging(a))
      bonus =
        growth.attack + mastery.power + hearth.attack + (gear?.attack ?? 0);
    const tweak = gear?.skill?.id === a.id ? gear.skill : undefined;
    const shields = a.effect === "guard" || a.effect === "taunt";
    return {
      ...a,
      power: a.power + bonus + (tweak?.power ?? 0),
      ...(tweak?.falloff ? { falloff: tweak.falloff } : {}),
      ...(shields && gear?.guardTurns
        ? { duration: GUARD_TURNS + gear.guardTurns }
        : {}),
    };
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
      (gear?.initiative ?? 0),
    abilities,
    ...statusFields(),
    passives: trainingPassives(id, rank),
    critBonus: gear?.crit ?? 0,
    lowHpAttack: gear?.lowHpAttack ?? 0,
    thorns: gear?.thorns ?? 0,
    healed: gear?.healed ?? 0,
    roomHeal: gear?.roomHeal ?? 0,
    color: c.color,
  };
}

/** True when the Trinket changes a skill this cat does not have (yet). */
export function trinketIdle(
  progress: Progress,
  id: string,
  item: string,
): boolean {
  const { skill, guardTurns } = ITEM_BONUS[item] ?? {};
  if (!skill && !guardTurns) return false;
  return !buildCat(progress, id).abilities.some((a) =>
    skill ? a.id === skill.id : a.effect === "guard" || a.effect === "taunt",
  );
}

export function enemy(
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

export function roomEnemies(
  room: number,
  d: Run["difficulty"],
  expedition = EXPEDITIONS[0]!.id,
): Unit[] {
  const { rooms } = expeditionById(expedition);
  const team = rooms[Math.min(room, rooms.length - 1)]!.map(
    ([name, hp, initiative, power], i) =>
      enemy(`e${i}`, name, hp, initiative, power),
  );
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
    const { armor, openingGuard } = ENEMY_TRAITS[u.name] ?? {};
    if (armor !== undefined) u.armor = armor + d.armorBonus;
    if (openingGuard) {
      u.guard = openingGuard;
      u.guardTurns = 2;
    }
  }
  return team;
}
