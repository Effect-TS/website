import { expect, type Page } from "playwright/test"

export type ThemeName = "Dark" | "Light" | "System"

export const storeTheme = (page: Page, theme: "light" | "dark") =>
  page.addInitScript((stored) => {
    localStorage.setItem("theme", JSON.stringify(stored))
  }, theme)

export const themeTrigger = (page: Page) =>
  page
    .getByRole("button", { name: "Change theme", exact: true })
    .filter({ visible: true })

export const themeMenu = (page: Page) =>
  page.getByRole("menu", { name: "Theme" })

export const themeItem = (page: Page, name: ThemeName) =>
  themeMenu(page).getByRole("menuitemradio", { name, exact: true })

export const chooseTheme = async (page: Page, name: ThemeName) => {
  await themeTrigger(page).click()
  await themeItem(page, name).click()
}

/** Loads the route with light stored and asserts light was the only theme the document ever reported, applied before first paint. */
export const expectLightWithoutFlash = async (page: Page, route: string) => {
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

  await page.goto(route, { waitUntil: "load" })
  // `load` can fire before the first frame is painted.
  await page.waitForFunction(
    () => performance.getEntriesByType("paint").length > 0,
  )

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
}
