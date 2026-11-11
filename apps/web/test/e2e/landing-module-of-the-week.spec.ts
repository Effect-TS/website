import { expect, test, type Locator, type Page } from "playwright/test"

test.use({ contextOptions: { reducedMotion: "reduce" } })

const desktop = { width: 1280, height: 900 }
const mobile = { width: 390, height: 844 }
// The narrowest width at which the modules sit in two columns.
const narrowDesktop = { width: 1024, height: 900 }

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

test("desktop features the latest module beside the three before it", async ({
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
  await expect(articles).toHaveCount(4)
  const featured = articles.first()
  const recent = await articles.all().then((all) => all.slice(1))
  const featuredBox = await box(featured)
  const recentBoxes = await Promise.all(recent.map(box))
  const right = ({ x, width }: { x: number; width: number }) => x + width
  const bottom = ({ y, height }: { y: number; height: number }) => y + height
  const gridRight = Math.max(...[featuredBox, ...recentBoxes].map(right))

  // "All modules" sits on the heading's row, flush with the grid's right edge.
  const headingBox = await box(heading)
  const buttonBox = await box(allModules)
  expect(buttonBox.x).toBeGreaterThan(right(headingBox))
  expect(buttonBox.y).toBeLessThan(bottom(headingBox))
  expect(bottom(buttonBox)).toBeGreaterThan(headingBox.y)
  expect(Math.abs(right(buttonBox) - gridRight)).toBeLessThanOrEqual(2)

  // Two columns: the featured module on the left for the full height, the
  // three before it stacked on the right between the same top and bottom.
  for (const rect of recentBoxes) {
    expect(rect.x).toBeGreaterThanOrEqual(right(featuredBox))
  }
  expect(Math.abs(recentBoxes[0]!.y - featuredBox.y)).toBeLessThanOrEqual(2)
  expect(
    Math.abs(bottom(recentBoxes[2]!) - bottom(featuredBox)),
  ).toBeLessThanOrEqual(2)

  // Newest first, numbered consecutively.
  const latest = await entryNumber(featured)
  for (const [index, article] of recent.entries()) {
    expect(await entryNumber(article)).toBe(latest - index - 1)
  }

  // The featured module leads with a 16:9 visual the width of the card, and
  // its metadata and description follow beneath it. Its heading sits in the
  // text block under a thumbnail, or on the title card itself.
  const visual = featured.locator(":scope > *").first()
  const visualBox = await box(visual)
  expect(visualBox.width).toBeGreaterThanOrEqual(featuredBox.width - 2)
  expect(visualBox.width / visualBox.height).toBeGreaterThan(1.7)
  expect(visualBox.width / visualBox.height).toBeLessThan(1.85)
  const title = featured.getByRole("heading", { level: 3 })
  await expect(title).toBeVisible()
  expect(
    (await box(featured.getByText(/^\d+$/).first())).y,
  ).toBeGreaterThanOrEqual(bottom(visualBox))
  const paragraphs = await Promise.all(
    await featured
      .locator("p")
      .all()
      .then((all) => all.map(box)),
  )
  expect(paragraphs.some((rect) => rect.y >= bottom(visualBox))).toBe(true)

  // With a video the visual is its YouTube thumbnail; without one it is a
  // text title card naming the module. Never an unrelated Open Graph image.
  await expect(section.locator('img[src*="/og/"]')).toHaveCount(0)
  if ((await featured.getByRole("link", { name: /^Video/ }).count()) > 0) {
    await expect(visual.locator("img")).toHaveAttribute(
      "src",
      /^https:\/\/i\.ytimg\.com\//,
    )
  } else {
    await expect(section.locator("img")).toHaveCount(0)
    await expect(visual).toContainText((await title.textContent())!.trim())
  }
})

test("every module links to its blog post and, when it has one, its video", async ({
  page,
}) => {
  const section = await open(page, desktop)
  const articles = await section.getByRole("article").all()
  expect(articles).toHaveLength(4)
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
  expect(hrefs.length).toBeGreaterThanOrEqual(4)

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
  expect(articles).toHaveLength(4)
  let previousBottom = -Infinity
  for (const article of articles) {
    const rect = await box(article)
    expect(rect.x).toBeGreaterThanOrEqual(0)
    expect(rect.x + rect.width).toBeLessThanOrEqual(viewportWidth)
    expect(rect.y).toBeGreaterThanOrEqual(previousBottom - 2)
    previousBottom = rect.y + rect.height
  }
})

test("a long package name stays inside its card", async ({ page }) => {
  const section = await open(page, narrowDesktop)
  const recent = await section
    .getByRole("article")
    .all()
    .then((all) => all.slice(1))
  expect(recent).toHaveLength(3)
  for (const article of recent) {
    // The longest package in the series so far, in every recent card.
    await article
      .getByText(/^from "/)
      .evaluate(
        (node) => (node.textContent = 'from "effect/unstable/persistence"'),
      )
    const articleBox = await onScreen(article)
    const overflow = await article.evaluate((node) =>
      Math.max(
        node.scrollWidth - node.clientWidth,
        ...[...node.querySelectorAll("*")].map(
          (child) =>
            child.getBoundingClientRect().right -
            node.getBoundingClientRect().right,
        ),
      ),
    )
    expect(overflow, `card at x=${articleBox.x}`).toBeLessThanOrEqual(1)
  }
})

test("small text in the modules keeps readable contrast at rest", async ({
  page,
}) => {
  const section = await open(page, desktop)
  // Every element under 14px with text of its own: numbers, packages, dates,
  // durations and any badge. Rendered over the card they sit in.
  const ratios = await section.getByRole("article").evaluateAll((articles) => {
    const channel = (value: number) => {
      const c = value / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    }
    // Computed colors come back in oklch; paint them to read sRGB bytes.
    const context = document.createElement("canvas").getContext("2d")!
    const luminance = (...layers: ReadonlyArray<string>) => {
      context.clearRect(0, 0, 1, 1)
      for (const layer of layers) {
        context.fillStyle = layer
        context.fillRect(0, 0, 1, 1)
      }
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data
      return 0.2126 * channel(r!) + 0.7152 * channel(g!) + 0.0722 * channel(b!)
    }
    const backgrounds = (node: Element) => {
      const layers: Array<string> = []
      for (let el: Element | null = node; el; el = el.parentElement) {
        const { backgroundColor } = getComputedStyle(el)
        if (!/rgba\(.*,\s*0\)$/.test(backgroundColor))
          layers.unshift(backgroundColor)
      }
      return layers
    }
    return articles
      .flatMap((article) => [...article.querySelectorAll("*")])
      .filter(
        (node) =>
          parseFloat(getComputedStyle(node).fontSize) < 14 &&
          [...node.childNodes].some(
            (child) =>
              child.nodeType === Node.TEXT_NODE &&
              child.textContent!.trim() !== "",
          ) &&
          node.getClientRects().length > 0,
      )
      .map((node) => {
        const text = luminance(getComputedStyle(node).color)
        const background = luminance(...backgrounds(node))
        const [light, dark] =
          text > background ? [text, background] : [background, text]
        return {
          text: node.textContent!.trim().slice(0, 30),
          ratio: Number(((light + 0.05) / (dark + 0.05)).toFixed(2)),
        }
      })
  })
  expect(ratios.length).toBeGreaterThan(0)
  // WCAG AA for small text.
  for (const { text, ratio } of ratios) {
    expect(ratio, text).toBeGreaterThanOrEqual(4.5)
  }
})
