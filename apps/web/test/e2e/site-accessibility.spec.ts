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

test("install commands support keyboard selection and copying in both panels", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await page.goto("/")
  await page.waitForFunction(
    () => !document.querySelector('astro-island[client="load"][ssr]'),
  )
  const panels = page.locator("[data-install-command]")
  await expect(panels).toHaveCount(2)
  for (const panel of await panels.all()) {
    const trigger = panel.getByRole("button", { name: "Package manager: npm" })
    await trigger.focus()
    await page.keyboard.press("ArrowDown")
    const menu = page.getByRole("menu", {
      name: "Package manager",
      exact: true,
    })
    await expect(menu).toBeVisible()
    await expect(
      menu.getByRole("menuitemradio", { name: "npm", exact: true }),
    ).toBeChecked()
    await page.keyboard.press("Escape")
    await expect(trigger).toBeFocused()
    await page.keyboard.press("ArrowDown")
    await page.keyboard.press("End")
    await page.keyboard.press("Enter")
    await expect(menu).toBeHidden()
    await expect(
      panel.getByRole("button", { name: "Package manager: deno" }),
    ).toBeFocused()
    await expect(panel.locator('[data-role="command-text"]')).toHaveText(
      "deno add npm:effect@rc",
    )
    await page.keyboard.press("Tab")
    await expect(
      panel.getByRole("button", { name: "Copy install command" }),
    ).toBeFocused()
    await page.keyboard.press("Enter")
    await expect(panel.getByRole("status")).toHaveText("Copied install command")
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      "deno add npm:effect@rc",
    )
  }
})

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

test("docs navigation preserves its desktop layout and nests keyboard menus on mobile", async ({
  page,
}) => {
  await page.goto("/docs/v4/getting-started/installation", {
    waitUntil: "networkidle",
  })
  const navigation = page.getByRole("navigation", {
    name: "Documentation",
    exact: true,
  })
  for (const width of [960, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(
      navigation.getByRole("link", { name: "Docs", exact: true }),
    ).toBeVisible()
    await expect(
      navigation
        .getByRole("link", { name: "Guides", exact: true })
        .filter({ visible: true }),
    ).toBeVisible()
    const versions = navigation
      .getByRole("group", { name: "Documentation version" })
      .filter({ visible: true })
    await expect(
      versions.getByRole("link", { name: "Effect v4 (rc) documentation" }),
    ).toHaveAttribute("aria-current", "page")
    const bounds = await versions.boundingBox()
    expect(bounds!.height).toBeLessThan(40)
    expect(bounds!.width).toBeLessThan(140)
    expect(
      await navigation.evaluate((element) => element.scrollWidth),
    ).toBeLessThanOrEqual(width)
    expect((await navigation.boundingBox())!.height).toBe(64)
  }

  await page.setViewportSize({ width: 320, height: 900 })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%"
  })
  const trigger = navigation.locator('summary[aria-label="Documentation menu"]')
  await trigger.focus()
  await page.keyboard.press("Enter")
  const disclosure = trigger.locator("..")
  const theme = disclosure.getByRole("button", {
    name: "Change theme",
    exact: true,
  })
  await theme.focus()
  await page.keyboard.press("ArrowDown")
  const menu = page.getByRole("menu", { name: "Theme", exact: true })
  await expect(menu).toBeVisible()
  await page.keyboard.press("Home")
  await page.keyboard.press("Enter")
  await expect(menu).toBeHidden()
  await expect(theme).toBeFocused()
  await expect(disclosure).toHaveAttribute("open", "")
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  )
  await page.keyboard.press("Escape")
  await expect(trigger).toBeFocused()
  await expect(disclosure).not.toHaveAttribute("open", "")
})

test("animation controls preserve the image dimensions when starting and stopping", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto("/blog/releases/playground")
  const poster = page.getByRole("img", {
    name: "Playground format on save",
    exact: true,
  })
  await poster.scrollIntoViewIfNeeded()
  await expect
    .poll(() =>
      poster.evaluate((element: HTMLImageElement) => element.naturalWidth),
    )
    .toBe(644)
  const before = await poster.boundingBox()
  expect(before!.width).toBe(644)
  expect(before!.height).toBe(360)
  const figure = poster.locator("..")
  const control = figure.locator("summary")
  await control.focus()
  await page.keyboard.press("Enter")
  await expect(control.locator("..")).toHaveAttribute("open", "")
  const playing = await page
    .getByRole("img", { name: "Playground format on save", exact: true })
    .boundingBox()
  expect(playing!.width).toBe(before!.width)
  expect(playing!.height).toBe(before!.height)
  await page.keyboard.press("Enter")
  await expect(control.locator("..")).not.toHaveAttribute("open", "")
  await expect(control).toBeFocused()
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
  const deletion = page.getByRole("group", {
    name: "Delete accessibility-test.ts?",
    exact: true,
  })
  await expect(
    deletion.getByRole("button", { name: "No", exact: true }),
  ).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(remove).toBeFocused()
  await page.keyboard.press("Enter")
  await page.keyboard.press("Shift+Tab")
  await expect(
    deletion.getByRole("button", { name: "Yes", exact: true }),
  ).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(created).toBeHidden()
  await expect(
    page.getByRole("complementary", { name: "Files", exact: true }),
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

  const keyboardHelp = page.getByRole("button", {
    name: "Editor keyboard controls",
    exact: true,
  })
  await keyboardHelp.click()
  await expect(
    page.getByRole("dialog", { name: "Editor keyboard controls" }),
  ).toContainText("Ctrl+Shift+M")
  await page.keyboard.press("Escape")
  await expect(keyboardHelp).toBeFocused()

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
