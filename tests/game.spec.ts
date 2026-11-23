import { expect, test, type Page } from "@playwright/test";

const saveKey = "catacomb-cats.progress.v1";

// A fixed seed keeps the random enemy marks reproducible in every test.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __CATACOMB_SEED__: number }).__CATACOMB_SEED__ = 1;
  });
});

async function seedLegacySave(
  page: Page,
  overrides: Record<string, unknown> = {},
) {
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(value));
    },
    {
      key: saveKey,
      value: {
        version: 1,
        gold: 30,
        xp: 0,
        generalLevel: 0,
        catLevels: {},
        equipment: {},
        inventory: ["Iron bell"],
        claimedRuns: [],
        ...overrides,
      },
    },
  );
}
async function advanceToCat(page: Page, name: string) {
  for (let i = 0; i < 12; i++) {
    if ((await page.locator(".command-deck h2").textContent()) === name) return;
    await page.getByRole("button", { name: "End turn", exact: true }).click();
  }
  throw new Error(`Could not reach ${name}'s turn`);
}

async function pickTarget(page: Page, id: string) {
  await page.locator(`[data-unit="${id}"] .unit-target`).click();
}

async function enterDungeon(page: Page) {
  await page.getByRole("button", { name: "Enter the dungeon" }).click();
  await expect(page.locator(".command-deck")).toBeVisible();
}

test("an upgraded party completes all three rooms and persists earned rewards", async ({
  page,
}) => {
  await seedLegacySave(page, { generalLevel: 8 });
  await page.goto("/");
  const miso = page
    .locator(".cat-card")
    .filter({ has: page.getByRole("heading", { name: "Miso", exact: true }) });
  await miso.getByRole("button", { name: "Remove from party" }).click();
  await expect(
    page.getByRole("button", { name: "Enter the dungeon" }),
  ).toBeDisabled();
  await miso.getByRole("button", { name: "Add to party" }).click();
  await enterDungeon(page);
  const ratTarget = page.getByRole("button", {
    name: "Target Crypt rat",
    exact: true,
  });
  await ratTarget.click();
  await expect(ratTarget).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-unit="e0"] .unit-target')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  let roomsCleared = 0;
  for (let action = 0; action < 120; action++) {
    if (
      await page
        .getByRole("heading", { name: "The burrow has its heroes." })
        .isVisible()
    )
      break;
    const next = page.getByRole("button", { name: "Continue to next room" });
    if (await next.isVisible()) {
      roomsCleared++;
      await expect(page.locator(".reward-details")).toContainText(
        roomsCleared === 1
          ? "Room reward: +20 gold, +30 XP"
          : "Room reward: +30 gold, +45 XP",
      );
      await expect(page.locator(".difficulty-banner")).toContainText(
        `Expedition Strength +${roomsCleared} (+${roomsCleared} damage to all cats)`,
      );
      await expect(page.locator(".run-loot")).toContainText(
        "Unbanked expedition loot",
      );
      await next.click();
      continue;
    }
    await expect(
      page.getByRole("button", { name: "End turn", exact: true }),
    ).toBeVisible();
    await page
      .locator(".enemies .combatant:not(.dead) .unit-target")
      .first()
      .click();
    const attack = page.getByRole("button", {
      name: /^(Claw strike|Moon bolt|Valiant slash|Thorn swipe|Cinder jab)/,
    });
    if (await attack.isEnabled()) await attack.click();
    else
      await page.getByRole("button", { name: "End turn", exact: true }).click();
  }
  expect(roomsCleared).toBe(2);
  await expect(
    page.getByRole("heading", { name: "The burrow has its heroes." }),
  ).toBeVisible();
  await expect(
    page.getByText("All companions are fully healed", { exact: false }),
  ).toBeVisible();
  for (const health of await page.locator(".allies .health-value").all()) {
    const values = (await health.innerText()).match(/(\d+) \/ (\d+) HP/)!;
    expect(values[1]).toBe(values[2]);
  }
  await page
    .getByRole("button", { name: "Return to lobby", exact: true })
    .click();
  await expect(page.locator(".currency")).toContainText("120 gold");
  await expect(page.locator(".top-meta")).toContainText("135 XP");
  await enterDungeon(page);
  for (const health of await page.locator(".allies .health-value").all()) {
    const values = (await health.innerText()).match(/(\d+) \/ (\d+) HP/)!;
    expect(values[1]).toBe(values[2]);
  }
  await page.reload();
  await expect(page.locator(".currency")).toContainText("120 gold");
  await expect(page.locator(".top-meta")).toContainText("135 XP");
});

test("defeat resets the expedition while preserving permanent upgrades", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Improve blessing/ }).click();
  await expect(page.getByText("Hearth blessing · Rank 1")).toBeVisible();
  await expect(page.locator(".hearth-next")).toContainText(
    "Rank 2 · Sharpened claws",
  );
  await enterDungeon(page);
  for (let turn = 0; turn < 150; turn++) {
    const end = page.getByRole("button", { name: "End turn", exact: true });
    if (!(await end.isVisible())) break;
    await end.click();
  }
  await expect(
    page.getByRole("heading", { name: "Even brave cats need another try." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Return to lobby", exact: true })
    .click();
  await expect(page.getByText("Hearth blessing · Rank 1")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Hearth blessing · Rank 1")).toBeVisible();
  await enterDungeon(page);
  await expect(
    page.getByRole("heading", { name: "Whispering entrance" }),
  ).toBeVisible();
});

test("reloading abandons the active dungeon and keeps only lobby progress", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Equipment for Miso").selectOption("Iron bell");
  await enterDungeon(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "The Burrow" })).toBeVisible();
  await expect(page.getByLabel("Equipment for Miso")).toHaveValue("Iron bell");
});

test("malformed saved data recovers to a playable lobby", async ({ page }) => {
  await page.addInitScript(
    (key) => localStorage.setItem(key, "{broken json"),
    saveKey,
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "The Burrow" })).toBeVisible();
  await expect(page.locator(".currency")).toContainText("30 gold");
  await enterDungeon(page);
});

test("equipping and unequipping the same cat persists an empty slot", async ({
  page,
}) => {
  await page.goto("/");
  const equipment = page.getByLabel("Equipment for Miso");
  await equipment.selectOption("Iron bell");
  await expect(equipment).toHaveValue("Iron bell");
  await equipment.selectOption("");
  await expect(equipment).toHaveValue("");
  await page.reload();
  await expect(page.getByLabel("Equipment for Miso")).toHaveValue("");
  await page.getByLabel("Equipment for Miso").selectOption("Iron bell");
  await expect(page.getByLabel("Equipment for Miso")).toHaveValue("Iron bell");
});

test("one AP skills stop after three uses and reset on the next actor turn", async ({
  page,
}) => {
  await page.goto("/");
  await enterDungeon(page);
  await pickTarget(page, "e1");
  const strike = page.getByRole("button", { name: /^Claw strike/ });
  for (let use = 0; use < 3; use++) {
    await pickTarget(page, "e1");
    await strike.click();
    await expect(page.locator('[data-unit="e1"] .unit-target')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  }
  await pickTarget(page, "e1");
  await expect(strike).toBeDisabled();
  await expect(strike).toHaveAttribute("title", "Turn limit reached");
  await expect(page.locator(".round-counter")).toContainText("3 / 6 AP");
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await pickTarget(page, "e0");
  await expect(page.getByRole("button", { name: /^Moon bolt/ })).toBeEnabled();
});

test("the field guide can be opened during combat without losing the turn", async ({
  page,
}) => {
  await page.goto("/");
  await enterDungeon(page);
  await pickTarget(page, "e0");
  await page.getByRole("button", { name: /^Claw strike/ }).click();
  const counter = (await page.locator(".round-counter").textContent()) ?? "";
  await page.getByRole("button", { name: /FAQ/ }).click();
  await expect(
    page.getByRole("heading", { name: "Field Guide", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to game" }).click();
  await expect(page.locator(".round-counter")).toHaveText(counter);
  await expect(page.locator('[data-unit="e0"] .unit-target')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("two AP support skills stop after two uses with AP still available", async ({
  page,
}) => {
  await page.goto("/");
  await enterDungeon(page);
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await pickTarget(page, "miso");
  const guard = page.getByRole("button", { name: /^Nine lives/ });
  await guard.click();
  await pickTarget(page, "luna");
  await guard.click();
  await pickTarget(page, "pip");
  await expect(guard).toBeDisabled();
  await expect(page.locator(".round-counter")).toContainText("2 / 6 AP");
});

test("training explains and applies its permanent health and power improvement", async ({
  page,
}) => {
  await page.goto("/");
  const miso = page
    .locator(".cat-card")
    .filter({ has: page.getByRole("heading", { name: "Miso", exact: true }) });
  await expect(miso.locator(".training-description")).toContainText(
    "+3 max HP",
  );
  await expect(miso.getByLabel("Miso skill unlock")).toContainText(
    "0/3 training ranks",
  );
  await miso.getByRole("button", { name: /^Train Miso/ }).click();
  await expect(miso.locator(".stats")).toContainText("38");
  await expect(page.locator(".currency")).toContainText("10 gold");
  await enterDungeon(page);
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await pickTarget(page, "e0");
  await expect(
    page.getByRole("button", { name: /^Valiant slash/ }),
  ).toContainText("4 damage");
});

test("three trainings cost 100 gold, unlock Moonwell, and its room limit preserves AP", async ({
  page,
}) => {
  await seedLegacySave(page, { gold: 100 });
  await page.goto("/");
  const luna = page
    .locator(".cat-card")
    .filter({ has: page.getByRole("heading", { name: "Luna", exact: true }) });
  for (const cost of [20, 30, 50]) {
    await expect(
      luna.getByRole("button", { name: /^Train Luna/ }),
    ).toContainText(`${cost} gold`);
    await luna.getByRole("button", { name: /^Train Luna/ }).click();
  }
  await expect(page.locator(".currency")).toContainText("0 gold");
  await expect(luna.getByLabel("Luna skill unlock")).toContainText("Moonwell");
  await enterDungeon(page);
  await advanceToCat(page, "Luna");
  const moonwell = page.getByRole("button", { name: /^Moonwell/ });
  await expect(page.locator('.unit-target[aria-pressed="true"]')).toHaveCount(
    0,
  );
  await expect(moonwell).toBeEnabled();
  await moonwell.click();
  await expect(page.locator(".round-counter")).toContainText("7 / 8 AP");
  await expect(moonwell).toBeDisabled();
  await expect(moonwell).toContainText("0/1 uses left this room");
  await page
    .getByRole("button", { name: "Retreat to lobby", exact: true })
    .click();
  await page.reload();
  await expect(luna.getByLabel("Luna skill unlock")).toContainText("Moonwell");
  await expect(page.getByLabel("Expedition difficulty")).toContainText(
    "100 gold invested",
  );
});

test("trained tank taunts without choosing a target and fully applied Guard rejects duplicate casts", async ({
  page,
}) => {
  await seedLegacySave(page, { catLevels: { miso: 3 } });
  await page.goto("/");
  await enterDungeon(page);
  await advanceToCat(page, "Miso");
  const taunt = page.getByRole("button", { name: /^Stand behind me/ });
  await expect(taunt).toBeEnabled();
  await taunt.click();
  await expect(
    page.locator(".allies").getByRole("button", { name: "Taunt: active" }),
  ).toBeVisible();
  await expect(taunt).toBeDisabled();
  await page
    .getByRole("button", { name: "Retreat to lobby", exact: true })
    .click();
  await enterDungeon(page);
  await advanceToCat(page, "Miso");
  await pickTarget(page, "miso");
  const guard = page.getByRole("button", { name: /^Nine lives/ });
  await guard.click();
  const before = await page
    .locator(".allies .combatant")
    .filter({ has: page.getByRole("heading", { name: "Miso", exact: true }) })
    .textContent();
  await expect(page.locator('.unit-target[aria-pressed="true"]')).toHaveCount(
    0,
  );
  await pickTarget(page, "miso");
  await expect(guard).toBeDisabled();
  await expect(guard).toHaveAttribute(
    "title",
    /already|duration|refresh|fully/i,
  );
  const after = await page
    .locator(".allies .combatant")
    .filter({ has: page.getByRole("heading", { name: "Miso", exact: true }) })
    .textContent();
  expect(after).toBe(before);
});

test("legacy saves migrate without losing upgrades and show ascension before entry", async ({
  page,
}) => {
  await seedLegacySave(page, {
    gold: 75,
    xp: 300,
    catLevels: { luna: 3 },
    claimedRuns: ["legacy-win"],
  });
  await page.goto("/");
  await expect(page.locator(".currency")).toContainText("75 gold");
  await expect(page.getByLabel("Expedition difficulty")).toContainText(
    "Ascension",
  );
  await expect(
    page
      .locator(".cat-card")
      .filter({ has: page.getByRole("heading", { name: "Luna", exact: true }) })
      .getByLabel("Luna skill unlock"),
  ).toContainText("Moonwell");
  await enterDungeon(page);
  await expect(page.getByLabel("Active expedition difficulty")).toContainText(
    "Fixed for this expedition",
  );
});

test("attacks retain a living enemy target while ending a turn clears it", async ({
  page,
}) => {
  await page.goto("/");
  await enterDungeon(page);
  const rat = page.getByRole("button", {
    name: "Target Crypt rat",
    exact: true,
  });
  await rat.click();
  const strike = page.getByRole("button", { name: /^Claw strike/ });
  await expect(strike.locator(".damage-preview")).toContainText(
    "Deals 4 · 20 HP left",
  );
  await strike.click();
  await expect(page.locator('[data-unit="e0"] .unit-target')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(rat).toHaveAttribute("aria-pressed", "true");
  await expect(strike).toBeEnabled();
  await expect(page.locator(".round-counter")).toContainText("5 / 6 AP");
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await expect(page.locator('.unit-target[aria-pressed="true"]')).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: /^Moon bolt/ })).toBeDisabled();
});

test("Inspired improves healing and cannot be applied twice at full duration", async ({
  page,
}) => {
  await page.goto("/");
  const pip = page
    .locator(".cat-card")
    .filter({ has: page.getByRole("heading", { name: "Pip", exact: true }) });
  await pip.getByRole("button", { name: "Remove from party" }).click();
  const clover = page.locator(".cat-card").filter({
    has: page.getByRole("heading", { name: "Mei", exact: true }),
  });
  await clover.getByRole("button", { name: "Add to party" }).click();
  await enterDungeon(page);
  await advanceToCat(page, "Luna");
  await pickTarget(page, "clover");
  const blessing = page.getByRole("button", { name: /^Moon blessing/i });
  await blessing.click();
  await expect(page.locator('.unit-target[aria-pressed="true"]')).toHaveCount(
    0,
  );
  await pickTarget(page, "clover");
  await expect(blessing).toBeDisabled();
  await expect(page.locator(".round-counter")).toContainText("4 / 6 AP");
  await advanceToCat(page, "Mei");
  await pickTarget(page, "luna");
  const heal = page.getByRole("button", { name: /^Healing purr/ });
  await expect(heal).toContainText("Heal 1 ally for 9 HP");
  await heal.click();
  await expect(page.locator('.unit-target[aria-pressed="true"]')).toHaveCount(
    0,
  );
  await pickTarget(page, "luna");
  await expect(heal).toBeDisabled();
});

test("exhausting shared AP resolves enemy turns and skips cats until the next round", async ({
  page,
}) => {
  await page.goto("/");
  await enterDungeon(page);
  await pickTarget(page, "e1");
  const pounce = page.getByRole("button", { name: /^Pounce/ });
  await pounce.click();
  await pounce.click();
  const strike = page.getByRole("button", { name: /^Claw strike/ });
  await strike.click();
  await expect(page.locator('[data-unit="e1"] .unit-target')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await strike.click();
  await expect(page.locator(".round-counter")).toContainText("ROUND 2");
  await expect(page.locator(".round-counter")).toContainText("6 / 6 AP");
  await expect(page.locator(".command-deck h2")).toHaveText("Pip");
  await expect(page.locator('.unit-target[aria-pressed="true"]')).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Target Moss slime" }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByLabel("Combat log")).toContainText("Crypt rat hits");
});

test("effect icons expose themed descriptions on hover and keyboard focus and Guard ticks only on Miso turn starts", async ({
  page,
}) => {
  await page.goto("/");
  await enterDungeon(page);
  await advanceToCat(page, "Miso");
  await pickTarget(page, "miso");
  await page.getByRole("button", { name: /^Nine lives/ }).click();
  const guard = page
    .locator(".allies")
    .getByRole("button", { name: /^Guard:/ });
  await expect(guard).toBeVisible();
  await guard.hover();
  await expect(page.getByRole("tooltip")).toContainText("Guard");
  await expect(page.getByRole("tooltip")).toContainText("2");
  await expect(page.getByRole("tooltip")).toContainText("Lasts 2 turns");
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await expect(page.locator(".command-deck h2")).toHaveText("Pip");
  await guard.focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await expect(page.getByRole("tooltip")).toContainText("2");
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await expect(page.locator(".command-deck h2")).toHaveText("Luna");
  await guard.hover();
  await expect(page.getByRole("tooltip")).toContainText("2");
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await expect(page.locator(".command-deck h2")).toHaveText("Miso");
  await guard.hover();
  await expect(page.getByRole("tooltip")).toContainText("1");
});

test("an attack clears a defeated target even when the same cat still has AP", async ({
  page,
}) => {
  await seedLegacySave(page, { catLevels: { luna: 3 } });
  await page.goto("/");
  await enterDungeon(page);
  await pickTarget(page, "e0");
  await page.getByRole("button", { name: /^Pounce/ }).click();
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await pickTarget(page, "e0");
  const bolt = page.getByRole("button", { name: /^Moon bolt/ });
  await bolt.click();
  await bolt.click();
  await expect(page.locator('[data-unit="e0"] .unit-target')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await bolt.click();
  await expect(page.locator(".command-deck h2")).toHaveText("Luna");
  await expect(page.locator(".round-counter")).toContainText("1 / 6 AP");
  await expect(page.locator('.unit-target[aria-pressed="true"]')).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Target Crypt rat" }),
  ).toBeDisabled();
});

test("Mei can revive at 60 percent with a revive-only cooldown while party healing stays available", async ({
  page,
}) => {
  await seedLegacySave(page, { catLevels: { clover: 3 } });
  await page.goto("/");
  const card = (name: string) =>
    page
      .locator(".cat-card")
      .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await card("Pip").getByRole("button", { name: "Remove from party" }).click();
  await card("Mei").getByRole("button", { name: "Add to party" }).click();
  await enterDungeon(page);
  const luna = page
    .locator(".allies .combatant")
    .filter({ has: page.getByRole("heading", { name: "Luna", exact: true }) });
  for (let turn = 0; turn < 50; turn++) {
    if ((await luna.locator(".health-value").innerText()).startsWith("0 /"))
      break;
    await page.getByRole("button", { name: "End turn", exact: true }).click();
  }
  await expect(luna.locator(".health-value")).toHaveText("0 / 25 HP");
  await advanceToCat(page, "Mei");
  await expect(
    page.getByRole("button", { name: "Target Luna", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Target Luna", exact: true }).click();
  await expect(page.locator('[data-unit="luna"] .unit-target')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const revive = page.getByRole("button", { name: /^Return to the hearth/ });
  const renewal = page.getByRole("button", { name: /^Circle of renewal/ });
  await expect(revive).toContainText("60% max HP");
  await revive.click();
  await expect(luna).toHaveClass(/heal-[01]/);
  await expect(luna.locator(".health-value")).toHaveText("15 / 25 HP");
  await expect(page.locator('.unit-target[aria-pressed="true"]')).toHaveCount(
    0,
  );
  await expect(renewal).toBeEnabled();
  await expect(renewal.locator(".ability-cooldown")).toHaveCount(0);
  await expect(revive.locator(".ability-cooldown")).toContainText(
    "Ready in 3 turns",
  );
  for (const remaining of [2, 1]) {
    await page.getByRole("button", { name: "End turn", exact: true }).click();
    await advanceToCat(page, "Mei");
    await expect(revive).toBeDisabled();
    await expect(revive.locator(".ability-cooldown")).toContainText(
      `Ready in ${remaining} turn`,
    );
    await expect(renewal.locator(".ability-cooldown")).toHaveCount(0);
    const values = await page
      .locator(".allies .health-value")
      .allTextContents();
    if (
      values.some((value) => {
        const hp = value.match(/(\d+) \/ (\d+) HP/)!;
        return Number(hp[1]) > 0 && Number(hp[1]) < Number(hp[2]);
      })
    )
      await expect(renewal).toBeEnabled();
  }
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await advanceToCat(page, "Mei");
  await expect(revive.locator(".ability-cooldown")).toContainText(
    "Cooldown: 2 turns",
  );
});

test("Ember Flame paw has a two-turn cooldown while Cinder jab has none", async ({
  page,
}) => {
  await seedLegacySave(page, { catLevels: { ember: 3 } });
  await page.goto("/");
  const card = (name: string) =>
    page
      .locator(".cat-card")
      .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await card("Pip").getByRole("button", { name: "Remove from party" }).click();
  await card("Ember").getByRole("button", { name: "Add to party" }).click();
  await enterDungeon(page);
  await advanceToCat(page, "Ember");
  await pickTarget(page, "e1");
  const flame = page.getByRole("button", { name: /^Flame paw/ });
  await flame.click();
  await expect(flame.locator(".ability-cooldown")).toContainText(
    "Ready in 3 turns",
  );
  const claw = page.getByRole("button", { name: /^Cinder jab/ });
  await expect(claw).toBeEnabled();
  await expect(claw.locator(".ability-cooldown")).toHaveCount(0);
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await advanceToCat(page, "Ember");
  await pickTarget(page, "e1");
  await expect(flame).toBeDisabled();
  await expect(flame.locator(".ability-cooldown")).toContainText(
    "Ready in 2 turns",
  );
  await expect(claw).toBeEnabled();
  await claw.click();
  await expect(claw).toBeEnabled();
  await expect(claw.locator(".ability-cooldown")).toHaveCount(0);
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await advanceToCat(page, "Ember");
  await pickTarget(page, "e1");
  await expect(flame).toBeDisabled();
  await expect(flame.locator(".ability-cooldown")).toContainText(
    "Ready in 1 turn",
  );
});

test("an eligible shield refresh restores consumed absorption as well as duration", async ({
  page,
}) => {
  await seedLegacySave(page, { catLevels: { miso: 6 } });
  await page.goto("/");
  await enterDungeon(page);
  await advanceToCat(page, "Miso");
  await pickTarget(page, "luna");
  const guard = page.getByRole("button", { name: /^Nine lives/ });
  await expect(guard).toContainText("Shield 1 ally for 8");
  await guard.click();
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await advanceToCat(page, "Miso");
  const luna = page
    .locator(".allies .combatant")
    .filter({ has: page.getByRole("heading", { name: "Luna", exact: true }) });
  await expect(
    luna.getByRole("button", { name: "Guard: 1", exact: true }),
  ).toBeVisible();
  await pickTarget(page, "luna");
  await expect(guard).toBeEnabled();
  await guard.click();
  const shield = luna.getByRole("button", { name: "Guard: 8", exact: true });
  await expect(shield).toBeVisible();
  await shield.hover();
  await expect(page.getByRole("tooltip")).toContainText("Lasts 2 turns");
});

test("the field guide exposes all eight training ranks for every companion", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "FAQ", exact: true }).click();
  await page.getByRole("tab", { name: /Companions/ }).click();
  for (const name of ["Miso", "Luna", "Mei", "Pip", "Ember"]) {
    const track = page.getByRole("list", {
      name: `${name} training ranks`,
      exact: true,
    });
    await expect(track.getByRole("listitem")).toHaveCount(8);
    await expect(track.getByRole("listitem").nth(2)).toContainText("Rank 3");
    await expect(track.getByRole("listitem").nth(7)).toContainText("Rank 8");
  }
  await expect(
    page.getByRole("list", { name: "Mei training ranks", exact: true }),
  ).toContainText("60%");
  await expect(
    page.getByRole("list", { name: "Luna training ranks", exact: true }),
  ).toContainText("Ice");
});

test("hovering an enemy shows its marked cat and what it will do next", async ({
  page,
}) => {
  await page.goto("/");
  await enterDungeon(page);
  await page.getByRole("button", { name: "Target Crypt rat" }).hover();
  await expect(page.getByTestId("intent-note")).toContainText(
    "Crypt rat next turn: Attack →",
  );
  await expect(page.locator(".intent-line.hostile")).toHaveCount(1);
  await expect(page.locator(".combatant.marked")).toHaveCount(1);
  await page.getByRole("button", { name: "Target Moss slime" }).hover();
  await expect(page.getByTestId("intent-note")).toContainText(
    "Moss slime next turn: Inspire an ally → Crypt rat",
  );
  await expect(page.locator(".intent-line.friendly")).toHaveCount(1);
  await expect(page.locator(".intent-line.hostile")).toHaveCount(0);
  await expect(page.locator(".combatant.marked")).toHaveCount(0);
  await page.getByRole("button", { name: "Target Miso" }).hover();
  await expect(page.getByTestId("intent-arrows")).toHaveCount(0);
  await expect(page.locator(".combatant.marked")).toHaveCount(0);
});

test("hovering a cat or a helped enemy shows who will attack or help it", async ({
  page,
}) => {
  await page.goto("/");
  await enterDungeon(page);
  // Find which cat the Crypt rat marked, then hover that cat.
  await page.locator('[data-unit="e0"] .unit-target').hover();
  const markedCat = page.locator(".allies .combatant.marked");
  await expect(markedCat).toHaveCount(1);
  const markedId = (await markedCat.getAttribute("data-unit"))!;
  await page.mouse.move(0, 0);
  await expect(page.getByTestId("intent-arrows")).toHaveCount(0);
  await page.locator(`[data-unit="${markedId}"] .unit-target`).hover();
  await expect(page.locator(".intent-line.hostile")).toHaveCount(1);
  await expect(page.locator(`[data-unit="${markedId}"]`)).toHaveClass(/marked/);
  // The Moss slime will inspire the rat, so hovering the rat shows both threads.
  await page.locator('[data-unit="e0"] .unit-target').hover();
  await expect(page.locator(".intent-line.friendly")).toHaveCount(1);
  await expect(page.locator(".intent-line.hostile")).toHaveCount(1);
  // Moving the mouse away clears the threads once the opening preview is over.
  await page.mouse.move(0, 0);
  await expect(page.getByTestId("intent-arrows")).toHaveCount(0);
});

test("a shield puts a silver border on its holder until it ends", async ({
  page,
}) => {
  await seedLegacySave(page, { catLevels: { miso: 3 } });
  await page.goto("/");
  await enterDungeon(page);
  await advanceToCat(page, "Miso");
  await expect(page.locator(".combatant.guarded")).toHaveCount(0);
  await pickTarget(page, "miso");
  await page.getByRole("button", { name: /^Nine lives/ }).click();
  const miso = page.locator('[data-unit="miso"]');
  await expect(miso).toHaveClass(/guarded/);
  await expect(page.locator(".combatant.guarded")).toHaveCount(1);
  const shadow = await miso.evaluate((el) => getComputedStyle(el).boxShadow);
  expect(shadow).toContain("rgb(213, 221, 232)");
});

test("enemies do not always mark the same cat", async ({ page }) => {
  await page.goto("/");
  await enterDungeon(page);
  const marked = new Set<string>();
  for (let i = 0; i < 8; i++) {
    await page.getByRole("button", { name: "Target Crypt rat" }).click();
    const note = await page.getByTestId("intent-note").textContent();
    marked.add(note!.split("→")[1]!.trim());
    await page.getByRole("button", { name: "End turn", exact: true }).click();
    if (await page.getByText("Return to lobby").count()) break;
  }
  expect(marked.size).toBeGreaterThan(1);
});

test("a hit flashes the target's border, name, HP bar and HP numbers red", async ({
  page,
}) => {
  await page.goto("/");
  await enterDungeon(page);
  await page.getByRole("button", { name: "Target Crypt rat" }).click();
  await page.getByRole("button", { name: /^Claw strike/ }).click();
  const rat = page
    .locator(".enemies .combatant")
    .filter({ has: page.getByRole("heading", { name: "Crypt rat" }) });
  await expect(rat).toHaveClass(/hit-[01]/);
  const animations = await rat.evaluate((card) =>
    ["h3", ".health", ".health span", ".health-value"].map(
      (selector) =>
        getComputedStyle(card.querySelector(selector)!).animationName,
    ),
  );
  expect(animations.every((name) => name.startsWith("hit-"))).toBe(true);
  expect(await rat.evaluate((c) => getComputedStyle(c).animationName)).toMatch(
    /^hit-card/,
  );
  const miso = page
    .locator(".allies .combatant")
    .filter({ has: page.getByRole("heading", { name: "Miso" }) });
  await expect(miso).not.toHaveClass(/hit-/);
});

test("each turn shows enemy threats one at a time, then stops", async ({
  page,
}) => {
  await page.goto("/");
  await enterDungeon(page);
  const watch = () =>
    page.evaluate(async () => {
      const seen = new Set<string>();
      let most = 0;
      for (let i = 0; i < 50; i++) {
        const paths = [...document.querySelectorAll(".intent-line")];
        most = Math.max(most, paths.length);
        for (const path of paths) seen.add(path.getAttribute("d")!);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return { distinct: seen.size, most };
    });
  const first = await watch();
  expect(first.most).toBe(1);
  expect(first.distinct).toBeGreaterThanOrEqual(2);
  await expect(page.locator(".intent-line")).toHaveCount(0);
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await expect(page.locator(".command-deck h2")).toHaveText("Luna");
  const second = await watch();
  expect(second.most).toBe(1);
  expect(second.distinct).toBeGreaterThanOrEqual(2);
});

test("threats are threads under the cards connecting an enemy to its mark", async ({
  page,
}) => {
  await page.goto("/");
  await enterDungeon(page);
  await page.getByRole("button", { name: "Target Crypt rat" }).hover();
  const line = page.locator(".intent-line.hostile");
  await expect(line).toHaveCount(1);
  const thread = await line.evaluate((el) => {
    const box = (el as SVGGraphicsElement).getBoundingClientRect();
    const bottoms = [...document.querySelectorAll("[data-unit]")].map(
      (card) => card.getBoundingClientRect().bottom,
    );
    return { top: box.top, bottom: box.bottom, cards: Math.max(...bottoms) };
  });
  // The horizontal run sits below every card, joining the two units.
  expect(thread.bottom).toBeGreaterThan(thread.cards);
  expect(Math.abs(thread.top - thread.cards)).toBeLessThan(1);
});

test("targets are picked by clicking characters; there is no target dropdown", async ({
  page,
}) => {
  await page.goto("/");
  await enterDungeon(page);
  await expect(page.getByLabel("Ability target")).toHaveCount(0);
  await expect(page.locator(".command-deck select")).toHaveCount(0);
  await page.getByRole("button", { name: "Target Crypt rat" }).click();
  await expect(page.locator(".command-heading")).toContainText(
    "Target: Crypt rat",
  );
});

test("the AP counter sits beside the abilities", async ({ page }) => {
  await page.goto("/");
  await enterDungeon(page);
  const counter = page.locator(".actions .round-counter");
  await expect(counter).toContainText("6 / 6 AP");
  await expect(page.locator(".battle-header .round-counter")).toHaveCount(0);
  const counterBox = await counter.boundingBox();
  const abilityBox = await page
    .getByRole("button", { name: /^Claw strike/ })
    .boundingBox();
  expect(counterBox!.y).toBeLessThan(abilityBox!.y + abilityBox!.height);
  expect(
    Math.abs(counterBox!.x + counterBox!.width - abilityBox!.x),
  ).toBeLessThan(40);
});

test("ability tags are centered in their button", async ({ page }) => {
  await page.goto("/");
  await enterDungeon(page);
  const centered = await page
    .getByRole("button", { name: /^Claw strike/ })
    .locator(".ability-tags")
    .evaluate((el) => getComputedStyle(el).justifyContent);
  expect(centered).toBe("center");
});

test("lobby cat cards line up row by row even with different skill texts", async ({
  page,
}) => {
  await seedLegacySave(page, {
    catLevels: { clover: 3, ember: 3, luna: 1, pip: 2, miso: 1 },
  });
  await page.goto("/");
  await expect(page.locator(".cat-card")).toHaveCount(5);
  const rows = await page
    .locator(".cat-card")
    .evaluateAll((cards) =>
      [
        ".milestone-progress",
        ".party-toggle",
        ".equipment-label",
        ".training-description",
        ".train-button",
      ].map((selector) =>
        cards.map((card) =>
          Math.round(card.querySelector(selector)!.getBoundingClientRect().top),
        ),
      ),
    );
  for (const tops of rows) expect(new Set(tops).size).toBe(1);
});

test("Expedition Strength is shown in the header under the room name", async ({
  page,
}) => {
  await page.goto("/");
  await enterDungeon(page);
  await expect(page.locator(".difficulty-banner")).toContainText(
    "Expedition Strength +0 (+0 damage to all cats)",
  );
  await expect(page.locator(".expedition-effects")).toHaveCount(0);
});

test("the field guide has two sections and shows skills as cards", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "FAQ", exact: true }).click();
  const faqTab = page.getByRole("tab", { name: /Frequently Asked Questions/ });
  const companionsTab = page.getByRole("tab", { name: /Companions/ });
  await expect(faqTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".faq-entries details").first()).toBeVisible();
  await expect(page.locator(".guide-companions")).toHaveCount(0);
  await companionsTab.click();
  await expect(companionsTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".faq-entries")).toHaveCount(0);
  const skills = (cat: string) =>
    page.getByRole("list", { name: `${cat} skills`, exact: true });
  await expect(skills("Miso").getByRole("listitem")).toHaveCount(3);
  await expect(skills("Mei").getByRole("listitem")).toHaveCount(4);
  await expect(skills("Ember").getByRole("listitem")).toHaveCount(3);
  await expect(skills("Miso")).toContainText("Valiant slash");
  await expect(skills("Mei")).toContainText("Thorn swipe");
  await expect(skills("Ember")).toContainText("Cinder jab");
  await expect(skills("Ember")).toContainText("Cooldown: 2 turns");
  await expect(skills("Pip")).toContainText("Claw strike");
  await expect(skills("Mei").getByRole("listitem").nth(3)).toContainText(
    "Revive a fallen ally",
  );
  const basics = await page
    .locator(".skill-cards")
    .evaluateAll((lists) =>
      lists.map((list) => list.querySelector("li span")!.textContent),
    );
  // Every companion's basic attack has its own name.
  expect(new Set(basics).size).toBe(5);
  await faqTab.click();
  await expect(page.locator(".faq-entries details").first()).toBeVisible();
});
