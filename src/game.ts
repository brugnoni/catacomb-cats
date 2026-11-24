// Public rules API. The engine lives in src/engine/; this file keeps every import path stable.
export { isDamaging, LINE_FALLOFF } from "./engine/model";
export type {
  Ability,
  Cat,
  Progress,
  Unit,
  CombatEvent,
  Run,
  RunOptions,
  DamagePreview,
  EnemyIntent,
} from "./engine/model";
export {
  CATS,
  SIGNATURE_ABILITIES,
  REVIVE_ABILITY,
  ITEMS,
  ITEM_BONUS,
  initialProgress,
} from "./engine/data";
export { buildCat } from "./engine/units";
export { currentUnit } from "./engine/state";
export {
  abilityLimit,
  abilityUses,
  cooldownRemaining,
  abilityUnavailableReason,
  abilityPower,
  abilityTargetUnavailableReason,
  abilityTargets,
  abilityReach,
} from "./engine/abilities";
export { damagePreview } from "./engine/damage";
export { INTENT_LABELS, enemyIntent } from "./engine/enemyAI";
export { createRun, act, endTurn, nextRoom } from "./engine/actions";
export {
  claimRewards,
  upgradeCost,
  buyUpgrade,
  equip,
  parseProgress,
} from "./engine/save";
