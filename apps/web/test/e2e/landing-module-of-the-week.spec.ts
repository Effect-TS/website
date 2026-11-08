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

/** The viewport position of `locator` once it has been scrolled on screen. */
const onScreen = async (locator: Locator) => {
  await locator.scrollIntoViewIfNeeded()
  return box(locator)
}

const entryNumber = async (article: Locator) =>
  Number(await article.getByText(/^\d+$/).first().textContent())

const blogPostOf = (article: Locator) =>
  article.getByRole("link", { name: /^Blog post/ })

const samePath = (a: string, b: string) =>
  a.replace(/\/$/, "") === b.replace(/\/$/, "")

/** Performs `action` on the homepage and waits until it has opened `href`. */
const expectToOpen = async (
  page: Page,
  href: string,
  action: () => Promise<void>,
) => {
  await action()
  await page.waitForURL((url) => samePath(url.pathname, href), {
    timeout: 10_000,
  })
}

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

  // The featured module leads with its title and description, not an image.
  await expect(section.locator("img")).toHaveCount(0)
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
    const blogPost = blogPostOf(article)
    await expect(blogPost).toHaveCount(1)
    await expect(blogPost).toHaveAttribute(
      "href",
      /^\/blog\/module-of-the-week\/[^/]+\/?$/,
    )
    // A single link per destination, so the post is announced once.
    await expect(
      article.locator(`a[href="${await blogPost.getAttribute("href")}"]`),
    ).toHaveCount(1)
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
  await expect(
    section.locator("a a, a [role='link'], [role='link'] a"),
  ).toHaveCount(0)
})

test("clicking anywhere on a module opens its blog post", async ({ page }) => {
  // The featured module, clicked on its title.
  let section = await open(page, desktop)
  let article = section.getByRole("article").first()
  let href = (await blogPostOf(article).getAttribute("href"))!
  const title = await onScreen(article.getByRole("heading", { level: 3 }))
  await expectToOpen(page, href, () =>
    page.mouse.click(title.x + title.width / 2, title.y + title.height / 2),
  )

  // A recent module, clicked in the padding by its top-left corner.
  section = await open(page, desktop)
  article = section.getByRole("article").last()
  href = (await blogPostOf(article).getAttribute("href"))!
  const corner = await onScreen(article)
  await expectToOpen(page, href, () =>
    page.mouse.click(corner.x + 6, corner.y + 6),
  )

  // The Video link still receives the pointer instead of the module.
  section = await open(page, desktop)
  await section
    .getByRole("link", { name: /^Video/ })
    .first()
    .hover()
  expect(samePath(new URL(page.url()).pathname, "/")).toBe(true)
})

test("modules are keyboard accessible through their links alone", async ({
  page,
}) => {
  const section = await open(page, desktop)
  const links = section.getByRole("article").getByRole("link")
  const hrefs = await links.evaluateAll((all) =>
    all.map((link) => link.getAttribute("href")),
  )
  expect(hrefs.length).toBeGreaterThanOrEqual(5)

  // Tabbing from "All modules" visits exactly the module links, in order,
  // then leaves the section: no extra or duplicate tab stops.
  await section.getByRole("link", { name: "All modules" }).focus()
  const focusedHref = () =>
    page.evaluate(() => {
      const active = document.activeElement
      return active?.closest("#module-of-the-week")
        ? active.getAttribute("href")
        : null
    })
  const visited: Array<string | null> = []
  for (let index = 0; index <= hrefs.length; index++) {
    await page.keyboard.press("Tab")
    visited.push(await focusedHref())
  }
  expect(visited).toEqual([...hrefs, null])

  // Enter on a module's Blog post link opens the post.
  const blogPost = blogPostOf(section.getByRole("article").first())
  const href = (await blogPost.getAttribute("href"))!
  await blogPost.focus()
  await expectToOpen(page, href, () => page.keyboard.press("Enter"))
})

test.describe("with motion enabled", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } })

  test("hovering a module does not zoom anything in it", async ({ page }) => {
    const section = await open(page, desktop)
    const featured = section.getByRole("article").first()
    const settle = () =>
      // Let any hover transition inside the module finish before measuring.
      featured.evaluate((root) =>
        Promise.race([
          Promise.allSettled(
            document
              .getAnimations()
              .filter(
                (animation) =>
                  animation.effect instanceof KeyframeEffect &&
                  animation.effect.target instanceof Node &&
                  root.contains(animation.effect.target),
              )
              .map((animation) => animation.finished),
          ),
          new Promise((resolve) => setTimeout(resolve, 1_000)),
        ]),
      )
    const scaled = () =>
      featured.evaluate((root) =>
        [root, ...root.querySelectorAll("*")]
          .map((node) => getComputedStyle(node))
          .filter(({ scale, transform }) => {
            if (scale !== "none" && scale !== "1") return true
            if (transform === "none") return false
            const { a, d } = new DOMMatrixReadOnly(transform)
            return a !== 1 || d !== 1
          })
          .map(({ scale, transform }) => ({ scale, transform })),
      )
    // Hover each block of the module in turn, wherever a thumbnail might sit.
    for (const block of await featured.locator(":scope > *").all()) {
      const rect = await onScreen(block)
      await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2)
      await settle()
      expect(await scaled()).toEqual([])
    }
  })
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
