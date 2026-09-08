import { expect, test } from "playwright/test"
import { AxeBuilder } from "@axe-core/playwright"

test.use({ contextOptions: { reducedMotion: "reduce" } })

for (const route of [
  "/",
  "/docs/v4/getting-started/installation",
  "/docs/v3/api/effect/Arbitrary",
  "/effect-days",
  "/merch",
  "/blog",
]) {
  test(`keyboard entry and accessibility rules: ${route}`, async ({ page }) => {
    await page.goto(route)
    await page
      .locator("astro-island[ssr]")
      .first()
      .waitFor({ state: "detached" })
    await page
      .locator("astro-dev-toolbar")
      .evaluateAll((nodes) => nodes.forEach((node) => node.remove()))
    await page.evaluate(() => document.fonts.ready)
    await page.keyboard.press("Tab")
    await expect(
      page.getByRole("link", { name: "Skip to content" }),
    ).toBeFocused()
    await page.keyboard.press("Enter")
    await expect(page.getByRole("main")).toBeFocused()
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze()
    expect(audit.violations).toEqual([])
  })
}

test("shared disclosures return focus on Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const [route, label] of [
    ["/docs/v4", "Documentation menu"],
    ["/effect-days", "Event navigation"],
    ["/effect-days", "Save to calendar"],
  ]) {
    await page.goto(route)
    const trigger = page.locator(`summary[aria-label="${label}"]`).first()
    await trigger.focus()
    await page.keyboard.press("Enter")
    const disclosure = trigger.locator("..")
    await expect(disclosure).toHaveAttribute("open", "")
    await page.keyboard.press("Tab")
    await expect(disclosure.locator("a").first()).toBeFocused()
    await page.keyboard.press("Escape")
    await expect(disclosure).not.toHaveAttribute("open", "")
    await expect(trigger).toBeFocused()
  }
})

test("blog category selection supports keyboard navigation and announces results", async ({
  page,
}) => {
  await page.goto("/blog", { waitUntil: "networkidle" })
  const trigger = page.getByRole("button", { name: "Category", exact: true })
  await trigger.focus()
  await page.keyboard.press("ArrowDown")
  await expect(page.getByRole("menu", { name: "Blog category" })).toBeVisible()
  await page.keyboard.press("End")
  await page.keyboard.press("Enter")
  await expect(page.getByRole("menu")).toBeHidden()
  await expect(page.locator("main [role=status]")).toContainText(
    "posts. Page 1",
  )
  await expect(page.locator("main [aria-haspopup=menu]")).toBeFocused()
})

test("blog pagination moves focus to the new results", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 256 })
  await page.goto("/blog")
  await page.waitForFunction(
    () => !document.querySelector('astro-island[client="load"][ssr]'),
  )
  const next = page
    .getByRole("button", { name: "Next page", exact: true })
    .last()
  await next.focus()
  await page.keyboard.press("Enter")
  const heading = page.getByRole("heading", {
    name: "Other posts",
    exact: true,
  })
  await expect(heading).toBeFocused()
  await expect(page.locator("main [role=status]")).toContainText("Page 2")
  const bounds = await heading.boundingBox()
  expect(bounds!.y).toBeGreaterThanOrEqual(0)
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(256)
})

test("documentation tabs are labelled and survive disabled storage", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("Storage disabled")
    }
    Storage.prototype.setItem = () => {
      throw new Error("Storage disabled")
    }
  })
  await page.goto("/docs/v4/getting-started/installation")
  const tabs = page.locator("docs-tabs").first()
  await expect(tabs.getByRole("tab").first()).toHaveAttribute(
    "aria-selected",
    "true",
  )
  await tabs.getByRole("tab").first().focus()
  await page.keyboard.press("End")
  await expect(tabs.getByRole("tab").last()).toBeFocused()
  await expect(tabs.getByRole("tabpanel")).toHaveAccessibleName(
    await tabs.getByRole("tab").last().innerText(),
  )
})

test("playground exposes file actions to keyboard users and contains dialog focus", async ({
  page,
}) => {
  await page.goto("/play")
  const editor = page.getByRole("textbox", {
    name: "TypeScript editor",
    exact: true,
  })
  await expect(editor).toBeVisible({ timeout: 45000 })
  await page
    .getByRole("status", { name: "Loading Playground", exact: true })
    .waitFor({ state: "hidden" })
  const newFile = page.getByRole("button", { name: /^New file in / }).first()
  await newFile.focus()
  await page.keyboard.press("Enter")
  await expect(
    page.getByRole("textbox", { name: "File name", exact: true }),
  ).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(newFile).toBeFocused()
  await page.keyboard.press("Enter")
  await page
    .getByRole("textbox", { name: "File name", exact: true })
    .fill("accessibility-test.ts")
  await page.keyboard.press("Enter")
  const created = page.getByRole("button", {
    name: "accessibility-test.ts",
    exact: true,
  })
  await expect(created).toBeVisible()
  const remove = page.getByRole("button", {
    name: "Delete accessibility-test.ts",
    exact: true,
  })
  await remove.focus()
  await page.keyboard.press("Enter")
  const deletion = page.getByRole("dialog", {
    name: "Delete accessibility-test.ts?",
    exact: true,
  })
  await expect(
    deletion.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(remove).toBeFocused()
  await page.keyboard.press("Enter")
  await deletion.getByRole("button", { name: "Delete", exact: true }).click()
  await expect(created).toBeHidden()
  await expect(
    page
      .getByRole("complementary", { name: "Files", exact: true })
      .getByRole("button")
      .first(),
  ).toBeFocused()
  const reset = page.getByRole("button", { name: "Reset", exact: true })
  await reset.click()
  const dialog = page.getByRole("dialog")
  await expect(
    dialog.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused()
  await page.keyboard.press("Shift+Tab")
  await expect(
    dialog.getByRole("button", { name: "Reset", exact: true }),
  ).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect(reset).toBeFocused()

  const share = page.getByRole("button", { name: "Share", exact: true })
  await share.focus()
  await page.keyboard.press("Enter")
  await expect(
    page.getByRole("textbox", { name: "Playground link", exact: true }),
  ).toBeFocused()
  await expect(
    page.getByRole("button", { name: "Copy playground link", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("button", {
      name: "Download playground files",
      exact: true,
    }),
  ).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(share).toBeFocused()

  await page.getByRole("tab", { name: "Trace Viewer", exact: true }).click()
  const resize = page.getByRole("separator", { name: /Name column width/ })
  await resize.focus()
  const width = Number(await resize.getAttribute("aria-valuenow"))
  await page.keyboard.press("ArrowRight")
  await expect(resize).toHaveAttribute("aria-valuenow", String(width + 10))
  await page.setViewportSize({ width: 320, height: 256 })
  await expect
    .poll(() =>
      page
        .locator(".monaco-editor")
        .evaluate((element) => element.clientHeight),
    )
    .toBeGreaterThan(24)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  )
})
