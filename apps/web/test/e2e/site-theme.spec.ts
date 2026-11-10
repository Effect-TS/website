import { expect, test, type Page } from "playwright/test"

test.use({ contextOptions: { reducedMotion: "reduce" } })

// Pages Michael asked to follow the site theme like the home page does.
const forcedDarkRoutes = [
  "/effect-jobs",
  "/community-hub",
  "/effect-days",
  "/effect-days/about-livorno",
  "/effect-days/code-of-conduct",
  "/effect-days/refund-policy",
]

// Pages that already honour the stored theme at the document level but paint
// dark-only sections on it and offer no way to switch.
const brokenLightRoutes = ["/merch", "/brand-assets"]

const storeTheme = (page: Page, theme: "light" | "dark") =>
  page.addInitScript((stored) => {
    localStorage.setItem("theme", JSON.stringify(stored))
  }, theme)

const themeTrigger = (page: Page) =>
  page
    .getByRole("button", { name: "Change theme", exact: true })
    .filter({ visible: true })

/** Relative luminance (0 dark, 1 light) of the first painted background behind an element. */
const backgroundLightness = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((element) => {
      const canvas = document.createElement("canvas")
      canvas.width = canvas.height = 1
      const context = canvas.getContext("2d", { willReadFrequently: true })!
      for (
        let node: Element | null = element;
        node;
        node = node.parentElement
      ) {
        context.clearRect(0, 0, 1, 1)
        context.fillStyle = getComputedStyle(node).backgroundColor
        context.fillRect(0, 0, 1, 1)
        const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
        if (a === 0) continue
        const channel = (v: number) =>
          v / 255 <= 0.03928
            ? v / 255 / 12.92
            : ((v / 255 + 0.055) / 1.055) ** 2.4
        return (
          0.2126 * channel(r!) + 0.7152 * channel(g!) + 0.0722 * channel(b!)
        )
      }
      return 1
    })

for (const route of forcedDarkRoutes) {
  test(`${route} follows the stored theme and offers the theme menu`, async ({
    page,
  }) => {
    await storeTheme(page, "light")
    await page.goto(route, { waitUntil: "networkidle" })
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
    await expect(themeTrigger(page)).toBeVisible()
  })
}

for (const route of brokenLightRoutes) {
  test(`${route} paints its sections in the stored theme and offers the theme menu`, async ({
    page,
  }) => {
    await storeTheme(page, "light")
    await page.goto(route, { waitUntil: "networkidle" })
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
    expect(await backgroundLightness(page, "main section")).toBeGreaterThan(0.5)
    await expect(themeTrigger(page)).toBeVisible()
  })
}

test("the broken-light pages still render dark when dark is stored", async ({
  page,
}) => {
  await storeTheme(page, "dark")
  for (const route of brokenLightRoutes) {
    await page.goto(route, { waitUntil: "networkidle" })
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
    expect(await backgroundLightness(page, "main section")).toBeLessThan(0.5)
  }
})

// One route per layout: PageLayout, EffectDaysLayout and a BaseLayout page.
const layoutRoutes = ["/effect-jobs", "/effect-days", "/merch"]

test("a theme chosen on one extended page follows the visitor across layouts", async ({
  page,
}) => {
  await page.goto("/effect-days", { waitUntil: "networkidle" })
  await themeTrigger(page).click()
  await page
    .getByRole("menu", { name: "Theme" })
    .getByRole("menuitemradio", { name: "Light", exact: true })
    .click()
  for (const route of [...layoutRoutes, "/"]) {
    await page.goto(route, { waitUntil: "networkidle" })
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
  }

  await page.emulateMedia({ colorScheme: "light" })
  await themeTrigger(page).click()
  await page
    .getByRole("menu", { name: "Theme" })
    .getByRole("menuitemradio", { name: "System", exact: true })
    .click()
  for (const route of layoutRoutes) {
    await page.goto(route, { waitUntil: "networkidle" })
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
    await page.emulateMedia({ colorScheme: "dark" })
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
    await page.emulateMedia({ colorScheme: "light" })
  }
})

for (const route of layoutRoutes) {
  test(`${route} paints in the stored theme without flashing the other one`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("theme", JSON.stringify("light"))
      const log: Array<{ theme: string; at: number }> = []
      Object.assign(window, { __themeLog: log })
      new MutationObserver(() => {
        const theme = document.documentElement?.dataset.theme
        if (theme !== undefined && log.at(-1)?.theme !== theme) {
          log.push({ theme, at: performance.now() })
        }
      }).observe(document, { attributes: true, childList: true, subtree: true })
    })
    await page.goto(route, { waitUntil: "load" })
    const result = await page.evaluate(() => ({
      log: (
        window as unknown as {
          __themeLog: Array<{ theme: string; at: number }>
        }
      ).__themeLog,
      firstPaintAt: performance.getEntriesByType("paint")[0]?.startTime,
    }))
    expect(result.log.map((entry) => entry.theme)).toEqual(["light"])
    expect(result.firstPaintAt).toBeDefined()
    expect(result.log[0]!.at).toBeLessThan(result.firstPaintAt!)
  })
}

/** Relative luminance of an element's own text colour. */
const textLightness = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((element) => {
      const canvas = document.createElement("canvas")
      canvas.width = canvas.height = 1
      const context = canvas.getContext("2d", { willReadFrequently: true })!
      context.fillStyle = getComputedStyle(element).color
      context.fillRect(0, 0, 1, 1)
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data
      const channel = (v: number) =>
        v / 255 <= 0.03928
          ? v / 255 / 12.92
          : ((v / 255 + 0.055) / 1.055) ** 2.4
      return 0.2126 * channel(r!) + 0.7152 * channel(g!) + 0.0722 * channel(b!)
    })

// Photo captions and white-only partner artwork sit on surfaces that stay dark
// in both themes; light mode must not turn them dark-on-dark or white-on-white.
test("dark photo and logo surfaces keep their contrast in light mode", async ({
  page,
}) => {
  await storeTheme(page, "light")
  await page.goto("/effect-days", { waitUntil: "networkidle" })
  expect(await textLightness(page, "#speakers h3")).toBeGreaterThan(0.5)
  expect(
    await backgroundLightness(page, "#sponsors a[aria-label$='visit website']"),
  ).toBeLessThan(0.1)
  await page.goto("/effect-jobs", { waitUntil: "networkidle" })
  expect(
    await backgroundLightness(
      page,
      "ul[aria-label='Teams running Effect in production'] li",
    ),
  ).toBeLessThan(0.1)
})

/** Relative luminance of an element's current outline colour. */
const outlineLightness = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((element) => {
      const canvas = document.createElement("canvas")
      canvas.width = canvas.height = 1
      const context = canvas.getContext("2d", { willReadFrequently: true })!
      context.fillStyle = getComputedStyle(element).outlineColor
      context.fillRect(0, 0, 1, 1)
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data
      const channel = (v: number) =>
        v / 255 <= 0.03928
          ? v / 255 / 12.92
          : ((v / 255 + 0.055) / 1.055) ** 2.4
      return 0.2126 * channel(r!) + 0.7152 * channel(g!) + 0.0722 * channel(b!)
    })

/** Focus the control once and assert the browser treats it as keyboard focus. */
const focusControl = async (page: Page, selector: string) => {
  const control = page.locator(selector).first()
  await control.evaluate((element) => (element as HTMLElement).focus())
  expect(
    await control.evaluate((element) => element.matches(":focus-visible")),
  ).toBe(true)
}

// The sponsor cells and speaker links are the only controls on surfaces that
// stay dark in light mode (the company grid holds plain images). The outline
// colour transitions, so the assertion retries until it settles rather than
// waiting on any transition event.
test("controls on dark surfaces keep a light focus ring in light mode", async ({
  page,
}) => {
  await storeTheme(page, "light")
  await page.goto("/effect-days", { waitUntil: "networkidle" })

  const speakerLink = "#speakers a[aria-label$='on X']"
  await focusControl(page, speakerLink)
  await expect
    .poll(() => outlineLightness(page, speakerLink))
    .toBeGreaterThan(0.9)

  // Hovering first starts the cell's background transition, which must not
  // satisfy or disturb the outline check.
  const sponsorLink = "#sponsors a[aria-label$='visit website']"
  await page.locator(sponsorLink).first().hover()
  await focusControl(page, sponsorLink)
  await expect
    .poll(() => outlineLightness(page, sponsorLink))
    .toBeGreaterThan(0.9)
})
