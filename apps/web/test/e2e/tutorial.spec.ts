import { expect, test, type Page } from "playwright/test"

const phase = (page: Page) => page.getByTestId("tutorial-results")
const settled = (page: Page, expected: string) =>
  expect(phase(page)).toHaveAttribute("data-phase", expected, {
    timeout: 60_000,
  })

const edit = (
  page: Page,
  change: { replace?: [string, string]; append?: string },
) =>
  page.evaluate(async ({ replace, append }) => {
    const monacoUrl: string = "/@id/@effect/monaco-editor"
    const monaco: typeof import("@effect/monaco-editor") = await import(
      monacoUrl
    )
    const model = monaco.editor
      .getModels()
      .find((candidate) => candidate.uri.path === "/main.ts")
    if (model === undefined) throw new Error("no model")
    const code = replace
      ? model.getValue().replace(replace[0], replace[1])
      : model.getValue()
    model.setValue(code + (append ?? ""))
  }, change)

test.beforeEach(async ({ page }) => {
  await page.goto("/tutorial/errors/failing", { waitUntil: "domcontentloaded" })
  await settled(page, "TestsFailed")
})

test("the start file fails its goal test", async ({ page }) => {
  await expect(page.getByTestId("tutorial-results")).toContainText(
    "program fails with NotFound",
  )
  await expect(page.getByTestId("tutorial-next")).toHaveAttribute(
    "aria-disabled",
    "true",
  )
})

test("the footer blocks Next and says why", async ({ page }) => {
  const cta = page.getByTestId("tutorial-next-cta")
  await expect(cta).toBeDisabled()
  await expect(cta).toContainText("Next: Recovering")
  await expect(page.getByTestId("tutorial-status")).toHaveText(
    "1 of 1 goals not reached",
  )
  await page.getByTestId("tutorial-solve").click()
  await settled(page, "Passed")
  await expect(cta).toBeEnabled()
  await expect(page.getByTestId("tutorial-status")).toHaveText("Goals reached")
})

test("the editor takes the space, the results fit their content", async ({
  page,
}) => {
  const editor = page.locator(".monaco-editor").first()
  const results = page.getByTestId("tutorial-results")
  const [editorBox, resultsBox] = await Promise.all([
    editor.boundingBox(),
    results.boundingBox(),
  ])
  expect(editorBox!.height).toBeGreaterThan(resultsBox!.height * 3)
  expect(resultsBox!.height).toBeLessThan(160)
  await expect(page.getByText("main.ts", { exact: true })).toHaveCount(0)
})

test("goal icons and text share a vertical center", async ({ page }) => {
  const row = page.getByTestId("tutorial-results").locator("li > div").first()
  const [icon, text] = await Promise.all([
    row.locator("svg").boundingBox(),
    row.locator("span").boundingBox(),
  ])
  const center = (box: { y: number; height: number }) => box.y + box.height / 2
  expect(Math.abs(center(icon!) - center(text!))).toBeLessThan(1.5)
})

test("tooltips open below the header", async ({ page }) => {
  const arrow = page.getByTestId("tutorial-prev")
  await arrow.hover()
  const tooltip = page.getByText("This is the first lesson", { exact: true })
  await expect(tooltip).toBeVisible()
  const [arrowBox, tooltipBox] = await Promise.all([
    arrow.boundingBox(),
    tooltip.boundingBox(),
  ])
  expect(tooltipBox!.y).toBeGreaterThan(arrowBox!.y + arrowBox!.height)
})

test("the loader hides once the first check is done", async ({ page }) => {
  await expect(page.getByTestId("tutorial-loader")).toHaveCount(0)
})

test("the server-rendered page already has the prose and a loader", async ({
  request,
}) => {
  const html = await (await request.get("/tutorial/errors/failing")).text()
  expect(html).toContain("Make it fail with")
  expect(html).toContain("Loading lesson")
  expect(html).toContain("Loading the editor")
})

test("shows where the learner is", async ({ page }) => {
  await expect(page.getByLabel("Breadcrumb")).toContainText(
    "Tutorial/Errors/Failing",
  )
  await expect(page.getByTestId("tutorial-menu")).toHaveText("Lesson 1 of 3")
  await expect(page).toHaveTitle(/Failing · Errors · Effect Tutorial/)
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "0",
  )
})

test("lesson prose has no line numbers", async ({ page }) => {
  await expect(page.getByTestId("tutorial-prose")).toContainText("Effect.fail")
  expect(await page.locator("[data-testid=tutorial-prose] .ln").count()).toBe(0)
})

test("the menu lists every lesson and locks the ones ahead", async ({
  page,
}) => {
  await page.getByTestId("tutorial-menu").click()
  const panel = page.getByTestId("tutorial-menu-panel")
  await expect(panel).toContainText("0 of 3 lessons complete")
  await expect(panel.getByRole("link", { name: "Failing" })).toHaveAttribute(
    "aria-current",
    "page",
  )
  await expect(panel.getByText("Recovering")).toHaveAttribute(
    "aria-disabled",
    "true",
  )
  await expect(panel.getByText("Two errors")).toHaveAttribute(
    "aria-disabled",
    "true",
  )
})

test("a type error blocks the lesson", async ({ page }) => {
  await edit(page, { append: '\nconst broken: number = "text"\n' })
  await settled(page, "TypeErrors")
  await expect(phase(page)).toContainText("not assignable")
})

test("code that compiles but misses the goal fails", async ({ page }) => {
  await edit(page, {
    replace: ['Effect.succeed("user 1")', "Effect.succeed(1)"],
  })
  await settled(page, "TestsFailed")
})

test("the learner's own edit reaches the goal", async ({ page }) => {
  await edit(page, {
    replace: ['Effect.succeed("user 1")', "Effect.fail(new NotFound())"],
  })
  await settled(page, "Passed")
  await expect(page.getByTestId("tutorial-next")).toBeEnabled()
})

test("solve passes, progress survives a reload", async ({ page }) => {
  await page.getByTestId("tutorial-solve").click()
  await settled(page, "Passed")
  await page.reload({ waitUntil: "domcontentloaded" })
  await settled(page, "Passed")
  await expect(page.getByTestId("tutorial-next")).not.toHaveAttribute(
    "aria-disabled",
    "true",
  )
})

test("moving to the next lesson does not reload the page", async ({ page }) => {
  await page.evaluate(() => {
    ;(window as unknown as { marker: number }).marker = 1
  })
  await page.getByTestId("tutorial-solve").click()
  await settled(page, "Passed")
  await page.getByTestId("tutorial-next-cta").click()
  await expect(page).toHaveURL(/\/tutorial\/errors\/recovering$/)
  await expect(page.getByTestId("tutorial-prose")).toContainText("catchTag")
  await expect(page.getByLabel("Breadcrumb")).toContainText("Recovering")
  await settled(page, "TestsFailed")
  expect(
    await page.evaluate(
      () => (window as unknown as { marker?: number }).marker,
    ),
  ).toBe(1)
  await page.goBack()
  await expect(page).toHaveURL(/\/tutorial\/errors\/failing$/)
  await expect(page.getByTestId("tutorial-prose")).toContainText("Effect.fail")
})

test("a locked lesson redirects to the first unfinished one", async ({
  page,
}) => {
  await page.goto("/tutorial/errors/two-errors", {
    waitUntil: "domcontentloaded",
  })
  await expect(page).toHaveURL(/\/tutorial\/errors\/failing$/)
})

test("reset restores the start file", async ({ page }) => {
  await page.getByTestId("tutorial-solve").click()
  await settled(page, "Passed")
  await page.getByTestId("tutorial-reset").click()
  await settled(page, "TestsFailed")
})

test("the reading panel resizes", async ({ page }) => {
  const prose = page.locator("[data-slot=resizable-panel]").first()
  const before = (await prose.boundingBox())?.width ?? 0
  const handle = page.locator("[data-slot=resizable-handle]").first()
  const box = await handle.boundingBox()
  if (box === null) throw new Error("no handle")
  await page.mouse.move(box.x + box.width / 2, box.y + 200)
  await page.mouse.down()
  await page.mouse.move(box.x + 250, box.y + 200, { steps: 8 })
  await page.mouse.up()
  const after = (await prose.boundingBox())?.width ?? 0
  expect(after).toBeGreaterThan(before + 100)
})

for (const slug of [
  "errors/failing",
  "errors/recovering",
  "errors/two-errors",
]) {
  test(`solution of ${slug} passes its goal test`, async ({ page }) => {
    await page.evaluate(
      (slugs) =>
        localStorage.setItem(
          "effect-website:tutorial:completed",
          JSON.stringify(slugs),
        ),
      ["errors/failing", "errors/recovering"],
    )
    await page.goto(`/tutorial/${slug}`, { waitUntil: "domcontentloaded" })
    await expect(phase(page)).not.toHaveAttribute(
      "data-phase",
      /^(Loading|Checking)$/,
      { timeout: 60_000 },
    )
    await page.getByTestId("tutorial-solve").click()
    await settled(page, "Passed")
  })
}

test("serves the lesson as markdown with the goal test", async ({
  request,
}) => {
  const response = await request.get("/tutorial/errors/failing.md")
  expect(response.headers()["content-type"]).toContain("text/markdown")
  const text = await response.text()
  for (const part of ["### Start", "### Goal test", "### Solution"]) {
    expect(text).toContain(part)
  }
  expect(text).toContain("Effect.fail(new NotFound())")
  expect(text).toContain("program fails with NotFound")
})

test("serves llms.txt with lesson links", async ({ request }) => {
  const text = await (await request.get("/tutorial/llms.txt")).text()
  expect(text).toContain("/tutorial/errors/two-errors.md")
})
