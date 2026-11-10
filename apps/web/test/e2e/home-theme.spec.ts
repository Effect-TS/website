import { expect, test, type Page } from "playwright/test"

test.use({ contextOptions: { reducedMotion: "reduce" } })

type ThemeName = "Dark" | "Light" | "System"

const themeTrigger = (page: Page) =>
  page
    .getByRole("button", { name: "Change theme", exact: true })
    .filter({ visible: true })

const themeMenu = (page: Page) => page.getByRole("menu", { name: "Theme" })

const themeItem = (page: Page, name: ThemeName) =>
  themeMenu(page).getByRole("menuitemradio", { name, exact: true })

const chooseTheme = async (page: Page, name: ThemeName) => {
  await themeTrigger(page).click()
  await themeItem(page, name).click()
}

const chooseThemeByKeyboard = async (page: Page, name: ThemeName) => {
  const trigger = themeTrigger(page)
  await expect(trigger).toBeVisible()
  await trigger.focus()
  await page.keyboard.press("ArrowDown")
  await themeItem(page, name).focus()
  await page.keyboard.press("Enter")
  await expect(themeMenu(page)).toBeHidden()
  await expect(trigger).toBeFocused()
}

test("home page follows the theme chosen elsewhere on the site", async ({
  page,
}) => {
  await page.goto("/blog", { waitUntil: "networkidle" })
  await chooseTheme(page, "Light")

  await page.goto("/", { waitUntil: "networkidle" })
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
  await page.reload({ waitUntil: "networkidle" })
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light")

  await page.emulateMedia({ colorScheme: "light" })
  await chooseTheme(page, "System")
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
  await page.emulateMedia({ colorScheme: "dark" })
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
})

test("home page offers the theme menu on desktop and mobile", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")

  await chooseThemeByKeyboard(page, "Light")
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light")

  await page.setViewportSize({ width: 390, height: 844 })
  await chooseThemeByKeyboard(page, "Dark")
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await page.reload({ waitUntil: "networkidle" })
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
})

test("home page paints in the stored theme without flashing the other one", async ({
  page,
}) => {
  // Runs before any page script: store the preference and record every
  // theme the document ever reports, with the time it was applied.
  await page.addInitScript(() => {
    localStorage.setItem("theme", JSON.stringify("light"))
    const log: Array<{ theme: string; at: number }> = []
    Object.assign(window, { __themeLog: log })
    // <html> does not exist yet when this runs, so watch the document.
    new MutationObserver(() => {
      const theme = document.documentElement?.dataset.theme
      if (theme !== undefined && log.at(-1)?.theme !== theme) {
        log.push({ theme, at: performance.now() })
      }
    }).observe(document, { attributes: true, childList: true, subtree: true })
  })

  await page.goto("/", { waitUntil: "load" })

  const result = await page.evaluate(() => {
    const [firstPaint] = performance.getEntriesByType("paint")
    return {
      log: (
        window as unknown as {
          __themeLog: Array<{ theme: string; at: number }>
        }
      ).__themeLog,
      firstPaintAt: firstPaint?.startTime,
    }
  })

  expect(result.log.map((entry) => entry.theme)).toEqual(["light"])
  expect(result.firstPaintAt).toBeDefined()
  expect(result.log[0]!.at).toBeLessThan(result.firstPaintAt!)
})
