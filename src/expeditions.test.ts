import { describe, it, expect } from "vitest";
import {
  act,
  buyUpgrade,
  claimRewards,
  createRun,
  initialProgress,
  nextRoom,
  parseProgress,
  type Progress,
  type Run,
} from "./game";
import { ENEMY_TRAITS } from "./engine/data";
import { powerPoints } from "./progression";
import {
  EXPEDITIONS,
  expeditionUnlocked,
  rankCap,
  roomReward,
  type Expedition,
} from "./expeditions";

const party = ["pip", "miso", "clover"];

describe("expedition choice", () => {
  it("defaults to the first Expedition", () => {
    const run = createRun(initialProgress(), party);
    expect(run.expedition).toBe(EXPEDITIONS[0]!.id);
    expect(run.enemies.map((e) => e.name)).toEqual(["Crypt rat", "Moss slime"]);
  });

  it("keeps the Expedition through every room", () => {
    const run = createRun(initialProgress(), party, 1, {
      expedition: EXPEDITIONS[0]!.id,
    });
    const next = nextRoom({ ...run, status: "reward" } as Run);
    expect(next.expedition).toBe(EXPEDITIONS[0]!.id);
    expect(next.enemies.map((e) => e.name)).toContain("Bone sentry");
  });

  it("rejects an unknown Expedition like an invalid party", () => {
    expect(() =>
      createRun(initialProgress(), party, 1, { expedition: "nowhere" }),
    ).toThrow("Choose a real expedition.");
  });
});

describe("victories per Expedition", () => {
  it("an old save counts its victories for the first Expedition", () => {
    const old = { ...initialProgress(), wins: 4, claimedRuns: ["a"] } as Record<
      string,
      unknown
    >;
    delete old.expeditionWins;
    expect(parseProgress(JSON.stringify(old)).expeditionWins).toEqual({
      [EXPEDITIONS[0]!.id]: 4,
    });
  });

  it("a win is counted for the Expedition it was played in", () => {
    const run = {
      ...createRun(initialProgress(), party),
      status: "victory",
    } as Run;
    const after = claimRewards(initialProgress(), run);
    expect(after.expeditionWins).toEqual({ [EXPEDITIONS[0]!.id]: 1 });
    expect(claimRewards(after, run)).toBe(after);
  });

  it("ignores Expedition ids from a newer build instead of resetting", () => {
    const newer = {
      ...initialProgress(),
      gold: 77,
      expeditionWins: { catacombs: 2, future: 9 },
    };
    const loaded = parseProgress(JSON.stringify(newer));
    expect(loaded.gold).toBe(77);
    expect(loaded.expeditionWins).toEqual({ catacombs: 2 });
  });

  it("rejects a save with a bad victory count", () => {
    const bad = { ...initialProgress(), expeditionWins: { catacombs: -1 } };
    expect(parseProgress(JSON.stringify(bad))).toEqual(initialProgress());
  });
});

describe("unlock rule", () => {
  const second: Expedition = {
    ...EXPEDITIONS[0]!,
    id: "second",
    unlock: { from: "catacombs", wins: 3 },
  };
  const wonFirst = (n: number) => ({
    ...initialProgress(),
    expeditionWins: { catacombs: n },
  });

  it("opens exactly at the required victories", () => {
    expect(expeditionUnlocked(wonFirst(2), second)).toBe(false);
    expect(expeditionUnlocked(wonFirst(3), second)).toBe(true);
  });

  it("the first Expedition is always open", () => {
    expect(expeditionUnlocked(initialProgress(), EXPEDITIONS[0]!)).toBe(true);
  });
});

describe("rank cap", () => {
  const rich = { ...initialProgress(), gold: 5000 };

  it("training and Hearth stop at the cap and keep the same object", () => {
    let p = rich;
    for (let i = 0; i < 4; i++) p = buyUpgrade(buyUpgrade(p, "pip"));
    expect(p.catLevels.pip).toBe(4);
    expect(p.generalLevel).toBe(4);
    expect(buyUpgrade(p, "pip")).toBe(p);
    expect(buyUpgrade(p)).toBe(p);
  });

  it("surplus XP is banked but mastery stops at the cap", () => {
    const p = { ...rich, xp: 1500, wins: 1 };
    expect(powerPoints(p)).toBe(4);
    expect(p.xp).toBe(1500);
  });

  it("ranks already owned above the cap are kept", () => {
    const p = { ...rich, catLevels: { pip: 6 } };
    expect(parseProgress(JSON.stringify(p)).catLevels.pip).toBe(6);
    expect(powerPoints(p)).toBe(6);
  });
});

describe("later Expeditions", () => {
  const won = (catacombs: number, warrens = 0) => ({
    ...initialProgress(),
    expeditionWins: { catacombs, warrens },
  });

  it("stay locked until the previous one is won enough times", () => {
    expect(() =>
      createRun(won(2), party, 1, { expedition: "warrens" }),
    ).toThrow("That expedition is still locked.");
    expect(() =>
      createRun(won(3, 4), party, 1, { expedition: "vault" }),
    ).toThrow("That expedition is still locked.");
    expect(
      createRun(won(3), party, 1, { expedition: "warrens" }).expedition,
    ).toBe("warrens");
    expect(
      createRun(won(3, 5), party, 1, { expedition: "vault" }).expedition,
    ).toBe("vault");
  });

  it("have their own enemies", () => {
    const names = (id: string, room: number) => {
      let run = createRun(won(3, 5), party, 1, { expedition: id });
      for (let i = 0; i < room; i++)
        run = nextRoom({ ...run, status: "reward" } as Run);
      return run.enemies.map((e) => e.name);
    };
    expect(names("warrens", 2)[0]).toBe("Royal wisp");
    expect(names("vault", 2)[0]).toBe("Bone sentry");
    expect(names("vault", 0)).not.toEqual(names("warrens", 0));
  });

  it("pay more for every room", () => {
    const loot = (id: string) => {
      const run = createRun(won(3, 5), party, 1, { expedition: id });
      run.enemies.forEach((e) => (e.hp = 0));
      run.enemies[0]!.hp = 1;
      run.enemies[0]!.armor = run.enemies[0]!.guard = 0;
      run.order = [
        "pip",
        ...run.party.filter((u) => u.id !== "pip").map((u) => u.id),
        ...run.enemies.map((u) => u.id),
      ];
      run.turn = 0;
      run.ap = 6;
      return act(run, "strike", "e0");
    };
    expect(loot("catacombs").gold).toBe(roomReward(0).gold);
    expect(loot("warrens").gold).toBe(roomReward(0, "warrens").gold);
    expect(loot("vault").gold).toBe(roomReward(0, "vault").gold);
    expect(roomReward(0, "vault").gold).toBe(80);
  });

  it("raise the Rank cap as they unlock", () => {
    expect(rankCap(initialProgress())).toBe(4);
    expect(rankCap(won(3))).toBe(6);
    expect(rankCap(won(3, 5))).toBe(8);
    let p: Progress = { ...won(3), gold: 5000 };
    for (let i = 0; i < 6; i++) p = buyUpgrade(p, "pip");
    expect(p.catLevels.pip).toBe(6);
    expect(buyUpgrade(p, "pip")).toBe(p);
  });
});

describe("enemy traits", () => {
  it("every trait names an enemy that exists, so a rename cannot silently drop a behaviour", () => {
    const names = new Set(
      EXPEDITIONS.flatMap((e) => e.rooms.flat().map(([name]) => name)),
    );
    names.add("Bone sentry");
    for (const name of Object.keys(ENEMY_TRAITS)) expect(names).toContain(name);
  });
});
