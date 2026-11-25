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
  TRINKET_DROP_CHANCE,
  TRINKET_DROP_GOLD,
  SKINS,
  initialProgress,
} from "./engine/data";
export type { TrinketBonus } from "./engine/data";
export { buildCat, trinketIdle } from "./engine/units";
export { currentUnit } from "./engine/state";
export {
  abilityLimit,
  abilityUses,
  abilityCost,
  cooldownRemaining,
  abilityUnavailableReason,
  abilityPower,
  abilityTargetUnavailableReason,
  abilityReach,
} from "./engine/abilities";
export { damagePreview } from "./engine/damage";
export { INTENT_LABELS, enemyIntent } from "./engine/enemyAI";
export { createRun, act, endTurn, nextRoom, pickRelic } from "./engine/actions";
export { RELICS, type Relic } from "./engine/relics";
export {
  claimRewards,
  holdLootSeed,
  releaseLootSeed,
  upgradeCost,
  buyUpgrade,
  equip,
  lampBoost,
  LAMP_BOOST_MAX,
  setSkin,
  parseProgress,
  readProgress,
} from "./engine/save";
