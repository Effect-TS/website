import { expect, test, type Locator, type Page } from "playwright/test"

test.use({ contextOptions: { reducedMotion: "reduce" } })

const desktop = { width: 1280, height: 900 }
const mobile = { width: 390, height: 844 }

const open = async (page: Page, viewport: typeof desktop) => {
  await page.setViewportSize(viewport)
  await page.goto("/", { waitUntil: "networkidle" })
  const section = page.locator("#module-of-the-week")
  await section.scrollIntoViewIfNeeded()
  return section
}

const box = async (locator: Locator) => {
  const rect = await locator.boundingBox()
  expect(rect).not.toBeNull()
  return rect!
}

const entryNumber = async (article: Locator) =>
  Number(await article.getByText(/^\d+$/).first().textContent())

test("desktop features the latest module beside the four before it", async ({
  page,
}) => {
  const section = await open(page, desktop)
  await expect(section.getByText("// Module of the Week")).toBeVisible()
  const heading = section.getByRole("heading", {
    level: 2,
    name: "One Effect module, every week",
  })
  const allModules = section.getByRole("link", { name: "All modules" })
  await expect(allModules).toHaveAttribute("href", "/module-of-the-week")

  const articles = section.getByRole("article")
  await expect(articles).toHaveCount(5)
  const featured = articles.first()
  const recent = await articles.all().then((all) => all.slice(1))

  // "All modules" sits on the heading's row, flush with the grid's right edge.
  const headingBox = await box(heading)
  const buttonBox = await box(allModules)
  const lastRecentBox = await box(recent[3]!)
  expect(buttonBox.x).toBeGreaterThan(headingBox.x + headingBox.width)
  expect(buttonBox.y).toBeLessThan(headingBox.y + headingBox.height)
  expect(buttonBox.y + buttonBox.height).toBeGreaterThan(headingBox.y)
  expect(
    Math.abs(
      buttonBox.x + buttonBox.width - (lastRecentBox.x + lastRecentBox.width),
    ),
  ).toBeLessThanOrEqual(2)

  // Two columns: the featured module on the left, the rest stacked on the right.
  const featuredBox = await box(featured)
  for (const article of recent) {
    const rect = await box(article)
    expect(rect.x).toBeGreaterThanOrEqual(featuredBox.x + featuredBox.width)
  }
  const firstRecentBox = await box(recent[0]!)
  expect(Math.abs(firstRecentBox.y - featuredBox.y)).toBeLessThanOrEqual(2)
  expect(
    Math.abs(
      lastRecentBox.y +
        lastRecentBox.height -
        (featuredBox.y + featuredBox.height),
    ),
  ).toBeLessThanOrEqual(2)

  // Newest first, numbered consecutively.
  const latest = await entryNumber(featured)
  for (const [index, article] of recent.entries()) {
    expect(await entryNumber(article)).toBe(latest - index - 1)
  }

  // The featured module leads with a large thumbnail and its description.
  const thumbnail = featured.locator("img").first()
  await expect(thumbnail).toBeVisible()
  expect((await box(thumbnail)).width).toBeGreaterThanOrEqual(
    featuredBox.width - 2,
  )
  await expect(featured.getByRole("heading", { level: 3 })).toBeVisible()
  await expect(featured.locator("p")).not.toHaveCount(0)
})

test("every module links to its blog post and, when it has one, its video", async ({
  page,
}) => {
  const section = await open(page, desktop)
  const articles = await section.getByRole("article").all()
  expect(articles).toHaveLength(5)
  for (const article of articles) {
    await expect(article.getByRole("heading", { level: 3 })).toBeVisible()
    const blogPost = article.getByRole("link", { name: /^Blog post/ })
    await expect(blogPost).toHaveCount(1)
    await expect(blogPost).toHaveAttribute(
      "href",
      /^\/blog\/module-of-the-week\/[^/]+\/?$/,
    )
    for (const video of await article
      .getByRole("link", { name: /^Video/ })
      .all()) {
      await expect(video).toHaveAttribute(
        "href",
        /^https:\/\/www\.youtube\.com\/watch\?v=/,
      )
      await expect(video).toHaveAttribute("target", "_blank")
      await expect(video).toHaveAttribute("rel", /noopener/)
    }
  }
  await expect(section.getByRole("link", { name: /^Video/ })).not.toHaveCount(0)
})

test("mobile stacks the modules in one column without overflowing", async ({
  page,
}) => {
  const section = await open(page, mobile)
  const viewportWidth = await page.evaluate(
    () => document.documentElement.clientWidth,
  )
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(viewportWidth)

  const allModules = section.getByRole("link", { name: "All modules" })
  await expect(allModules).toBeVisible()
  const buttonBox = await box(allModules)
  expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(viewportWidth)

  const articles = await section.getByRole("article").all()
  expect(articles).toHaveLength(5)
  let previousBottom = -Infinity
  for (const article of articles) {
    const rect = await box(article)
    expect(rect.x).toBeGreaterThanOrEqual(0)
    expect(rect.x + rect.width).toBeLessThanOrEqual(viewportWidth)
    expect(rect.y).toBeGreaterThanOrEqual(previousBottom - 2)
    previousBottom = rect.y + rect.height
  }
})
