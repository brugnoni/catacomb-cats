import {
  type Ability,
  type Cat,
  type EnemyPlanKind,
  type Progress,
} from "./model";

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
        cost: 1,
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
    hp: 30,
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
    name: "Pursian",
    role: "Scout",
    color: "#88ceb3",
    hp: 40,
    initiative: 20,
    abilities: [
      strike,
      {
        id: "line",
        name: "Dagger line",
        cost: 1,
        power: 5,
        target: "enemy",
        effect: "line",
        turnLimit: 1,
        cooldownTurns: 1,
        lifesteal: 30,
      },
    ],
  },
  {
    id: "clover",
    name: "Mei",
    role: "Healer",
    color: "#d2d98d",
    hp: 36,
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
    name: "Tuntun",
    role: "Brawler",
    color: "#e98e91",
    hp: 42,
    initiative: 12,
    abilities: [
      { ...strike, name: "Cinder jab", power: 5 },
      {
        id: "slam",
        name: "Flame paw",
        cost: 3,
        power: 24,
        target: "enemy",
        cooldownTurns: 1,
        lifesteal: 30,
      },
    ],
  },
];

export const SIGNATURE_ABILITIES: Record<string, Ability> = {
  miso: {
    id: "taunt",
    name: "Stand behind me",
    cost: 2,
    power: 5,
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
    power: 8,
    target: "all-enemies",
    effect: "cleave",
    turnLimit: 1,
    cooldownTurns: 1,
    lifesteal: 30,
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

/** What each trinket adds to the cat wearing it. Order is the room that drops it. */
export const ITEM_BONUS = {
  "Iron bell": { hp: 6, initiative: 0, attack: 0 },
  "Silk ribbon": { hp: 0, initiative: 3, attack: 0 },
  "Lucky fang": { hp: 0, initiative: 0, attack: 1 },
} as const;
export const ITEMS = Object.keys(ITEM_BONUS);

/** Names of the two extra Skins of each Companion; Skin 0 is the original. */
export const SKINS: Record<string, [string, string]> = {
  miso: ["Iron Warden", "Golden Aegis"],
  luna: ["Nightshade", "Persian Eclipse"],
  pip: ["Tuxedo", "Desert Nomad"],
  clover: ["Frost Healer", "Field Medic"],
  ember: ["Karate Master", "Shaolin Monk"],
};

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
    expeditionWins: {},
    spentGold: 0,
    skins: {},
    lampBoosts: 0,
  };
}

/** What sets an enemy apart, keyed by its name. Enemies not listed just attack. */
export interface EnemyTraits {
  /** Plan for the rounds whose number modulo 3 is the key; it falls back to an attack when it has no one to act on. */
  cycle?: Partial<Record<0 | 1 | 2, EnemyPlanKind>>;
  /** Armor before the Ascension bonus. */
  armor?: number;
  /** Guard shield (lasting 2 turns) each room opens with. */
  openingGuard?: number;
  /** Curse power (1 when missing). */
  curse?: number;
}

export const ENEMY_TRAITS: Record<string, EnemyTraits> = {
  "Royal wisp": { cycle: { 1: "heal" } },
  "Moss slime": { cycle: { 1: "inspire" } },
  "Spore imp": { cycle: { 0: "mirror", 1: "curse", 2: "ward" } },
  "The Hollow King": { cycle: { 1: "curse" }, armor: 1, curse: 2 },
  "Bone squire": { cycle: { 1: "rally" }, armor: 2, openingGuard: 6 },
  "Bone sentry": { armor: 2, openingGuard: 6 },
};
