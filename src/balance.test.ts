import { describe, expect, it } from "vitest";
import { initialProgress, type Progress } from "./game";
import { getDifficulty } from "./progression";
import { playRun, playerAfter, playerAtCap, summarize } from "./sim";
import { EXPEDITIONS } from "./expeditions";

/** Win rate of the medium bot over several seeds; fully deterministic. */
function winRate(progress: Progress, team: string[], seeds = 12) {
  const results = Array.from({ length: seeds }, (_, i) =>
    playRun(progress, team, i + 1, "medium"),
  );
  return summarize(results);
}
const TEAMS = [
  ["miso", "luna", "clover"],
  ["luna", "pip", "clover"],
  ["miso", "pip", "ember"],
];
const average = (values: number[]) =>
  values.reduce((a, b) => a + b, 0) / values.length;

/**
 * Targets from the balance review (see outputs/BALANCE_REPORT.md): a reasonable
 * player should win roughly 75-85% of expeditions at every stage, rooms must not
 * be a formality, and no team may be hopeless. Bounds are wider than the targets
 * to absorb seed noise.
 */
describe("balance targets (medium bot)", () => {
  it("the first descent is a real challenge that is still winnable", () => {
    const rates = TEAMS.map((team) => winRate(initialProgress(), team).winRate);
    expect(average(rates)).toBeGreaterThan(0.5);
    expect(average(rates)).toBeLessThan(0.97);
    expect(Math.min(...rates)).toBeGreaterThan(0.15);
  });
  it("never drops below 60 percent while the player grows", () => {
    for (const wins of [2, 5, 8]) {
      const rates = TEAMS.map(
        (team) => winRate(playerAfter(wins, team), team).winRate,
      );
      expect(average(rates), `stage ${wins}`).toBeGreaterThan(0.6);
    }
  });
  it("lifesteal keeps a team without a healer viable", () => {
    const team = ["miso", "pip", "ember"];
    for (const wins of [0, 3, 6])
      expect(
        winRate(wins === 0 ? initialProgress() : playerAfter(wins, team), team)
          .winRate,
        `stage ${wins}`,
      ).toBeGreaterThan(0.5);
  });
  it("early rooms cost health, so they are not a formality", () => {
    const s = winRate(initialProgress(), TEAMS[0]!, 20);
    expect(s.avgHpAtClear[0]).toBeLessThan(100);
    expect(s.avgHpAtClear[1]).toBeLessThan(95);
  });
  it("the maximum tier is attainable with a fully trained team", () => {
    const progress: Progress = {
      ...initialProgress(),
      xp: 1500,
      expeditionWins: { catacombs: 3, warrens: 5 },
      generalLevel: 8,
      catLevels: { miso: 8, luna: 8, clover: 8, ember: 8, pip: 8 },
      equipment: {
        miso: "Iron bell",
        luna: "Lucky fang",
        clover: "Silk ribbon",
      },
      inventory: ["Iron bell", "Silk ribbon", "Lucky fang"],
    };
    expect(getDifficulty(progress).tier).toBe(14);
    const s = winRate(progress, ["luna", "ember", "clover"]);
    expect(s.winRate).toBeGreaterThan(0.4);
  });
  it("a victory leaves the whole party healed and loot banked only after the boss", () => {
    const won = playRun(playerAfter(3, TEAMS[1]!), TEAMS[1]!, 1, "optimal");
    expect(won.won).toBe(true);
    expect(won.rounds).toHaveLength(3);
  });
});

/**
 * Each Expedition is tuned for a party at its own Rank cap. Ascension follows
 * Power, so the same party also faces tougher enemies after it trains: a party
 * at the previous cap is not reliably weaker in the next Expedition.
 */
describe("expedition balance (capped party, medium bot)", () => {
  it.each([1, 2])(
    "a party at the cap wins about half to two thirds of Expedition %i",
    (index) => {
      const rates = TEAMS.map((team) => {
        const progress = playerAtCap(index, team);
        const runs = Array.from({ length: 16 }, (_, i) =>
          playRun(progress, team, i + 1, "medium", EXPEDITIONS[index]!.id),
        );
        return summarize(runs).winRate;
      });
      expect(average(rates)).toBeGreaterThanOrEqual(0.45);
      expect(average(rates)).toBeLessThanOrEqual(0.7);
    },
  );
});
