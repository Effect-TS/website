import { expect, test } from "playwright/test"

// Lessons outside Part 1 and the guides are plain articles. On a phone the
// article has to fit the screen: a wide code block may scroll inside its own
// box, but must not stretch the page so the prose runs off the right edge.
test("local lessons and guides fit a phone screen", async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/learn")
  const paths = await page
    .locator('a[href^="/learn/part-"]')
    .evaluateAll((links) =>
      links
        .map((link) => link.getAttribute("href")!)
        .filter((href) => !href.startsWith("/learn/part-1/")),
    )
  expect(paths.length).toBeGreaterThan(0)

  const overflowing: Array<string> = []
  for (const path of new Set(paths)) {
    await page.goto(path)
    const { documentWidth, articleRight } = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      articleRight: document.querySelector("article")!.getBoundingClientRect()
        .right,
    }))
    if (documentWidth > 390 || articleRight > 390) {
      overflowing.push(
        `${path}: document ${documentWidth}px, article right edge ${Math.round(articleRight)}px`,
      )
    }
  }
  expect(overflowing).toEqual([])
})
