import { ROOM_HEAL } from "../progression";
import { expeditionById, roomReward } from "../expeditions";
import { type Run } from "./model";
import { ITEMS } from "./data";
import { clearEffects } from "./state";

/**
 * Ends the room when a side has fallen: marks defeat, or banks the room reward,
 * heals and revives the cats and moves to "reward" (or "victory" after the boss).
 * Returns true when the room is over.
 */
export function settleRoom(run: Run): boolean {
  if (run.party.every((u) => u.hp <= 0)) {
    run.status = "defeat";
    run.log.push("Your expedition has fallen. Permanent upgrades remain.");
    return true;
  }
  if (run.enemies.every((u) => u.hp <= 0)) {
    const reward = roomReward(run.room, run.expedition);
    const boss = run.room === expeditionById(run.expedition).rooms.length - 1;
    run.gold += reward.gold;
    run.xp += reward.xp;
    run.status = boss ? "victory" : "reward";
    run.items = [...new Set([...run.items, ITEMS[run.room]!])];
    run.log.push(
      `Room rewards: +${reward.gold} gold, +${reward.xp} XP and ${ITEMS[run.room]}. Spoils are banked only after defeating the boss and returning to the lobby.`,
    );
    if (!boss) {
      run.bonus++;
      run.log.push(
        `Expedition Strength +1: all damage is now +${run.bonus} for the rest of this run.`,
      );
    }
    for (const c of run.party) {
      if (run.status === "victory") {
        c.hp = c.maxHp;
        clearEffects(c);
        c.cooldowns = {};
        c.iceCharges = c.reactiveHealCharges = c.openingAttack = 0;
        run.log.push(
          `${c.name} fully recovers after expedition victory (${c.hp}/${c.maxHp} HP).`,
        );
      } else if (c.hp <= 0) {
        c.hp = Math.max(1, Math.ceil(c.maxHp * 0.25));
        clearEffects(c);
        if (run.tauntId === c.id) delete run.tauntId;
        run.log.push(
          `${c.name} resurrects at 25% HP (${c.hp}/${c.maxHp}); no additional room recovery.`,
        );
      } else if (!boss) {
        const healed = Math.min(
          Math.max(
            ROOM_HEAL.flat,
            Math.ceil((c.maxHp * ROOM_HEAL.percent) / 100),
          ),
          c.maxHp - c.hp,
        );
        c.hp += healed;
        run.log.push(`${c.name} recovers ${healed} HP (${c.hp}/${c.maxHp}).`);
      }
    }
    if (run.status === "victory") delete run.tauntId;
    run.log.push(
      run.status === "victory"
        ? "The Hollow King is defeated!"
        : "Room cleared. Choose your next descent.",
    );
    return true;
  }
  return false;
}
