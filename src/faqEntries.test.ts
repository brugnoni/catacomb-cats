import { describe, expect, it } from "vitest";
import { buildCat, initialProgress } from "./game";
import { buildEntries } from "./faqEntries";
import { identityT } from "./i18n";

const answers = buildEntries(identityT)
  .map(([, answer]) => answer)
  .join("\n");

describe("Field Guide answers", () => {
  it("name the cooldowns the skills really have", () => {
    const trained = {
      ...initialProgress(),
      catLevels: { clover: 3, ember: 3 },
    };
    const cooldown = (id: string, ability: string) =>
      buildCat(trained, id).abilities.find((a) => a.id === ability)!
        .cooldownTurns;
    expect([
      cooldown("clover", "revive"),
      cooldown("ember", "slam"),
      cooldown("ember", "cleave"),
    ]).toEqual([2, 1, 1]);
    expect(answers).toContain(
      "Mei's revival has two turns; Tuntun's Flame paw and Sweeping embers have one.",
    );
  });
  it("name everything that raises the critical chance", () => {
    expect(answers).toContain(
      "the Four-leaf clover Trinket and the Lucky whisker Relic",
    );
  });
});
