/** A foe in a room: name, HP, initiative and attack power before Ascension. */
export type EnemySpec = readonly [
  name: string,
  hp: number,
  initiative: number,
  power: number,
];

export interface Expedition {
  id: string;
  name: string;
  theme: string;
  /** Multiplies the gold and XP of every room. */
  rewardMultiplier: number;
  /** Victories in another Expedition needed to open this one. */
  unlock?: { from: string; wins: number };
  /** Highest training and Hearth rank this Expedition allows. */
  rankCap: number;
  /** Highest mastery level this Expedition allows. */
  masteryCap: number;
  recommendedPower: number;
  /** Enemy teams, one per room; the last room holds the boss. */
  rooms: readonly (readonly EnemySpec[])[];
}

/**
 * Every Expedition, in unlock order. Stats are tuned against the Ascension a
 * party at the Rank cap meets (see outputs/balance-report.md), so a later route
 * can have weaker base enemies than an earlier one.
 */
export const EXPEDITIONS: readonly Expedition[] = [
  {
    id: "catacombs",
    name: "The Catacombs",
    theme: "Rats, slimes and a hollow king.",
    rewardMultiplier: 1,
    rankCap: 4,
    masteryCap: 4,
    recommendedPower: 0,
    rooms: [
      [
        ["Crypt rat", 31, 14, 8],
        ["Moss slime", 38, 7, 8],
      ],
      [
        ["Bone sentry", 43, 13, 9],
        ["Cave bat", 31, 22, 8],
        ["Spore imp", 36, 9, 8],
      ],
      [
        ["The Hollow King", 80, 11, 10],
        ["Royal wisp", 32, 17, 8],
        ["Bone squire", 40, 8, 9],
      ],
    ],
  },
  {
    id: "warrens",
    name: "Moss Warrens",
    theme: "Slimes, imps and bats led by a royal wisp.",
    rewardMultiplier: 1.5,
    unlock: { from: "catacombs", wins: 3 },
    rankCap: 6,
    masteryCap: 7,
    recommendedPower: 31,
    rooms: [
      [
        ["Moss slime", 58, 7, 10],
        ["Spore imp", 48, 9, 10],
        ["Cave bat", 41, 22, 10],
      ],
      [
        ["Spore imp", 53, 9, 11],
        ["Moss slime", 65, 7, 11],
        ["Bone squire", 55, 8, 11],
      ],
      [
        ["Royal wisp", 115, 17, 12],
        ["Spore imp", 55, 9, 11],
        ["Moss slime", 70, 7, 11],
      ],
    ],
  },
  {
    id: "vault",
    name: "Bone Vault",
    theme: "Sentries and squires guarding a bone captain.",
    rewardMultiplier: 2,
    unlock: { from: "warrens", wins: 5 },
    rankCap: 8,
    masteryCap: 10,
    recommendedPower: 42,
    rooms: [
      [
        ["Bone sentry", 36, 13, 9],
        ["Bone squire", 32, 8, 9],
        ["Cave bat", 25, 22, 9],
      ],
      [
        ["Bone sentry", 39, 13, 10],
        ["Bone squire", 35, 8, 9],
        ["Spore imp", 34, 9, 9],
      ],
      [
        ["Bone sentry", 90, 13, 11],
        ["Bone squire", 36, 8, 9],
        ["Royal wisp", 27, 17, 9],
      ],
    ],
  },
];

type Wins = { expeditionWins: Record<string, number> };

/** The one place an unknown id fails; callers hold a real Expedition afterwards. */
export function expeditionById(id: string): Expedition {
  const found = EXPEDITIONS.find((e) => e.id === id);
  if (!found) throw new Error("Choose a real expedition.");
  return found;
}
export const expeditionUnlocked = (progress: Wins, e: Expedition) =>
  !e.unlock || (progress.expeditionWins[e.unlock.from] ?? 0) >= e.unlock.wins;
/** The chosen Expedition if it is open, otherwise the first one (for example after a save reset). */
export const playableExpedition = (progress: Wins, id: string) => {
  const chosen = EXPEDITIONS.find((e) => e.id === id);
  return chosen && expeditionUnlocked(progress, chosen)
    ? chosen
    : EXPEDITIONS[0]!;
};
/** The first Expedition the player has not opened yet, which holds back the Rank cap. */
export const nextLockedExpedition = (progress: Wins) =>
  EXPEDITIONS.find((e) => !expeditionUnlocked(progress, e));
/** The highest Expedition opened sets the Rank cap. */
const highestUnlocked = (progress: Wins) =>
  EXPEDITIONS.filter((e) => expeditionUnlocked(progress, e)).at(-1)!;
export const rankCap = (progress: Wins) => highestUnlocked(progress).rankCap;
export const masteryCap = (progress: Wins) =>
  highestUnlocked(progress).masteryCap;

/** Loot for clearing a room (0-2). Banked only after the boss falls and the player returns to the lobby. */
export const ROOM_REWARD = { gold: [40, 60, 80], xp: [30, 45, 60] } as const;
/** Room loot of an Expedition (the first one by default). */
export const roomReward = (room: number, expedition = EXPEDITIONS[0]!.id) => {
  const { rewardMultiplier } = expeditionById(expedition);
  return {
    gold: Math.round((ROOM_REWARD.gold[room] ?? 0) * rewardMultiplier),
    xp: Math.round((ROOM_REWARD.xp[room] ?? 0) * rewardMultiplier),
  };
};
/** Gold and XP for clearing all three rooms of an Expedition. */
export const expeditionReward = (expedition: string) =>
  [0, 1, 2].reduce(
    (sum, room) => {
      const loot = roomReward(room, expedition);
      return { gold: sum.gold + loot.gold, xp: sum.xp + loot.xp };
    },
    { gold: 0, xp: 0 },
  );
export const totalWins = (progress: Wins) =>
  Object.values(progress.expeditionWins).reduce((sum, n) => sum + n, 0);
/** Base loot of the first Expedition. */
export const EXPEDITION_REWARD = expeditionReward(EXPEDITIONS[0]!.id);
