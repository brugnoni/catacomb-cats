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
  enemyIntent,
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
import { EXPEDITION_REWARD, ROOM_HEAL } from "./progression";
/** Healing a surviving cat gets when a room is cleared. */
const roomHeal = (maxHp: number) =>
  Math.max(ROOM_HEAL.flat, Math.ceil((maxHp * ROOM_HEAL.percent) / 100));
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
    expect(next.enemies[0]!.hp).toBe(27);
    expect(r.enemies[0]!.hp).toBe(31);
    expect(currentUnit(endTurn(next))?.id).toBe("miso");
  });
  it("invalid actions never mutate or spend AP", () => {
    const r = start();
    expect(act(r, "strike", "pip")).toBe(r);
    expect(act(r, "bad", "e0")).toBe(r);
    r.ap = 1;
    expect(act(r, "line", "e0")).toBe(r);
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
    let r = turn(start(), "clover");
    r.party.find((c) => c.id === "miso")!.hp = 1;
    r = act(act(r, "heal", "miso"), "heal", "miso");
    expect(r.ap).toBe(2);
    expect(
      abilityLimit(r.party.find((c) => c.id === "clover")!.abilities[1]!),
    ).toBe(2);
    expect(act(r, "heal", "miso")).toBe(r);
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
    expect(r.gold).toBe(40);
    expect(r.xp).toBe(30);
    expect(r.bonus).toBe(1);
    expect(r.party[0]!.hp).toBe(
      r.party[0]!.maxHp - 12 + roomHeal(r.party[0]!.maxHp),
    );
    expect(act(r, "strike", "e0")).toBe(r);
    r = nextRoom(r);
    expect(r.bonus).toBe(1);
    expect(r.maxAp).toBe(6);
    r = clear(r);
    r = clear(nextRoom(r));
    expect(r.status).toBe("victory");
    expect(r.items).toEqual(["Iron bell", "Silk ribbon", "Lucky fang"]);
    const p = claimRewards(initialProgress(), r);
    expect(p.gold).toBe(30 + EXPEDITION_REWARD.gold);
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
    expect(buildCat(p, "miso").maxHp).toBe(46);
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
    expect(buildCat(p, "miso").maxHp).toBe(56);
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
    const trained = {
      wins: 2,
      xp: 600,
      generalLevel: 8,
      catLevels: { miso: 8, pip: 8, clover: 8 },
    };
    const harder = createRun({ ...p, ...trained }, ["pip", "miso", "clover"]);
    expect(harder.difficulty.tier).toBeGreaterThan(first.difficulty.tier);
    expect(harder.enemies[0]!.maxHp).toBeGreaterThan(first.enemies[0]!.maxHp);
    expect(harder.enemies.length).toBe(3);
    expect(
      createRun({ ...p, ...trained, xp: 99999 }, ["pip", "miso", "clover"])
        .enemies,
    ).toHaveLength(3);
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
    expect(buildCat(q, "miso").maxHp).toBe(56);
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
    expect(r.party.find((u) => u.id === "pip")!.guard).toBe(8);
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
    expect(r.log.some((l) => l.includes("10 attack power"))).toBe(true);
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
      expect(r.party[0]!.hp).toBe(live.maxHp - 12 + roomHeal(live.maxHp));
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
    expect(abilityPower(r, tank, guard)).toBe(10);
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
    expect(r.party.find((c) => c.id === "pip")!.guard).toBe(8);
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
      expect(r.party.find((c) => c.id === targetId)!.guard).toBe(8);
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
  it("Ember Cinder jab never has a cooldown and Flame paw waits two own turns", () => {
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
  it("Flame paw out-damages spamming Cinder jab for the same AP", () => {
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
    ).toBe(9);
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
    expect(after.hp).toBe(4);
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
    expect(mei.hp).toBe(4);
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

describe("enemy marks and combat events", () => {
  const catIds = ["pip", "miso", "clover"];
  it("every living enemy starts marked on a living cat", () => {
    const r = start();
    for (const e of r.enemies) expect(catIds).toContain(e.mark);
  });
  it("marks are reproducible per seed and not always the same cat", () => {
    const marks = (seed: number) =>
      createRun(initialProgress(), catIds, seed).enemies.map((e) => e.mark);
    expect(marks(7)).toEqual(marks(7));
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++)
      for (const m of marks(seed)) seen.add(m!);
    expect(seen.size).toBe(3);
  });
  it("an enemy attacks the cat it marked, then marks a new living cat", () => {
    let r = start();
    expect(currentUnit(r)!.id).toBe("pip");
    r.enemies[0]!.mark = "clover";
    r = endTurn(r);
    expect(r.log.join(" ")).toContain("Crypt rat hits Mei");
    expect(catIds).toContain(r.enemies[0]!.mark);
  });
  it("re-rolls a mark whose cat has fallen instead of wasting the attack", () => {
    let r = start();
    r.party.find((c) => c.id === "clover")!.hp = 0;
    r.enemies[0]!.mark = "clover";
    r = endTurn(r);
    expect(r.log.join(" ")).toMatch(/Crypt rat hits (Pip|Miso)/);
  });
  it("reports the intent with the marked cat and no arrow for a dead mark", () => {
    const r = start();
    const rat = r.enemies[0]!;
    rat.mark = "miso";
    expect(enemyIntent(r, rat)).toMatchObject({
      kind: "attack",
      label: "Attack",
      targetId: "miso",
    });
    r.party.find((c) => c.id === "miso")!.hp = 0;
    expect(enemyIntent(r, rat)!.targetId).toBeUndefined();
    rat.hp = 0;
    expect(enemyIntent(r, rat)).toBeUndefined();
  });
  it("Taunt redirects the shown intent only for enemies acting before the taunt ends", () => {
    const r = start();
    r.tauntId = "miso";
    const rat = r.enemies[0]!;
    rat.mark = "clover";
    // Order: Pip (current), Crypt rat, Miso, Mei, Moss slime. The rat acts before Miso.
    expect(enemyIntent(r, rat)).toMatchObject({
      targetId: "miso",
      redirected: true,
    });
    // Miso now begins a turn before the rat acts, so Taunt will already be over.
    r.order = ["pip", "miso", "e0", "clover", "e1"];
    expect(enemyIntent(r, rat)).toMatchObject({ targetId: "clover" });
    expect(enemyIntent(r, rat)!.redirected).toBeUndefined();
  });
  it("support enemies show their ally instead of a hostile target", () => {
    const r = createRun(initialProgress(), catIds);
    const slime = r.enemies[1]!;
    r.round = 1;
    r.order = ["pip", "e0", "miso", "clover", "e1"];
    r.turn = 0;
    const intent = enemyIntent(r, slime)!;
    expect(intent.kind).toBe("inspire");
    expect(intent.allyId).toBe("e0");
    expect(intent.targetId).toBeUndefined();
  });
  it("records a hit event for each damaging blow and bumps the event id", () => {
    let r = start();
    expect(r.events).toEqual([]);
    const before = r.eventId;
    r = act(r, "strike", "e0");
    expect(r.eventId).toBe(before + 1);
    expect(r.events).toEqual([
      { type: "hit", targetId: "e0", damage: 4, absorbed: 0 },
    ]);
    r = endTurn(r);
    expect(r.eventId).toBe(before + 2);
    expect(r.events.every((e) => e.type === "hit")).toBe(true);
    expect(r.events.length).toBeGreaterThan(0);
  });
});

describe("Hearth blessing in combat", () => {
  const catIds = ["pip", "miso", "clover"];
  const withHearth = (generalLevel: number) => ({
    ...initialProgress(),
    generalLevel,
  });
  it("adds its stats to every cat and to damaging skills", () => {
    const base = createRun(withHearth(0), catIds);
    const rank2 = createRun(withHearth(2), catIds);
    base.party.forEach((cat, i) => {
      expect(rank2.party[i]!.maxHp).toBe(cat.maxHp + 2);
      expect(rank2.party[i]!.initiative).toBe(cat.initiative + 1);
      expect(rank2.party[i]!.abilities[0]!.power).toBe(
        cat.abilities[0]!.power + 1,
      );
    });
  });
  it("rank 5 also raises healing, Guard and Inspired power", () => {
    const base = createRun(withHearth(0), catIds);
    const r5 = createRun(withHearth(5), catIds);
    const power = (run: Run, catId: string, effect: string) =>
      run.party
        .find((c) => c.id === catId)!
        .abilities.find((a) => a.effect === effect)!.power;
    expect(power(r5, "clover", "heal")).toBe(power(base, "clover", "heal") + 1);
    expect(power(r5, "miso", "guard")).toBe(power(base, "miso", "guard") + 1);
  });
  it("rank 8 gives +1 AP only in the first round of each room", () => {
    let r = createRun(withHearth(8), catIds);
    expect(r.ap).toBe(7);
    expect(r.maxAp).toBe(6);
    r = clear(r);
    r = nextRoom(r);
    expect(r.ap).toBe(7);
    expect(createRun(withHearth(7), catIds).ap).toBe(6);
  });
  it("Second Wind raises the first fallen cat once per expedition", () => {
    let r = createRun(withHearth(3), catIds);
    const mei = r.party.find((c) => c.id === "clover")!;
    mei.hp = 1;
    r.enemies[0]!.mark = "clover";
    r = endTurn(r);
    const risen = r.party.find((c) => c.id === "clover")!;
    expect(risen.hp).toBe(Math.ceil(risen.maxHp * 0.4));
    expect(r.secondWind).toBe(0);
    expect(r.log.join(" ")).toContain("Second Wind!");
    risen.hp = 1;
    r.enemies.forEach((e) => (e.mark = "clover"));
    for (let i = 0; i < 6 && risen.hp > 0; i++) r = endTurn(r);
    expect(r.party.find((c) => c.id === "clover")!.hp).toBe(0);
  });
  it("Second Wind restores 60 percent from rank 7", () => {
    let r = createRun(withHearth(7), catIds);
    r.party.find((c) => c.id === "clover")!.hp = 1;
    r.enemies[0]!.mark = "clover";
    r = endTurn(r);
    const risen = r.party.find((c) => c.id === "clover")!;
    expect(risen.hp).toBe(Math.ceil(risen.maxHp * 0.6));
  });
  it("Second Wind prevents defeat when the last cat falls", () => {
    let r = createRun(withHearth(3), catIds);
    for (const cat of r.party) if (cat.id !== "clover") cat.hp = 0;
    r.party.find((c) => c.id === "clover")!.hp = 1;
    r.enemies[0]!.mark = "clover";
    r = endTurn(r);
    expect(r.status).toBe("combat");
    expect(r.party.find((c) => c.id === "clover")!.hp).toBeGreaterThan(0);
  });
  it("without Hearth rank 3 a fallen cat stays down", () => {
    let r = createRun(withHearth(2), catIds);
    r.party.find((c) => c.id === "clover")!.hp = 1;
    r.enemies[0]!.mark = "clover";
    r = endTurn(r);
    expect(r.party.find((c) => c.id === "clover")!.hp).toBe(0);
  });
});

describe("automatic pass when no skill is usable", () => {
  it("passes Ember's turn after three Cinder jabs leave 1 AP and nothing else fits", () => {
    let r = trained("ember");
    r.enemies.forEach((e) => (e.hp = e.maxHp = 200));
    r.ap = 4;
    r = act(r, "strike", "e0");
    r = act(r, "strike", "e0");
    expect(currentUnit(r)!.id).toBe("ember");
    expect(r.ap).toBe(2);
    r = act(r, "strike", "e0");
    // The third use hits the per-turn limit; 1 AP remain but Flame paw and
    // Sweeping embers cost 3, so the turn ends on its own.
    expect(currentUnit(r)!.id).not.toBe("ember");
    expect(r.log.join(" ")).toContain("Ember has no usable skills left");
  });
  it("keeps the turn while any skill is still usable", () => {
    let r = trained("ember");
    r.enemies.forEach((e) => (e.hp = e.maxHp = 200));
    r = act(r, "strike", "e0");
    r = act(r, "strike", "e0");
    r = act(r, "strike", "e0");
    // 3 AP remain: Flame paw is usable, so Ember keeps acting.
    expect(currentUnit(r)!.id).toBe("ember");
    expect(r.ap).toBe(3);
  });
});

describe("piercing attacks ignore every defense", () => {
  const needleOf = (r: Run) =>
    r.party[0]!.abilities.find((a) => a.id === "pierce")!;
  it("deals its full power through armor, Guard and Ice Ward", () => {
    let r = trained("pip");
    const foe = r.enemies[0]!;
    foe.hp = foe.maxHp = 100;
    foe.armor = 2;
    foe.guard = 6;
    foe.guardTurns = 2;
    foe.iceArmor = 2;
    foe.iceCharges = 3;
    const needle = needleOf(r);
    const power = abilityPower(r, r.party[0]!, needle);
    expect(damagePreview(r, r.party[0]!, needle, foe)).toMatchObject({
      armor: 0,
      blocked: 0,
      iceBlocked: 0,
      damage: power,
    });
    r = act(r, "pierce", "e0");
    expect(r.enemies[0]!.hp).toBe(100 - power);
    // Nothing was spent: the shield and the Ice Ward charges are untouched.
    expect(r.enemies[0]!.guard).toBe(6);
    expect(r.enemies[0]!.iceCharges).toBe(3);
    expect(r.log.join(" ")).toContain(
      `${power} damage (${power} attack power, 0 armor, 0 Guard blocked, 0 Ice Ward blocked`,
    );
  });
  it("reported case: a 40 HP enemy with 2 armor takes the whole hit", () => {
    let r = trained("pip");
    const foe = r.enemies[0]!;
    foe.hp = foe.maxHp = 40;
    foe.armor = 2;
    const power = abilityPower(r, r.party[0]!, needleOf(r));
    r = act(r, "pierce", "e0");
    expect(r.enemies[0]!.hp).toBe(40 - power);
  });
  it("a regular attack on the same defended target is still mitigated", () => {
    const r = trained("pip");
    const foe = r.enemies[0]!;
    foe.hp = foe.maxHp = 100;
    foe.armor = 2;
    foe.guard = 6;
    const strike = r.party[0]!.abilities[0]!;
    const preview = damagePreview(r, r.party[0]!, strike, foe);
    expect(preview.armor).toBe(2);
    expect(preview.blocked).toBeGreaterThan(0);
    expect(preview.damage).toBeLessThan(strike.power);
  });
  it("preview and resolution agree for every defense mix", () => {
    for (const [armor, guard, charges] of [
      [0, 0, 0],
      [2, 0, 0],
      [0, 6, 0],
      [3, 4, 2],
    ] as const) {
      let r = trained("pip");
      const foe = r.enemies[0]!;
      foe.hp = foe.maxHp = 100;
      foe.armor = armor;
      foe.guard = guard;
      foe.guardTurns = guard ? 2 : 0;
      foe.iceArmor = 2;
      foe.iceCharges = charges;
      const needle = needleOf(r);
      const expected = damagePreview(r, r.party[0]!, needle, foe).damage;
      r = act(r, "pierce", "e0");
      expect(100 - r.enemies[0]!.hp).toBe(expected);
    }
  });
});

describe("Dagger line", () => {
  const withThreeFoes = () => {
    const r = start();
    const extra = structuredClone(r.enemies[0]!);
    extra.id = "e2";
    extra.name = "Cave bat";
    r.enemies.push(extra);
    r.enemies.forEach((e) => {
      e.hp = e.maxHp = 500;
      e.armor = 0;
      e.guard = 0;
    });
    return r;
  };
  it("hits the target fully, the one behind it for half and the next for 35%", () => {
    let r = withThreeFoes();
    const line = r.party[0]!.abilities.find((a) => a.id === "line")!;
    const power = abilityPower(r, r.party[0]!, line);
    r = act(r, "line", "e0");
    expect(500 - r.enemies[0]!.hp).toBe(power);
    expect(500 - r.enemies[1]!.hp).toBe(Math.round(power * 0.5));
    expect(500 - r.enemies[2]!.hp).toBe(Math.round(power * 0.35));
  });
  it("only reaches the enemies behind the target, never the ones in front", () => {
    let r = withThreeFoes();
    r = act(r, "line", "e1");
    expect(r.enemies[0]!.hp).toBe(500);
    expect(r.enemies[1]!.hp).toBeLessThan(500);
    expect(r.enemies[2]!.hp).toBeLessThan(500);
    const last = withThreeFoes();
    const hit = act(last, "line", "e2");
    expect(hit.enemies[0]!.hp).toBe(500);
    expect(hit.enemies[1]!.hp).toBe(500);
    expect(hit.enemies[2]!.hp).toBeLessThan(500);
  });
  it("skips fallen enemies when counting who is behind", () => {
    let r = withThreeFoes();
    r.enemies[1]!.hp = 0;
    r = act(r, "line", "e0");
    expect(r.enemies[1]!.hp).toBe(0);
    expect(r.enemies[2]!.hp).toBeLessThan(500);
  });
  it("armor still reduces each hit of the line", () => {
    let r = withThreeFoes();
    r.enemies[1]!.armor = 2;
    const power = abilityPower(
      r,
      r.party[0]!,
      r.party[0]!.abilities.find((a) => a.id === "line")!,
    );
    r = act(r, "line", "e0");
    expect(500 - r.enemies[1]!.hp).toBe(Math.round(power * 0.5) - 2);
  });
  it("is limited to one use per turn and then waits one own turn", () => {
    let r = withThreeFoes();
    const line = r.party[0]!.abilities.find((a) => a.id === "line")!;
    r = act(r, "line", "e0");
    expect(abilityUnavailableReason(r, line)).toBeDefined();
    expect(cooldownRemaining(r.party[0]!, line)).toBe(2);
    r = endTurn(r);
    // Pip's next turn: still cooling down.
    let guardTurns = 0;
    while (currentUnit(r)!.id !== "pip" && guardTurns++ < 12) r = endTurn(r);
    expect(abilityUnavailableReason(r, line)).toContain("Cooldown");
    r = endTurn(r);
    while (currentUnit(r)!.id !== "pip" && guardTurns++ < 24) r = endTurn(r);
    expect(abilityUnavailableReason(r, line)).toBeUndefined();
  });
});

describe("Taunt makes every enemy mark the taunting cat", () => {
  const tauntRun = (seed = 1) => {
    const p = { ...initialProgress(), catLevels: { miso: 3 } };
    const r = createRun(p, ["miso", "pip", "clover"], seed);
    r.enemies.forEach((e) => (e.hp = e.maxHp = 500));
    return turn(r, "miso");
  };
  it("marks Miso on every living enemy as soon as Taunt is cast", () => {
    let r = tauntRun();
    r = act(r, "taunt", "miso");
    expect(r.tauntId).toBe("miso");
    for (const enemy of r.enemies) expect(enemy.mark).toBe("miso");
    const rat = r.enemies[0]!;
    expect(enemyIntent(r, rat)).toMatchObject({
      kind: "attack",
      targetId: "miso",
    });
  });
  it("keeps the mark on Miso after each enemy acts while Taunt lasts", () => {
    let r = tauntRun();
    r = act(r, "taunt", "miso");
    r = endTurn(r);
    let checked = 0;
    for (let i = 0; i < 12 && r.status === "combat" && r.tauntId; i++) {
      for (const enemy of r.enemies.filter((e) => e.hp > 0))
        expect(enemy.mark).toBe("miso");
      checked++;
      r = endTurn(r);
    }
    expect(checked).toBeGreaterThan(0);
  });
  it("every enemy attack lands on Miso during Taunt", () => {
    let r = tauntRun();
    r = act(r, "taunt", "miso");
    const hits: string[] = [];
    for (let i = 0; i < 6 && r.tauntId; i++) {
      const before = r.log.length;
      r = endTurn(r);
      hits.push(
        ...r.log
          .slice(before)
          .filter((line) => /^(Crypt rat|Moss slime) hits /.test(line)),
      );
    }
    expect(hits.length).toBeGreaterThan(0);
    for (const line of hits) expect(line).toContain("hits Miso");
  });
  it("releases the marks when Taunt ends and rolls them again", () => {
    let nonMiso = 0;
    for (let seed = 1; seed <= 20; seed++) {
      let r = tauntRun(seed);
      r = act(r, "taunt", "miso");
      for (let i = 0; i < 12 && r.tauntId; i++) r = endTurn(r);
      expect(r.tauntId).toBeUndefined();
      if (r.enemies.some((e) => e.hp > 0 && e.mark !== "miso")) nonMiso++;
    }
    expect(nonMiso).toBeGreaterThan(0);
  });
  it("curses and support actions do not follow Taunt", () => {
    const r = tauntRun();
    r.tauntId = "miso";
    const imp = r.enemies[0]!;
    imp.name = "Spore imp";
    r.round = 1;
    r.party.find((c) => c.id === "pip")!.hp = 1;
    const intent = enemyIntent(r, imp)!;
    expect(intent.kind).toBe("curse");
    expect(intent.targetId).toBe("pip");
    expect(intent.redirected).toBeUndefined();
  });
});

describe("critical hits", () => {
  const party = ["pip", "miso", "clover"];
  it("are off in the engine unless requested", () => {
    const r = createRun(initialProgress(), party);
    expect(r.critChance).toBe(0);
    expect(r.enemyCritChance).toBe(0);
    const hit = act(r, "strike", "e0");
    expect(hit.events.every((e) => !e.crit)).toBe(true);
  });
  it("use 10 percent for everyone and add Hearth bonuses only for cats", () => {
    const base = createRun(initialProgress(), party, 1, { crit: "on" });
    expect(base.critChance).toBe(10);
    expect(base.enemyCritChance).toBe(10);
    for (const [rank, chance] of [
      [5, 10],
      [6, 15],
      [8, 20],
    ] as const) {
      const r = createRun(
        { ...initialProgress(), generalLevel: rank },
        party,
        1,
        {
          crit: "on",
        },
      );
      expect(r.critChance).toBe(chance);
      expect(r.enemyCritChance).toBe(10);
    }
  });
  it("only Hearth changes the chance, not mastery, training or equipment", () => {
    const rich: Progress = {
      ...initialProgress(),
      xp: 1500,
      catLevels: { pip: 8 },
      equipment: { pip: "Iron bell" },
    };
    expect(createRun(rich, party, 1, { crit: "on" }).critChance).toBe(10);
  });
  it("a critical hit deals 50 percent more, rounded up, before armor", () => {
    let r = createRun(initialProgress(), party, 1, { crit: 100 });
    r = act(r, "strike", "e0");
    expect(r.events[0]).toMatchObject({ type: "hit", crit: true, damage: 6 });
    expect(r.enemies[0]!.hp).toBe(31 - 6);
    expect(r.log.join(" ")).toContain(
      "Pip scores a critical hit on Crypt rat!",
    );
    let armored = createRun(initialProgress(), party, 1, { crit: 100 });
    armored.enemies[0]!.armor = 2;
    armored = act(armored, "strike", "e0");
    expect(armored.events[0]).toMatchObject({ crit: true, damage: 4 });
  });
  it("heals can be critical too", () => {
    let r = turn(
      createRun(initialProgress(), party, 1, { crit: 100 }),
      "clover",
    );
    r.party.find((c) => c.id === "miso")!.hp = 1;
    r = act(r, "heal", "miso");
    expect(r.events[0]).toMatchObject({ type: "heal", crit: true, amount: 11 });
    expect(r.party.find((c) => c.id === "miso")!.hp).toBe(12);
    expect(r.log.join(" ")).toContain("Mei lands a critical heal on Miso!");
  });
  it("enemy attacks can be critical", () => {
    let r = createRun(initialProgress(), party, 1, { crit: 100 });
    r = endTurn(r);
    const enemyHits = r.events.filter(
      (e) => e.type === "hit" && e.targetId !== "e0" && e.targetId !== "e1",
    );
    expect(enemyHits.length).toBeGreaterThan(0);
    expect(enemyHits.every((e) => e.crit)).toBe(true);
  });
  it("roll each target of an area attack separately", () => {
    const rates = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const p = { ...initialProgress(), catLevels: { ember: 3 } };
      let r = turn(
        createRun(p, ["ember", "pip", "miso"], seed, { crit: 50 }),
        "ember",
      );
      r.enemies.forEach((e) => (e.hp = e.maxHp = 500));
      r = act(r, "cleave", "ember");
      rates.add(r.events.filter((e) => e.crit).length);
    }
    // With 50 percent per target, sometimes none, one or both are critical.
    expect(rates.size).toBeGreaterThan(1);
  });
  it("happen about one time in ten over many hits", () => {
    let hits = 0;
    let crits = 0;
    for (let seed = 1; seed <= 400; seed++) {
      let r = createRun(initialProgress(), party, seed, { crit: "on" });
      r.enemies[0]!.hp = r.enemies[0]!.maxHp = 500;
      r = act(r, "strike", "e0");
      const own = r.events[0]!;
      hits++;
      if (own.crit) crits++;
    }
    expect(crits / hits).toBeGreaterThan(0.05);
    expect(crits / hits).toBeLessThan(0.17);
  });
  it("never change who the enemies mark", () => {
    const marks = (crit: "off" | "on") =>
      createRun(initialProgress(), party, 7, { crit }).enemies.map(
        (e) => e.mark,
      );
    expect(marks("on")).toEqual(marks("off"));
  });
});
