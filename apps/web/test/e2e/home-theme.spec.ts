import { expect, test } from "playwright/test"

test.use({ contextOptions: { reducedMotion: "reduce" } })

const chooseTheme = async (
  page: import("playwright/test").Page,
  name: "Dark" | "Light" | "System",
) => {
  await page
    .getByRole("button", { name: "Change theme", exact: true })
    .filter({ visible: true })
    .click()
  await page
    .getByRole("menu", { name: "Theme" })
    .getByRole("menuitemradio", { name, exact: true })
    .click()
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

  const trigger = page
    .getByRole("button", { name: "Change theme", exact: true })
    .filter({ visible: true })
  await expect(trigger).toBeVisible()
  await trigger.focus()
  await page.keyboard.press("ArrowDown")
  const menu = page.getByRole("menu", { name: "Theme" })
  await menu.getByRole("menuitemradio", { name: "Light", exact: true }).focus()
  await page.keyboard.press("Enter")
  await expect(menu).toBeHidden()
  await expect(trigger).toBeFocused()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light")

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(trigger).toBeVisible()
})
