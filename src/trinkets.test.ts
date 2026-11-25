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
  ITEM_BONUS,
  ITEMS,
  nextRoom,
  trinketIdle,
  type Run,
} from "./game";
import { describeAbility } from "./abilityText";
import { identityT } from "./i18n";
import { itemBonusText } from "./uiText";

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

const CATS_IDS = ["miso", "luna", "pip", "clover", "ember"];
const ATTACKS = [
  "miso.strike",
  "luna.strike",
  "pip.strike",
  "pip.line",
  "pip.pierce",
  "clover.strike",
  "ember.strike",
  "ember.slam",
  "ember.cleave",
];
const HEALS = ["clover.heal", "clover.renewal"];
const SHIELDS = ["miso.guard", "miso.taunt"];
const each = (keys: string[], n: number) =>
  Object.fromEntries(keys.map((k) => [k, n]));
const everyCat = (stat: string, n: number) =>
  each(
    CATS_IDS.map((id) => `${id}.${stat}`),
    n,
  );

/** What the Bag says about each Trinket, and every number it changes on any cat. */
const TRINKETS: Record<string, [string, Record<string, unknown>]> = {
  "Iron bell": ["(+6 HP)", everyCat("maxHp", 6)],
  "Silk ribbon": ["(+3 INIT)", everyCat("initiative", 3)],
  "Lucky fang": ["(+1 ATK)", each(ATTACKS, 1)],
  "Copper locket": [
    "(+3 HP, +1 INIT)",
    { ...everyCat("maxHp", 3), ...everyCat("initiative", 1) },
  ],
  "Brass whistle": [
    "(+2 HP, +2 INIT)",
    { ...everyCat("maxHp", 2), ...everyCat("initiative", 2) },
  ],
  "Herb pouch": ["(+2 HEAL)", each(HEALS, 2)],
  "Knight's button": ["(+2 GUARD)", { "miso.guard": 2 }],
  "Moon pebble": ["(+1 Inspired)", { "luna.fury": 1 }],
  "Mint sprig": [
    "(+3 HP, +1 HEAL)",
    { ...everyCat("maxHp", 3), ...each(HEALS, 1) },
  ],
  "Pewter charm": [
    "(+3 HP, +1 GUARD)",
    { ...everyCat("maxHp", 3), "miso.guard": 1 },
  ],
  "Four-leaf clover": ["(+5% CRIT)", everyCat("critBonus", 5)],
  "Thorn ring": ["(Returns 1 damage to attackers)", everyCat("thorns", 1)],
  "Pocket lantern": ["(Their shields last 1 more turn)", each(SHIELDS, 4)],
  "Snack bag": ["(Heals 4 HP at each room start)", everyCat("roomHeal", 4)],
  "Brave bell": ["(+1 ATK below half HP)", everyCat("lowHpAttack", 1)],
  "Warm milk": ["(+2 HP from healing skills)", everyCat("healed", 2)],
  "Long thread": [
    "(Dagger line: 60% and 45% behind the target)",
    { "pip.line": [1, 0.6, 0.45] },
  ],
  Hearthstone: [
    "(Return to the hearth revives at 75%)",
    { "clover.revive": 15 },
  ],
  "Beacon stone": ["(+3 shield on Stand behind me)", { "miso.taunt": 3 }],
  "Ember glove": ["(+4 Flame paw power)", { "ember.slam": 4 }],
};

/** Every number that differs from the bare cat, keyed "cat.stat" or "cat.skill". */
function changes(item: string) {
  const out: Record<string, unknown> = {};
  for (const id of CATS_IDS) {
    const bare = buildCat(trained(id, ""), id);
    const worn = buildCat(trained(id, item), id);
    for (const stat of [
      "maxHp",
      "initiative",
      "critBonus",
      "thorns",
      "healed",
      "roomHeal",
      "lowHpAttack",
    ] as const)
      if (worn[stat] !== bare[stat])
        out[`${id}.${stat}`] = worn[stat] - bare[stat];
    worn.abilities.forEach((a, i) => {
      const was = bare.abilities[i]!;
      const key = `${id}.${a.id}`;
      if (a.power !== was.power) out[key] = a.power - was.power;
      if (a.falloff !== was.falloff) out[key] = a.falloff;
      if (a.duration !== was.duration) out[key] = a.duration;
    });
  }
  return out;
}

describe("every Trinket", () => {
  it("has a case", () => {
    expect(Object.keys(TRINKETS)).toEqual(Object.keys(ITEM_BONUS));
  });
  it.each(Object.entries(TRINKETS))(
    "%s changes exactly what its label says",
    (item, [label, expected]) => {
      expect(itemBonusText(item, identityT)).toBe(label);
      expect(changes(item)).toEqual(expected);
    },
  );
});

/** Who gets nothing from a Trinket, with signature skills unlocked. */
const NOBODY_ELSE = (user: string) => CATS_IDS.filter((id) => id !== user);
const IDLE: Record<string, string[]> = {
  "Herb pouch": NOBODY_ELSE("clover"),
  "Knight's button": NOBODY_ELSE("miso"),
  "Moon pebble": NOBODY_ELSE("luna"),
  "Pocket lantern": NOBODY_ELSE("miso"),
  "Long thread": NOBODY_ELSE("pip"),
  Hearthstone: NOBODY_ELSE("clover"),
  "Beacon stone": NOBODY_ELSE("miso"),
  "Ember glove": NOBODY_ELSE("ember"),
};
describe("no effect on the wearer", () => {
  it.each(Object.keys(TRINKETS))("%s is marked exactly there", (item) => {
    expect(
      CATS_IDS.filter((id) => trinketIdle(trained(id, item), id, item)),
    ).toEqual(IDLE[item] ?? []);
  });
});

describe("no effect before the skill is unlocked", () => {
  it("marks Beacon stone on an untrained Miso", () => {
    expect(trinketIdle(owned, "miso", "Beacon stone")).toBe(true);
  });
});

describe("Thorn ring limits", () => {
  const attacked = (guard: number, enemyHp: number) => {
    const r = createRun(wear("miso", "Thorn ring"), PARTY);
    r.order = ["miso", "e0"];
    r.turn = 0;
    r.enemies = [r.enemies[0]!];
    Object.assign(r.enemies[0]!, { mark: "miso", hp: enemyHp });
    Object.assign(cat(r, "miso"), { guard, guardTurns: guard ? 3 : 0 });
    return endTurn(r);
  };
  it("returns nothing when the shield takes the whole hit", () => {
    expect(attacked(99, 10).enemies[0]!.hp).toBe(10);
  });
  it("clears the room when it fells the last enemy", () => {
    expect(attacked(0, 1).status).toBe("reward");
  });
});

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
  it("Long thread shows its shares on the Dagger line card", () => {
    const line = buildCat(wear("pip", "Long thread"), "pip").abilities[1]!;
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
});
