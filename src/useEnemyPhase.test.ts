import { describe, expect, it } from "vitest";
import { createRun, endTurn, initialProgress } from "./game";
import { buildSteps } from "./useEnemyPhase";

const start = () => createRun(initialProgress(), ["clover", "ember", "miso"]);

describe("buildSteps", () => {
  it("opens a room with the round banner, then each enemy that strikes first", () => {
    const steps = buildSteps(start(), 0);
    expect(steps[0]).toEqual({ kind: "banner", round: 1 });
    expect(steps.slice(1).every((s) => s.kind === "attack")).toBe(true);
    expect(steps.length).toBeGreaterThan(1);
  });
  it("has no steps when nothing happened and the round is the same", () => {
    expect(buildSteps(start(), 1).filter((s) => s.kind === "banner")).toEqual(
      [],
    );
  });
  it("puts the next round banner after the enemy turns of the old round", () => {
    let run = start();
    const rounds = run.round;
    for (let i = 0; i < 12 && run.round === rounds; i++) run = endTurn(run);
    expect(run.round).toBe(rounds + 1);
    const steps = buildSteps(run, rounds);
    const banner = steps.findIndex((s) => s.kind === "banner");
    expect(steps[banner]).toEqual({ kind: "banner", round: rounds + 1 });
    for (const [i, s] of steps.entries())
      if (s.kind === "attack" && i < banner) expect(s.round).toBe(rounds);
  });
});
