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
