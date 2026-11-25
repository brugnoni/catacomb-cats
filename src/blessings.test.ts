import { describe, expect, it } from "vitest";
import {
  act,
  buildCat,
  createRun,
  initialProgress,
  nextRoom,
  type Progress,
  type Run,
} from "./game";
import { describeAbility } from "./abilityText";
import { HEARTH_TRACK } from "./progression";

const PARTY = ["miso", "luna", "clover"];
const hearth = (generalLevel: number) => ({
  ...initialProgress(),
  generalLevel,
});
/** Rank 3 unlocks every signature skill. */
const trained: Progress = {
  ...initialProgress(),
  catLevels: { miso: 3, luna: 3, clover: 3 },
};
const cat = (r: Run, id: string) => r.party.find((u) => u.id === id)!;
const skill = (r: Run, id: string, ability: string) =>
  cat(r, id).abilities.find((a) => a.id === ability)!;
const turnOf = (r: Run, id: string) => {
  r.order = [id, ...r.order.filter((x) => x !== id)];
  r.turn = 0;
  r.ap = 6;
  return r;
};
const cast = (r: Run, id: string, ability: string, target = id) =>
  act(turnOf(r, id), ability, target);

/** Everything the Hearth blessing has given in total at each rank, from its texts. */
// [HP, initiative, attack, healing/Guard/Inspired, Second Wind %, opening AP, crit %]
const RANKS = [
  [2, 1, 0, 0, 0, 0, 0],
  [2, 1, 1, 0, 0, 0, 0],
  [2, 1, 1, 0, 40, 0, 0],
  [5, 2, 1, 0, 40, 0, 0],
  [5, 2, 1, 1, 40, 0, 0],
  [5, 2, 2, 1, 40, 0, 5],
  [8, 2, 2, 1, 60, 0, 5],
  [8, 2, 2, 1, 60, 1, 10],
];

describe("every Hearth blessing rank", () => {
  it("has a case", () => {
    expect(RANKS).toHaveLength(HEARTH_TRACK.length);
  });
  it.each(RANKS.map((row, i) => [i + 1, row] as const))(
    "rank %i gives its running total",
    (rank, [hp, init, attack, support, wind, ap, crit]) => {
      const bare = (id: string) => buildCat(initialProgress(), id);
      const built = (id: string) => buildCat(hearth(rank), id);
      const gain = (id: string, slot: number) =>
        built(id).abilities[slot]!.power - bare(id).abilities[slot]!.power;
      for (const id of PARTY) {
        expect(built(id).maxHp - bare(id).maxHp).toBe(hp);
        expect(built(id).initiative - bare(id).initiative).toBe(init);
        expect(gain(id, 0)).toBe(attack);
        // Nine lives, Moon blessing and Healing purr.
        expect(gain(id, 1)).toBe(support);
      }
      const run = createRun(hearth(rank), PARTY, 1, { crit: "on" });
      expect(run.secondWind).toBe(wind);
      expect(run.hearthAp).toBe(ap);
      expect(run.critChance).toBe(10 + crit);
    },
  );
});

describe("Blessings", () => {
  const text = (r: Run, id: string, ability: string) => {
    const a = skill(r, id, ability);
    const d = describeAbility(a, a.power);
    return `${d.text} ${d.note ?? ""}`;
  };
  const run = () => createRun(trained, PARTY);

  it("Nine lives (+1 from rank 2) shields for what it says, replacing and never adding", () => {
    expect(text(run(), "miso", "guard")).toContain(
      "Shield 1 ally for 9. Lasts 3 turns.",
    );
    const once = cast(run(), "miso", "guard", "luna");
    expect(cat(once, "luna")).toMatchObject({ guard: 9, guardTurns: 3 });
    Object.assign(cat(once, "luna"), { guard: 3 });
    expect(cat(cast(once, "miso", "guard", "luna"), "luna").guard).toBe(9);
  });
  it("Moon blessing inspires by what it says and renews only its duration", () => {
    expect(text(run(), "luna", "fury")).toContain(
      "+2 to damage, healing and shields. Lasts 3 turns.",
    );
    const once = cast(run(), "luna", "fury", "miso");
    expect(cat(once, "miso")).toMatchObject({ fury: 2, furyTurns: 3 });
    Object.assign(cat(once, "miso"), { fury: 1, furyTurns: 1 });
    once.uses = {};
    expect(cat(cast(once, "luna", "fury", "miso"), "miso")).toMatchObject({
      fury: 1,
      furyTurns: 3,
    });
  });
  it("Inspired raises Nine lives but not Stand behind me or Moonwell", () => {
    const r = run();
    cat(r, "miso").fury = 2;
    cat(r, "miso").furyTurns = 3;
    expect(cat(cast(r, "miso", "guard", "luna"), "luna").guard).toBe(11);
    expect(cat(cast(r, "miso", "taunt"), "miso").guard).toBe(5);
    cat(r, "luna").fury = 2;
    cat(r, "luna").furyTurns = 3;
    expect(cast(r, "luna", "surge").maxAp).toBe(8);
  });
  it("Stand behind me draws every mark and gives its shield", () => {
    expect(text(run(), "miso", "taunt")).toContain("a 5 shield");
    const after = cast(run(), "miso", "taunt");
    expect(cat(after, "miso")).toMatchObject({ guard: 5, guardTurns: 3 });
    expect(after.enemies.map((e) => e.mark)).toEqual(
      after.enemies.map(() => "miso"),
    );
  });
  it("Moonwell raises shared AP for this room only, once", () => {
    expect(text(run(), "luna", "surge")).toContain("+2 AP");
    const after = cast(run(), "luna", "surge");
    // 1 AP spent, 2 gained.
    expect([after.ap, after.maxAp]).toEqual([7, 8]);
    expect(act(after, "surge", "luna")).toBe(after);
    const next = nextRoom({ ...after, status: "reward" });
    expect(next.maxAp).toBe(6);
  });
});
