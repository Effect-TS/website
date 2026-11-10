import { expect, test, type Page } from "playwright/test"
import {
  chooseTheme,
  expectLightWithoutFlash,
  themeItem,
  themeMenu,
  themeTrigger,
  type ThemeName,
} from "./theme-helpers.ts"

test.use({ contextOptions: { reducedMotion: "reduce" } })

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
  await expectLightWithoutFlash(page, "/")
})
