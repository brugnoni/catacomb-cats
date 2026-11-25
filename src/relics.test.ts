import { describe, expect, it } from "vitest";
import {
  RELICS,
  abilityCost,
  act,
  createRun,
  initialProgress,
  nextRoom,
  pickRelic,
  type Run,
} from "./game";

const PARTY = ["miso", "luna", "pip"];
const start = (party = PARTY, seed = 1) =>
  createRun(initialProgress(), party, seed, { relics: true });
/** A Run holding exactly `name`, whatever the first offer was. */
const holding = (name: string, party = PARTY) =>
  pickRelic({ ...start(party), offer: [name] }, name);
const cat = (run: Run, id: string) => run.party.find((u) => u.id === id)!;
const skill = (run: Run, id: string, ability: string) =>
  cat(run, id).abilities.find((a) => a.id === ability)!;
/** Hands the turn to `id` against foes that only take hits. */
const turnOf = (run: Run, id: string) => {
  run.order = [id, ...run.enemies.map((e) => e.id)];
  run.turn = 0;
  run.ap = 6;
  for (const e of run.enemies) {
    e.hp = e.maxHp = 100;
    e.guard = e.armor = 0;
  }
  return run;
};

describe("Relic offers", () => {
  it("offers three distinct Relics and blocks play until one is picked", () => {
    const run = start();
    expect(run.status).toBe("relic");
    expect(new Set(run.offer).size).toBe(3);
    expect(act(run, "strike", "e0")).toBe(run);
    expect(pickRelic(run, "nonsense")).toBe(run);
    const picked = pickRelic(run, run.offer[0]!);
    expect(picked.status).toBe("combat");
    expect(picked.relics).toEqual([run.offer[0]]);
    expect(picked.offer).toEqual([]);
  });
  it("is reproducible and leaves enemy marks alone", () => {
    expect(start(PARTY, 7).offer).toEqual(start(PARTY, 7).offer);
    const plain = createRun(initialProgress(), PARTY, 7);
    expect(plain.status).toBe("combat");
    expect(plain.offer).toEqual([]);
    expect(start(PARTY, 7).rng).not.toBeUndefined();
  });
  it("never offers another party's Relic", () => {
    for (let seed = 1; seed <= 200; seed++)
      for (const name of start(PARTY, seed).offer)
        expect([undefined, ...PARTY]).toContain(RELICS[name]!.companion);
  });
  it("offers again before each room, without repeats or useless picks", () => {
    for (let seed = 1; seed <= 100; seed++) {
      let run = start(PARTY, seed);
      for (let room = 0; room < 3; room++) {
        if (room) {
          run = nextRoom({ ...run, status: "reward" });
          expect(run.status).toBe("relic");
          for (const held of run.relics) expect(run.offer).not.toContain(held);
          if (room === 2) expect(run.offer).not.toContain("Warm broth");
        }
        run = pickRelic(run, run.offer[0]!);
      }
      expect(run.relics).toHaveLength(3);
    }
  });
});

describe("Relic effects", () => {
  it("changes the party stats", () => {
    const base = createRun(initialProgress(), PARTY);
    expect(holding("Thick fur").party.map((c) => c.armor)).toEqual([1, 1, 1]);
    expect(holding("Lucky whisker").critChance).toBe(base.critChance + 10);
    const heavy = holding("Heavy collars");
    expect(cat(heavy, "miso").maxHp).toBe(50);
    expect(cat(heavy, "miso").initiative).toBe(8);
    expect(cat(holding("Iron coat"), "miso").armor).toBe(2);
    expect(cat(holding("Iron coat"), "miso").initiative).toBe(6);
    expect(skill(holding("Stone den"), "miso", "guard").power).toBe(11);
  });
  it("Reckless torch strengthens both sides", () => {
    const run = holding("Reckless torch");
    const base = createRun(initialProgress(), PARTY);
    expect(skill(run, "miso", "strike").power).toBe(8);
    expect(run.enemies[0]!.abilities[0]!.power).toBe(
      base.enemies[0]!.abilities[0]!.power + 2,
    );
  });
  it("Hurried remedy, Smoke step, Overheat and Full moon rewrite skills", () => {
    const mei = holding("Hurried remedy", ["miso", "luna", "clover"]);
    expect(skill(mei, "clover", "heal")).toMatchObject({ cost: 1, power: 4 });
    expect(
      skill(holding("Smoke step"), "pip", "line").cooldownTurns,
    ).toBeUndefined();
    const luna = turnOf(holding("Full moon"), "luna");
    const after = act(luna, "strike", "e0");
    expect(after.enemies[0]!.hp).toBe(95);
    expect(after.enemies[1]!.hp).toBe(97);
  });
  it("Healing thorns and Shield stance add to a basic attack", () => {
    const mei = turnOf(
      holding("Healing thorns", ["miso", "luna", "clover"]),
      "clover",
    );
    cat(mei, "luna").hp = 10;
    expect(cat(act(mei, "strike", "e0"), "luna").hp).toBe(13);
    const miso = turnOf(holding("Shield stance"), "miso");
    cat(miso, "miso").guard = 0;
    expect(cat(act(miso, "strike", "e0"), "miso").guard).toBe(3);
  });
  it("Kindling makes only the first Cinder jab free", () => {
    const run = turnOf(holding("Kindling", ["miso", "luna", "ember"]), "ember");
    const jab = skill(run, "ember", "strike");
    expect(abilityCost(run, jab)).toBe(0);
    const once = act(run, "strike", "e0");
    expect(once.ap).toBe(6);
    expect(act(once, "strike", "e0").ap).toBe(5);
  });
  it("Overheat costs Tuntun HP but never the last point", () => {
    const run = turnOf(holding("Overheat", ["miso", "luna", "ember"]), "ember");
    const ember = cat(run, "ember");
    ember.hp = 3;
    skill(run, "ember", "slam").lifesteal = 0;
    expect(cat(act(run, "slam", "e0"), "ember").hp).toBe(1);
  });
  it("Warm broth heals more after a room", () => {
    const heal = (run: Run) => {
      turnOf(run, "miso");
      run.enemies.forEach((e, i) => (e.hp = i === 0 ? 1 : 0));
      cat(run, "miso").hp = 1;
      return cat(act(run, "strike", "e0"), "miso").hp;
    };
    // Miso has 40 max HP: 33% is 14 and 53% is 22.
    expect(heal(createRun(initialProgress(), PARTY))).toBe(15);
    expect(heal(holding("Warm broth"))).toBe(23);
  });
});
