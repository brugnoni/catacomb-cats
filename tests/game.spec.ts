import { expect, test, type Page } from "@playwright/test";

const saveKey = "catacomb-cats.progress.v1";

// A fixed seed keeps the random enemy marks reproducible in every test.
test.beforeEach(async ({ page }) => {
  // Battle pauses are covered by the "enemy phase" tests; the rest skip them.
  await page.addInitScript(() => {
    (window as unknown as { __CATACOMB_FAST__: boolean }).__CATACOMB_FAST__ =
      true;
  });
  // English by default so the game starts without the language screen.
  await page.addInitScript(() => {
    localStorage.setItem("catacomb-cats.lang", "en");
    // The tutorial question has its own tests (tests/tutorial.spec.ts).
    localStorage.setItem("catacomb-cats.tutorial", "skipped");
  });
  await page.addInitScript(() => {
    const w = window as unknown as {
      __CATACOMB_SEED__: number;
      __CATACOMB_CRIT__: "off";
    };
    // No random critical hits, so damage numbers stay exact.
    w.__CATACOMB_CRIT__ = "off";
  });
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
    await page.getByTestId("end-turn").click();
  }
  throw new Error(`Could not reach ${name}'s turn`);
}

/** Waits for the opening hits and the threat preview to finish, when hovering works. */
async function previewDone(page: Page) {
  await expect(
    page.locator('.battlefield[data-previewing="false"]'),
  ).toBeVisible({ timeout: 10000 });
}

/** Runs the battle pauses at their real length (the default is the fast test timing). */
async function realTiming(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __CATACOMB_FAST__: boolean }).__CATACOMB_FAST__ =
      false;
  });
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
  // Every action now pauses briefly, so a full expedition takes longer.
  test.slow();
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
          ? "Room reward: +40 gold, +30 XP"
          : "Room reward: +60 gold, +45 XP",
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
    await expect(page.getByTestId("end-turn")).toBeVisible();
    await page
      .locator(".enemies .combatant:not(.dead) .unit-target")
      .first()
      .click();
    const attack = page.getByRole("button", {
      name: /^(Claw strike|Moon bolt|Valiant slash|Thorn swipe|Cinder jab)/,
    });
    await expect(page.getByTestId("end-turn")).toBeEnabled();
    if (await attack.isEnabled()) await attack.click();
    else await page.getByTestId("end-turn").click();
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
  await expect(page.locator(".currency")).toContainText("210 gold");
  await expect(page.locator(".top-meta")).toContainText("135 XP");
  await enterDungeon(page);
  for (const health of await page.locator(".allies .health-value").all()) {
    const values = (await health.innerText()).match(/(\d+) \/ (\d+) HP/)!;
    expect(values[1]).toBe(values[2]);
  }
  await page.reload();
  await expect(page.locator(".currency")).toContainText("210 gold");
  await expect(page.locator(".top-meta")).toContainText("135 XP");
});

test("defeat resets the expedition while preserving permanent upgrades", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Improve blessing/ }).click();
  await expect(page.getByText("Hearth blessing · Rank 1")).toBeVisible();
  await expect(page.locator(".hearth-next")).toContainText(
    "Next rank 2 · Sharpened claws",
  );
  await enterDungeon(page);
  for (let turn = 0; turn < 150; turn++) {
    const end = page.getByTestId("end-turn");
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
  await page.getByTestId("end-turn").click();
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

test("1 AP support skills stop after three uses with AP still available", async ({
  page,
}) => {
  await page.goto("/");
  await enterDungeon(page);
  await page.getByTestId("end-turn").click();
  await page.getByTestId("end-turn").click();
  await pickTarget(page, "miso");
  const guard = page.getByRole("button", { name: /^Nine lives/ });
  await guard.click();
  await pickTarget(page, "luna");
  await guard.click();
  await pickTarget(page, "pip");
  await guard.click();
  await expect(guard).toBeDisabled();
  await expect(page.locator(".round-counter")).toContainText("3 / 6 AP");
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
    "Rank 3 unlocks Stand behind me · now 0/3",
  );
  await miso.getByRole("button", { name: /^Train Miso/ }).click();
  await expect(miso.locator(".stats")).toContainText("43");
  await expect(page.locator(".currency")).toContainText("10 gold");
  await enterDungeon(page);
  await page.getByTestId("end-turn").click();
  await page.getByTestId("end-turn").click();
  await pickTarget(page, "e0");
  await expect(
    page.getByRole("button", { name: /^Valiant slash/ }),
  ).toContainText("5 damage");
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
    "Power 3",
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
    "Deals 4 · 32 HP left",
  );
  await strike.click();
  await expect(page.locator('[data-unit="e0"] .unit-target')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(rat).toHaveAttribute("aria-pressed", "true");
  await expect(strike).toBeEnabled();
  await expect(page.locator(".round-counter")).toContainText("5 / 6 AP");
  await page.getByTestId("end-turn").click();
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
  await page.getByRole("button", { name: /^Dagger line/ }).click();
  const strike = page.getByRole("button", { name: /^Claw strike/ });
  await strike.click();
  await expect(page.locator('[data-unit="e1"] .unit-target')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await strike.click();
  await strike.click();
  // Two AP remain but Pip has nothing usable left, so the turn passes by itself.
  await expect(page.locator(".command-deck h2")).toHaveText("Luna");
  await pickTarget(page, "e1");
  const moonBolt = page.getByRole("button", { name: /^Moon bolt/ });
  await moonBolt.click();
  await moonBolt.click();
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
  await expect(page.getByRole("tooltip")).toContainText("3");
  await expect(page.getByRole("tooltip")).toContainText("Lasts 3 turns");
  await page.getByTestId("end-turn").click();
  await expect(page.locator(".command-deck h2")).toHaveText("Pip");
  await guard.focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await expect(page.getByRole("tooltip")).toContainText("Lasts 3 turns");
  await page.getByTestId("end-turn").click();
  await expect(page.locator(".command-deck h2")).toHaveText("Luna");
  await guard.hover();
  await expect(page.getByRole("tooltip")).toContainText("Lasts 3 turns");
  await page.getByTestId("end-turn").click();
  await expect(page.locator(".command-deck h2")).toHaveText("Miso");
  await guard.hover();
  await expect(page.getByRole("tooltip")).toContainText("Lasts 2 turns");
});

test("an attack clears a defeated target even when the same cat still has AP", async ({
  page,
}) => {
  // Hearth rank 2 and mastery 3 add +2 attack so two bolts leave the rat alive and the third finishes it.
  await seedLegacySave(page, {
    catLevels: { luna: 3 },
    generalLevel: 2,
    xp: 450,
  });
  await page.goto("/");
  await enterDungeon(page);
  await pickTarget(page, "e0");
  await page.getByRole("button", { name: /^Dagger line/ }).click();
  await page.getByRole("button", { name: /^Claw strike/ }).click();
  await page.getByTestId("end-turn").click();
  await pickTarget(page, "e0");
  const bolt = page.getByRole("button", { name: /^Moon bolt/ });
  await bolt.click();
  await bolt.click();
  await expect(page.locator('[data-unit="e0"] .unit-target')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await bolt.click();
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
    await page.getByTestId("end-turn").click();
  }
  await expect(luna.locator(".health-value")).toHaveText("0 / 30 HP");
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
  await expect(luna.locator(".health-value")).toHaveText("18 / 30 HP");
  await expect(page.locator('.unit-target[aria-pressed="true"]')).toHaveCount(
    0,
  );
  await expect(renewal).toBeEnabled();
  await expect(renewal.locator(".ability-cooldown")).toHaveCount(0);
  await expect(revive.locator(".ability-cooldown")).toContainText(
    "Ready in 3 turns",
  );
  for (const remaining of [2, 1]) {
    await page.getByTestId("end-turn").click();
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
  await page.getByTestId("end-turn").click();
  await advanceToCat(page, "Mei");
  await expect(revive.locator(".ability-cooldown")).toContainText(
    "Cooldown: 2 turns",
  );
});

test("Ember Flame paw has a one-turn cooldown while Cinder jab has none", async ({
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
    "Ready in 2 turns",
  );
  const claw = page.getByRole("button", { name: /^Cinder jab/ });
  await expect(claw).toBeEnabled();
  await expect(claw.locator(".ability-cooldown")).toHaveCount(0);
  await page.getByTestId("end-turn").click();
  await advanceToCat(page, "Ember");
  await pickTarget(page, "e1");
  await expect(flame).toBeDisabled();
  await expect(flame.locator(".ability-cooldown")).toContainText(
    "Ready in 1 turn",
  );
  await expect(claw).toBeEnabled();
  await claw.click();
  await expect(claw).toBeEnabled();
  await expect(claw.locator(".ability-cooldown")).toHaveCount(0);
  await page.getByTestId("end-turn").click();
  await advanceToCat(page, "Ember");
  await pickTarget(page, "e1");
  await expect(flame).toBeEnabled();
  await expect(flame.locator(".ability-cooldown")).toContainText(
    "Cooldown: 1 turn",
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
  await expect(guard).toContainText("Shield 1 ally for 10");
  await guard.click();
  await page.getByTestId("end-turn").click();
  await advanceToCat(page, "Miso");
  const luna = page
    .locator(".allies .combatant")
    .filter({ has: page.getByRole("heading", { name: "Luna", exact: true }) });
  await expect(
    // The enemy hit (10 power) consumed the whole 10 point shield.
    luna.getByRole("button", { name: /^Guard:/ }),
  ).toHaveCount(0);
  await pickTarget(page, "luna");
  await expect(guard).toBeEnabled();
  await guard.click();
  const shield = luna.getByRole("button", { name: "Guard: 10", exact: true });
  await expect(shield).toBeVisible();
  await shield.hover();
  await expect(page.getByRole("tooltip")).toContainText("Lasts 3 turns");
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
  await previewDone(page);
  await page.getByRole("button", { name: "Target Crypt rat" }).hover();
  await expect(page.getByTestId("intent-note")).toContainText(
    "Crypt rat next turn: Attack →",
  );
  await expect(page.locator(".intent-line.hostile")).toHaveCount(1);
  await expect(page.locator(".combatant.marked")).toHaveCount(1);
  await previewDone(page);
  await page.getByRole("button", { name: "Target Moss slime" }).hover();
  await expect(page.getByTestId("intent-note")).toContainText(
    "Moss slime next turn: Inspire an ally → Crypt rat",
  );
  await expect(page.locator(".intent-line.friendly")).toHaveCount(1);
  await expect(page.locator(".intent-line.hostile")).toHaveCount(0);
  await expect(page.locator(".combatant.marked")).toHaveCount(0);
  await previewDone(page);
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
  await previewDone(page);
  await page.locator('[data-unit="e0"] .unit-target').hover();
  const markedCat = page.locator(".allies .combatant.marked");
  await expect(markedCat).toHaveCount(1);
  const markedId = (await markedCat.getAttribute("data-unit"))!;
  await page.mouse.move(0, 0);
  await expect(page.getByTestId("intent-arrows")).toHaveCount(0);
  await previewDone(page);
  await page.locator(`[data-unit="${markedId}"] .unit-target`).hover();
  await expect(page.locator(".intent-line.hostile")).toHaveCount(1);
  await expect(page.locator(`[data-unit="${markedId}"]`)).toHaveClass(/marked/);
  // The Moss slime will inspire the rat, so hovering the rat shows both threads.
  await previewDone(page);
  await page.locator('[data-unit="e0"] .unit-target').hover();
  await expect(page.locator(".intent-line.friendly")).toHaveCount(1);
  await expect(page.locator(".intent-line.hostile")).toHaveCount(1);
  // Moving the mouse away clears the threads once the opening preview is over.
  await page.mouse.move(0, 0);
  await expect(page.getByTestId("intent-arrows")).toHaveCount(0);
});

test("enemies do not always mark the same cat", async ({ page }) => {
  await page.goto("/");
  await enterDungeon(page);
  const marked = new Set<string>();
  for (let i = 0; i < 8; i++) {
    await page.getByRole("button", { name: "Target Crypt rat" }).click();
    const note = await page.getByTestId("intent-note").textContent();
    marked.add(note!.split("→")[1]!.trim());
    await page.getByTestId("end-turn").click();
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
  await realTiming(page);
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
  await page.getByTestId("end-turn").click();
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
  await previewDone(page);
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
  await expect(skills("Ember")).toContainText("Cooldown: 1 turn");
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

test("the first visit shows only a language screen and remembers the choice", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.removeItem("catacomb-cats.lang"));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Select Your Language" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "English" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Español" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Enter the dungeon/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Español" }).click();
  await expect(
    page.getByRole("button", { name: /Entrar en la mazmorra/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("catacomb-cats.lang")),
  ).toBe("es");
  expect(await page.evaluate(() => document.documentElement.lang)).toBe("es");
});

test("the Language menu switches between English and Spanish at any time", async ({
  page,
}) => {
  await page.goto("/");
  const language = page.getByLabel("Language");
  await expect(language).toHaveValue("en");
  await language.selectOption("es");
  await expect(
    page.getByRole("heading", { name: "La Madriguera" }),
  ).toBeVisible();
  await expect(page.getByText("Maestría de la compañía")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Entrenar a Miso/ }),
  ).toBeVisible();
  // Enemies, skills and the log are translated in the middle of an expedition.
  await page.getByRole("button", { name: /Entrar en la mazmorra/ }).click();
  await expect(page.getByRole("button", { name: /^Zarpazo/ })).toBeVisible();
  await expect(page.locator(".difficulty-banner")).toContainText(
    "Fuerza de expedición +0 (+0 de daño a todos los gatos)",
  );
  await expect(page.getByLabel("Registro de combate")).toContainText(
    "El descenso comienza",
  );
  await pickTarget(page, "e0");
  await expect(page.locator(".command-heading")).toContainText(
    "Objetivo: Rata de cripta",
  );
  await page.getByRole("button", { name: /^Zarpazo/ }).click();
  await expect(page.getByLabel("Registro de combate")).toContainText(
    "Pip usa Zarpazo.",
  );
  await expect(page.getByLabel("Registro de combate")).toContainText(
    "golpea a Rata de cripta",
  );
  await page.getByLabel("Idioma").selectOption("en");
  await expect(page.getByLabel("Combat log")).toContainText(
    "Pip uses Claw strike.",
  );
  await expect(page.getByLabel("Combat log")).toContainText("hits Crypt rat");
  await page.reload();
  await expect(page.getByLabel("Language")).toHaveValue("en");
});

test("the field guide is fully available in Spanish", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("catacomb-cats.lang", "es"),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "FAQ", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Guía de campo" }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: /Preguntas frecuentes/ }),
  ).toBeVisible();
  await expect(page.locator(".faq-entries summary").first()).toHaveText(
    "¿Cómo funcionan los turnos y los PA?",
  );
  await page.getByRole("tab", { name: /Compañeros/ }).click();
  const skills = page.getByRole("list", {
    name: "Habilidades de Ember",
    exact: true,
  });
  await expect(skills).toContainText("Jab de brasa");
  await expect(skills).toContainText("Garra de fuego");
  await expect(skills).toContainText("Enfriamiento: 1 turno");
  await expect(
    page.getByRole("list", {
      name: "Rangos de entrenamiento de Miso",
      exact: true,
    }),
  ).toContainText("Patas robustas");
});

test("lobby says which rank is the next one", async ({ page }) => {
  await page.goto("/");
  const miso = page
    .locator(".cat-card")
    .filter({ has: page.getByRole("heading", { name: "Miso", exact: true }) });
  await expect(miso.locator(".training-description")).toContainText(
    "Next rank 1 · Sturdy paws",
  );
  await expect(page.locator(".hearth-next")).toContainText(
    "Next rank 1 · Warm embers",
  );
});

test("a curse is drawn as a violet thread", async ({ page }) => {
  await seedLegacySave(page, { generalLevel: 8 });
  await page.goto("/");
  await enterDungeon(page);
  for (let step = 0; step < 80; step++) {
    const next = page.getByRole("button", { name: "Continue to next room" });
    if (await next.isVisible()) {
      await next.click();
      break;
    }
    await page
      .locator(".enemies .combatant:not(.dead) .unit-target")
      .first()
      .click();
    const attack = page.getByRole("button", {
      name: /^(Claw strike|Moon bolt|Valiant slash|Thorn swipe|Cinder jab)/,
    });
    await expect(page.getByTestId("end-turn")).toBeEnabled();
    if (await attack.isEnabled()) await attack.click();
    else await page.getByTestId("end-turn").click();
  }
  await expect(
    page.getByRole("heading", { name: "The forgotten hall" }),
  ).toBeVisible();
  await previewDone(page);
  await page.getByRole("button", { name: "Target Spore imp" }).hover();
  await expect(page.locator(".intent-line.curse")).toHaveCount(1);
  await expect(page.getByTestId("intent-note")).toContainText("Curse");
  const stroke = await page
    .locator(".intent-line.curse")
    .evaluate((el) => getComputedStyle(el).stroke);
  expect(stroke).toBe("rgb(181, 124, 255)");
});

test("Taunt makes every enemy mark Miso", async ({ page }) => {
  await seedLegacySave(page, { catLevels: { miso: 3 } });
  await page.goto("/");
  await enterDungeon(page);
  await advanceToCat(page, "Miso");
  await page.getByRole("button", { name: /^Stand behind me/ }).click();
  await previewDone(page);
  await page.getByRole("button", { name: "Target Crypt rat" }).hover();
  await expect(page.locator('[data-unit="miso"]')).toHaveClass(/marked/);
  await expect(page.getByTestId("intent-note")).toContainText("Miso");
});

test("Dagger line hits the target and the enemy behind it", async ({
  page,
}) => {
  await page.goto("/");
  await enterDungeon(page);
  await pickTarget(page, "e0");
  const line = page.getByRole("button", { name: /^Dagger line/ });
  await expect(line).toContainText(
    "Hit 1 enemy for 5, the one behind it for 3 and the next for 2.",
  );
  await line.click();
  await expect(page.locator('[data-unit="e0"] .health-value')).toHaveText(
    "31 / 36 HP",
  );
  await expect(page.locator('[data-unit="e1"] .health-value')).toHaveText(
    "41 / 44 HP",
  );
  await expect(line).toBeDisabled();
});

test("a critical hit is announced over its target", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __CATACOMB_CRIT__: number }).__CATACOMB_CRIT__ =
      100;
  });
  await page.goto("/");
  await enterDungeon(page);
  await pickTarget(page, "e0");
  await page.getByRole("button", { name: /^Claw strike/ }).click();
  await expect(page.locator('[data-unit="e0"] .crit-pop')).toHaveText(
    "CRITICAL!",
  );
  await expect(page.locator('[data-unit="e0"]')).toHaveClass(/crit/);
  await expect(page.getByLabel("Combat log")).toContainText(
    "Pip scores a critical hit on Crypt rat!",
  );
  await expect(page.locator('[data-unit="e0"] .health-value')).toHaveText(
    "30 / 36 HP",
  );
});

test("Needle strike ignores armor and shields in the preview and the result", async ({
  page,
}) => {
  await seedLegacySave(page, { catLevels: { pip: 3 } });
  await page.goto("/");
  await enterDungeon(page);
  await pickTarget(page, "e0");
  const needle = page.getByRole("button", { name: /^Needle strike/ });
  await expect(needle).toContainText("Ignores armor, shields and Ice Ward.");
  await expect(needle).toContainText(/Deals \d+ · \d+ HP left/);
  await expect(needle).not.toContainText("blocked");
});

test("hovering is locked during the threat preview of each turn", async ({
  page,
}) => {
  await realTiming(page);
  await page.goto("/");
  await enterDungeon(page);
  await expect(page.locator(".battlefield")).toHaveAttribute(
    "data-previewing",
    "true",
  );
  await page.getByRole("button", { name: "Target Crypt rat" }).hover();
  // The note and the hovered thread do not appear while the preview plays.
  await expect(page.getByTestId("intent-note")).toHaveCount(0);
  await previewDone(page);
  await page.mouse.move(0, 0);
  await page.getByRole("button", { name: "Target Crypt rat" }).hover();
  await expect(page.getByTestId("intent-note")).toContainText("Crypt rat");
  await page.getByTestId("end-turn").click();
  await expect(page.locator(".battlefield")).toHaveAttribute(
    "data-previewing",
    "true",
  );
});

async function chooseParty(page: Page, add: string[], remove: string[]) {
  const card = (name: string) =>
    page
      .locator(".cat-card")
      .filter({ has: page.getByRole("heading", { name, exact: true }) });
  for (const name of remove)
    await card(name).getByRole("button", { name: "Remove from party" }).click();
  for (const name of add)
    await card(name).getByRole("button", { name: "Add to party" }).click();
}

test("a room opens with the round banner, then each enemy attacks alone, then threads show", async ({
  page,
}) => {
  await realTiming(page);
  await page.goto("/");
  // Mei, Ember and Miso act after the Crypt rat, so it strikes first.
  await chooseParty(page, ["Mei", "Ember"], ["Luna", "Pip"]);
  await page.getByRole("button", { name: "Enter the dungeon" }).click();
  await expect(page.locator(".round-banner")).toHaveText("ROUND 1");
  await expect(page.getByTestId("end-turn")).toBeDisabled();
  // Nothing has landed yet while the banner is up.
  for (const health of await page.locator(".allies .health-value").all()) {
    const values = (await health.innerText()).match(/(\d+) \/ (\d+) HP/)!;
    expect(values[1]).toBe(values[2]);
  }
  await expect(page.locator(".round-banner")).toHaveCount(0, { timeout: 3000 });
  await expect(page.locator(".combatant.acting")).toHaveCount(1);
  await expect(
    page.getByRole("status").filter({ hasText: "The enemies strike first!" }),
  ).toBeVisible();
  // No threads and no labels until the enemy phase has ended.
  await expect(page.getByTestId("intent-arrows")).toHaveCount(0);
  await expect(page.locator(".next-target")).toHaveCount(0);
  await expect(page.locator(".combatant.acting")).toHaveCount(0);
  await expect(page.locator(".intro-banner")).toHaveCount(0, { timeout: 5000 });
  // The threads come after, one enemy at a time, each with its label.
  await expect(page.locator(".next-target")).toHaveCount(1);
  await expect(page.locator(".next-target")).toContainText(/^Next/);
  await expect(page.locator(".intent-line")).toHaveCount(1);
  await previewDone(page);
  await page.getByRole("button", { name: "Target Moss slime" }).hover();
  await expect(page.getByTestId("intent-note")).toContainText(
    "Moss slime next turn: Inspire an ally → Crypt rat",
  );
  await expect(page.locator(".next-target.friendly")).toContainText(
    "Next: supports Crypt rat",
  );
  await expect(page.locator(".intent-line.friendly")).toHaveCount(1);
  await expect(page.locator(".intent-line.hostile")).toHaveCount(0);
  await expect(page.locator(".combatant.marked")).toHaveCount(0);
  await previewDone(page);
  await page.getByRole("button", { name: "Target Miso" }).hover();
  await expect(page.getByTestId("intent-arrows")).toHaveCount(0);
  await expect(page.locator(".combatant.marked")).toHaveCount(0);
});

test("a new round is announced by a banner before the enemies act", async ({
  page,
}) => {
  await realTiming(page);
  await page.goto("/");
  await enterDungeon(page);
  await previewDone(page);
  let seen = false;
  for (let i = 0; i < 6 && !seen; i++) {
    await page.getByTestId("end-turn").click();
    seen = await page
      .locator(".round-banner")
      .filter({ hasText: "ROUND 2" })
      .waitFor({ timeout: 2500 })
      .then(() => true)
      .catch(() => false);
    if (!seen) await previewDone(page);
  }
  expect(seen).toBe(true);
  // While the banner is up the controls are locked and no thread is drawn.
  await expect(page.getByTestId("end-turn")).toBeDisabled();
  await expect(page.getByTestId("intent-arrows")).toHaveCount(0);
  await expect(page.locator(".round-banner")).toHaveCount(0, { timeout: 3000 });
  await previewDone(page);
  await expect(page.getByTestId("end-turn")).toBeEnabled();
});

test("the turn button passes to the next cat and ends the turn on the last one", async ({
  page,
}) => {
  await page.goto("/");
  await enterDungeon(page);
  const button = page.getByTestId("end-turn");
  await expect(button).toHaveText("Pass to Luna");
  await button.click();
  await expect(button).toHaveText("Pass to Miso");
  await button.click();
  await expect(button).toHaveText("End turn");
});

test("ability points are explained as shared by the whole party", async ({
  page,
}) => {
  await page.goto("/");
  await enterDungeon(page);
  const counter = page.locator(".actions .round-counter");
  await expect(counter).toContainText("SHARED AP");
  await expect(counter).toContainText("Shared by all your cats");
  await expect(counter).toContainText("6 / 6 AP");
});

test("the chosen party is remembered after a reload", async ({ page }) => {
  await page.goto("/");
  await chooseParty(page, ["Mei", "Ember"], ["Luna", "Pip"]);
  await page.reload();
  const toggle = (name: string) =>
    page
      .locator(".cat-card")
      .filter({ has: page.getByRole("heading", { name, exact: true }) })
      .getByRole("button", { name: /party/ });
  await expect(toggle("Mei")).toHaveText("Remove from party");
  await expect(toggle("Ember")).toHaveText("Remove from party");
  await expect(toggle("Miso")).toHaveText("Remove from party");
  await expect(toggle("Luna")).toHaveText("Add to party");
  await expect(toggle("Pip")).toHaveText("Add to party");
});

test("a broken saved party falls back to the default", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("catacomb-cats.party", '["x","miso","miso"]'),
  );
  await page.goto("/");
  await expect(page.locator(".party-count")).toContainText("3");
  await expect(
    page
      .locator(".cat-card")
      .filter({ has: page.getByRole("heading", { name: "Pip", exact: true }) })
      .getByRole("button", { name: /party/ }),
  ).toHaveText("Remove from party");
});

test("hovering a skill outlines the units it can reach in yellow", async ({
  page,
}) => {
  await page.goto("/");
  await enterDungeon(page);
  await expect(page.locator(".combatant.aimed")).toHaveCount(0);
  await page.getByRole("button", { name: /^Claw strike/ }).hover();
  await expect(page.locator(".enemies .combatant.aimed")).toHaveCount(2);
  await expect(page.locator(".allies .combatant.aimed")).toHaveCount(0);
  const outline = await page
    .locator(".enemies .combatant.aimed")
    .first()
    .evaluate((el) => getComputedStyle(el).boxShadow);
  expect(outline).toMatch(/255, 216, 74/);
  await pickTarget(page, "e1");
  await page.getByRole("button", { name: /^Claw strike/ }).hover();
  await expect(page.locator(".enemies .combatant.aimed")).toHaveCount(1);
  await page.mouse.move(0, 0);
  await expect(page.locator(".combatant.aimed")).toHaveCount(0);
});

test("Mei's group heal outlines all living allies and Sweeping embers all enemies", async ({
  page,
}) => {
  await seedLegacySave(page, { catLevels: { clover: 3, ember: 3 } });
  await page.goto("/");
  await chooseParty(page, ["Mei", "Ember"], ["Luna", "Pip"]);
  await enterDungeon(page);
  await advanceToCat(page, "Ember");
  await page.getByRole("button", { name: /^Sweeping embers/ }).hover();
  await expect(page.locator(".enemies .combatant.aimed")).toHaveCount(2);
  await advanceToCat(page, "Mei");
  await page.getByRole("button", { name: /^Circle of renewal/ }).hover();
  await expect(page.locator(".allies .combatant.aimed")).toHaveCount(3);
});

test("a skill on cooldown shows a badge above its owner with the turns left", async ({
  page,
}) => {
  await page.goto("/");
  await enterDungeon(page);
  await pickTarget(page, "e0");
  await page.getByRole("button", { name: /^Dagger line/ }).click();
  const badge = page
    .locator('[data-unit="pip"]')
    .getByRole("button", { name: "Cooldown · Dagger line: 2" });
  await expect(badge).toBeVisible();
  await badge.hover();
  await expect(page.getByRole("tooltip")).toContainText("Ready in 2 turns");
});

test("a short loading screen shows before the battle starts", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the dungeon" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Entering the dungeon…" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enter the dungeon" }),
  ).toBeDisabled();
  await expect(page.locator(".command-deck")).toBeVisible();
  await expect(page.locator(".entering-overlay")).toHaveCount(0);
  // The scenery is already loaded when the battle appears.
  const loaded = await page.evaluate(() =>
    ["art/crypt.png", "art/characters.png"].every((src) =>
      performance
        .getEntriesByType("resource")
        .some((e) => e.name.endsWith(src)),
    ),
  );
  expect(loaded).toBe(true);
});

test("a missed or evaded attack is announced over its target", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __CATACOMB_CRIT__?: number };
    delete w.__CATACOMB_CRIT__;
    (window as unknown as { __CATACOMB_SEED__: number }).__CATACOMB_SEED__ = 3;
  });
  await page.goto("/");
  await enterDungeon(page);
  await pickTarget(page, "e0");
  await page.getByRole("button", { name: /^Claw strike/ }).click();
  await expect(page.locator('[data-unit="e0"] .pop-avoid')).toHaveText(
    /MISS!|EVADED!/,
  );
});

test("hovering Dagger line outlines only the chosen enemy", async ({
  page,
}) => {
  await page.goto("/");
  await enterDungeon(page);
  await pickTarget(page, "e0");
  await page.getByRole("button", { name: /^Dagger line/ }).hover();
  await expect(page.locator(".allies .combatant.aimed")).toHaveCount(0);
  await expect(page.locator('.enemies [data-unit="e0"].aimed')).toHaveCount(1);
});

test("hovering Healing purr outlines the chosen ally, or Mei when nobody is chosen", async ({
  page,
}) => {
  await seedLegacySave(page, { catLevels: { clover: 3, ember: 3 } });
  await page.goto("/");
  await chooseParty(page, ["Mei", "Ember"], ["Luna", "Pip"]);
  await enterDungeon(page);
  await advanceToCat(page, "Mei");
  const heal = page.getByRole("button", { name: /^Healing purr/ });
  await heal.hover();
  await expect(page.locator(".combatant.aimed")).toHaveCount(1);
  await expect(page.locator('[data-unit="clover"].aimed')).toHaveCount(1);
  await pickTarget(page, "ember");
  await heal.hover();
  await expect(page.locator(".combatant.aimed")).toHaveCount(1);
  await expect(page.locator('[data-unit="ember"].aimed')).toHaveCount(1);
});

test("the cat whose turn it is announces it and actions pause briefly", async ({
  page,
}) => {
  await realTiming(page);
  await page.goto("/");
  await enterDungeon(page);
  await expect(page.locator(".turn-banner")).toHaveText("Your turn!");
  await pickTarget(page, "e0");
  await page.getByRole("button", { name: /^Claw strike/ }).click();
  await expect(page.getByTestId("end-turn")).toBeDisabled();
  await expect(page.getByTestId("end-turn")).toBeEnabled();
});
