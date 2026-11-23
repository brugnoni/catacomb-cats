/** Shared balance rules. Keep UI explanations and engine calculations on these values. */
export const MAX_TRAINING_RANK = 8;
export const MAX_MASTERY_LEVEL = 10;
export const XP_PER_MASTERY = 150;
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
    ? `Rank ${next.rank} · ${next.title}: ${next.description}`
    : "No training available.";
}
export interface DifficultyProgress {
  wins: number;
  spentGold: number;
  xp: number;
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
/** No hidden scaling from unspent gold. Snapshot this once when a run begins. */
export function getDifficulty(progress: DifficultyProgress): Difficulty {
  const wins = whole(progress.wins);
  const tier =
    wins === 0
      ? 0
      : Math.min(
          12,
          wins +
            Math.floor(whole(progress.spentGold) / 200) +
            Math.floor(masteryLevel(progress.xp) / 2),
        );
  return {
    tier,
    hpMultiplier: 1 + tier * 0.08,
    damageBonus: Math.ceil(tier / 4),
    initiativeBonus: Math.floor(tier / 4),
    extraEnemies: tier >= 10 ? 2 : tier >= 5 ? 1 : 0,
    armorBonus: Math.min(2, Math.floor(tier / 6)),
    label: tier === 0 ? "First descent" : `Ascension ${tier}`,
    description:
      tier === 0
        ? "Base encounters. Ascension begins after your first boss victory."
        : `Enemies have +${tier * 8}% HP, +${Math.ceil(tier / 4)} power and +${Math.floor(tier / 4)} initiative. ${tier >= 5 ? `${tier >= 10 ? 2 : 1} extra reinforcement${tier >= 10 ? "s" : ""} per room; ` : ""}${Math.floor(tier / 6) > 0 ? `armored foes gain +${Math.min(2, Math.floor(tier / 6))} armor. ` : ""}Based on victories, gold spent and mastery; fixed for this expedition.`,
  };
}
