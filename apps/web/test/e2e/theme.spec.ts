import { expect, test, type Page } from "playwright/test"

test.use({ contextOptions: { reducedMotion: "reduce" } })

const html = (page: Page) => page.locator("html")

const themeTrigger = (page: Page) =>
  page
    .getByRole("button", { name: "Change theme", exact: true })
    .filter({ visible: true })

const themeItem = (page: Page, name: "Dark" | "Light") =>
  page.getByRole("menuitemradio", { name, exact: true })

const storeTheme = (page: Page, theme: "light" | "system") =>
  page.addInitScript((stored) => {
    localStorage.setItem("theme", JSON.stringify(stored))
  }, theme)

test("a theme chosen by keyboard on the home page carries over to other pages", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(html(page)).toHaveAttribute("data-theme", "dark")

  const trigger = themeTrigger(page)
  await trigger.focus()
  await page.keyboard.press("ArrowDown")
  await themeItem(page, "Light").focus()
  await page.keyboard.press("Enter")
  await expect(trigger).toBeFocused()
  await expect(html(page)).toHaveAttribute("data-theme", "light")

  // /podcast was dark-only before the site-wide light theme.
  await page.goto("/podcast")
  await expect(html(page)).toHaveAttribute("data-theme", "light")
})

test("System follows the OS until an explicit theme is chosen", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" })
  await storeTheme(page, "system")
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(html(page)).toHaveAttribute("data-theme", "light")
  await page.emulateMedia({ colorScheme: "dark" })
  await expect(html(page)).toHaveAttribute("data-theme", "dark")

  await themeTrigger(page).click()
  await themeItem(page, "Dark").click()
  // Registered after the page's own listeners, so its message means they
  // have all seen the OS change.
  await page.evaluate(() =>
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () =>
      console.log("os-changed"),
    ),
  )
  await Promise.all([
    page.waitForEvent("console", (message) => message.text() === "os-changed"),
    page.emulateMedia({ colorScheme: "light" }),
  ])
  await expect(html(page)).toHaveAttribute("data-theme", "dark")
})

test("the stored theme is applied before any script bundle loads", async ({
  page,
}) => {
  await page.route("**/*", (route) =>
    route.request().resourceType() === "script"
      ? route.abort()
      : route.continue(),
  )
  await storeTheme(page, "light")
  await page.goto("/")
  await expect(html(page)).toHaveAttribute("data-theme", "light")
})
