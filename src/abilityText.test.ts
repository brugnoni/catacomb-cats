import { describe, expect, it } from "vitest";
import { cooldownText, describeAbility } from "./abilityText";
import { CATS, REVIVE_ABILITY, SIGNATURE_ABILITIES } from "./game";

const all = [
  ...CATS.flatMap((cat) => cat.abilities),
  ...Object.values(SIGNATURE_ABILITIES),
  REVIVE_ABILITY,
];

describe("ability descriptions", () => {
  it("gives every ability a kind, a target and one short sentence", () => {
    for (const ability of all) {
      const info = describeAbility(ability, ability.power);
      expect(info.kindLabel, ability.name).not.toBe("");
      expect(info.targetLabel, ability.name).not.toBe("");
      expect(info.text.length, ability.name).toBeGreaterThan(10);
      expect(info.text.length, ability.name).toBeLessThan(100);
    }
  });
  it("labels damage, heal, shield, buff and single or group targets", () => {
    const byId = Object.fromEntries(all.map((a) => [a.id, a]));
    const info = (id: string) => describeAbility(byId[id]!, byId[id]!.power);
    expect(info("slam")).toMatchObject({
      kind: "damage",
      targetLabel: "1 enemy",
    });
    expect(info("cleave")).toMatchObject({
      kind: "damage",
      targetLabel: "All enemies",
    });
    expect(info("heal")).toMatchObject({ kind: "heal", targetLabel: "1 ally" });
    expect(info("renewal")).toMatchObject({
      kind: "heal",
      targetLabel: "All allies",
    });
    expect(info("guard")).toMatchObject({
      kind: "shield",
      targetLabel: "1 ally",
    });
    expect(info("fury").kind).toBe("buff");
    expect(info("taunt").kind).toBe("utility");
    expect(info("revive").targetLabel).toBe("1 fallen ally");
  });
  it("explains Guard simply: duration in turns and the single refresh rule", () => {
    const guard = all.find((a) => a.effect === "guard")!;
    const info = describeAbility(guard, 8);
    expect(info.text).toBe("Shield 1 ally for 8. Lasts 2 turns.");
    expect(info.note).toBe(
      "Refreshing this ability restores full shield and duration (does not stack).",
    );
  });
  it("never uses the old 'turn starts' wording", () => {
    for (const ability of all) {
      const { text, note } = describeAbility(ability, ability.power);
      expect(`${text} ${note ?? ""}`).not.toMatch(/turn starts?/i);
    }
  });
  it("formats cooldowns in turns", () => {
    expect(cooldownText(2, 0)).toBe("Cooldown: 2 turns");
    expect(cooldownText(2, 3)).toBe("Ready in 3 turns");
    expect(cooldownText(1, 1)).toBe("Ready in 1 turn");
  });
});
