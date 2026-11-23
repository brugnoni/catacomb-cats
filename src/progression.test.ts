import { describe, expect, it } from "vitest";
import {
  getDifficulty,
  masteryBonuses,
  masteryLevel,
  nextTrainingDescription,
  trainingBonuses,
  trainingCost,
  MAX_TRAINING_RANK,
  trainingPassives,
  trainingTrack,
} from "./progression";

describe("class progression balance", () => {
  it("unlocks third training rank for exactly 100 gold with increasing later prices", () => {
    expect([0, 1, 2].reduce((sum, rank) => sum + trainingCost(rank), 0)).toBe(
      100,
    );
    expect(trainingCost(3)).toBe(70);
    expect(trainingCost(7)).toBe(150);
  });
  it("gives classes distinct benefits without granting every stat every rank", () => {
    expect(trainingBonuses("miso", 3)).toMatchObject({
      hp: 5,
      guard: 1,
      attack: 0,
      healing: 0,
    });
    expect(trainingBonuses("clover", 3)).toMatchObject({
      hp: 3,
      healing: 1,
      attack: 0,
    });
    expect(trainingBonuses("luna", 3)).toMatchObject({
      hp: 2,
      fury: 0,
      attack: 1,
    });
    expect(trainingBonuses("pip", 3)).toMatchObject({
      initiative: 1,
      attack: 1,
      hp: 2,
    });
    expect(trainingBonuses("ember", 3)).toMatchObject({ attack: 1, hp: 4 });
  });
  it("caps training stat growth and describes actual next-rank benefit and unlock", () => {
    expect(trainingBonuses("miso", 1000)).toEqual(
      trainingBonuses("miso", MAX_TRAINING_RANK),
    );
    expect(nextTrainingDescription("miso", 2)).toContain("Stand behind me");
    expect(nextTrainingDescription("miso", 0)).toContain("+3 max HP");
    expect(nextTrainingDescription("miso", 8)).toContain("Maximum");
    expect(trainingBonuses("unknown", 3).hp).toBe(0);
  });
  it("slows shared mastery, caps it and extends numeric skill growth to every third level", () => {
    expect(masteryLevel(135)).toBe(0);
    expect(masteryBonuses(150)).toEqual({ hp: 2, attack: 0, power: 0 });
    expect(masteryBonuses(450)).toEqual({ hp: 6, attack: 1, power: 1 });
    expect(masteryBonuses(100000)).toEqual({ hp: 20, attack: 3, power: 3 });
    expect(masteryLevel(-1)).toBe(0);
  });
});
describe("explicit training tracks", () => {
  const ids = ["miso", "luna", "clover", "pip", "ember"];
  it("defines all eight sequential ranks with a third-rank skill milestone", () => {
    for (const id of ids) {
      const track = trainingTrack(id);
      expect(track.map((row) => row.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(
        track.every(
          (row) => row.title.length > 0 && row.description.length > 0,
        ),
      ).toBe(true);
      expect(track[2]!.description).toContain("Unlock");
      expect(trainingBonuses(id, 3)).toEqual(trainingBonuses(id, 2));
      expect(trainingPassives(id, 3)).toEqual(trainingPassives(id, 2));
      for (const row of track.filter((row) => row.rank !== 3)) {
        const before = trainingBonuses(id, row.rank - 1);
        const after = trainingBonuses(id, row.rank);
        const beforePassive = trainingPassives(id, row.rank - 1);
        const afterPassive = trainingPassives(id, row.rank);
        expect(
          JSON.stringify(after) !== JSON.stringify(before) ||
            JSON.stringify(afterPassive) !== JSON.stringify(beforePassive),
        ).toBe(true);
      }
    }
  });
  it("unlocks opening defense and capped-use passives at rank five and improves them at eight", () => {
    for (const id of ids)
      expect(
        Object.values(trainingPassives(id, 4)).every((value) => value === 0),
      ).toBe(true);
    expect(trainingPassives("miso", 5).openingGuard).toBe(4);
    expect(trainingPassives("miso", 8).openingGuard).toBe(6);
    expect(trainingPassives("ember", 5).openingGuard).toBe(3);
    expect(trainingPassives("ember", 8).openingGuard).toBe(5);
    expect(trainingPassives("luna", 5)).toMatchObject({
      iceArmor: 2,
      iceCharges: 3,
    });
    expect(trainingPassives("luna", 8)).toMatchObject({
      iceArmor: 2,
      iceCharges: 4,
    });
    expect(trainingPassives("clover", 5)).toMatchObject({
      reactiveHeal: 2,
      reactiveHealCharges: 3,
    });
    expect(trainingPassives("clover", 8)).toMatchObject({
      reactiveHeal: 2,
      reactiveHealCharges: 5,
    });
    expect(trainingPassives("pip", 5).openingAttack).toBe(2);
    expect(trainingPassives("pip", 8).openingAttack).toBe(3);
  });
  it("caps cumulative role stats and passives for legacy over-cap ranks", () => {
    for (const id of ids) {
      expect(trainingBonuses(id, 100000)).toEqual(trainingBonuses(id, 8));
      expect(trainingPassives(id, 100000)).toEqual(trainingPassives(id, 8));
      expect(trainingBonuses(id, 8).attack).toBeLessThanOrEqual(3);
      expect(trainingBonuses(id, 8).hp).toBeLessThanOrEqual(16);
      expect(trainingBonuses(id, -1)).toEqual(trainingBonuses(id, 0));
    }
    expect(trainingTrack("unknown")).toEqual([]);
    expect(nextTrainingDescription("unknown", 0)).toBe(
      "No training available.",
    );
  });
});
describe("ascension snapshot calculation", () => {
  it("does not punish spending before a first victory and excludes unspent gold", () => {
    expect(getDifficulty({ wins: 0, spentGold: 1000, xp: 1000 }).tier).toBe(0);
    expect(getDifficulty({ wins: 1, spentGold: 0, xp: 135 }).tier).toBe(1);
  });
  it("scales independently with wins, spent gold and mastery and bounds escalation", () => {
    const baseline = getDifficulty({ wins: 1, spentGold: 0, xp: 135 });
    expect(
      getDifficulty({ wins: 2, spentGold: 0, xp: 135 }).hpMultiplier,
    ).toBeGreaterThan(baseline.hpMultiplier);
    expect(getDifficulty({ wins: 1, spentGold: 200, xp: 135 }).tier).toBe(2);
    expect(getDifficulty({ wins: 1, spentGold: 0, xp: 300 }).tier).toBe(2);
    expect(
      getDifficulty({ wins: 10000, spentGold: 100000, xp: 100000 }),
    ).toMatchObject({
      tier: 12,
      hpMultiplier: 1.96,
      damageBonus: 3,
      initiativeBonus: 3,
      extraEnemies: 2,
      armorBonus: 2,
    });
  });
});
