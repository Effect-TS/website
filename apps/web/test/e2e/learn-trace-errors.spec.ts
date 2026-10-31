import { expect, test } from "playwright/test"

// Lesson 7's checkpoint is read in the Trace Viewer: the malformed rule's
// `evaluate` span is red, shows its SchemaError, and carries the log line
// written inside it. Effect 4 reports a span's failure in its exit, not in a
// `code.stacktrace` attribute.
test("lesson 7 shows the malformed rule's evaluate span as a failure", async ({
  page,
}) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto("/learn/part-1/07-name-it-see-it", {
    waitUntil: "domcontentloaded",
  })

  await page.getByRole("button", { name: "Solve", exact: true }).first().click()
  await page.getByRole("button", { name: "Solve", exact: true }).last().click()
  await expect(page.getByRole("tabpanel", { name: "Terminal" })).toContainText(
    "SchemaError",
    { timeout: 150_000 },
  )

  await page.getByRole("tab", { name: "Trace Viewer" }).click()
  // The solution evaluates three rules outside any parent span, so each
  // `evaluate` call is its own trace. The malformed rule's is the one whose
  // only log is the evaluation line: decoding fails before it alerts or skips.
  const selector = page
    .getByRole("button", {
      name: /^(Select a trace|[0-9a-f]{8,})/,
    })
    .first()
  const traces = page.locator(".absolute.top-full button")
  const span = page.getByRole("button", { name: "select table row" }).first()
  const details = page
    .locator("h3", { hasText: "evaluate" })
    .locator("..")
    .locator("..")

  await selector.click()
  await expect(traces).toHaveCount(3)
  await selector.click()
  let found = false
  for (let index = 0; index < 3 && !found; index++) {
    await selector.click()
    await traces.nth(index).click()
    await span.click()
    await details.getByRole("button", { name: /Events/ }).click()
    const text = await details.innerText()
    found = !text.includes("expense 1200") && !text.includes("skip:")
  }
  expect(found).toBe(true)

  await expect(span).toHaveClass(/destructive/)
  await expect(details).toContainText("evaluating a rule for expense")
  await expect(details).toContainText("SchemaError")
})
