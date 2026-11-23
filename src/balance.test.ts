import { describe, expect, it } from "vitest";
import {
  act,
  abilityTargets,
  abilityUnavailableReason,
  buyUpgrade,
  createRun,
  damagePreview,
  currentUnit,
  endTurn,
  equip,
  initialProgress,
  nextRoom,
  type Ability,
  type Progress,
  type Run,
} from "./game";

/** Deliberately simple reproducible policy, not an optimal player or a win-rate model. */
function simulate(
  progress: Progress,
  party: string[],
  support: boolean,
  seed = 1,
) {
  let run = createRun(progress, party, seed);
  let decisions = 0;
  let revives = 0;
  const rounds: number[] = [];
  const roomHealth: string[][] = [];
  let lowestLivingCount = party.length;
  let preVictoryHealth: { name: string; hp: number; maxHp: number }[] = [];
  while (
    (run.status === "combat" || run.status === "reward") &&
    decisions++ < 2000
  ) {
    lowestLivingCount = Math.min(
      lowestLivingCount,
      run.party.filter((cat) => cat.hp > 0).length,
    );
    if (run.status === "reward") {
      roomHealth.push(
        run.party.map((cat) => `${cat.name} ${cat.hp}/${cat.maxHp}`),
      );
      rounds.push(run.round);
      run = nextRoom(run);
      continue;
    }
    const actor = currentUnit(run)!;
    const legal = actor.abilities.filter(
      (a) => !abilityUnavailableReason(run, a),
    );
    const allies = run.party.filter((a) => a.hp > 0);
    const enemies = run.enemies.filter((a) => a.hp > 0);
    const wounded = [...allies].sort(
      (a, b) => b.maxHp - b.hp - (a.maxHp - a.hp),
    )[0];
    let chosen: Ability | undefined;
    let target = "";
    if (support) {
      const fallen = run.party.find((cat) => cat.hp <= 0);
      chosen = legal.find(
        (a) =>
          a.effect === "revive" && fallen && abilityTargets(run, a, fallen.id),
      );
      if (chosen && fallen) target = fallen.id;
      if (!chosen)
        chosen = legal.find(
          (a) => a.effect === "ap" && abilityTargets(run, a, actor.id),
        );
      if (chosen && chosen.effect === "ap") target = actor.id;
      if (!chosen && wounded && wounded.maxHp - wounded.hp >= 6) {
        chosen =
          legal.find(
            (a) =>
              a.effect === "heal-all" &&
              abilityTargets(run, a, actor.id) &&
              allies.filter((c) => c.maxHp - c.hp >= 5).length >= 2,
          ) ??
          legal.find(
            (a) => a.effect === "heal" && abilityTargets(run, a, wounded.id),
          );
        if (chosen)
          target = chosen.effect === "heal-all" ? actor.id : wounded.id;
      }
      if (!chosen) {
        chosen = legal.find(
          (a) =>
            a.effect === "fury" &&
            allies.some(
              (c) => c.furyTurns === 0 && abilityTargets(run, a, c.id),
            ),
        );
        if (chosen)
          target = [...allies]
            .filter(
              (c) => c.furyTurns === 0 && abilityTargets(run, chosen!, c.id),
            )
            .sort((a, b) => b.abilities[0]!.power - a.abilities[0]!.power)[0]!
            .id;
      }
    }
    if (!chosen) {
      const attacks = legal.filter(
        (a) => !a.effect || a.effect === "cleave" || a.effect === "pierce",
      );
      let bestScore = -1;
      for (const ability of attacks)
        for (const enemy of [...enemies].sort((a, b) => a.hp - b.hp)) {
          const candidateTarget =
            ability.target === "all-enemies" ? actor.id : enemy.id;
          if (!abilityTargets(run, ability, candidateTarget)) continue;
          let dealt = damagePreview(run, actor, ability, enemy).damage;
          if (ability.effect === "cleave")
            dealt = enemies.reduce(
              (sum, targetEnemy) =>
                sum + damagePreview(run, actor, ability, targetEnemy).damage,
              0,
            );
          const score = dealt / ability.cost + (enemy.hp <= dealt ? 3 : 0);
          if (score > bestScore) {
            bestScore = score;
            chosen = ability;
            target = ability.target === "all-enemies" ? actor.id : enemy.id;
          }
        }
    }
    const after: Run = chosen ? act(run, chosen.id, target) : run;
    if (after !== run && chosen?.effect === "revive") revives++;
    const next = after === run ? endTurn(run) : after;
    if (next.status === "victory") {
      // Capture combat health before the finishing decision; the victory state is fully healed.
      preVictoryHealth = run.party.map(({ name, hp, maxHp }) => ({
        name,
        hp,
        maxHp,
      }));
    }
    run = next;
  }
  rounds.push(run.round);
  roomHealth.push(run.party.map((cat) => `${cat.name} ${cat.hp}/${cat.maxHp}`));
  if (process.env.BALANCE_REPORT === "1") {
    console.log(
      JSON.stringify({
        party,
        support,
        tier: run.difficulty.tier,
        outcome: run.status,
        rounds,
        decisions,
        revives,
        lowestLivingCount,
        preVictoryHealth,
        finalHealth: run.party.map(({ name, hp, maxHp }) => ({
          name,
          hp,
          maxHp,
        })),
      }),
    );
  }
  return {
    run,
    rounds,
    decisions,
    revives,
    roomHealth,
    lowestLivingCount,
    preVictoryHealth,
  };
}

describe("deterministic balance scenarios", () => {
  it("revives cats between rooms, fully heals victory parties and preserves combat-health measurements", () => {
    const progress = initialProgress();
    const party = ["miso", "luna", "clover"];
    // Enemy marks are random, so use the first seed where a cat does fall.
    const seed = Array.from({ length: 40 }, (_, i) => i + 1).find((s) => {
      const r = simulate(progress, party, false, s);
      return r.run.status === "victory" && r.lowestLivingCount < party.length;
    })!;
    expect(seed).toBeDefined();
    const attackOnly = simulate(progress, party, false, seed);
    expect(attackOnly.run.status).toBe("victory");
    expect(attackOnly.lowestLivingCount).toBeLessThan(party.length);
    expect(attackOnly.run.party.every((cat) => cat.hp === cat.maxHp)).toBe(
      true,
    );
    expect(attackOnly.preVictoryHealth.some((cat) => cat.hp < cat.maxHp)).toBe(
      true,
    );
    expect(attackOnly.rounds.every((round) => round >= 3)).toBe(true);
    const result = simulate(progress, party, true, seed);
    expect(result.run.status).toBe("victory");
    expect(result.rounds.every((round) => round >= 3)).toBe(true);
    expect(result.run.party.every((cat) => cat.hp === cat.maxHp)).toBe(true);
    expect(result.decisions).toBeLessThan(2000);
    // Random enemy marks must not make the starter team unwinnable (measured: ~99-100 of 100 seeds win).
    for (const support of [false, true]) {
      let wins = 0;
      for (let s = 1; s <= 20; s++)
        if (simulate(progress, party, support, s).run.status === "victory")
          wins++;
      expect(wins).toBeGreaterThanOrEqual(18);
    }
  });
  it("makes the next run stronger without allowing a rank-three basic attack to one-shot its opening enemies", () => {
    let progress: Progress = {
      ...initialProgress(),
      gold: 130,
      xp: 135,
      wins: 1,
    };
    for (let i = 0; i < 3; i++) progress = buyUpgrade(progress, "clover");
    progress = equip(progress, "miso", "Iron bell");
    const first = createRun(initialProgress(), ["miso", "luna", "clover"]);
    const next = createRun(progress, ["miso", "luna", "clover"]);
    expect(next.difficulty.tier).toBe(1);
    expect(next.enemies[0]!.maxHp).toBeGreaterThan(first.enemies[0]!.maxHp);
    for (const cat of next.party)
      expect(cat.abilities[0]!.power).toBeLessThan(
        Math.min(...next.enemies.map((e) => e.hp)),
      );
    const result = simulate(progress, ["miso", "luna", "clover"], true);
    expect(result.run.status).toBe("victory");
    expect(result.revives).toBeGreaterThan(0);
    expect(result.rounds.at(-1)).toBeGreaterThan(3);
  });
  it("keeps the maximum ascension attainable with a fully trained support and area-damage team", () => {
    const progress: Progress = {
      ...initialProgress(),
      xp: 1500,
      wins: 6,
      spentGold: 3000,
      generalLevel: 8,
      catLevels: { miso: 8, luna: 8, clover: 8, ember: 8, pip: 8 },
      equipment: {
        miso: "Iron bell",
        luna: "Lucky fang",
        clover: "Silk ribbon",
      },
      inventory: ["Iron bell", "Silk ribbon", "Lucky fang"],
    };
    const result = simulate(progress, ["luna", "ember", "clover"], true);
    expect(result.run.difficulty.tier).toBe(12);
    expect(result.run.status).toBe("victory");
    expect(result.rounds.at(-1)).toBeGreaterThan(3);
    expect(result.run.party.every((cat) => cat.hp === cat.maxHp)).toBe(true);
    expect(result.decisions).toBeLessThan(2000);
  });
});
