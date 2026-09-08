import { expect, test } from "playwright/test"

test.use({ contextOptions: { reducedMotion: "reduce" } })

test.beforeEach(async ({ page }) => {
  await page.goto("/blog/astra-vs-the-boys", { waitUntil: "networkidle" })
})

test("skip link is visible and moves keyboard focus past site navigation", async ({
  page,
}) => {
  await page.keyboard.press("Tab")
  const skip = page.getByRole("link", { name: "Skip to content" })
  await expect(skip).toBeFocused()
  await expect(skip).toBeInViewport()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("main")).toBeFocused()
  await page.keyboard.press("Tab")
  await expect(
    page
      .getByRole("navigation", { name: "Breadcrumb" })
      .getByRole("link", { name: "Blog", exact: true }),
  ).toBeFocused()
})

test("mobile navigation contains focus and returns it on Escape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const trigger = page.getByRole("button", {
    name: "Open navigation menu",
    exact: true,
  })
  await trigger.focus()
  await page.keyboard.press("Enter")
  const menu = page.getByRole("dialog", { name: "Navigation menu" })
  const close = menu.getByRole("button", {
    name: "Close navigation menu",
    exact: true,
  })
  await expect(close).toBeFocused()
  await page.keyboard.press("Shift+Tab")
  await expect(
    menu.getByRole("button", { name: "Open search", exact: true }),
  ).toBeFocused()
  await page.keyboard.press("Tab")
  await expect(close).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(menu).toBeHidden()
  await expect(trigger).toBeFocused()

  await page.keyboard.press("Enter")
  await menu.getByRole("button", { name: "Open search", exact: true }).click()
  await expect(
    page.getByRole("searchbox", { name: "Search Effect" }),
  ).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog", { name: "Search Effect" })).toBeHidden()
  await expect(trigger).toBeFocused()
})

test("theme menu supports arrow keys and returns focus after selection", async ({
  page,
}) => {
  const trigger = page
    .getByRole("button", { name: "Change theme", exact: true })
    .filter({ visible: true })
  await trigger.focus()
  await page.keyboard.press("ArrowDown")
  const menu = page.getByRole("menu", { name: "Theme" })
  await page.keyboard.press("Home")
  await expect(
    menu.getByRole("menuitemradio", { name: "Dark", exact: true }),
  ).toBeFocused()
  await page.keyboard.press("ArrowDown")
  await expect(
    menu.getByRole("menuitemradio", { name: "Light", exact: true }),
  ).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(menu).toBeHidden()
  await expect(trigger).toBeFocused()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
})

test("200% text enlargement keeps controls and heading links inside the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" })
  await expect(
    page.getByRole("button", { name: "Open navigation menu", exact: true }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  expect(
    await page.locator("main a").evaluateAll((links) =>
      links.every((link) => {
        const rect = link.getBoundingClientRect()
        return (
          rect.width === 0 ||
          (rect.left >= 0 && rect.right <= window.innerWidth)
        )
      }),
    ),
  ).toBe(true)
})
