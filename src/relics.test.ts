import { describe, expect, it } from "vitest";
import {
  ITEMS,
  RELICS,
  abilityCost,
  act,
  createRun,
  damagePreview,
  endTurn,
  equip,
  initialProgress,
  nextRoom,
  pickRelic,
  type Run,
} from "./game";

const PARTY = ["miso", "luna", "pip"];
const MEI = ["miso", "luna", "clover"];
const TUNTUN = ["miso", "luna", "ember"];
const start = (party = PARTY, seed = 1) =>
  createRun(initialProgress(), party, seed, { relics: true });
/** A Run holding exactly `name`, whatever the first offer was. */
const holding = (name: string, party = PARTY) =>
  pickRelic({ ...start(party), offer: [name] }, name);
const base = (party = PARTY) => createRun(initialProgress(), party);
/** The party with one cat wearing one Trinket, holding the given Relics. */
const geared = (id: string, item: string, relics: string[], party = PARTY) => {
  const owned = { ...initialProgress(), inventory: [...ITEMS] };
  let run = createRun(equip(owned, id, item), party, 1, { relics: true });
  for (const name of relics)
    run = pickRelic({ ...run, status: "relic", offer: [name] }, name);
  return run;
};
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
const cast = (run: Run, id: string, ability: string, target = "e0") =>
  act(turnOf(run, id), ability, target);

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
  it("is reproducible from the seed, and absent unless asked for", () => {
    expect(start(PARTY, 7).offer).toEqual(start(PARTY, 7).offer);
    const plain = createRun(initialProgress(), PARTY, 7);
    expect(plain.status).toBe("combat");
    expect(plain.offer).toEqual([]);
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

/** Clears the room with Miso on 1 HP and returns the HP he is left with. */
const roomHealOf = (run: Run) => {
  turnOf(run, "miso");
  run.enemies.forEach((e, i) => (e.hp = i === 0 ? 1 : 0));
  cat(run, "miso").hp = 1;
  return cat(act(run, "strike", "e0"), "miso").hp;
};

/** One case per Relic: what its text promises and what its drawback takes. */
const CASES: Record<string, () => void> = {
  "Warm broth": () => {
    // Miso has 40 max HP: 33% is 14 and 53% is 22.
    expect(roomHealOf(base())).toBe(15);
    expect(roomHealOf(holding("Warm broth"))).toBe(23);
  },
  "Lucky whisker": () => {
    expect(holding("Lucky whisker").critChance).toBe(base().critChance + 10);
  },
  "Thick fur": () => {
    expect(holding("Thick fur").party.map((c) => c.armor)).toEqual([1, 1, 1]);
  },
  "Stone den": () => {
    expect(skill(holding("Stone den"), "miso", "guard").power).toBe(11);
  },
  "Reckless torch": () => {
    const run = holding("Reckless torch");
    const enemyPower = (r: Run) => r.enemies.map((e) => e.abilities[0]!.power);
    expect(skill(run, "miso", "strike").power).toBe(8);
    expect(enemyPower(run)).toEqual(enemyPower(base()).map((n) => n + 2));
    // The drawback follows into the next room's enemies.
    const next = pickRelic(
      { ...nextRoom({ ...run, status: "reward" }), offer: ["Thick fur"] },
      "Thick fur",
    );
    const plain = nextRoom({ ...base(), status: "reward" });
    expect(enemyPower(next)).toEqual(enemyPower(plain).map((n) => n + 2));
  },
  "Heavy collars": () => {
    const miso = cat(holding("Heavy collars"), "miso");
    expect([miso.maxHp, miso.hp, miso.initiative]).toEqual([50, 50, 8]);
  },
  "Healing thorns": () => {
    const run = holding("Healing thorns", MEI);
    cat(run, "luna").hp = 10;
    expect(cat(cast(run, "clover", "strike"), "luna").hp).toBe(13);
  },
  "Hurried remedy": () => {
    const run = holding("Hurried remedy", MEI);
    expect(skill(run, "clover", "heal")).toMatchObject({ cost: 1, power: 4 });
  },
  "Shield stance": () => {
    const run = holding("Shield stance");
    cat(run, "miso").guard = 0;
    expect(cat(cast(run, "miso", "strike"), "miso").guard).toBe(3);
  },
  "Iron coat": () => {
    const miso = cat(holding("Iron coat"), "miso");
    expect([miso.armor, miso.initiative]).toEqual([2, 6]);
  },
  Kindling: () => {
    const run = turnOf(holding("Kindling", TUNTUN), "ember");
    expect(abilityCost(run, skill(run, "ember", "strike"))).toBe(0);
    const once = act(run, "strike", "e0");
    expect(once.ap).toBe(6);
    expect(act(once, "strike", "e0").ap).toBe(5);
  },
  Overheat: () => {
    const run = holding("Overheat", TUNTUN);
    skill(run, "ember", "slam").lifesteal = 0;
    const after = cast(run, "ember", "slam");
    expect(cat(after, "ember").hp).toBe(cat(run, "ember").hp - 5);
    expect(cat(after, "ember").cooldowns).toEqual({});
    // Never the last point.
    cat(run, "ember").hp = 3;
    expect(cat(cast(run, "ember", "slam"), "ember").hp).toBe(1);
  },
  "Full moon": () => {
    const after = cast(holding("Full moon"), "luna", "strike");
    expect(after.enemies.slice(0, 2).map((e) => e.hp)).toEqual([95, 97]);
  },
  "Smoke step": () => {
    const after = cast(holding("Smoke step"), "pip", "line");
    expect(cat(after, "pip").cooldowns).toEqual({});
  },
};

describe("every Relic", () => {
  it("has a case", () => {
    expect(Object.keys(CASES)).toEqual(Object.keys(RELICS));
  });
  it.each(Object.keys(CASES))("%s does what its text says", (name) => {
    CASES[name]!();
  });
});

describe("Kindling without shared AP", () => {
  it("keeps the free jab after the AP run out", () => {
    const run = turnOf(holding("Kindling", TUNTUN), "ember");
    run.ap = 3;
    const after = act(run, "slam", "e0");
    expect(after.ap).toBe(0);
    expect(after.order[after.turn]).toBe("ember");
    const jabbed = act(after, "strike", "e0");
    expect(jabbed.enemies[0]!.hp).toBeLessThan(after.enemies[0]!.hp);
    expect(jabbed.order[jabbed.turn]).not.toBe("ember");
  });
  it("lets Tuntun act in a turn that starts with none", () => {
    const run = turnOf(holding("Kindling", TUNTUN), "miso");
    run.order = ["miso", "ember", ...run.enemies.map((e) => e.id)];
    run.ap = 0;
    const next = endTurn(run);
    expect(next.order[next.turn]).toBe("ember");
  });
});

describe("Relics and Trinkets that touch the same thing", () => {
  it("add up on max HP and initiative", () => {
    // 40 + 6 from the bell, then a quarter more.
    const big = geared("miso", "Iron bell", ["Heavy collars"]);
    expect(cat(big, "miso").maxHp).toBe(58);
    const slow = geared("miso", "Silk ribbon", ["Heavy collars", "Iron coat"]);
    expect(cat(slow, "miso").initiative).toBe(12 + 3 - 4 - 6);
  });
  it.each([
    ["miso", "Lucky fang", "Reckless torch", PARTY, "strike", 9],
    ["miso", "Knight's button", "Stone den", PARTY, "guard", 13],
    ["clover", "Herb pouch", "Hurried remedy", MEI, "heal", 6],
    ["ember", "Ember glove", "Overheat", TUNTUN, "slam", 28],
  ])("%s: %s with %s", (id, item, relic, party, ability, power) => {
    const run = geared(id, item, [relic], party);
    expect(skill(run, id, ability).power).toBe(power);
  });
  it("Full moon splits the power Reckless torch added, in either order", () => {
    for (const order of [
      ["Full moon", "Reckless torch"],
      ["Reckless torch", "Full moon"],
    ]) {
      const after = cast(geared("luna", "", order), "luna", "strike");
      expect(after.enemies.slice(0, 2).map((e) => e.hp)).toEqual([92, 96]);
    }
  });
  it("Smoke step keeps the Long thread shares", () => {
    const line = skill(
      geared("pip", "Long thread", ["Smoke step"]),
      "pip",
      "line",
    );
    expect(line.falloff).toEqual([1, 0.6, 0.45]);
    expect(line.cooldownTurns).toBeUndefined();
  });
  it("Warm milk adds to the Healing thorns heal", () => {
    const run = geared("luna", "Warm milk", ["Healing thorns"], MEI);
    cat(run, "luna").hp = 10;
    expect(cat(cast(run, "clover", "strike"), "luna").hp).toBe(15);
  });
  it("Pocket lantern lengthens the Shield stance shield", () => {
    const run = geared("miso", "Pocket lantern", ["Shield stance"]);
    cat(run, "miso").guard = 0;
    expect(cat(cast(run, "miso", "strike"), "miso").guardTurns).toBe(4);
  });
  it("Four-leaf clover stacks on Lucky whisker", () => {
    const run = geared("miso", "Four-leaf clover", ["Lucky whisker"]);
    expect([run.critChance, cat(run, "miso").critBonus]).toEqual([10, 5]);
  });
  it("Brave bell counts the half of the raised max HP", () => {
    const run = turnOf(geared("miso", "Brave bell", ["Heavy collars"]), "miso");
    const miso = cat(run, "miso");
    const dealt = (hp: number) => {
      miso.hp = hp;
      return damagePreview(
        run,
        miso,
        skill(run, "miso", "strike"),
        run.enemies[0]!,
      ).power;
    };
    expect([dealt(24), dealt(25)]).toEqual([6, 5]);
  });
});
