import { beforeEach, describe, expect, it } from "vitest";
import { act, currentUnit, endTurn } from "./game";
import {
  TUTORIAL_KEY,
  TUTORIAL_STEPS,
  loadTutorialFlag,
  practiceRun,
  saveTutorialFlag,
} from "./tutorialSteps";

const memory = new Map<string, string>();
beforeEach(() => {
  memory.clear();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => void memory.set(key, value),
    },
  });
});

describe("tutorial steps", () => {
  it("has unique steps: the lobby first, then the practice battle", () => {
    expect(new Set(TUTORIAL_STEPS.map((s) => s.id)).size).toBe(
      TUTORIAL_STEPS.length,
    );
    const phases = TUTORIAL_STEPS.map((s) => s.phase);
    expect(phases.indexOf("battle")).toBe(phases.lastIndexOf("lobby") + 1);
    expect(phases.slice(0, 4).every((p) => p === "lobby")).toBe(true);
  });
  it("starts the practice battle once and finishes on the last step", () => {
    expect(TUTORIAL_STEPS.filter((s) => s.next === "practice")).toHaveLength(1);
    expect(TUTORIAL_STEPS.at(-1)!.next).toBe("finish");
    expect(TUTORIAL_STEPS.findIndex((s) => s.next === "practice")).toBe(
      TUTORIAL_STEPS.findIndex((s) => s.phase === "battle") - 1,
    );
  });
  it("covers the topics the player asked for", () => {
    const text = TUTORIAL_STEPS.map((s) => `${s.title} ${s.body}`).join(" ");
    for (const word of [
      "Add to party",
      "training",
      "gold",
      "XP",
      "mastery",
      "Hearth",
      "Threat",
      "initiative",
      "ability points",
      "Pass to",
      "Taunt",
      "banked",
    ])
      expect(text.toLowerCase(), word).toContain(word.toLowerCase());
  });
  it("only battle steps ask the player to act, and each gate has a step to move to", () => {
    TUTORIAL_STEPS.forEach((step, i) => {
      if (step.gate) {
        expect(step.phase).toBe("battle");
        expect(i).toBeLessThan(TUTORIAL_STEPS.length - 1);
      }
    });
    expect(TUTORIAL_STEPS.map((s) => s.gate).filter(Boolean)).toEqual([
      "attack",
      "pass",
      "reward",
    ]);
  });
});

describe("practice battle", () => {
  it("is a weak first room that a beginner cannot lose", () => {
    const run = practiceRun();
    expect(run.room).toBe(0);
    expect(run.party.map((c) => c.id)).toEqual(["miso", "luna", "pip"]);
    expect(run.enemies.every((e) => e.abilities[0]!.power === 3)).toBe(true);
    expect(run.enemies.every((e) => e.maxHp < 30)).toBe(true);
  });
  it("is winnable by simply attacking", () => {
    let run = practiceRun();
    for (let i = 0; i < 80 && run.status === "combat"; i++) {
      const actor = currentUnit(run)!;
      const foe = run.enemies.find((e) => e.hp > 0)!;
      const attack = actor.abilities[0]!;
      const next = act(run, attack.id, foe.id);
      run = next === run ? endTurn(run) : next;
    }
    expect(run.status).toBe("reward");
    expect(run.party.every((c) => c.hp > 0)).toBe(true);
  });
});

describe("tutorial flag", () => {
  it("is empty on a first visit and remembers done or skipped", () => {
    expect(loadTutorialFlag()).toBeNull();
    saveTutorialFlag("skipped");
    expect(loadTutorialFlag()).toBe("skipped");
    saveTutorialFlag("done");
    expect(loadTutorialFlag()).toBe("done");
  });
  it("ignores anything else that is stored", () => {
    memory.set(TUTORIAL_KEY, "yes please");
    expect(loadTutorialFlag()).toBeNull();
  });
});
