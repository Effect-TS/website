import { expect, test } from "playwright/test"

test.use({ contextOptions: { reducedMotion: "reduce" } })

test("the Reference section opens v4 from a v3 page", async ({ page }) => {
  await page.goto("/docs/v3/getting-started")
  await expect(
    page
      .getByRole("list", { name: "Docs sections" })
      .first()
      .getByRole("link", { name: "Reference" }),
  ).toHaveAttribute("href", "/docs/v4/api")
})

test("old /docs/api/v3 URLs redirect to the versioned v3 reference", async ({
  request,
}) => {
  for (const [from, to] of [
    ["/docs/api/v3", "/docs/v3/api"],
    ["/docs/api/v3/effect/Effect?x=1", "/docs/v3/api/effect/Effect?x=1"],
  ]) {
    const response = await request.get(from, { maxRedirects: 0 })
    expect(response.status()).toBe(308)
    const location = new URL(
      response.headers()["location"] ?? "",
      response.url(),
    )
    expect(location.pathname + location.search).toBe(to)
  }
})

test("a hover-opened menu stays open while a link in it has keyboard focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/blog", { waitUntil: "networkidle" })
  const trigger = page.getByRole("button", { name: "Resources" })
  await trigger.hover()
  await trigger.click()
  await page.keyboard.press("Tab")
  const blog = page.locator("#navigation-menu-resources").getByRole("link", {
    name: /^Blog/,
  })
  await expect(blog).toBeFocused()

  await page.mouse.move(700, 700)
  await page.waitForTimeout(500)
  await expect(blog).toBeVisible()
  await expect(blog).toBeFocused()

  await page.keyboard.press("Escape")
  await expect(trigger).toBeFocused()
  await expect(trigger).toHaveAttribute("aria-expanded", "false")
})
