import { expect, test, type Page } from "@playwright/test";

const progressKey = "catacomb-cats.progress.v1";

test.beforeEach(async ({ page }) => {
  // Battle pauses are covered by the "enemy phase" tests; the rest skip them.
  await page.addInitScript(() => {
    (window as unknown as { __CATACOMB_FAST__: boolean }).__CATACOMB_FAST__ =
      true;
  });
  await page.addInitScript(() => {
    const w = window as unknown as {
      __CATACOMB_SEED__: number;
      __CATACOMB_CRIT__: "off";
    };
    w.__CATACOMB_SEED__ = 1;
    w.__CATACOMB_CRIT__ = "off";
    localStorage.setItem("catacomb-cats.lang", "en");
  });
});

// Only the first load of a test is a "first visit"; reloads keep the answer.
const freshVisit = (page: Page) =>
  page.addInitScript(() => {
    if (sessionStorage.getItem("test-first-load")) return;
    sessionStorage.setItem("test-first-load", "1");
    localStorage.removeItem("catacomb-cats.tutorial");
  });
const answered = (page: Page) =>
  page.addInitScript(() => {
    if (!localStorage.getItem("catacomb-cats.tutorial"))
      localStorage.setItem("catacomb-cats.tutorial", "skipped");
  });
const coach = (page: Page) =>
  page.getByRole("complementary", { name: "Tutorial" });
const next = (page: Page) =>
  page.getByRole("button", { name: "Next", exact: true });
const openTutorial = (page: Page) =>
  page.getByRole("button", { name: "Tutorial", exact: true }).click();

test("the first visit asks once and remembers the answer", async ({ page }) => {
  await freshVisit(page);
  await page.goto("/");
  await expect(page.getByRole("dialog", { name: "New here?" })).toBeVisible();
  await page.getByRole("button", { name: "Not now" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("catacomb-cats.tutorial")),
  ).toBe("skipped");
});

test("it can be opened again at any time from the Tutorial button", async ({
  page,
}) => {
  await answered(page);
  await page.goto("/");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await openTutorial(page);
  await expect(coach(page)).toContainText("Welcome to the Burrow");
  await expect(coach(page)).toContainText("Step 1 of 12");
  await page.getByRole("button", { name: "Skip tutorial" }).click();
  await expect(coach(page)).toHaveCount(0);
  await openTutorial(page);
  await expect(coach(page)).toContainText("Welcome to the Burrow");
});

test("lobby steps highlight what they explain, then a practice battle starts", async ({
  page,
}) => {
  await freshVisit(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Start tutorial" }).click();
  await expect(page.locator(".roster.tutorial-spot")).toBeVisible();
  await next(page).click();
  await expect(coach(page)).toContainText("Training, gold and trinkets");
  await expect(page.locator(".tutorial-spot").first()).toBeVisible();
  await next(page).click();
  await expect(coach(page)).toContainText("XP, mastery and the Hearth");
  await next(page).click();
  await expect(coach(page)).toContainText("Rooms, boss and Threat");
  await expect(page.locator(".expedition-gate.tutorial-spot")).toBeVisible();
  await page.getByRole("button", { name: "Start practice battle" }).click();
  await expect(page.locator(".practice-badge")).toBeVisible();
  await expect(coach(page)).toContainText("Turn order");
  await expect(page.locator(".initiative.tutorial-spot")).toBeVisible();
});

test("the practice battle teaches by doing and never touches real progress", async ({
  page,
}) => {
  await freshVisit(page);
  await page.addInitScript((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        gold: 77,
        xp: 40,
        generalLevel: 0,
        catLevels: {},
        equipment: {},
        inventory: ["Iron bell"],
        claimedRuns: [],
      }),
    );
  }, progressKey);
  await page.goto("/");
  await page.getByRole("button", { name: "Start tutorial" }).click();
  for (let i = 0; i < 3; i++) await next(page).click();
  await page.getByRole("button", { name: "Start practice battle" }).click();
  await next(page).click();
  await expect(coach(page)).toContainText("Shared ability points");
  await expect(page.locator(".round-counter.tutorial-spot")).toBeVisible();
  await next(page).click();
  // The attack step waits for the player to act.
  await expect(coach(page)).toContainText("Pick a target and attack");
  await expect(next(page)).toHaveCount(0);
  await expect(coach(page)).toContainText("Do it to continue");
  await page.locator('[data-unit="e0"] .unit-target').click();
  await page.getByRole("button", { name: /^Claw strike/ }).click();
  await expect(coach(page)).toContainText("Each skill says what it does");
  await next(page).click();
  await expect(coach(page)).toContainText("Passing the turn");
  await expect(
    page.locator('[data-testid="end-turn"].tutorial-spot'),
  ).toBeVisible();
  // Only the turn button works here, so the room cannot be won early.
  await expect(
    page.getByRole("button", { name: /^Claw strike/ }),
  ).toBeDisabled();
  await page.getByTestId("end-turn").click();
  await expect(coach(page)).toContainText("Enemy threats");
  // Explaining steps freeze the fight so it cannot be finished behind the coach.
  await expect(page.getByTestId("end-turn")).toBeDisabled();
  await expect(
    page.locator(".ability-grid:not(.ghost) button").first(),
  ).toBeDisabled();
  await next(page).click();
  await expect(coach(page)).toContainText("Defeat the enemies");
  for (let i = 0; i < 80; i++) {
    if (await page.getByRole("heading", { name: "The way opens." }).isVisible())
      break;
    const foe = page
      .locator(".enemies .combatant:not(.dead) .unit-target")
      .first();
    if (await foe.count()) await foe.click();
    const attack = page.getByRole("button", {
      name: /^(Claw strike|Moon bolt|Valiant slash)/,
    });
    await expect(page.getByTestId("end-turn")).toBeEnabled();
    if (await attack.isEnabled()) await attack.click();
    else await page.getByTestId("end-turn").click();
  }
  await expect(coach(page)).toContainText("Loot and what comes next");
  await expect(
    page.getByText("Practice rewards are not kept.").first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Finish tutorial" }).first().click();
  await expect(coach(page)).toHaveCount(0);
  await expect(page.locator(".practice-badge")).toHaveCount(0);
  await expect(page.locator(".currency")).toContainText("77 gold");
  await expect(page.locator(".top-meta")).toContainText("40 XP");
  expect(
    await page.evaluate(() => localStorage.getItem("catacomb-cats.tutorial")),
  ).toBe("done");
});

test("retreating from the practice battle ends the tutorial without saving rewards", async ({
  page,
}) => {
  await answered(page);
  await page.goto("/");
  await openTutorial(page);
  for (let i = 0; i < 3; i++) await next(page).click();
  await page.getByRole("button", { name: "Start practice battle" }).click();
  await page.getByRole("button", { name: "Retreat to lobby" }).click();
  await expect(coach(page)).toHaveCount(0);
  await expect(page.locator(".roster")).toBeVisible();
});

test("the tutorial is available in Spanish", async ({ page }) => {
  await answered(page);
  await page.addInitScript(() =>
    localStorage.setItem("catacomb-cats.lang", "es"),
  );
  await page.goto("/");
  await openTutorial(page);
  const guide = page.getByRole("complementary", { name: "Tutorial" });
  await expect(guide).toContainText("Bienvenido a la Madriguera");
  await expect(guide).toContainText("Paso 1 de 12");
  await page.getByRole("button", { name: "Saltar tutorial" }).click();
  await expect(guide).toHaveCount(0);
});

test("the button is unavailable during a real expedition", async ({ page }) => {
  await answered(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the dungeon" }).click();
  await expect(page.locator(".command-deck")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tutorial", exact: true }),
  ).toBeDisabled();
});

// Relic offers have their own test; the rest start straight in the room.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __CATACOMB_RELICS__?: boolean };
    w.__CATACOMB_RELICS__ ??= false;
  });
});
