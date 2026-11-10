import { expect, test, type Page } from "playwright/test"
import {
  changeOsScheme,
  chooseTheme,
  expectLightWithoutFlash,
  storeTheme,
  themeTrigger,
} from "./theme-helpers.ts"

test.use({ contextOptions: { reducedMotion: "reduce" } })

// Pages Michael asked to follow the site theme like the home page does.
const forcedDarkRoutes = [
  "/effect-jobs",
  "/community-hub",
  "/effect-days",
  "/effect-days/about-livorno",
  "/effect-days/code-of-conduct",
  "/effect-days/refund-policy",
  "/podcast",
  "/podcast/episodes/effectifying-opencode-with-kit-langton",
  "/myths",
  "/privacy",
  "/adoption-partners/ziverge",
]

// Pages that already honour the stored theme at the document level but paint
// dark-only sections on it and offer no way to switch.
const brokenLightRoutes = ["/merch", "/brand-assets"]

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

// Every layout (PageLayout, EffectDaysLayout, a BaseLayout page) plus the
// routes themed last and the standalone visual frame.
const layoutRoutes = [
  "/effect-jobs",
  "/effect-days",
  "/merch",
  "/podcast/episodes/effectifying-opencode-with-kit-langton",
  "/myths",
  "/privacy",
  "/adoption-partners/ziverge",
  "/visuals/persisted-queue",
]

test("a theme chosen on one extended page follows the visitor across layouts", async ({
  page,
}) => {
  await page.goto("/effect-days", { waitUntil: "networkidle" })
  await chooseTheme(page, "Light")
  for (const route of [...layoutRoutes, "/"]) {
    await page.goto(route, { waitUntil: "networkidle" })
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
  }

  await page.emulateMedia({ colorScheme: "light" })
  await chooseTheme(page, "System")
  for (const route of layoutRoutes) {
    await page.goto(route, { waitUntil: "networkidle" })
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
    await page.emulateMedia({ colorScheme: "dark" })
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
    await page.emulateMedia({ colorScheme: "light" })
  }
})

// A document loaded with "System" stored installs the OS listener. An explicit
// choice made afterwards, in that same document, must win over a later OS
// change in the opposite direction.
for (const [choice, chosen, os] of [
  ["Light", "light", "dark"],
  ["Dark", "dark", "light"],
] as const) {
  test(`${choice} chosen after loading with System ignores a later OS change to ${os}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: chosen })
    await storeTheme(page, "system")
    await page.goto("/podcast", { waitUntil: "networkidle" })
    await expect(page.locator("html")).toHaveAttribute("data-theme", chosen)

    await chooseTheme(page, choice)
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe(
      JSON.stringify(chosen),
    )
    await changeOsScheme(page, os)
    await expect(page.locator("html")).toHaveAttribute("data-theme", chosen)
  })
}

// The frame has no menu: a choice made elsewhere reaches it through storage.
// Loaded with "System", it follows the OS until an explicit value is stored.
test("the no-menu frame loaded with System stops following the OS once a choice is stored", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" })
  await storeTheme(page, "system")
  await page.goto("/visuals/persisted-queue", { waitUntil: "networkidle" })
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
  await changeOsScheme(page, "dark")
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await changeOsScheme(page, "light")
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light")

  await page.evaluate(() =>
    localStorage.setItem("theme", JSON.stringify("light")),
  )
  await changeOsScheme(page, "dark")
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light")

  await page.evaluate(() => {
    localStorage.setItem("theme", JSON.stringify("dark"))
    document.documentElement.classList.add("dark")
  })
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await changeOsScheme(page, "light")
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
})

for (const route of layoutRoutes) {
  test(`${route} paints in the stored theme without flashing the other one`, async ({
    page,
  }) => {
    await expectLightWithoutFlash(page, route)
  })
}

/** Relative luminance of one of an element's own computed colours. */
const colourLightness = (
  page: Page,
  selector: string,
  property: "color" | "outlineColor",
) =>
  page
    .locator(selector)
    .first()
    .evaluate((element, property) => {
      const canvas = document.createElement("canvas")
      canvas.width = canvas.height = 1
      const context = canvas.getContext("2d", { willReadFrequently: true })!
      context.fillStyle = getComputedStyle(element)[property]
      context.fillRect(0, 0, 1, 1)
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data
      const channel = (v: number) =>
        v / 255 <= 0.03928
          ? v / 255 / 12.92
          : ((v / 255 + 0.055) / 1.055) ** 2.4
      return 0.2126 * channel(r!) + 0.7152 * channel(g!) + 0.0722 * channel(b!)
    }, property)

// Photo captions and white-only partner artwork sit on surfaces that stay dark
// in both themes; light mode must not turn them dark-on-dark or white-on-white.
test("dark photo and logo surfaces keep their contrast in light mode", async ({
  page,
}) => {
  await storeTheme(page, "light")
  await page.goto("/effect-days", { waitUntil: "networkidle" })
  expect(await colourLightness(page, "#speakers h3", "color")).toBeGreaterThan(
    0.5,
  )
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
    .poll(() => colourLightness(page, speakerLink, "outlineColor"))
    .toBeGreaterThan(0.9)

  // Hovering first starts the cell's background transition, which must not
  // satisfy or disturb the outline check.
  const sponsorLink = "#sponsors a[aria-label$='visit website']"
  await page.locator(sponsorLink).first().hover()
  await focusControl(page, sponsorLink)
  await expect
    .poll(() => colourLightness(page, sponsorLink, "outlineColor"))
    .toBeGreaterThan(0.9)
})

// Already renders light and dark; what it lacks is a way to switch.
test("the 404 page offers the theme menu", async ({ page }) => {
  await storeTheme(page, "light")
  await page.goto("/this-route-does-not-exist", { waitUntil: "networkidle" })
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
  await expect(themeTrigger(page)).toBeVisible()
})

// Standalone visual frames are embedded inside themed pages, so they follow the
// stored preference like any other page instead of a fixed palette. They have
// no navigation and therefore no theme menu of their own.
for (const theme of ["light", "dark"] as const) {
  test(`the persisted-queue visual follows a stored ${theme} preference`, async ({
    page,
  }) => {
    await storeTheme(page, theme)
    await page.goto("/visuals/persisted-queue", { waitUntil: "networkidle" })
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme)
    const lightness = await backgroundLightness(page, "main")
    if (theme === "light") expect(lightness).toBeGreaterThan(0.5)
    else expect(lightness).toBeLessThan(0.5)
  })
}

// The footer marks the current section's link active; on Effect Days pages the
// active class must read against the light footer too.
test("the active footer link stays readable in light mode", async ({
  page,
}) => {
  await storeTheme(page, "light")
  await page.goto("/effect-days", { waitUntil: "networkidle" })
  expect(
    await colourLightness(page, 'footer a:has-text("Effect Days")', "color"),
  ).toBeLessThan(0.5)
})
