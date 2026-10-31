import { expect, test } from "playwright/test"

// Lesson 7's checkpoint is read in the terminal: Part 1 provides no tracing
// layer, so the malformed rule's failure shows the `evaluate` name given to
// Effect.fn in the trace runMain prints with it.
test("lesson 7 names the evaluate span in the malformed rule's failure", async ({
  page,
}) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto("/learn/part-1/07-name-it-see-it", {
    waitUntil: "domcontentloaded",
  })

  await page.getByRole("button", { name: "Solve", exact: true }).first().click()
  await page.getByRole("button", { name: "Solve", exact: true }).last().click()
  const terminal = page.getByRole("tabpanel", { name: "Terminal" })
  await expect(terminal).toContainText("SchemaError", { timeout: 150_000 })
  await expect(terminal).toContainText(/at evaluate \(/)
})
