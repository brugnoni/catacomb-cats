import { expect, test, type Page } from "@playwright/test";

const saveKey = "catacomb-cats.progress.v1";

test.beforeEach(async ({ page }) => {
  // Battle pauses are covered by the "enemy phase" tests; the rest skip them.
  await page.addInitScript(() => {
    (window as unknown as { __CATACOMB_FAST__: boolean }).__CATACOMB_FAST__ =
      true;
  });
  await page.addInitScript(() => {
    localStorage.setItem("catacomb-cats.lang", "en");
    // The tutorial question has its own tests (tests/tutorial.spec.ts).
    localStorage.setItem("catacomb-cats.tutorial", "skipped");
  });
});

/** A save with the given overrides; only written when the browser has none yet. */
async function seedSave(page: Page, overrides: Record<string, unknown> = {}) {
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

test("the expedition picker shows locked routes and enters an unlocked one", async ({
  page,
}) => {
  await seedSave(page, {
    claimedRuns: ["a", "b", "c"],
    expeditionWins: { catacombs: 3 },
  });
  await page.goto("/");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Choose expedition" }).click();
  const dialog = page.getByRole("dialog", { name: "Choose expedition" });
  await expect(dialog.getByRole("heading")).toHaveText("Choose expedition");
  const vault = page.locator('[data-expedition="vault"]');
  await expect(vault).toContainText("Locked · win Moss Warrens 5 times (0/5)");
  await expect(vault.getByRole("button")).toBeDisabled();
  // Escape closes it without changing the choice.
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".expedition-gate h2")).toHaveText("The Catacombs");
  await page.getByRole("button", { name: "Choose expedition" }).click();
  await page.locator('[data-expedition="warrens"] button').click();
  // Picking an open route closes the window by itself.
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".expedition-gate h2")).toHaveText("Moss Warrens");
  await page.getByRole("button", { name: "Enter the dungeon" }).click();
  await expect(page.locator(".command-deck")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Target Moss slime", exact: true }),
  ).toBeVisible();
});

test("a saved but locked expedition falls back to the first one", async ({
  page,
}) => {
  await seedSave(page);
  await page.addInitScript(() =>
    localStorage.setItem("catacomb-cats.expedition", "vault"),
  );
  await page.goto("/");
  await expect(page.locator(".expedition-gate h2")).toHaveText("The Catacombs");
  await expect(
    page.getByRole("button", { name: "Enter the dungeon" }),
  ).toBeEnabled();
});
