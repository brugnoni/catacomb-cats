import { isDamaging, type Ability, type Run, type Unit } from "./model";
import { relicRandom } from "./state";

export interface Relic {
  /** The Companion it belongs to; it is only offered when that cat is in the party. */
  companion?: string;
  text: string;
  drawback?: string;
  /** Only useful if a room follows, so never offered before the boss. */
  early?: boolean;
  /** A change made to the party once, when picked. Other effects are checked where they happen. */
  apply?: (run: Run) => void;
}

/** Rewrites one skill of one cat. */
function tune(
  run: Run,
  catId: string,
  abilityId: string,
  change: (ability: Ability) => void,
) {
  const ability = run.party
    .find((u) => u.id === catId)
    ?.abilities.find((a) => a.id === abilityId);
  if (ability) change(ability);
}

const each = (run: Run, change: (cat: Unit) => void) =>
  run.party.forEach(change);

/** Every Relic. The names are what a Run stores and what gets translated. */
export const RELICS: Record<string, Relic> = {
  "Warm broth": {
    text: "Cleared rooms heal 20% more of max HP.",
    early: true,
  },
  "Lucky whisker": {
    text: "+10% critical chance for your cats.",
    apply: (run) => {
      run.critChance += 10;
    },
  },
  "Thick fur": {
    text: "+1 armor for every cat.",
    apply: (run) => each(run, (c) => (c.armor += 1)),
  },
  "Stone den": {
    text: "Guard shields cast by your cats are 3 stronger.",
    apply: (run) =>
      each(run, (c) => {
        for (const a of c.abilities)
          if (a.effect === "guard" || a.effect === "taunt") a.power += 3;
      }),
  },
  "Reckless torch": {
    text: "Your cats deal 3 more damage.",
    drawback: "Enemies deal 2 more damage.",
    apply: (run) =>
      each(run, (c) => {
        for (const a of c.abilities) if (isDamaging(a)) a.power += 3;
      }),
  },
  "Heavy collars": {
    text: "+25% max HP for every cat.",
    drawback: "-4 initiative for every cat.",
    apply: (run) =>
      each(run, (c) => {
        const extra = Math.round(c.maxHp * 0.25);
        c.maxHp += extra;
        if (c.hp > 0) c.hp += extra;
        c.initiative -= 4;
      }),
  },
  "Healing thorns": {
    companion: "clover",
    text: "Thorn swipe also heals the most wounded ally for 3.",
  },
  "Hurried remedy": {
    companion: "clover",
    text: "Healing purr costs 1 AP.",
    drawback: "Healing purr heals 3 less.",
    apply: (run) =>
      tune(run, "clover", "heal", (a) => {
        a.cost = 1;
        a.power -= 3;
        a.turnLimit = 2;
      }),
  },
  "Shield stance": {
    companion: "miso",
    text: "Valiant slash also gives Miso a 3 shield.",
  },
  "Iron coat": {
    companion: "miso",
    text: "+2 armor for Miso.",
    drawback: "-6 initiative for Miso.",
    apply: (run) =>
      each(run, (c) => {
        if (c.id !== "miso") return;
        c.armor += 2;
        c.initiative -= 6;
      }),
  },
  Kindling: {
    companion: "ember",
    text: "The first Cinder jab of each turn costs no AP.",
  },
  Overheat: {
    companion: "ember",
    text: "Flame paw has no cooldown.",
    drawback: "Each Flame paw costs Tuntun 5 HP, never the last one.",
    apply: (run) =>
      tune(run, "ember", "slam", (a) => {
        delete a.cooldownTurns;
        a.turnLimit = 1;
      }),
  },
  "Full moon": {
    companion: "luna",
    text: "Moon bolt also hits the next foe for half.",
    apply: (run) =>
      tune(run, "luna", "strike", (a) => {
        a.effect = "line";
        a.falloff = [1, 0.5];
      }),
  },
  "Smoke step": {
    companion: "pip",
    text: "Dagger line has no cooldown.",
    apply: (run) =>
      tune(run, "pip", "line", (a) => {
        delete a.cooldownTurns;
      }),
  },
};

/** Draws up to three Relics the Run does not hold and the party can use. */
export function rollOffer(run: Run, bossNext: boolean): string[] {
  // The whole table is shuffled before filtering, so the order never depends on
  // the party or on earlier picks: a locked seed cannot be re-rolled by them.
  const order = Object.keys(RELICS);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(relicRandom(run) * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order
    .filter((name) => {
      const r = RELICS[name]!;
      return (
        !run.relics.includes(name) &&
        !(r.early && bossNext) &&
        (!r.companion || run.party.some((u) => u.id === r.companion))
      );
    })
    .slice(0, 3);
}
