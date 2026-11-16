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
  await trigger.focus()
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

test("hovering another menu leaves a keyboard-focused menu open until a click switches", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/blog", { waitUntil: "networkidle" })
  const resources = page.getByRole("button", { name: "Resources" })
  const community = page.getByRole("button", { name: "Community" })
  await resources.focus()
  await page.keyboard.press("Enter")
  await page.keyboard.press("Tab")
  const blog = page.locator("#navigation-menu-resources").getByRole("link", {
    name: /^Blog/,
  })
  await expect(blog).toBeFocused()

  await community.hover()
  await page.waitForTimeout(500)
  await expect(blog).toBeVisible()
  await expect(blog).toBeFocused()
  await expect(community).toHaveAttribute("aria-expanded", "false")

  await community.click()
  await expect(community).toHaveAttribute("aria-expanded", "true")
  await expect(resources).toHaveAttribute("aria-expanded", "false")
  await expect(blog).toBeHidden()
})

test("the version menu opens on hover, can be crossed into, and Escape dismisses it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/docs/v4/getting-started", { waitUntil: "networkidle" })
  const trigger = page.getByRole("button", {
    name: "Docs version: v4. Change version",
  })
  const v3 = page
    .locator("#docs-version-menu")
    .getByRole("link", { name: "v3" })
  await trigger.hover()
  await expect(trigger).toHaveAttribute("aria-expanded", "true")

  // Slower than the close delay, so only the bridge over the gap keeps it open.
  const from = (await trigger.boundingBox())!
  const to = (await v3.boundingBox())!
  const x = from.x + from.width - 8
  for (let y = from.y + from.height - 2; y <= to.y + 6; y += 2) {
    await page.mouse.move(x, y)
    await page.waitForTimeout(30)
  }
  await page.waitForTimeout(300)
  await expect(v3).toBeVisible()

  await page.keyboard.press("Escape")
  await expect(v3).toBeHidden()
  await expect(trigger).not.toBeFocused()
})

test("a menu opened by click or keyboard stays open when the pointer leaves", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/blog", { waitUntil: "networkidle" })
  const trigger = page.getByRole("button", { name: "Resources" })
  const panel = page.locator("#navigation-menu-resources")

  await trigger.click()
  await page.mouse.move(700, 700)
  await page.waitForTimeout(500)
  await expect(panel).toBeVisible()
  await page.mouse.click(700, 700)
  await expect(panel).toBeHidden()

  await trigger.focus()
  await page.keyboard.press("Enter")
  await trigger.hover()
  await page.mouse.move(700, 700)
  await page.waitForTimeout(500)
  await expect(panel).toBeVisible()
})

test("menu chevrons do not animate under reduced motion", async ({ page }) => {
  await page.goto("/docs/v4/getting-started", { waitUntil: "networkidle" })
  const transitions = await page
    .locator("[data-popover-trigger] svg")
    .evaluateAll((icons) =>
      icons.map((icon) => getComputedStyle(icon).transitionProperty),
    )
  expect(transitions.length).toBeGreaterThan(0)
  expect(transitions.every((property) => property === "none")).toBe(true)
})
