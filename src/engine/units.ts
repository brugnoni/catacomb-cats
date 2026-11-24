import {
  trainingBonuses,
  masteryBonuses,
  masteryOf,
  hearthBonuses,
  trainingPassives,
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
  const gear = ITEM_BONUS[progress.equipment[id] as keyof typeof ITEM_BONUS];
  const hp = c.hp + growth.hp + mastery.hp + hearth.hp + (gear?.hp ?? 0);
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
        growth.attack + mastery.power + hearth.attack + (gear?.attack ?? 0);
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
      (gear?.initiative ?? 0),
    abilities,
    ...statusFields(),
    passives: trainingPassives(id, rank),
    color: c.color,
  };
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
