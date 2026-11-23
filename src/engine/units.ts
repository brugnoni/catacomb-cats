import {
  trainingBonuses,
  masteryBonuses,
  hearthBonuses,
  trainingPassives,
} from "../progression";
import { isDamaging, type Progress, type Unit, type Run } from "./model";
import { CATS, SIGNATURE_ABILITIES, REVIVE_ABILITY } from "./data";

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

export function roomEnemies(room: number, d: Run["difficulty"]): Unit[] {
  const team =
    room === 0
      ? [
          enemy("e0", "Crypt rat", 31, 14, 8),
          enemy("e1", "Moss slime", 38, 7, 8),
        ]
      : room === 1
        ? [
            enemy("e0", "Bone sentry", 43, 13, 9),
            enemy("e1", "Cave bat", 31, 22, 8),
            enemy("e2", "Spore imp", 36, 9, 8),
          ]
        : [
            enemy("e0", "The Hollow King", 80, 11, 10),
            enemy("e1", "Royal wisp", 32, 17, 8),
            enemy("e2", "Bone squire", 40, 8, 9),
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
