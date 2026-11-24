import { getDifficulty, trainingPassives } from "../progression";

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
  /** Percent of the HP damage this skill deals that heals the caster. */
  lifesteal?: number;
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

export interface Progress {
  version: 1;
  gold: number;
  xp: number;
  generalLevel: number;
  catLevels: Record<string, number>;
  equipment: Record<string, string>;
  inventory: string[];
  claimedRuns: string[];
  /** Victories per Expedition id; unlocks and rank caps read this. */
  expeditionWins: Record<string, number>;
  spentGold: number;
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
export type CombatEvent = (
  | {
      type: "avoid";
      targetId: string;
      kind: "miss" | "evade";
      crit?: undefined;
    }
  | { type: "ready"; targetId: string; name: string; crit?: undefined }
  /** An enemy turn with no hit or heal (a curse, a blessing...), so it still gets its own step. */
  | { type: "act"; targetId: string; crit?: undefined }
  | {
      type: "hit";
      targetId: string;
      damage: number;
      absorbed: number;
      crit?: boolean;
    }
  | { type: "heal"; targetId: string; amount: number; crit?: boolean }
) & {
  /** The enemy whose turn caused this event, with the round it acted in. */
  actorId?: string;
  round?: number;
};

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
  /** Id of the Expedition this Run belongs to. */
  expedition: string;
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
  /** Misses and evasion are active (they share the critical-hit option). */
  luck: boolean;
}

export interface RunOptions {
  /** "off" (default) disables critical hits; "on" uses the base chance plus Hearth; a number fixes the chance. */
  crit?: "off" | "on" | number;
  /** Expedition id; defaults to the first one. */
  expedition?: string;
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

export type EnemyPlanKind =
  "attack" | "curse" | "heal" | "inspire" | "ward" | "mirror" | "rally";

export interface EnemyPlan {
  kind: EnemyPlanKind;
  /** Hostile target: the weakest cat for a curse. Attacks use the mark. */
  targetId?: string;
  /** Friendly target of a support action. */
  allyId?: string;
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
