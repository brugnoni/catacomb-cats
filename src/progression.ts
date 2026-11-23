/** Shared balance rules. Keep UI explanations and engine calculations on these values. */
export const MAX_TRAINING_RANK = 8;
export const MAX_MASTERY_LEVEL = 10;
export const XP_PER_MASTERY = 150;
/** Critical hits: base chance in percent for every skill, and the damage and healing multiplier. */
export const BASE_CRIT_CHANCE = 10;
export const CRIT_MULTIPLIER = 1.5;
export interface TrainingBonuses {
  hp: number;
  attack: number;
  healing: number;
  guard: number;
  fury: number;
  initiative: number;
}
const whole = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
export function trainingCost(rank: number): number {
  const r = whole(rank);
  return r === 0 ? 20 : r === 1 ? 30 : r === 2 ? 50 : 70 + 20 * (r - 3);
}
export interface TrainingPassives {
  openingGuard: number;
  iceArmor: number;
  iceCharges: number;
  reactiveHeal: number;
  reactiveHealCharges: number;
  openingAttack: number;
}
export interface TrainingRank {
  rank: number;
  title: string;
  description: string;
  bonuses: Partial<TrainingBonuses>;
  passive?: string;
  /** Absolute passive values unlocked at this rank, replacing earlier values. */
  passives?: Partial<TrainingPassives>;
}
export const SIGNATURE_NAMES: Record<string, string> = {
  miso: "Stand behind me",
  luna: "Moonwell",
  clover: "Circle of renewal",
  pip: "Needle strike",
  ember: "Sweeping embers",
};
export const TRAINING_TRACKS: Record<string, TrainingRank[]> = {
  miso: [
    {
      rank: 1,
      title: "Sturdy paws",
      description: "+3 max HP.",
      bonuses: { hp: 3 },
    },
    {
      rank: 2,
      title: "Shield practice",
      description: "+2 max HP and +1 Guard power.",
      bonuses: { hp: 2, guard: 1 },
    },
    {
      rank: 3,
      title: "Stand behind me",
      description: "Unlock Taunt: draw enemy attacks until your next turn.",
      bonuses: {},
    },
    {
      rank: 4,
      title: "Ready stance",
      description: "+3 max HP and +1 initiative.",
      bonuses: { hp: 3, initiative: 1 },
    },
    {
      rank: 5,
      title: "Prepared defender",
      description: "Start each room with a 4-point Guard shield.",
      bonuses: {},
      passive: "Opening Guard",
      passives: { openingGuard: 4 },
    },
    {
      rank: 6,
      title: "Hold the line",
      description: "+2 max HP and +1 Guard power.",
      bonuses: { hp: 2, guard: 1 },
    },
    {
      rank: 7,
      title: "Veteran claws",
      description: "+3 max HP and +1 attack power.",
      bonuses: { hp: 3, attack: 1 },
    },
    {
      rank: 8,
      title: "Burrow guardian",
      description:
        "+3 max HP, +1 Guard power; opening shield improves to 6 points.",
      bonuses: { hp: 3, guard: 1 },
      passive: "Opening Guard",
      passives: { openingGuard: 6 },
    },
  ],
  luna: [
    {
      rank: 1,
      title: "Moon studies",
      description: "+1 max HP and +1 attack power.",
      bonuses: { hp: 1, attack: 1 },
    },
    {
      rank: 2,
      title: "Quick incantation",
      description: "+1 max HP and +1 initiative.",
      bonuses: { hp: 1, initiative: 1 },
    },
    {
      rank: 3,
      title: "Moonwell",
      description:
        "Unlock Moonwell: raise shared AP by 2 for this room, once per room.",
      bonuses: {},
    },
    {
      rank: 4,
      title: "Brighter blessing",
      description: "+1 Inspired blessing power.",
      bonuses: { fury: 1 },
    },
    {
      rank: 5,
      title: "Ice ward",
      description:
        "Start each room reducing damage by 2 for the next 3 incoming attacks.",
      bonuses: {},
      passive: "Ice Ward",
      passives: { iceArmor: 2, iceCharges: 3 },
    },
    {
      rank: 6,
      title: "Focused moonlight",
      description: "+2 max HP and +1 attack power.",
      bonuses: { hp: 2, attack: 1 },
    },
    {
      rank: 7,
      title: "Astral rhythm",
      description: "+1 initiative and +1 Inspired blessing power.",
      bonuses: { initiative: 1, fury: 1 },
    },
    {
      rank: 8,
      title: "Winter moon",
      description:
        "+3 max HP; Ice Ward protects against 4 incoming attacks per room.",
      bonuses: { hp: 3 },
      passive: "Ice Ward",
      passives: { iceCharges: 4 },
    },
  ],
  clover: [
    {
      rank: 1,
      title: "Gentle paws",
      description: "+2 max HP and +1 healing power.",
      bonuses: { hp: 2, healing: 1 },
    },
    {
      rank: 2,
      title: "First responder",
      description: "+1 max HP and +1 initiative.",
      bonuses: { hp: 1, initiative: 1 },
    },
    {
      rank: 3,
      title: "Circle of renewal",
      description:
        "Unlock a choice: heal the party or revive one fallen ally at 60% HP.",
      bonuses: {},
    },
    {
      rank: 4,
      title: "Restorative touch",
      description: "+2 max HP and +1 healing power.",
      bonuses: { hp: 2, healing: 1 },
    },
    {
      rank: 5,
      title: "Soothing spirit",
      description:
        "Recover 2 HP when an attack damages you, up to 3 times per room.",
      bonuses: {},
      passive: "Soothing Spirit",
      passives: { reactiveHeal: 2, reactiveHealCharges: 3 },
    },
    {
      rank: 6,
      title: "Steady hands",
      description: "+2 max HP and +1 healing power.",
      bonuses: { hp: 2, healing: 1 },
    },
    {
      rank: 7,
      title: "Healing rhythm",
      description: "+1 initiative and +1 healing power.",
      bonuses: { initiative: 1, healing: 1 },
    },
    {
      rank: 8,
      title: "Unbroken spirit",
      description: "+3 max HP; Soothing Spirit can trigger 5 times per room.",
      bonuses: { hp: 3 },
      passive: "Soothing Spirit",
      passives: { reactiveHealCharges: 5 },
    },
  ],
  pip: [
    {
      rank: 1,
      title: "Light feet",
      description: "+1 max HP and +1 initiative.",
      bonuses: { hp: 1, initiative: 1 },
    },
    {
      rank: 2,
      title: "Sharp edge",
      description: "+1 max HP and +1 attack power.",
      bonuses: { hp: 1, attack: 1 },
    },
    {
      rank: 3,
      title: "Needle strike",
      description: "Unlock Needle strike: a precise attack that ignores armor.",
      bonuses: {},
    },
    {
      rank: 4,
      title: "Cave runner",
      description: "+2 max HP and +1 initiative.",
      bonuses: { hp: 2, initiative: 1 },
    },
    {
      rank: 5,
      title: "Ambush",
      description: "Your first damaging skill each room gains +2 attack power.",
      bonuses: {},
      passive: "Ambush",
      passives: { openingAttack: 2 },
    },
    {
      rank: 6,
      title: "Honed claws",
      description: "+2 max HP and +1 attack power.",
      bonuses: { hp: 2, attack: 1 },
    },
    {
      rank: 7,
      title: "Fleet scout",
      description: "+2 max HP and +1 initiative.",
      bonuses: { hp: 2, initiative: 1 },
    },
    {
      rank: 8,
      title: "Perfect opening",
      description: "+2 max HP, +1 attack power; Ambush improves to +3 power.",
      bonuses: { hp: 2, attack: 1 },
      passive: "Ambush",
      passives: { openingAttack: 3 },
    },
  ],
  ember: [
    {
      rank: 1,
      title: "Iron constitution",
      description: "+3 max HP.",
      bonuses: { hp: 3 },
    },
    {
      rank: 2,
      title: "Heavy paws",
      description: "+1 max HP and +1 attack power.",
      bonuses: { hp: 1, attack: 1 },
    },
    {
      rank: 3,
      title: "Sweeping embers",
      description: "Unlock Sweeping embers: strike every living enemy.",
      bonuses: {},
    },
    {
      rank: 4,
      title: "Battle rhythm",
      description: "+2 max HP and +1 initiative.",
      bonuses: { hp: 2, initiative: 1 },
    },
    {
      rank: 5,
      title: "Battle ready",
      description: "Start each room with a 3-point Guard shield.",
      bonuses: {},
      passive: "Opening Guard",
      passives: { openingGuard: 3 },
    },
    {
      rank: 6,
      title: "Tempered strength",
      description: "+3 max HP and +1 attack power.",
      bonuses: { hp: 3, attack: 1 },
    },
    {
      rank: 7,
      title: "Relentless stride",
      description: "+2 max HP and +1 initiative.",
      bonuses: { hp: 2, initiative: 1 },
    },
    {
      rank: 8,
      title: "Forged in fire",
      description:
        "+3 max HP, +1 attack power; opening shield improves to 5 points.",
      bonuses: { hp: 3, attack: 1 },
      passive: "Opening Guard",
      passives: { openingGuard: 5 },
    },
  ],
};
export function trainingTrack(catId: string): TrainingRank[] {
  return TRAINING_TRACKS[catId] ?? [];
}
export function trainingBonuses(catId: string, rank: number): TrainingBonuses {
  const stats: TrainingBonuses = {
    hp: 0,
    attack: 0,
    healing: 0,
    guard: 0,
    fury: 0,
    initiative: 0,
  };
  const capped = Math.min(MAX_TRAINING_RANK, whole(rank));
  for (const row of trainingTrack(catId)) {
    if (row.rank > capped) break;
    for (const key of Object.keys(row.bonuses) as (keyof TrainingBonuses)[]) {
      stats[key] += row.bonuses[key] ?? 0;
    }
  }
  return stats;
}
export function trainingPassives(
  catId: string,
  rank: number,
): TrainingPassives {
  const passive: TrainingPassives = {
    openingGuard: 0,
    iceArmor: 0,
    iceCharges: 0,
    reactiveHeal: 0,
    reactiveHealCharges: 0,
    openingAttack: 0,
  };
  const capped = Math.min(MAX_TRAINING_RANK, whole(rank));
  for (const row of trainingTrack(catId)) {
    if (row.rank > capped) break;
    Object.assign(passive, row.passives);
  }
  return passive;
}
/** Global Hearth blessing: shared by every cat, one distinct benefit per rank. */
export interface HearthBonuses {
  hp: number;
  initiative: number;
  /** Extra power for damaging skills (attacks, Needle strike, Sweeping embers). */
  attack: number;
  /** Extra power for healing, Guard and Inspired blessings. */
  support: number;
  /** Percent of max HP restored by Second Wind; 0 = not unlocked. */
  secondWind: number;
  /** Extra shared AP in the first round of every room. */
  openingAp: number;
  /** Extra critical chance, in percent, for every skill of every cat. */
  crit: number;
}
export interface HearthRank {
  rank: number;
  title: string;
  description: string;
  bonuses: Partial<HearthBonuses>;
}
export const HEARTH_TRACK: HearthRank[] = [
  {
    rank: 1,
    title: "Warm embers",
    description: "+2 max HP and +1 initiative for every cat.",
    bonuses: { hp: 2, initiative: 1 },
  },
  {
    rank: 2,
    title: "Sharpened claws",
    description: "+1 attack power for every cat.",
    bonuses: { attack: 1 },
  },
  {
    rank: 3,
    title: "Second Wind",
    description:
      "Once per expedition, the first cat to fall rises at once with 40% HP.",
    bonuses: { secondWind: 40 },
  },
  {
    rank: 4,
    title: "Thick fur",
    description: "+3 max HP and +1 initiative for every cat.",
    bonuses: { hp: 3, initiative: 1 },
  },
  {
    rank: 5,
    title: "Soothing light",
    description: "+1 healing, Guard and Inspired power for every cat.",
    bonuses: { support: 1 },
  },
  {
    rank: 6,
    title: "Hunter's focus",
    description: "+1 attack power and +5% critical chance for every cat.",
    bonuses: { attack: 1, crit: 5 },
  },
  {
    rank: 7,
    title: "Stronger flame",
    description: "Second Wind restores 60% HP. +3 max HP for every cat.",
    bonuses: { hp: 3, secondWind: 60 },
  },
  {
    rank: 8,
    title: "Hearthlight",
    description:
      "+1 AP in the first round of every room and +5% critical chance for every cat.",
    bonuses: { openingAp: 1, crit: 5 },
  },
];
export function hearthBonuses(rank: number): HearthBonuses {
  const total: HearthBonuses = {
    hp: 0,
    initiative: 0,
    attack: 0,
    support: 0,
    secondWind: 0,
    openingAp: 0,
    crit: 0,
  };
  const capped = Math.min(MAX_TRAINING_RANK, whole(rank));
  for (const row of HEARTH_TRACK) {
    if (row.rank > capped) break;
    for (const key of Object.keys(row.bonuses) as (keyof HearthBonuses)[]) {
      // Second Wind is an absolute percentage that later ranks replace.
      if (key === "secondWind") total[key] = row.bonuses[key] ?? total[key];
      else total[key] += row.bonuses[key] ?? 0;
    }
  }
  return total;
}
export function nextHearthDescription(rank: number): string {
  const r = whole(rank);
  if (r >= MAX_TRAINING_RANK) return "Maximum Hearth rank reached.";
  const next = HEARTH_TRACK[r]!;
  return `Next rank ${next.rank} · ${next.title}: ${next.description}`;
}
export function masteryLevel(xp: number): number {
  return Math.min(MAX_MASTERY_LEVEL, Math.floor(whole(xp) / XP_PER_MASTERY));
}
export function masteryBonuses(xp: number): {
  hp: number;
  power: number;
  attack: number;
} {
  const level = masteryLevel(xp);
  const power = Math.floor(level / 3);
  // `attack` remains an alias for existing callers; never add it to `power`.
  return { hp: level * 2, power, attack: power };
}
export function nextTrainingDescription(catId: string, rank: number): string {
  const r = whole(rank);
  if (r >= MAX_TRAINING_RANK) return "Maximum training rank reached.";
  const next = trainingTrack(catId)[r];
  return next
    ? `Next rank ${next.rank} · ${next.title}: ${next.description}`
    : "No training available.";
}
export interface DifficultyProgress {
  wins: number;
  xp: number;
  generalLevel?: number;
  catLevels?: Record<string, number>;
}
/**
 * How much permanent power a player has bought: the ranks of their three best
 * cats, the Hearth and the mastery level. Difficulty follows this, not gold.
 */
export function powerPoints(progress: DifficultyProgress): number {
  const top3 = Object.values(progress.catLevels ?? {})
    .map(whole)
    .sort((a, b) => b - a)
    .slice(0, 3)
    .reduce((a, b) => a + Math.min(b, MAX_TRAINING_RANK), 0);
  return (
    top3 +
    Math.min(MAX_TRAINING_RANK, whole(progress.generalLevel ?? 0)) +
    masteryLevel(progress.xp)
  );
}
export interface Difficulty {
  tier: number;
  hpMultiplier: number;
  damageBonus: number;
  initiativeBonus: number;
  extraEnemies: number;
  armorBonus: number;
  label: string;
  description: string;
}
/** Difficulty tuning: one place to rebalance how fast Ascension grows. */
export const DIFFICULTY_TUNING = {
  maxTier: 14,
  /** Power points (see powerPoints) for one tier. */
  pointsPerTier: 3,
  hpPerTier: 0.13,
  powerEveryTiers: 2,
  initiativeEveryTiers: 4,
  /** Tiers that add a reinforcement to every room (first and second). */
  reinforcementTiers: [10] as const,
  armorEveryTiers: 8,
};
/** Loot for clearing a room (0-2). Banked only after the boss falls and the player returns to the lobby. */
export const ROOM_REWARD = { gold: [40, 60, 80], xp: [30, 45, 60] } as const;
export const roomReward = (room: number) => ({
  gold: ROOM_REWARD.gold[room] ?? 0,
  xp: ROOM_REWARD.xp[room] ?? 0,
});
export const EXPEDITION_REWARD = {
  gold: ROOM_REWARD.gold.reduce((a, b) => a + b, 0),
  xp: ROOM_REWARD.xp.reduce((a, b) => a + b, 0),
};
/** Turns a Guard shield lasts. */
export const GUARD_TURNS = 3;
/** Healing a surviving cat gets when a room is cleared: the larger of a flat amount and a share of max HP. */
export const ROOM_HEAL = { flat: 8, percent: 33 };
/** The numbers a tier adds to every enemy; shared by the engine, lobby text and FAQ. */
export function tierFacts(tier: number) {
  return {
    hpPercent: Math.round(tier * DIFFICULTY_TUNING.hpPerTier * 100),
    power: Math.ceil(tier / DIFFICULTY_TUNING.powerEveryTiers),
    initiative: Math.floor(tier / DIFFICULTY_TUNING.initiativeEveryTiers),
    reinforcements: DIFFICULTY_TUNING.reinforcementTiers.filter(
      (t) => tier >= t,
    ).length,
    armor: Math.min(2, Math.floor(tier / DIFFICULTY_TUNING.armorEveryTiers)),
  };
}
/** No hidden scaling from unspent gold. Snapshot this once when a run begins. */
export function getDifficulty(progress: DifficultyProgress): Difficulty {
  const wins = whole(progress.wins);
  const tier =
    wins === 0
      ? 0
      : Math.min(
          DIFFICULTY_TUNING.maxTier,
          Math.floor(powerPoints(progress) / DIFFICULTY_TUNING.pointsPerTier),
        );
  return {
    tier,
    hpMultiplier: 1 + tier * DIFFICULTY_TUNING.hpPerTier,
    damageBonus: tierFacts(tier).power,
    initiativeBonus: tierFacts(tier).initiative,
    extraEnemies: tierFacts(tier).reinforcements,
    armorBonus: tierFacts(tier).armor,
    label: tier === 0 ? "First descent" : `Ascension ${tier}`,
    description:
      tier === 0
        ? "Base encounters. Ascension begins after your first boss victory."
        : (({ hpPercent, power, initiative, reinforcements, armor }) =>
            `Enemies have +${hpPercent}% HP, +${power} power and +${initiative} initiative. ${reinforcements > 0 ? `${reinforcements} extra reinforcement${reinforcements > 1 ? "s" : ""} per room; ` : ""}${armor > 0 ? `armored foes gain +${armor} armor. ` : ""}Based on victories, gold spent and mastery; fixed for this expedition.`)(
            tierFacts(tier),
          ),
  };
}
