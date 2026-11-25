import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ALL_TEAMS,
  legalActions,
  mediumAction,
  optimalPlan,
  playRun,
  playerAfter,
  summarize,
} from "./sim";
import { createRun, initialProgress } from "./game";

const report = process.env.BALANCE_REPORT === "1";
const out = (label: string, value: unknown) => {
  const line = `${label} ${JSON.stringify(value)}
`;
  if (process.env.SIM_OUT) appendFileSync(process.env.SIM_OUT, line);
  else console.log(line);
};
const pct = (x: number) => Math.round(x * 100);

describe("simulator", () => {
  it("lists the ten possible teams", () => {
    expect(ALL_TEAMS).toHaveLength(10);
    expect(new Set(ALL_TEAMS.map((t) => t.join())).size).toBe(10);
  });
  it("offers only legal actions and plans a whole round", () => {
    const run = createRun(initialProgress(), ["pip", "miso", "clover"]);
    expect(legalActions(run).length).toBeGreaterThan(0);
    expect(mediumAction(run).abilityId).toBeDefined();
    const plan = optimalPlan(run, 6, 6);
    expect(plan.length).toBeGreaterThan(0);
  });
  it("plays complete expeditions with both bots, deterministically", () => {
    const p = initialProgress();
    const a = playRun(p, ["miso", "luna", "clover"], 3, "medium");
    const b = playRun(p, ["miso", "luna", "clover"], 3, "medium");
    expect(a).toEqual(b);
    const o = playRun(p, ["miso", "luna", "clover"], 3, "optimal");
    expect(o.rounds.length).toBeGreaterThan(0);
  });
  it("builds a plausible save after some wins", () => {
    const p = playerAfter(3, ["miso", "luna", "clover"]);
    expect(p.expeditionWins).toEqual({ catacombs: 3 });
    expect(Object.values(p.catLevels).some((r) => r > 0)).toBe(true);
    expect(p.gold).toBeGreaterThanOrEqual(0);
  });
});

describe.skipIf(!report)("balance report (BALANCE_REPORT=1)", () => {
  const seeds = Number(process.env.SIM_SEEDS ?? 20);
  const bots = (process.env.SIM_BOTS ?? "medium").split(",") as (
    "medium" | "optimal"
  )[];
  const stages = (process.env.SIM_STAGES ?? "0,1,2,4,6,9")
    .split(",")
    .map(Number);
  for (const bot of bots)
    it(`win rate by stage, ${bot} bot`, { timeout: 3_600_000 }, () => {
      for (const wins of stages) {
        const all = [];
        const perTeam: Record<string, number> = {};
        for (const team of ALL_TEAMS) {
          const progress = playerAfter(wins, team);
          const results = Array.from({ length: seeds }, (_, i) =>
            playRun(progress, team, i + 1, bot),
          );
          perTeam[team.join("+")] = pct(summarize(results).winRate);
          all.push(...results);
        }
        const s = summarize(all);
        out(`${bot} wins=${wins}`, {
          tier: s.tier,
          winRate: pct(s.winRate),
          avgRounds: Math.round(s.avgRounds * 10) / 10,
          avgFewestAlive: Math.round(s.avgFewestAlive * 100) / 100,
          hpAtClear: s.avgHpAtClear.map((x) => Math.round(x)),
          lostInRoom: s.lostInRoom,
          perTeam,
        });
      }
      expect(true).toBe(true);
    });
});
