import { describe, expect, it } from "vitest";
import {
  abilityTargetUnavailableReason,
  act,
  buildCat,
  createRun,
  currentUnit,
  damagePreview,
  endTurn,
  equip,
  initialProgress,
  ITEMS,
  nextRoom,
  trinketIdle,
  type Run,
} from "./game";
import { describeAbility } from "./abilityText";

const PARTY = ["miso", "pip", "clover"];
const owned = { ...initialProgress(), inventory: [...ITEMS] };
const wear = (cat: string, item: string) => equip(owned, cat, item);
const trained = (cat: string, item: string) => ({
  ...wear(cat, item),
  catLevels: { [cat]: 3 },
});
const cat = (r: Run, id: string) => r.party.find((u) => u.id === id)!;
const skill = (r: Run, id: string, ability: string) =>
  cat(r, id).abilities.find((a) => a.id === ability)!;

/** Makes it `id`'s turn, with harmless durable foes. */
function turnOf(r: Run, id: string): Run {
  r.order = [id, ...r.order.filter((x) => x !== id)];
  r.turn = 0;
  r.ap = 6;
  for (const e of r.enemies) {
    e.hp = e.maxHp = 500;
    e.armor = 0;
    e.guard = 0;
  }
  expect(currentUnit(r)!.id).toBe(id);
  return r;
}

describe("Four-leaf clover", () => {
  it("raises only the wearer's crit chance, and nothing while crits are off", () => {
    const p = wear("miso", "Four-leaf clover");
    expect(buildCat(p, "miso").critBonus).toBe(5);
    expect(buildCat(p, "pip").critBonus).toBe(0);
    const crits = (item: string) =>
      Array.from({ length: 300 }, (_, i) => {
        const r = turnOf(
          createRun(wear("miso", item), PARTY, i + 1, { crit: 10 }),
          "miso",
        );
        return act(r, "strike", "e0").events.some((e) => e.crit);
      }).filter(Boolean).length;
    expect(crits("Four-leaf clover")).toBeGreaterThan(crits("Iron bell"));
    for (const crit of ["off", 0] as const) {
      const r = turnOf(createRun(p, PARTY, 1, { crit }), "miso");
      expect(act(r, "strike", "e0").events.some((e) => e.crit)).toBe(false);
    }
  });
});

describe("Brave bell", () => {
  it("adds 1 attack strictly below half HP", () => {
    const r = turnOf(createRun(wear("miso", "Brave bell"), PARTY), "miso");
    const miso = cat(r, "miso");
    const dealt = (hp: number) => {
      miso.hp = hp;
      return damagePreview(r, miso, skill(r, "miso", "strike"), r.enemies[0]!)
        .power;
    };
    expect(dealt(miso.maxHp / 2)).toBe(5);
    expect(dealt(miso.maxHp / 2 - 1)).toBe(6);
  });
  it("keeps preview and resolution equal when lifesteal crosses half mid-sweep", () => {
    const p = trained("ember", "Brave bell");
    const r = turnOf(createRun(p, ["miso", "ember", "clover"]), "ember");
    const ember = cat(r, "ember");
    ember.hp = Math.ceil(ember.maxHp / 2) - 1;
    const cleave = skill(r, "ember", "cleave");
    const previews = r.enemies.map(
      (e) => damagePreview(r, ember, cleave, e).damage,
    );
    const after = act(r, "cleave", "ember");
    expect(after.enemies.map((e, i) => r.enemies[i]!.hp - e.hp)).toEqual(
      previews,
    );
  });
});

describe("Thorn ring", () => {
  it("returns 1 damage to whoever hits the wearer", () => {
    const r = createRun(wear("miso", "Thorn ring"), PARTY);
    r.order = ["miso", "e0"];
    r.turn = 0;
    r.enemies = [r.enemies[0]!];
    r.enemies[0]!.mark = "miso";
    const before = r.enemies[0]!.hp;
    const after = endTurn(r);
    expect(cat(after, "miso").hp).toBeLessThan(cat(r, "miso").hp);
    expect(after.enemies[0]!.hp).toBe(before - 1);
  });
});

describe("Warm milk", () => {
  const healed = (curse: number, hp: number) => {
    const r = turnOf(createRun(wear("miso", "Warm milk"), PARTY), "clover");
    const miso = cat(r, "miso");
    miso.hp = hp;
    miso.curse = curse;
    return cat(act(r, "heal", "miso"), "miso").hp - hp;
  };
  it("adds 2 to healing received, within max HP and after the curse", () => {
    expect(healed(0, 10)).toBe(9);
    expect(healed(3, 10)).toBe(6);
    expect(healed(0, 39)).toBe(1);
  });
});

describe("Snack bag", () => {
  it("heals 4 at the start of every room, never above max HP", () => {
    const p = wear("miso", "Snack bag");
    const next = (hp: number) => {
      const r = createRun(p, PARTY);
      r.status = "reward";
      cat(r, "miso").hp = hp;
      // No enemy acts before we look.
      for (const u of r.party) u.initiative = 999;
      return cat(nextRoom(r), "miso").hp;
    };
    expect(next(10)).toBe(14);
    expect(next(38)).toBe(40);
  });
});

describe("Pocket lantern", () => {
  it("makes only the wearer's Guards last one more turn, and says so", () => {
    const p = trained("miso", "Pocket lantern");
    const r = turnOf(createRun(p, PARTY), "miso");
    expect(cat(act(r, "guard", "pip"), "pip").guardTurns).toBe(4);
    expect(cat(act(r, "taunt", "miso"), "miso").guardTurns).toBe(4);
    const guard = skill(r, "miso", "guard");
    expect(describeAbility(guard, guard.power).text).toContain("4 turns");
    // A 3-turn shield is not yet at the wearer's full duration.
    Object.assign(cat(r, "pip"), { guard: 8, guardTurns: 3 });
    expect(abilityTargetUnavailableReason(r, guard, "pip")).toBeUndefined();
    const plain = turnOf(createRun(owned, PARTY), "miso");
    expect(cat(act(plain, "guard", "pip"), "pip").guardTurns).toBe(3);
  });
});

describe("skill Trinkets", () => {
  it("Long thread widens Dagger line", () => {
    const line = buildCat(wear("pip", "Long thread"), "pip").abilities[1]!;
    expect(line.falloff).toEqual([1, 0.6, 0.45]);
    expect(describeAbility(line, 10).text).toContain(
      "for 6 and the next for 5",
    );
  });
  it("Hearthstone revives at 75%", () => {
    const p = trained("clover", "Hearthstone");
    const r = turnOf(createRun(p, PARTY), "clover");
    cat(r, "miso").hp = 0;
    const revive = skill(r, "clover", "revive");
    expect(describeAbility(revive, revive.power).text).toContain("75%");
    expect(cat(act(r, "revive", "miso"), "miso").hp).toBe(30);
  });
  it("Beacon stone and Ember glove raise only their skill", () => {
    const miso = buildCat(trained("miso", "Beacon stone"), "miso");
    expect(miso.abilities.find((a) => a.id === "taunt")!.power).toBe(8);
    const ember = buildCat(wear("ember", "Ember glove"), "ember");
    expect(ember.abilities.map((a) => a.power)).toEqual([5, 28]);
    expect(buildCat(wear("pip", "Ember glove"), "pip").abilities).toEqual(
      buildCat(owned, "pip").abilities,
    );
  });
  it("knows when a Trinket does nothing for its wearer", () => {
    expect(trinketIdle(owned, "pip", "Ember glove")).toBe(true);
    expect(trinketIdle(owned, "ember", "Ember glove")).toBe(false);
    expect(trinketIdle(owned, "miso", "Beacon stone")).toBe(true);
    const p = trained("miso", "Beacon stone");
    expect(trinketIdle(p, "miso", "Beacon stone")).toBe(false);
    expect(trinketIdle(owned, "pip", "Pocket lantern")).toBe(true);
    expect(trinketIdle(owned, "pip", "Iron bell")).toBe(false);
  });
});
