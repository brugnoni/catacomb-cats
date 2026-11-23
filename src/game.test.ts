import { describe, it, expect } from "vitest";
import {
  act,
  abilityLimit,
  abilityPower,
  abilityUses,
  abilityUnavailableReason,
  abilityTargets,
  abilityTargetUnavailableReason,
  damagePreview,
  buildCat,
  buyUpgrade,
  CATS,
  claimRewards,
  createRun,
  currentUnit,
  endTurn,
  equip,
  initialProgress,
  nextRoom,
  parseProgress,
  SIGNATURE_ABILITIES,
  REVIVE_ABILITY,
  cooldownRemaining,
  type Progress,
  type Run,
} from "./game";
const start = () => createRun(initialProgress(), ["pip", "miso", "clover"]);
function turn(run: Run, id: string) {
  run.order = [
    id,
    ...run.party.filter((u) => u.id !== id).map((u) => u.id),
    ...run.enemies.map((u) => u.id),
  ];
  run.turn = 0;
  run.uses = {};
  run.ap = run.maxAp;
  return run;
}
function trained(id: string): Run {
  const p = { ...initialProgress(), catLevels: { [id]: 3 } };
  const party = [
    id,
    ...["pip", "miso", "clover"].filter((c) => c !== id),
  ].slice(0, 3);
  return turn(createRun(p, party), id);
}
function clear(run: Run): Run {
  run.enemies.forEach((e) => (e.hp = 0));
  run.enemies[0]!.hp = 1;
  run.enemies[0]!.armor = run.enemies[0]!.guard = 0;
  return act(turn(run, run.party.find((u) => u.hp > 0)!.id), "strike", "e0");
}
describe("basic expedition and lobby regression", () => {
  it("requires three distinct known cats", () => {
    expect(() =>
      createRun(initialProgress(), ["pip", "pip", "miso"]),
    ).toThrow();
    expect(() =>
      createRun(initialProgress(), ["pip", "miso", "unknown"]),
    ).toThrow();
  });
  it("initiative, shared AP and immutable actions", () => {
    const r = start();
    expect(currentUnit(r)?.id).toBe("pip");
    const next = act(r, "strike", "e0");
    expect(next.ap).toBe(5);
    expect(next.enemies[0]!.hp).toBe(20);
    expect(r.enemies[0]!.hp).toBe(24);
    expect(currentUnit(endTurn(next))?.id).toBe("miso");
  });
  it("invalid actions never mutate or spend AP", () => {
    const r = start();
    expect(act(r, "strike", "pip")).toBe(r);
    expect(act(r, "bad", "e0")).toBe(r);
    r.ap = 1;
    expect(act(r, "pounce", "e0")).toBe(r);
  });
  it("1AP skills stop at three uses and new actors reset counts", () => {
    let r = start();
    r.enemies[0]!.hp = 500;
    for (let i = 0; i < 3; i++) r = act(r, "strike", "e0");
    expect(r.ap).toBe(3);
    expect(abilityUses(r, "strike")).toBe(3);
    expect(act(r, "strike", "e0")).toBe(r);
    const next = endTurn(r);
    expect(abilityUses(next, "strike")).toBe(0);
    expect(act(next, "strike", "e0")).not.toBe(next);
  });
  it("2AP skills stop at two uses with AP remaining", () => {
    let r = start();
    r.enemies[0]!.hp = 500;
    r = act(act(r, "pounce", "e0"), "pounce", "e0");
    expect(r.ap).toBe(2);
    expect(abilityLimit(r.party[0]!.abilities[1]!)).toBe(2);
    expect(act(r, "pounce", "e0")).toBe(r);
  });
  it("AP resets each round and next turn allows same skill again", () => {
    let r = start();
    r = act(r, "strike", "e0");
    for (let i = 0; i < 20 && r.round === 1; i++) r = endTurn(r);
    expect(r.round).toBe(2);
    expect(r.ap).toBe(6);
    expect(abilityUses(r, "strike")).toBe(0);
  });
  it("defeat does not reward carried spoils", () => {
    let r = start();
    for (let i = 0; i < 200 && r.status === "combat"; i++) r = endTurn(r);
    expect(r.status).toBe("defeat");
    const p = buyUpgrade(initialProgress());
    expect(claimRewards(p, r)).toBe(p);
  });
  it("room rewards/recovery happen once immediately and loot accumulates", () => {
    let r = start();
    r.party[0]!.hp -= 12;
    r = clear(r);
    expect(r.status).toBe("reward");
    expect(r.gold).toBe(20);
    expect(r.xp).toBe(30);
    expect(r.bonus).toBe(1);
    expect(r.party[0]!.hp).toBe(r.party[0]!.maxHp - 4);
    expect(act(r, "strike", "e0")).toBe(r);
    r = nextRoom(r);
    expect(r.bonus).toBe(1);
    expect(r.maxAp).toBe(6);
    r = clear(r);
    r = clear(nextRoom(r));
    expect(r.status).toBe("victory");
    expect(r.items).toEqual(["Iron bell", "Silk ribbon", "Lucky fang"]);
    const p = claimRewards(initialProgress(), r);
    expect(p.gold).toBe(120);
    expect(p.xp).toBe(135);
    expect(p.wins).toBe(1);
    expect(claimRewards(p, r)).toBe(p);
  });
  it("unequips same cat and preserves inventory through persistence", () => {
    const p = equip(initialProgress(), "pip", "Iron bell");
    const q = equip(p, "pip", "");
    expect(q.equipment.pip).toBeUndefined();
    expect(q.inventory).toContain("Iron bell");
    expect(p.equipment.pip).toBe("Iron bell");
    expect(parseProgress(JSON.stringify(q))).toEqual(q);
  });
  it("equipment stays unique and modifies bounded stats", () => {
    let p = equip(initialProgress(), "pip", "Iron bell");
    p = equip(p, "miso", "Iron bell");
    expect(p.equipment.pip).toBeUndefined();
    expect(buildCat(p, "miso").maxHp).toBe(41);
  });
});
describe("training, migration and increasing challenge", () => {
  it("third training costs total100 and unlocks class signature for all classes", () => {
    for (const id of ["miso", "luna", "clover", "pip", "ember"]) {
      let p = { ...initialProgress(), gold: 100 };
      for (let rank = 0; rank < 3; rank++) p = buyUpgrade(p, id);
      expect(p.gold).toBe(0);
      expect(p.spentGold).toBe(100);
      expect(buildCat(p, id).abilities[2]!.id).toBe(
        SIGNATURE_ABILITIES[id]!.id,
      );
      expect(buildCat(initialProgress(), id).abilities).toHaveLength(2);
    }
  });
  it("training grows classes differently and cannot buy above cap", () => {
    const p = {
      ...initialProgress(),
      gold: 1000,
      catLevels: { miso: 8, pip: 1, clover: 2 },
    };
    expect(buyUpgrade(p, "miso")).toBe(p);
    expect(buildCat(p, "miso").maxHp).toBe(51);
    expect(buildCat(p, "pip").initiative).toBe(21);
    expect(buildCat(p, "clover").abilities[1]!.power).toBe(8);
  });
  it("mastery increases HP slowly and every numerical skill every third mastery", () => {
    const p = { ...initialProgress(), xp: 450 };
    const c = buildCat(p, "clover");
    expect(c.maxHp).toBe(35);
    expect(c.abilities[0]!.power).toBe(5);
    expect(c.abilities[1]!.power).toBe(8);
    expect(buildCat({ ...p, xp: 100000 }, "clover").maxHp).toBe(49);
  });
  it("difficulty increases after a win using investment and mastery but unspentgold does not matter", () => {
    const p = initialProgress();
    const first = createRun({ ...p, gold: 9999 }, ["pip", "miso", "clover"]);
    expect(first.difficulty.tier).toBe(0);
    const harder = createRun({ ...p, wins: 2, spentGold: 400, xp: 600 }, [
      "pip",
      "miso",
      "clover",
    ]);
    expect(harder.difficulty.tier).toBeGreaterThan(first.difficulty.tier);
    expect(harder.enemies[0]!.maxHp).toBeGreaterThan(first.enemies[0]!.maxHp);
    expect(harder.enemies.length).toBe(3);
    expect(
      createRun({ ...p, wins: 9999, spentGold: 9999, xp: 99999 }, [
        "pip",
        "miso",
        "clover",
      ]).enemies,
    ).toHaveLength(4);
    const snapshot = structuredClone(harder.difficulty);
    expect(nextRoom(clear(harder)).difficulty).toEqual(snapshot);
  });
  it("migrates old saves without losing ranks or resources and validates additions", () => {
    const p: Partial<Progress> = {
      ...initialProgress(),
      gold: 77,
      xp: 135,
      catLevels: { miso: 12 },
      claimedRuns: ["legacy-victory"],
    };
    delete p.wins;
    delete p.spentGold;
    const q = parseProgress(JSON.stringify(p));
    expect(q.gold).toBe(77);
    expect(q.catLevels.miso).toBe(12);
    expect(q.wins).toBe(1);
    expect(q.spentGold).toBe(1560);
    expect(buildCat(q, "miso").maxHp).toBe(51);
    expect(parseProgress(JSON.stringify({ ...q, wins: -1 }))).toEqual(
      initialProgress(),
    );
  });
  it("corrupt saves fall back safely", () => {
    for (const raw of [
      "{",
      "null",
      '{"version":2}',
      JSON.stringify({ ...initialProgress(), inventory: ["bad"] }),
      JSON.stringify({ ...initialProgress(), gold: -1 }),
    ])
      expect(parseProgress(raw)).toEqual(initialProgress());
  });
});
describe("non-stacking effects and exact numeric outcomes", () => {
  it("eligible Guard refresh replaces remaining absorption and duration without stacking", () => {
    let r = turn(start(), "miso");
    r = act(r, "guard", "pip");
    const pip = r.party.find((u) => u.id === "pip")!;
    pip.guard -= 2;
    pip.guardTurns = 1;
    r = act(r, "guard", "pip");
    expect(r.party.find((u) => u.id === "pip")!.guard).toBe(6);
    expect(r.party.find((u) => u.id === "pip")!.guardTurns).toBe(2);
  });
  it("Inspired does not amplify itself, and support skills benefit", () => {
    let r = turn(
      createRun(initialProgress(), ["luna", "miso", "clover"]),
      "luna",
    );
    r = act(r, "fury", "luna");
    r.party[0]!.abilities[1]!.power = 99;
    r = act(r, "fury", "luna");
    const luna = r.party[0]!;
    expect(luna.fury).toBe(2);
    expect(abilityPower(r, luna, luna.abilities[0]!)).toBe(7);
    const c = r.party[2]!;
    c.fury = 50;
    expect(abilityPower(r, c, c.abilities[1]!)).toBe(57);
  });
  it("shield, Inspired and curse expire at the affected unit next start, not its End turn", () => {
    let r = turn(start(), "pip");
    r.party[0]!.guard = 5;
    r.party[0]!.guardTurns = 1;
    r.party[0]!.fury = 2;
    r.party[0]!.furyTurns = 1;
    r.party[0]!.curse = 99;
    r.party[0]!.curseTurns = 1;
    expect(abilityPower(r, r.party[0]!, r.party[0]!.abilities[0]!)).toBe(0);
    r.order = ["pip", "miso", "clover"];
    r = endTurn(r);
    expect(r.party[0]!.guard).toBe(5);
    expect(r.party[0]!.furyTurns).toBe(1);
    expect(r.party[0]!.curseTurns).toBe(1);
    r = endTurn(r);
    expect(r.party[0]!.guardTurns).toBe(1);
    r = endTurn(r);
    expect(currentUnit(r)?.id).toBe("pip");
    expect(r.party[0]!.guard).toBe(0);
    expect(r.party[0]!.fury).toBe(0);
    expect(r.party[0]!.curse).toBe(0);
  });
  it("damage logs actual loss after armor and Guard, healing reports capped gain", () => {
    let r = start();
    r.enemies[0]!.armor = 1;
    r.enemies[0]!.guard = 2;
    r = act(r, "strike", "e0");
    expect(r.log.at(-1)).toContain(
      "1 damage (4 attack power, 1 armor, 2 Guard blocked",
    );
    r = turn(r, "clover");
    r.party[0]!.hp = r.party[0]!.maxHp - 3;
    r = act(r, "heal", "pip");
    expect(r.log.at(-1)).toContain("+3 HP (7 healing power");
  });
  it("reflection damages attackers once without recursive reflection", () => {
    let r = start();
    r.enemies[0]!.reflect = 2;
    r.enemies[0]!.reflectTurns = 2;
    r.party[0]!.reflect = 2;
    r.party[0]!.reflectTurns = 2;
    const before = r.party[0]!.hp;
    r = act(r, "strike", "e0");
    expect(r.party[0]!.hp).toBe(before - 2);
    expect(r.log.filter((l) => l.includes("reflects"))).toHaveLength(1);
  });
});
describe("signature mechanics", () => {
  it("tank taunt redirects attacks and expires exactly when tank next begins", () => {
    let r = trained("miso");
    const tank = r.party.find((u) => u.id === "miso")!;
    tank.hp = 35;
    r.party.find((u) => u.id === "pip")!.hp = 1;
    r = act(r, "taunt", "miso");
    expect(r.tauntId).toBe("miso");
    r.order = ["miso", "e0", "pip", "clover", "e1"];
    r.turn = 0;
    const before = r.party[0]!.hp;
    r = endTurn(r);
    expect(r.party.find((u) => u.id === "pip")!.hp).toBe(1);
    expect(r.party[0]!.hp).toBeLessThan(before);
    for (let i = 0; i < 10 && currentUnit(r)?.id !== "miso"; i++)
      r = endTurn(r);
    expect(currentUnit(r)?.id).toBe("miso");
    expect(r.tauntId).toBeUndefined();
  });
  it("Moonwell pays1 gives2 AP plus persistent roomcapacity and cannot repeat or scale", () => {
    let r = trained("luna");
    const a = r.party[0]!.abilities[2]!;
    expect(abilityTargets(r, a, "luna")).toBe(true);
    r = act(r, "surge", "luna");
    expect(r.ap).toBe(7);
    expect(r.maxAp).toBe(8);
    expect(abilityUnavailableReason(r, a)).toBeTruthy();
    expect(act(r, "surge", "luna")).toBe(r);
    for (let i = 0; i < 20 && r.round === 1; i++) r = endTurn(r);
    expect(r.ap).toBe(8);
    r = nextRoom(clear(r));
    expect(r.maxAp).toBe(6);
    expect(r.roomUses).toEqual({});
  });
  it("area heal restores all living allies without reviving fallen cats once perturn", () => {
    let r = trained("clover");
    r.party[0]!.hp -= 10;
    r.party[1]!.hp -= 10;
    r.party[2]!.hp = 0;
    const before = r.party.map((c) => c.hp);
    r = act(r, "renewal", "clover");
    expect(r.party[0]!.hp).toBeGreaterThan(before[0]!);
    expect(r.party[1]!.hp).toBeGreaterThan(before[1]!);
    expect(r.party[2]!.hp).toBe(0);
    expect(act(r, "renewal", "clover")).toBe(r);
  });
  it("rogue signature ignores armor while regular attack is mitigated", () => {
    let r = trained("pip");
    r.enemies[0]!.armor = 99;
    const before = r.enemies[0]!.hp;
    r = act(r, "pierce", "e0");
    expect(r.enemies[0]!.hp).toBeLessThan(before);
    expect(act(r, "pierce", "e0")).toBe(r);
  });
  it("brawler signature hits every enemy once", () => {
    let r = trained("ember");
    const before = r.enemies.map((e) => e.hp);
    r = act(r, "cleave", "ember");
    expect(r.enemies.every((e, i) => e.hp < before[i]!)).toBe(true);
    expect(act(r, "cleave", "ember")).toBe(r);
  });
});
describe("enemy role actions", () => {
  it("slime blesses an ally and applies bonus to attack", () => {
    let r = start();
    r.order = ["pip", "e1", "e0", "miso", "clover"];
    r = endTurn(r);
    expect(r.log.some((l) => l.includes("Inspired +2"))).toBe(true);
    expect(r.log.some((l) => l.includes("7 attack power"))).toBe(true);
  });
  it("tank foes have initial armor/guard and agile bats have higher initiative", () => {
    const r = nextRoom(clear(start()));
    expect(r.enemies[0]!.armor).toBe(2);
    expect(r.enemies[0]!.guard).toBe(6);
    expect(r.enemies[1]!.initiative).toBeGreaterThan(r.party[0]!.initiative);
  });
  it("caster curses on first round, shields on second and reflects on third", () => {
    let r = nextRoom(clear(start()));
    for (const phase of [1, 2, 3]) {
      r.order = ["pip", "e2", "miso", "clover", "e0", "e1"];
      r.turn = 0;
      r.round = phase;
      r = endTurn(r);
    }
    expect(r.log.some((l) => l.includes("curses"))).toBe(true);
    expect(r.log.some((l) => l.includes("Guard"))).toBe(true);
    expect(r.log.some((l) => l.includes("Mirror spores"))).toBe(true);
  });
  it("healer restores allies at most twice per room", () => {
    let r = nextRoom(clear(nextRoom(clear(start()))));
    for (let i = 0; i < 3; i++) {
      r.enemies[0]!.hp = 30;
      r.order = ["pip", "e1", "miso", "clover", "e0", "e2"];
      r.turn = 0;
      r.round = 1;
      r = endTurn(r);
    }
    expect(r.roomUses["e1:heal"]).toBe(2);
    expect(r.log.filter((l) => l.includes("Royal wisp heals"))).toHaveLength(2);
  });
});

describe("revival, inspiration and safe targeting regressions", () => {
  it.each([1, 2])(
    "revives %i fallen cats at rounded-up25percent after a clear without extra8HP",
    (fallen) => {
      let r = start();
      const live = r.party[0]!;
      live.hp -= 12;
      for (let i = 1; i <= fallen; i++) {
        const c = r.party[i]!;
        c.hp = 0;
        c.guard = 6;
        c.guardTurns = 2;
        c.fury = 2;
        c.furyTurns = 3;
        c.curse = 2;
        c.curseTurns = 2;
      }
      r.tauntId = r.party[1]!.id;
      r = clear(r);
      expect(r.party[0]!.hp).toBe(live.maxHp - 4);
      for (let i = 1; i <= fallen; i++) {
        const c = r.party[i]!;
        expect(c.hp).toBe(Math.ceil(c.maxHp / 4));
        expect(
          c.guard +
            c.fury +
            c.curse +
            c.guardTurns +
            c.furyTurns +
            c.curseTurns,
        ).toBe(0);
      }
      expect(r.tauntId).toBeUndefined();
      const already = r.party.map((c) => c.hp);
      expect(act(r, "strike", "e0")).toBe(r);
      // The faster bat may act immediately on entry; nobody receives a second recovery.
      const entered = nextRoom(r);
      entered.party.forEach((c, i) =>
        expect(c.hp).toBeLessThanOrEqual(already[i]!),
      );
    },
  );
  it("fully heals after the final boss but never resurrects a full party wipe", () => {
    let r = start();
    r.room = 2;
    r.party[1]!.hp = 0;
    r = clear(r);
    expect(r.status).toBe("victory");
    expect(r.party.every((cat) => cat.hp === cat.maxHp)).toBe(true);
    let wiped = start();
    wiped.party.forEach((c) => (c.hp = 0));
    wiped = endTurn(wiped);
    expect(wiped.status).toBe("defeat");
    expect(wiped.party.every((c) => c.hp === 0)).toBe(true);
  });
  it("Inspired improves actual healing and shields and cannot boost itself or Moonwell", () => {
    let r = trained("clover");
    r.party[0]!.fury = 2;
    r.party[0]!.furyTurns = 3;
    r.party[1]!.hp -= 15;
    const before = r.party[1]!.hp;
    const healing = r.party[0]!.abilities.find((a) => a.id === "heal")!;
    expect(abilityPower(r, r.party[0]!, healing)).toBe(10);
    r = act(r, "heal", r.party[1]!.id);
    expect(r.party[1]!.hp).toBe(before + 10);
    r = turn(r, "miso");
    const tank = r.party.find((c) => c.id === "miso")!;
    tank.fury = 2;
    tank.furyTurns = 3;
    const guard = tank.abilities.find((a) => a.id === "guard")!;
    expect(abilityPower(r, tank, guard)).toBe(8);
    const mage = trained("luna");
    const luna = mage.party[0]!;
    luna.fury = 2;
    luna.furyTurns = 3;
    expect(
      abilityPower(
        mage,
        luna,
        luna.abilities.find((a) => a.id === "fury")!,
      ),
    ).toBe(2);
    expect(
      abilityPower(
        mage,
        luna,
        luna.abilities.find((a) => a.id === "surge")!,
      ),
    ).toBe(2);
  });
  it("blocks full-duration blessings with no AP or usage cost until target duration decreases", () => {
    let r = turn(
      createRun(initialProgress(), ["luna", "miso", "clover"]),
      "luna",
    );
    r = act(r, "fury", "miso");
    const ability = r.party[0]!.abilities.find((a) => a.id === "fury")!;
    expect(abilityTargetUnavailableReason(r, ability, "miso")).toContain(
      "full duration",
    );
    expect(act(r, "fury", "miso")).toBe(r);
    expect(r.ap).toBe(4);
    expect(abilityUses(r, "fury")).toBe(1);
    const tank = r.party[1]!;
    tank.furyTurns = 2;
    const refreshed = act(r, "fury", "miso");
    expect(refreshed).not.toBe(r);
    expect(refreshed.party[1]!.furyTurns).toBe(3);
    expect(refreshed.party[1]!.fury).toBe(2);
  });
  it("rejects full-duration Guard, then permits full strength and duration refresh", () => {
    let r = turn(start(), "miso");
    r = act(r, "guard", "pip");
    const target = r.party.find((c) => c.id === "pip")!;
    target.guard = 2;
    expect(act(r, "guard", "pip")).toBe(r);
    target.guardTurns = 1;
    r = act(r, "guard", "pip");
    expect(r.party.find((c) => c.id === "pip")!.guard).toBe(6);
    expect(r.party.find((c) => c.id === "pip")!.guardTurns).toBe(2);
  });
  it("prevents full-HP single and area healing without spending resources, while injured allies remain legal", () => {
    const r = trained("clover");
    expect(act(r, "heal", "clover")).toBe(r);
    expect(act(r, "renewal", "clover")).toBe(r);
    r.party[1]!.hp--;
    expect(act(r, "renewal", "clover")).not.toBe(r);
    expect(act(r, "heal", r.party[1]!.id)).not.toBe(r);
    expect(act(r, "heal", "e0")).toBe(r);
  });
  it("a6power spell kills an enemy on1of37HP with2armor and no shield", () => {
    let r = turn(
      createRun(initialProgress(), ["luna", "miso", "clover"]),
      "luna",
    );
    const actor = r.party[0]!;
    actor.abilities[0]!.power = 6;
    const foe = r.enemies[0]!;
    foe.maxHp = 37;
    foe.hp = 1;
    foe.armor = 2;
    foe.guard = 0;
    expect(damagePreview(r, actor, actor.abilities[0]!, foe)).toEqual({
      power: 6,
      armor: 2,
      blocked: 0,
      iceBlocked: 0,
      reactiveHealing: 0,
      damage: 1,
      remainingHp: 0,
    });
    r = act(r, "strike", "e0");
    expect(r.enemies[0]!.hp).toBe(0);
    expect(r.log.at(-1)).toContain(
      "1 damage (6 attack power, 2 armor, 0 Guard blocked, 0 Ice Ward blocked; 0/37 HP)",
    );
  });
  it("correctly displays a surviving1HP enemy when Guard absorbs the spell after armor", () => {
    let r = start();
    const actor = r.party[0]!;
    actor.abilities[0]!.power = 6;
    const foe = r.enemies[0]!;
    foe.maxHp = 37;
    foe.hp = 1;
    foe.armor = 2;
    foe.guard = 6;
    foe.guardTurns = 2;
    const preview = damagePreview(r, actor, actor.abilities[0]!, foe);
    expect(preview).toEqual({
      power: 6,
      armor: 2,
      blocked: 4,
      iceBlocked: 0,
      reactiveHealing: 0,
      damage: 0,
      remainingHp: 1,
    });
    r = act(r, "strike", "e0");
    expect(r.enemies[0]!.hp).toBe(preview.remainingHp);
    expect(r.enemies[0]!.guard).toBe(2);
    expect(r.log.at(-1)).toContain(
      "0 damage (6 attack power, 2 armor, 4 Guard blocked, 0 Ice Ward blocked; 1/37 HP)",
    );
  });
});

describe("owner-start clocks, automatic exhaustion and expedition recovery", () => {
  it.each(["miso", "pip"])(
    "Guard on %s lasts its next two starts and ignores unrelated End turns",
    (targetId) => {
      let r = turn(start(), "miso");
      r = act(r, "guard", targetId);
      const otherId = targetId === "miso" ? "pip" : "miso";
      r.order = [otherId, "clover", targetId];
      r.turn = 0;
      r = endTurn(r);
      expect(currentUnit(r)?.id).toBe("clover");
      expect(r.party.find((c) => c.id === targetId)!.guardTurns).toBe(2);
      r = endTurn(r);
      expect(currentUnit(r)?.id).toBe(targetId);
      expect(r.party.find((c) => c.id === targetId)!.guardTurns).toBe(1);
      expect(r.party.find((c) => c.id === targetId)!.guard).toBe(6);
      // Completing the affected turn itself does not consume another duration.
      r.order = [targetId, otherId, "clover"];
      r.turn = 0;
      r = endTurn(r);
      expect(r.party.find((c) => c.id === targetId)!.guardTurns).toBe(1);
      r.party.find((c) => c.id === targetId)!.initiative = 100;
      r = endTurn(endTurn(r));
      expect(currentUnit(r)?.id).toBe(targetId);
      expect(r.party.find((c) => c.id === targetId)!.guardTurns).toBe(0);
      expect(r.party.find((c) => c.id === targetId)!.guard).toBe(0);
    },
  );
  it("reflected protection expires only at its affected unit start", () => {
    let r = turn(start(), "pip");
    r.party[0]!.reflect = 2;
    r.party[0]!.reflectTurns = 1;
    r.order = ["pip", "miso", "clover"];
    r = endTurn(r);
    expect(r.party[0]!.reflectTurns).toBe(1);
    r = endTurn(endTurn(r));
    expect(currentUnit(r)?.id).toBe("pip");
    expect(r.party[0]!.reflect).toBe(0);
  });
  it.each([6, 8])(
    "spending the final AP skips exhausted cats, resolves enemies and refills %i AP",
    (capacity) => {
      let r = start();
      r.maxAp = capacity;
      r.ap = 1;
      r.enemies.forEach((foe) => (foe.hp = foe.maxHp = 500));
      r = act(r, "strike", "e0");
      expect(r.round).toBe(2);
      expect(r.ap).toBe(capacity);
      expect(currentUnit(r)?.id).toBe("pip");
      expect(r.log.some((line) => line.includes("automatically passes"))).toBe(
        true,
      );
      expect(r.log.some((line) => line.includes("Crypt rat hits"))).toBe(true);
    },
  );
  it("exhausted auto-passes end Taunt only when Miso next starts", () => {
    let r = trained("miso");
    r.order = ["miso", "pip", "e0", "clover", "e1"];
    r = act(r, "taunt", "miso");
    r.ap = 1;
    r.enemies[0]!.hp = 500;
    const tankBefore = r.party[0]!.hp;
    r = act(r, "strike", "e0");
    expect(r.party[0]!.hp).toBeLessThan(tankBefore);
    // The new round starts with Pip; Miso's taunt remains until his own start.
    expect(currentUnit(r)?.id).toBe("pip");
    expect(r.tauntId).toBe("miso");
    r = endTurn(r);
    expect(currentUnit(r)?.id).toBe("miso");
    expect(r.tauntId).toBeUndefined();
  });
  it("victory fully heals survivors and fallen cats, clears effects and starts the next run healthy", () => {
    let r = start();
    r.room = 2;
    r.party.forEach((c, i) => {
      c.hp = i === 0 ? 1 : 0;
      c.guard =
        c.guardTurns =
        c.fury =
        c.furyTurns =
        c.curse =
        c.curseTurns =
        c.reflect =
        c.reflectTurns =
          2;
    });
    r.tauntId = "miso";
    r = clear(r);
    expect(r.status).toBe("victory");
    for (const cat of r.party) {
      expect(cat.hp).toBe(cat.maxHp);
      expect(
        cat.guard +
          cat.guardTurns +
          cat.fury +
          cat.furyTurns +
          cat.curse +
          cat.curseTurns +
          cat.reflect +
          cat.reflectTurns,
      ).toBe(0);
    }
    expect(r.tauntId).toBeUndefined();
    const progress = claimRewards(initialProgress(), r);
    const next = createRun(progress, ["pip", "miso", "clover"]);
    expect(next.party.every((c) => c.hp === c.maxHp)).toBe(true);
  });
});

describe("revival choices, cooldown timing and trained passives", () => {
  function onlyOwnTurns(run: Run, id: string) {
    run.party.find((c) => c.id === id)!.initiative = 100;
    run.order = [id];
    run.turn = 0;
    return endTurn(run);
  }
  it("only Mei's revive skips the next two own turns while healing stays available", () => {
    let r = trained("clover");
    const mei = r.party.find((c) => c.id === "clover")!;
    expect(mei.abilities.map((a) => a.id)).toContain("revive");
    const fallen = r.party.find((c) => c.id !== "clover")!;
    fallen.hp = 0;
    r.party[2]!.hp -= 10;
    r = act(r, "revive", fallen.id);
    const restored = r.party.find((c) => c.id === fallen.id)!;
    expect(restored.hp).toBe(Math.ceil(restored.maxHp * 0.6));
    expect(r.ap).toBe(3);
    expect(cooldownRemaining(r.party[0]!, REVIVE_ABILITY)).toBe(3);
    const heal = r.party[0]!.abilities.find((a) => a.id === "renewal")!;
    const singleHeal = r.party[0]!.abilities.find((a) => a.id === "heal")!;
    expect(heal.cooldownTurns).toBeUndefined();
    expect(abilityUnavailableReason(r, heal)).toBeUndefined();
    expect(act(r, "renewal", "clover")).not.toBe(r);
    expect(act(r, "heal", r.party[2]!.id)).not.toBe(r);
    r = onlyOwnTurns(r, "clover");
    expect(cooldownRemaining(r.party[0]!, REVIVE_ABILITY)).toBe(2);
    expect(abilityUnavailableReason(r, REVIVE_ABILITY)).toContain("Cooldown");
    expect(abilityUnavailableReason(r, heal)).toBeUndefined();
    expect(abilityUnavailableReason(r, singleHeal)).toBeUndefined();
    r = onlyOwnTurns(r, "clover");
    expect(cooldownRemaining(r.party[0]!, REVIVE_ABILITY)).toBe(1);
    expect(abilityUnavailableReason(r, REVIVE_ABILITY)).toContain("Cooldown");
    expect(abilityUnavailableReason(r, heal)).toBeUndefined();
    r = onlyOwnTurns(r, "clover");
    expect(cooldownRemaining(r.party[0]!, REVIVE_ABILITY)).toBe(0);
    expect(abilityUnavailableReason(r, REVIVE_ABILITY)).toBeUndefined();
  });
  it("revival rejects living allies and enemies without consuming AP and joins revived allies next round", () => {
    let r = trained("clover");
    expect(act(r, "revive", "clover")).toBe(r);
    expect(act(r, "revive", "e0")).toBe(r);
    const fallen = r.party.find((c) => c.id !== "clover")!;
    fallen.hp = 0;
    fallen.curse = 2;
    fallen.curseTurns = 2;
    fallen.cooldowns.strike = 2;
    r.order = ["clover", fallen.id, ...r.enemies.map((e) => e.id)];
    r.turn = 0;
    r = act(r, "revive", fallen.id);
    expect(r.order).not.toContain(fallen.id);
    const revived = r.party.find((c) => c.id === fallen.id)!;
    expect(revived.curse).toBe(0);
    expect(revived.cooldowns.strike).toBe(2);
  });
  it("party healing has no cross-turn cooldown, does not block revive, and room entry resets revive cooldown", () => {
    let r = trained("clover");
    r.party[1]!.hp -= 20;
    r = act(r, "renewal", "clover");
    expect(abilityUnavailableReason(r, REVIVE_ABILITY)).toBeUndefined();
    expect(r.party[0]!.cooldowns).toEqual({});
    expect(act(r, "renewal", "clover")).toBe(r); // once-per-own-turn limit remains
    r = onlyOwnTurns(r, "clover");
    expect(act(r, "renewal", "clover")).not.toBe(r);
    r.party[0]!.cooldowns.revive = 3;
    r = nextRoom(clear(r));
    expect(r.party.find((c) => c.id === "clover")!.cooldowns).toEqual({});
  });
  it("Ember Claw strike never has a cooldown and Flame paw waits two own turns", () => {
    let r = trained("ember");
    r.enemies.forEach((e) => (e.hp = e.maxHp = 100));
    const claw = r.party[0]!.abilities[0]!;
    const slam = r.party[0]!.abilities.find((a) => a.id === "slam")!;
    expect(claw.id).toBe("strike");
    expect(claw.cooldownTurns).toBeUndefined();
    r = act(r, "strike", "e0");
    expect(cooldownRemaining(r.party[0]!, claw)).toBe(0);
    expect(abilityUnavailableReason(r, claw)).toBeUndefined();
    r = act(r, "strike", "e0");
    expect(abilityUnavailableReason(r, claw)).toBeUndefined();
    r = onlyOwnTurns(r, "ember");
    expect(abilityUnavailableReason(r, claw)).toBeUndefined();
    r = act(r, "slam", "e0");
    expect(cooldownRemaining(r.party[0]!, slam)).toBe(3);
    expect(abilityUnavailableReason(r, claw)).toBeUndefined();
  });
  it("Ember Flame paw is blocked for two own turns and returns on the third", () => {
    let r = trained("ember");
    r.enemies.forEach((e) => (e.hp = e.maxHp = 100));
    const slam = r.party[0]!.abilities.find((a) => a.id === "slam")!;
    r = act(r, "slam", "e0");
    expect(cooldownRemaining(r.party[0]!, slam)).toBe(3);
    r = onlyOwnTurns(r, "ember");
    expect(abilityUnavailableReason(r, slam)).toContain("Cooldown");
    expect(act(r, "slam", "e0")).toBe(r);
    r = onlyOwnTurns(r, "ember");
    expect(abilityUnavailableReason(r, slam)).toContain("Cooldown");
    r = onlyOwnTurns(r, "ember");
    expect(abilityUnavailableReason(r, slam)).toBeUndefined();
    expect(act(r, "slam", "e0")).not.toBe(r);
  });
  it("Ember Sweeping embers keeps its own one-turn cooldown", () => {
    let r = trained("ember");
    r.enemies.forEach((e) => (e.hp = e.maxHp = 100));
    const cleave = r.party[0]!.abilities.find((a) => a.id === "cleave")!;
    r = act(r, "cleave", "ember");
    expect(cooldownRemaining(r.party[0]!, cleave)).toBe(2);
    r = onlyOwnTurns(r, "ember");
    expect(abilityUnavailableReason(r, cleave)).toContain("Cooldown");
    r = onlyOwnTurns(r, "ember");
    expect(abilityUnavailableReason(r, cleave)).toBeUndefined();
  });
  it("Flame paw out-damages spamming Claw strike for the same AP", () => {
    const flame = CATS.find((c) => c.id === "ember")!.abilities;
    const claw = flame[0]!;
    const slam = flame[1]!;
    expect(slam.power / slam.cost).toBeGreaterThan(claw.power / claw.cost);
  });
  it("mastery improves native heal, Guard and blessing without changing revive percentage or AP", () => {
    const p = {
      ...initialProgress(),
      xp: 450,
      catLevels: { clover: 3, luna: 3 },
    };
    expect(
      buildCat(p, "clover").abilities.find((a) => a.id === "heal")!.power,
    ).toBe(9);
    expect(
      buildCat(p, "miso").abilities.find((a) => a.id === "guard")!.power,
    ).toBe(7);
    expect(
      buildCat(p, "luna").abilities.find((a) => a.id === "fury")!.power,
    ).toBe(3);
    expect(
      buildCat(p, "clover").abilities.find((a) => a.id === "revive")!.power,
    ).toBe(60);
    expect(
      buildCat(p, "luna").abilities.find((a) => a.id === "surge")!.power,
    ).toBe(2);
  });
  it("Miso and Ember start every room with their trained shield", () => {
    const p = { ...initialProgress(), catLevels: { miso: 5, ember: 8 } };
    let r = createRun(p, ["pip", "miso", "ember"]);
    expect(r.party.find((c) => c.id === "miso")!.guard).toBe(4);
    expect(r.party.find((c) => c.id === "ember")!.guard).toBe(5);
    r.party.find((c) => c.id === "miso")!.guard = 0;
    r = nextRoom(clear(r));
    expect(r.party.find((c) => c.id === "miso")!.guard).toBe(4);
  });
  it("Ice Ward reduces the next qualifying attacks and consumes charges once per attack", () => {
    let r = createRun({ ...initialProgress(), catLevels: { luna: 5 } }, [
      "pip",
      "luna",
      "miso",
    ]);
    const luna = r.party.find((c) => c.id === "luna")!;
    luna.hp = 10;
    r.order = ["pip", "e0", "luna", "miso", "e1"];
    r.turn = 0;
    r = endTurn(r);
    const after = r.party.find((c) => c.id === "luna")!;
    expect(after.hp).toBe(7);
    expect(after.iceCharges).toBe(2);
    expect(r.log.some((line) => line.includes("2 Ice Ward blocked"))).toBe(
      true,
    );
  });
  it("Mei's reactive healing is capped by charges and never revives from lethal damage", () => {
    let r = createRun({ ...initialProgress(), catLevels: { clover: 5 } }, [
      "pip",
      "clover",
      "miso",
    ]);
    r.party.find((c) => c.id === "clover")!.hp = 10;
    r.order = ["pip", "e0", "clover", "miso", "e1"];
    r.turn = 0;
    r = endTurn(r);
    const mei = r.party.find((c) => c.id === "clover")!;
    expect(mei.hp).toBe(7);
    expect(mei.reactiveHealCharges).toBe(2);
    mei.hp = 1;
    r.order = ["pip", "e0", "clover", "miso", "e1"];
    r.turn = 0;
    r = endTurn(r);
    expect(r.party.find((c) => c.id === "clover")!.hp).toBe(0);
  });
  it("Pip's opening bonus applies to one damaging cast and resets per room", () => {
    let r = createRun({ ...initialProgress(), catLevels: { pip: 5 } }, [
      "pip",
      "miso",
      "clover",
    ]);
    const power = abilityPower(r, r.party[0]!, r.party[0]!.abilities[0]!);
    expect(power).toBe(7);
    r = act(r, "strike", "e0");
    expect(r.party[0]!.openingAttack).toBe(0);
    expect(abilityPower(r, r.party[0]!, r.party[0]!.abilities[0]!)).toBe(5);
    r = nextRoom(clear(r));
    expect(r.party.find((c) => c.id === "pip")!.openingAttack).toBe(2);
  });
});

describe("reactive passive preview consistency", () => {
  it("predicts final HP including a surviving target's reactive heal", () => {
    let r = start();
    const target = r.enemies[0]!;
    target.hp = 10;
    target.reactiveHeal = 2;
    target.reactiveHealCharges = 1;
    const preview = damagePreview(
      r,
      r.party[0]!,
      r.party[0]!.abilities[0]!,
      target,
    );
    expect(preview.damage).toBe(4);
    expect(preview.reactiveHealing).toBe(2);
    expect(preview.remainingHp).toBe(8);
    r = act(r, "strike", target.id);
    expect(r.enemies[0]!.hp).toBe(preview.remainingHp);
    expect(r.enemies[0]!.reactiveHealCharges).toBe(0);
  });
});
