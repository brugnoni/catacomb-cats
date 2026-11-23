import { type Ability, type Cat, type Progress } from "./model";

export const strike: Ability = {
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
    hp: 40,
    initiative: 12,
    abilities: [
      { ...strike, name: "Valiant slash", power: 5 },
      {
        id: "guard",
        name: "Nine lives",
        cost: 2,
        power: 8,
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
    hp: 30,
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
    hp: 35,
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
