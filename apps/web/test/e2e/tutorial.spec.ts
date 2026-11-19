import { expect, test, type Page } from "playwright/test"

const phase = (page: Page) => page.getByTestId("tutorial-results")
const settled = (page: Page, expected: string) =>
  expect(phase(page)).toHaveAttribute("data-phase", expected, {
    timeout: 60_000,
  })

const edit = (
  page: Page,
  change: { replace?: [string, string]; append?: string; value?: string },
) =>
  page.evaluate(async ({ replace, append, value }) => {
    const monacoUrl: string = "/@id/@effect/monaco-editor"
    const monaco: typeof import("@effect/monaco-editor") = await import(
      monacoUrl
    )
    const model = monaco.editor
      .getModels()
      .find((candidate) => candidate.uri.path === "/main.ts")
    if (model === undefined) throw new Error("no model")
    const code =
      value !== undefined
        ? value
        : replace
          ? model.getValue().replace(replace[0], replace[1])
          : model.getValue()
    model.setValue(code + (append ?? ""))
  }, change)

test.beforeEach(async ({ page }) => {
  await page.goto("/tutorial/errors/tagging", { waitUntil: "domcontentloaded" })
  await settled(page, "TestsFailed")
})

test("the start file fails its goal test", async ({ page }) => {
  await expect(page.getByTestId("tutorial-results")).toContainText(
    "each error carries a _tag with its own name",
  )
  await expect(page.getByTestId("tutorial-next")).toHaveAttribute(
    "aria-disabled",
    "true",
  )
})

test("the footer blocks Next and says why", async ({ page }) => {
  const cta = page.getByTestId("tutorial-next-cta")
  await expect(cta).toBeDisabled()
  await expect(cta).toContainText("Next: Return errors in the type")
  await expect(page.getByTestId("tutorial-status")).toHaveText(
    "2 of 2 goals not reached",
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

test("the lesson text renders without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    ...(baseURL === undefined ? {} : { baseURL }),
  })
  const page = await context.newPage()
  await page.goto("/tutorial/errors/tagging")
  await expect(page.getByTestId("tutorial-prose")).toContainText(
    "Tag all three errors",
  )
  await context.close()
})

test("the server-rendered page already has the prose and a loader", async ({
  request,
}) => {
  const html = await (await request.get("/tutorial/errors/tagging")).text()
  expect(html).toContain("Tag all three errors")
  expect(html).toContain("Loading lesson")
  expect(html).toContain("Loading the editor")
})

test("shows where the learner is", async ({ page }) => {
  await expect(page.getByLabel("Breadcrumb")).toContainText(
    "Tutorial/Modeling Errors with Effect/Tag your errors",
  )
  await expect(page.getByTestId("tutorial-menu")).toHaveText("Lesson 1 of 8")
  await expect(page).toHaveTitle(
    /Tag your errors · Modeling Errors with Effect · Effect Tutorial/,
  )
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "0",
  )
})

test("backlinks to the chapter article", async ({ page }) => {
  await expect(page.getByTestId("tutorial-article")).toHaveAttribute(
    "href",
    "/tutorial/errors",
  )
})

test("the chapter article renders and links to the first lesson", async ({
  page,
}) => {
  await page.goto("/tutorial/errors")
  await expect(page.locator("h1")).toHaveText("Modeling Errors with Effect")
  await expect(page.getByTestId("tutorial-practice")).toHaveAttribute(
    "href",
    "/tutorial/errors/tagging",
  )
})

test("clearing one lesson forgets its completion", async ({ page }) => {
  await page.getByTestId("tutorial-solve").click()
  await settled(page, "Passed")
  await page.getByTestId("tutorial-clear").click()
  await page.getByTestId("tutorial-clear-lesson").click()
  await settled(page, "TestsFailed")
  await expect(page.getByTestId("tutorial-next")).toHaveAttribute(
    "aria-disabled",
    "true",
  )
})

test("clearing a lesson also forgets the lessons after it", async ({
  page,
}) => {
  await page.getByTestId("tutorial-solve").click()
  await settled(page, "Passed")
  await page.getByTestId("tutorial-next-cta").click()
  await page.getByTestId("tutorial-solve").click()
  await settled(page, "Passed")
  await page.getByTestId("tutorial-prev").click()
  await expect(page).toHaveURL(/\/tutorial\/errors\/tagging$/)
  await page.getByTestId("tutorial-clear").click()
  await page.getByTestId("tutorial-clear-lesson").click()
  await page.getByTestId("tutorial-menu").click()
  await expect(page.getByTestId("tutorial-menu-panel")).toContainText(
    "0 of 8 lessons complete",
  )
})

test("clearing all progress returns to the first lesson", async ({ page }) => {
  await page.getByTestId("tutorial-solve").click()
  await settled(page, "Passed")
  await page.getByTestId("tutorial-next-cta").click()
  await expect(page).toHaveURL(/\/tutorial\/errors\/failing$/)
  page.once("dialog", (dialog) => dialog.accept())
  await page.getByTestId("tutorial-clear").click()
  await page.getByTestId("tutorial-clear-all").click()
  await expect(page).toHaveURL(/\/tutorial\/errors\/tagging$/)
  await settled(page, "TestsFailed")
  await page.reload({ waitUntil: "domcontentloaded" })
  await settled(page, "TestsFailed")
})

test("lesson prose has no line numbers", async ({ page }) => {
  await expect(page.getByTestId("tutorial-prose")).toContainText(
    "Data.TaggedError",
  )
  expect(await page.locator("[data-testid=tutorial-prose] .ln").count()).toBe(0)
})

test("the menu lists every lesson and locks the ones ahead", async ({
  page,
}) => {
  await page.getByTestId("tutorial-menu").click()
  const panel = page.getByTestId("tutorial-menu-panel")
  await expect(panel).toContainText("0 of 8 lessons complete")
  await expect(
    panel.getByRole("link", { name: "Tag your errors" }),
  ).toHaveAttribute("aria-current", "page")
  await expect(panel.getByText("Return errors in the type")).toHaveAttribute(
    "aria-disabled",
    "true",
  )
  await expect(panel.getByText("Catch a defect at a boundary")).toHaveAttribute(
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
    replace: [
      "class NetworkError extends Error {}",
      "class NetworkError extends Error { x = 1 }",
    ],
  })
  await settled(page, "TestsFailed")
})

test("the learner's own edit reaches the goal", async ({ page }) => {
  await edit(page, {
    value: [
      'import { Data } from "effect"',
      ...["ExpiredCardError", "InvalidTokenError", "NetworkError"].map(
        (name) => `export class ${name} extends Data.TaggedError("${name}") {}`,
      ),
    ].join("\n"),
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
  await expect(page).toHaveURL(/\/tutorial\/errors\/failing$/)
  await expect(page.getByTestId("tutorial-prose")).toContainText("Effect.fn")
  await expect(page.getByLabel("Breadcrumb")).toContainText(
    "Return errors in the type",
  )
  await settled(page, "GoalTypeErrors")
  expect(
    await page.evaluate(
      () => (window as unknown as { marker?: number }).marker,
    ),
  ).toBe(1)
  await page.goBack()
  await expect(page).toHaveURL(/\/tutorial\/errors\/tagging$/)
  await expect(page.getByTestId("tutorial-prose")).toContainText(
    "Data.TaggedError",
  )
})

test("a locked lesson redirects to the first unfinished one", async ({
  page,
}) => {
  await page.goto("/tutorial/errors/catching-defects", {
    waitUntil: "domcontentloaded",
  })
  await expect(page).toHaveURL(/\/tutorial\/errors\/tagging$/)
})

test("reset restores the start file", async ({ page }) => {
  await page.getByTestId("tutorial-solve").click()
  await settled(page, "Passed")
  await page.getByTestId("tutorial-reset").click()
  await settled(page, "TestsFailed")
})

test("the reading panel resizes with the mouse and the keyboard", async ({
  page,
}) => {
  const prose = page.locator("[data-tutorial-prose]")
  const before = (await prose.boundingBox())?.width ?? 0
  const handle = page.locator("[data-tutorial-handle]")
  const box = await handle.boundingBox()
  if (box === null) throw new Error("no handle")
  await page.mouse.move(box.x + box.width / 2, box.y + 200)
  await page.mouse.down()
  await page.mouse.move(box.x + 250, box.y + 200, { steps: 8 })
  await page.mouse.up()
  const dragged = (await prose.boundingBox())?.width ?? 0
  expect(dragged).toBeGreaterThan(before + 100)
  await handle.focus()
  await page.keyboard.press("ArrowLeft")
  const nudged = (await prose.boundingBox())?.width ?? 0
  expect(nudged).toBeLessThan(dragged)
  await page.reload({ waitUntil: "domcontentloaded" })
  await settled(page, "TestsFailed")
  expect(
    Math.abs(((await prose.boundingBox())?.width ?? 0) - nudged),
  ).toBeLessThan(2)
})

test("the lesson text is static HTML, outside every island", async ({
  page,
}) => {
  const insideIsland = await page.evaluate(
    () =>
      document
        .querySelector("[data-testid=tutorial-prose]")
        ?.closest("astro-island") !== null,
  )
  expect(insideIsland).toBe(false)
})

const LESSONS = [
  "errors/tagging",
  "errors/failing",
  "errors/propagating",
  "errors/catching-one",
  "errors/catching-all",
  "errors/defects",
  "errors/or-die",
  "errors/catching-defects",
]

for (const slug of LESSONS) {
  test(`solution of ${slug} passes its goal test`, async ({ page }) => {
    await page.evaluate(
      (slugs) =>
        localStorage.setItem(
          "effect-website:tutorial:completed",
          JSON.stringify(slugs),
        ),
      LESSONS.filter((candidate) => candidate !== slug),
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
  const response = await request.get("/tutorial/errors/tagging.md")
  expect(response.headers()["content-type"]).toContain("text/markdown")
  const text = await response.text()
  for (const part of ["### Start", "### Goal test", "### Solution"]) {
    expect(text).toContain(part)
  }
  expect(text).toContain("Data.TaggedError")
  expect(text).toContain("each error carries a _tag with its own name")
})

test("serves llms.txt with lesson links", async ({ request }) => {
  const text = await (await request.get("/tutorial/llms.txt")).text()
  expect(text).toContain("/tutorial/errors/catching-defects.md")
})
