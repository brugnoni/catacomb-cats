import { describe, expect, it } from "vitest";
import {
  RELICS,
  act,
  createRun,
  holdLootSeed,
  initialProgress,
  nextRoom,
  parseProgress,
  pickRelic,
  releaseLootSeed,
  type Run,
} from "./game";
import { EXPEDITIONS } from "./expeditions";

const PARTY = ["miso", "luna", "pip"];
const [first, second] = EXPEDITIONS.map((e) => e.id) as [string, string];
/** One attempt: a new combat seed every time, the saved loot seed. */
const attempt = (lootSeed: number, seed: number, party = PARTY) =>
  createRun(initialProgress(), party, seed, { relics: true, lootSeed });
/** The offer of every room when the first card is always picked. */
const offers = (run: Run) => {
  const seen: string[][] = [];
  for (let room = 0; room < 3; room++) {
    if (room) run = nextRoom({ ...run, status: "reward" });
    seen.push(run.offer);
    run = pickRelic(run, run.offer[0]!);
  }
  return seen;
};

describe("locked Relic offers", () => {
  it("repeat in every room across attempts with different combat seeds", () => {
    for (let loot = 1; loot <= 30; loot++)
      expect(offers(attempt(loot, 200))).toEqual(offers(attempt(loot, 100)));
  });
  it("still differ between loot seeds", () => {
    const all = Array.from({ length: 30 }, (_, i) =>
      attempt(i + 1, 1).offer.join(),
    );
    expect(new Set(all).size).toBeGreaterThan(20);
  });
  it("keep their party-wide Relics when a Companion changes", () => {
    const other = ["miso", "luna", "ember"];
    const wide = (offer: string[]) =>
      offer.filter((name) => !RELICS[name]!.companion);
    for (let loot = 1; loot <= 100; loot++) {
      const before = wide(attempt(loot, 1).offer);
      const after = wide(attempt(loot, 1, other).offer);
      const [short, long] =
        before.length < after.length ? [before, after] : [after, before];
      expect(long.slice(0, short.length)).toEqual(short);
    }
  });
  it("leave enemy marks to the combat seed", () => {
    const marks = (loot: number) =>
      pickRelic(
        { ...attempt(loot, 9), offer: ["Thick fur"] },
        "Thick fur",
      ).enemies.map((e) => e.mark);
    expect(marks(1)).toEqual(marks(2));
  });
});

/** Kills the foes of the room with one strike of the first cat. */
const clearRoom = (run: Run) => {
  run.order = ["miso", ...run.enemies.map((e) => e.id)];
  run.turn = 0;
  run.ap = 6;
  run.enemies.forEach((e, i) => {
    e.hp = i === 0 ? 1 : 0;
    e.guard = e.armor = 0;
  });
  return act(run, "strike", run.enemies[0]!.id);
};
/** What every room of an attempt dropped. */
const drops = (lootSeed: number | undefined, seed: number) => {
  let run = createRun(initialProgress(), PARTY, seed, { lootSeed });
  return [0, 1, 2].map((room) => {
    if (room) run = nextRoom(run);
    run = clearRoom(run);
    return run.drop ?? "nothing";
  });
};

describe("locked Trinket drops", () => {
  it("repeat across attempts with different combat seeds", () => {
    for (let loot = 1; loot <= 30; loot++)
      expect(drops(loot, 200)).toEqual(drops(loot, 100));
  });
  it("still differ between loot seeds", () => {
    const all = Array.from({ length: 30 }, (_, i) => drops(i + 1, 1).join());
    expect(new Set(all).size).toBeGreaterThan(20);
  });
  it("come from the combat seed when there is no loot seed", () => {
    expect(drops(undefined, 5)).toEqual(drops(5, 5));
  });
});

describe("saved loot seeds", () => {
  const held = holdLootSeed(initialProgress(), first, 7);
  const ended = (status: Run["status"], expedition = first) =>
    ({ status, expedition }) as Run;

  it("creates a seed once per Expedition", () => {
    expect(held.lootSeeds).toEqual({ [first]: 7 });
    expect(holdLootSeed(held, first, 99)).toBe(held);
    expect(holdLootSeed(held, second, 99).lootSeeds).toEqual({
      [first]: 7,
      [second]: 99,
    });
  });
  it("releases only on victory or defeat, only for that Expedition", () => {
    const both = holdLootSeed(held, second, 99);
    for (const status of ["victory", "defeat"] as const)
      expect(releaseLootSeed(both, ended(status)).lootSeeds).toEqual({
        [second]: 99,
      });
    for (const status of ["relic", "combat", "reward"] as const)
      expect(releaseLootSeed(both, ended(status))).toBe(both);
  });
  it("survives saving, and bad entries are dropped without a reset", () => {
    expect(parseProgress(JSON.stringify(held))).toEqual(held);
    for (const bad of [-1, 1.5, 2 ** 32, "7", null] as unknown as number[]) {
      const read = parseProgress(
        JSON.stringify({ ...held, gold: 555, lootSeeds: { [first]: bad } }),
      );
      expect(read.gold).toBe(555);
      expect(read.lootSeeds).toBeUndefined();
    }
    for (const lootSeeds of [{ nowhere: 3 }, [3], "x"])
      expect(
        parseProgress(JSON.stringify({ ...initialProgress(), lootSeeds }))
          .lootSeeds,
      ).toBeUndefined();
  });
});
