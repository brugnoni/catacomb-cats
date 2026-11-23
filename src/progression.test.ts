import { describe, expect, it } from "vitest";
import {
  getDifficulty,
  powerPoints,
  HEARTH_TRACK,
  hearthBonuses,
  nextHearthDescription,
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
    const bought = { xp: 1000, generalLevel: 8, catLevels: { miso: 8 } };
    expect(getDifficulty({ wins: 0, ...bought }).tier).toBe(0);
    expect(getDifficulty({ wins: 1, xp: 0 }).tier).toBe(0);
  });
  it("follows the permanent power bought: top three cats, Hearth and mastery", () => {
    expect(powerPoints({ wins: 1, xp: 0 })).toBe(0);
    expect(
      powerPoints({
        wins: 1,
        xp: 300,
        generalLevel: 2,
        catLevels: { a: 5, b: 4, c: 3, d: 2, e: 1 },
      }),
    ).toBe(5 + 4 + 3 + 2 + 2);
    const at = (points: number) =>
      getDifficulty({ wins: 1, xp: 0, catLevels: { a: points } }).tier;
    expect(at(2)).toBe(0);
    expect(at(3)).toBe(1);
    expect(at(6)).toBe(2);
    // Gold spent or victories alone never raise the tier.
    expect(getDifficulty({ wins: 500, xp: 0 }).tier).toBe(0);
  });
  it("bounds escalation at the maximum tier", () => {
    expect(
      getDifficulty({
        wins: 1,
        xp: 99999,
        generalLevel: 8,
        catLevels: { a: 8, b: 8, c: 8 },
      }).hpMultiplier,
    ).toBeCloseTo(2.82, 5);
    expect(
      getDifficulty({
        wins: 10000,
        xp: 100000,
        generalLevel: 99,
        catLevels: { a: 99, b: 99, c: 99 },
      }),
    ).toMatchObject({
      tier: 14,
      damageBonus: 7,
      initiativeBonus: 3,
      extraEnemies: 1,
      armorBonus: 1,
    });
  });
});

describe("Hearth blessing", () => {
  it("has eight ranks, each with its own described benefit", () => {
    expect(HEARTH_TRACK).toHaveLength(MAX_TRAINING_RANK);
    HEARTH_TRACK.forEach((row, index) => {
      expect(row.rank).toBe(index + 1);
      expect(row.description.length).toBeGreaterThan(10);
    });
  });
  it("accumulates stats, replaces Second Wind and caps at rank 8", () => {
    expect(hearthBonuses(0)).toEqual({
      hp: 0,
      initiative: 0,
      attack: 0,
      support: 0,
      secondWind: 0,
      openingAp: 0,
      crit: 0,
    });
    expect(hearthBonuses(1)).toMatchObject({ hp: 2, initiative: 1 });
    expect(hearthBonuses(2).attack).toBe(1);
    expect(hearthBonuses(3).secondWind).toBe(40);
    expect(hearthBonuses(6).secondWind).toBe(40);
    expect(hearthBonuses(7).secondWind).toBe(60);
    expect(hearthBonuses(8)).toEqual({
      hp: 8,
      initiative: 2,
      attack: 2,
      support: 1,
      secondWind: 60,
      openingAp: 1,
      crit: 10,
    });
    expect(hearthBonuses(5).crit).toBe(0);
    expect(hearthBonuses(6).crit).toBe(5);
    expect(hearthBonuses(99)).toEqual(hearthBonuses(8));
    expect(hearthBonuses(-3)).toEqual(hearthBonuses(0));
  });
  it("describes the next rank and the end of the track", () => {
    expect(nextHearthDescription(2)).toContain("Next rank 3 · Second Wind");
    expect(nextHearthDescription(8)).toBe("Maximum Hearth rank reached.");
  });
});
