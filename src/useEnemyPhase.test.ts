import { describe, expect, it } from "vitest";
import { createRun, endTurn, initialProgress } from "./game";
import { buildSteps } from "./useEnemyPhase";

const start = () => createRun(initialProgress(), ["clover", "ember", "miso"]);

describe("buildSteps", () => {
  it("opens a room with the round banner, then the strike-first notice, then each enemy", () => {
    const steps = buildSteps(start(), 0);
    expect(steps[0]).toEqual({ kind: "banner", round: 1 });
    expect(steps[1]).toEqual({ kind: "intro" });
    expect(steps.slice(2).length).toBeGreaterThan(0);
    expect(steps.slice(2).every((s) => s.kind === "attack")).toBe(true);
  });
  it("shows the strike-first notice only when an enemy really strikes first", () => {
    const run = start();
    run.events = [];
    expect(buildSteps(run, 0).some((s) => s.kind === "intro")).toBe(false);
    expect(buildSteps(start(), 1).some((s) => s.kind === "intro")).toBe(false);
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
