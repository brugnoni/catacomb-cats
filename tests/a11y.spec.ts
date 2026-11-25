import { expect, test, type Page } from "@playwright/test";

/** Unnamed controls and low-contrast text. Background images are not measured. */
async function problems(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    const visible = (el: Element) =>
      el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
      !el.closest("[inert],[aria-hidden=true]");
    for (const el of document.querySelectorAll(
      "button,select,input,a[href],[tabindex]",
    )) {
      if (!visible(el)) continue;
      const name =
        el.getAttribute("aria-label") ||
        el.textContent?.trim() ||
        (el as HTMLInputElement).labels?.[0]?.textContent?.trim();
      if (!name) out.push(`UNNAMED ${el.outerHTML.slice(0, 120)}`);
    }
    const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!);
    };
    const seen = new Set<string>();
    for (const el of document.querySelectorAll("body *")) {
      if (!visible(el) || el.closest(":disabled")) continue;
      const own = [...el.childNodes].some(
        (n) => n.nodeType === 3 && n.textContent!.trim(),
      );
      if (!own) continue;
      const style = getComputedStyle(el);
      let node: Element | null = el;
      let bg: number[] = [16, 23, 35];
      while (node) {
        const c = rgb(getComputedStyle(node).backgroundColor);
        if (c.length === 3 || c[3]! > 0.6) {
          bg = c;
          break;
        }
        node = node.parentElement;
      }
      const a = lum(rgb(style.color));
      const b = lum(bg);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const key = `${el.tagName}.${el.className} ${style.color} on ${bg}`;
      if (ratio < 4.5 && !seen.has(key)) {
        seen.add(key);
        out.push(
          `CONTRAST ${ratio.toFixed(2)} ${style.fontSize} ${key} "${el.textContent!.trim().slice(0, 40)}"`,
        );
      }
    }
    return out;
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("catacomb-cats.lang", "en");
    localStorage.setItem("catacomb-cats.tutorial", "skipped");
    Object.assign(window, {
      __CATACOMB_FAST__: true,
      __CATACOMB_SEED__: 1,
      __CATACOMB_CRIT__: "off",
    });
  });
  await page.goto("/");
});

const ready = (page: Page) =>
  page.locator('.battlefield[data-previewing="false"]').waitFor();

test("camp, Relic offer and battle have named controls and readable text", async ({
  page,
}) => {
  expect(await problems(page)).toEqual([]);
  await page.getByRole("button", { name: "Enter the dungeon →" }).click();
  await page.locator(".relic-pick").waitFor();
  expect(await problems(page)).toEqual([]);
  await page.locator(".relic-cards button").first().click();
  await ready(page);
  expect(await problems(page)).toEqual([]);
});

test("a run can be started and fought with the keyboard, and is announced", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Enter the dungeon →" })
    .press("Enter");
  await expect(
    page.getByRole("heading", { name: "Choose a Relic" }),
  ).toBeFocused();
  await page.locator(".relic-cards button").first().press("Enter");
  await ready(page);
  const target = page.locator('[data-unit="e0"] .unit-target');
  await expect(target).toHaveAccessibleDescription(
    new RegExp("[0-9]+ . [0-9]+ HP"),
  );
  await target.press("Enter");
  await expect(target).toHaveAttribute("aria-pressed", "true");
  const skill = page.locator(".ability-grid:not(.ghost) button").first();
  await expect(skill).toBeEnabled();
  await skill.press("Enter");
  await expect(page.getByTestId("announcer")).toContainText(/hits|misses/);
});
