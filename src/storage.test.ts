import { beforeEach, describe, expect, it } from "vitest";
import { initialProgress } from "./game";
import {
  BACKUP_KEY,
  exportSave,
  importSave,
  PARTY_KEY,
  SAVE_KEY,
  loadParty,
  loadProgress,
} from "./storage";

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

describe("remembered party", () => {
  it("defaults to the first three cats", () => {
    expect(loadParty()).toEqual(["miso", "luna", "pip"]);
  });
  it("restores a valid choice, even a partial one", () => {
    memory.set(PARTY_KEY, '["clover","ember","miso"]');
    expect(loadParty()).toEqual(["clover", "ember", "miso"]);
    memory.set(PARTY_KEY, '["pip"]');
    expect(loadParty()).toEqual(["pip"]);
  });
  it("ignores anything invalid", () => {
    for (const bad of [
      "not json",
      '["x","miso","pip"]',
      '["miso","miso","pip"]',
      '["miso","luna","pip","ember"]',
      '{"a":1}',
      "42",
    ]) {
      memory.set(PARTY_KEY, bad);
      expect(loadParty(), bad).toEqual(["miso", "luna", "pip"]);
    }
  });
});

describe("saved progress", () => {
  it("starts fresh when nothing or garbage is stored", () => {
    expect(loadProgress()).toEqual(initialProgress());
    memory.set(SAVE_KEY, "{broken");
    expect(loadProgress()).toEqual(initialProgress());
  });
  it("loads a valid save", () => {
    memory.set(
      SAVE_KEY,
      JSON.stringify({
        ...initialProgress(),
        gold: 77,
        expeditionWins: { catacombs: 2 },
      }),
    );
    expect(loadProgress()).toMatchObject({
      gold: 77,
      expeditionWins: { catacombs: 2 },
    });
  });
});

describe("backup of a save about to be reset", () => {
  it("keeps the latest unreadable save unchanged", () => {
    for (const bad of ["{broken", '{"version":1,"gold":-5}']) {
      memory.set(SAVE_KEY, bad);
      expect(loadProgress()).toEqual(initialProgress());
      expect(memory.get(BACKUP_KEY)).toBe(bad);
    }
  });
  it("backs up nothing for a valid save or an empty store", () => {
    loadProgress();
    memory.set(SAVE_KEY, JSON.stringify(initialProgress()));
    loadProgress();
    expect(memory.has(BACKUP_KEY)).toBe(false);
  });
});

describe("save file", () => {
  it("round-trips progress and rejects anything invalid", () => {
    const progress = { ...initialProgress(), gold: 99 };
    expect(importSave(exportSave(progress))).toMatchObject({ gold: 99 });
    expect(importSave("nonsense")).toBeNull();
    expect(importSave('{"version":2}')).toBeNull();
  });
});
