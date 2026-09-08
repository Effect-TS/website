import fs from "node:fs/promises"
import path from "node:path"
import { chromium } from "playwright"
import { AxeBuilder } from "@axe-core/playwright"
import { parse } from "devalue"

const baseURL = process.env.WEBSITE_URL ?? "http://localhost:4321"
const output = process.env.AUDIT_OUTPUT ?? "test-results/accessibility.json"
const templates = [
  "/",
  "/myths",
  "/community-hub",
  "/effect-jobs",
  "/merch",
  "/brand-assets",
  "/privacy",
  "/adoption-partners/ziverge",
  "/effect-days",
  "/effect-days/about-livorno",
  "/effect-days/code-of-conduct",
  "/effect-days/refund-policy",
  "/blog",
  "/blog/astra-vs-the-boys",
  "/podcast",
  "/docs/v4",
  "/docs/v4/guides",
  "/docs/v3",
  "/play",
  "/404",
]
const browser = await chromium.launch({ channel: "chrome", headless: true })
const results = []
const all = process.env.AUDIT_ALL === "1"
const startedAt = new Date().toISOString()
let expectedStates = 0
try {
  const routes = new Set(templates)
  // Use Astro's collection IDs, including frontmatter slugs and punctuation rules.
  const store = parse(
    await fs.readFile("apps/web/.astro-cache/data-store.json", "utf8"),
  )
  if (all) {
    for (const name of ["docs", "blog"]) {
      for (const { id } of store.get(name).values())
        routes.add(`/${name}/${id}`)
    }
  }
  const packages = new Set()
  const modules = store.get("apiReference")
  if (!modules?.size)
    throw new Error(
      "Prepare the API-reference dataset and run astro sync before auditing.",
    )
  for (const { data } of modules.values()) {
    const pkg = `/docs/${data.version}/api/${data.packageSlug}`
    routes.add(`/docs/${data.version}/api`)
    routes.add(pkg)
    if (all || !packages.has(pkg)) routes.add(`${pkg}/${data.modulePath}`)
    packages.add(pkg)
  }
  const discovery = await browser.newContext()
  const page = await discovery.newPage()
  await page.goto(`${baseURL}/podcast`)
  for (const href of await page
    .locator('a[href^="/podcast/episodes/"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute("href"))))
    routes.add(href.replace(/\/$/, ""))
  await discovery.close()
  if (process.env.AUDIT_ROUTES) {
    routes.clear()
    for (const route of process.env.AUDIT_ROUTES.split(",")) routes.add(route)
  }
  const widths =
    process.env.AUDIT_WIDTHS?.split(",").map(Number) ??
    (all ? [1280] : [1280, 390, 320])
  const themes =
    process.env.AUDIT_THEMES?.split(",") ?? (all ? ["dark"] : ["dark", "light"])
  if (
    widths.some((width) => !Number.isInteger(width) || width <= 0) ||
    themes.some((theme) => !["dark", "light"].includes(theme))
  )
    throw new Error("Invalid audit widths or themes")
  const layouts = widths.flatMap((width) =>
    themes.map((theme) => ({ width, theme })),
  )
  expectedStates = routes.size * layouts.length
  for (const { width, theme } of layouts) {
    const queue = [...routes]
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          reducedMotion: "reduce",
        })
        await context.addInitScript(
          (theme) => localStorage.setItem("theme", theme),
          theme,
        )
        const page = await context.newPage()
        const resourceErrors = []
        page.on("response", (response) => {
          if (
            response.status() >= 400 &&
            response.url().startsWith(baseURL) &&
            ["script", "stylesheet"].includes(response.request().resourceType())
          )
            resourceErrors.push(`${response.status()} ${response.url()}`)
        })
        while (queue.length) {
          const route = queue.shift()
          resourceErrors.length = 0
          try {
            const response = await page.goto(new URL(route, baseURL).href, {
              waitUntil: "load",
              timeout: 45000,
            })
            await page.waitForFunction(
              () =>
                !document.querySelector(
                  'astro-island[client="load"][ssr], astro-island[client="only"][ssr]',
                ),
              undefined,
              { timeout: 15000 },
            )
            await page.evaluate(() => document.fonts.ready)
            if (route === "/play") {
              await page
                .getByRole("textbox", {
                  name: "TypeScript editor",
                  exact: true,
                })
                .waitFor({ timeout: 45000 })
              await page
                .getByRole("status", {
                  name: "Loading Playground",
                  exact: true,
                })
                .waitFor({ state: "hidden", timeout: 45000 })
            }
            if (resourceErrors.length)
              throw new Error(resourceErrors.join("\n"))
            await page.waitForFunction(
              () =>
                [...document.querySelectorAll(".expressive-code pre")].every(
                  (pre) =>
                    pre.scrollWidth <= pre.clientWidth || pre.tabIndex === 0,
                ),
              undefined,
              { timeout: 5000 },
            )
            await page
              .locator("astro-dev-toolbar")
              .evaluateAll((nodes) => nodes.forEach((node) => node.remove()))
            const scan = await new AxeBuilder({ page })
              .withTags([
                "wcag2a",
                "wcag2aa",
                "wcag21a",
                "wcag21aa",
                "wcag22aa",
                "best-practice",
              ])
              .analyze()
            const layout = await page.evaluate(() => ({
              width: innerWidth,
              theme: document.documentElement.dataset.theme,
              scrollWidth: document.documentElement.scrollWidth,
              headings: [
                ...document.querySelectorAll("main h1, main h2, main h3"),
              ].map((heading) => ({
                level: heading.tagName,
                text: heading.textContent,
              })),
              buttons: [...document.querySelectorAll("button")]
                .filter((button) => button.getClientRects().length)
                .map((button) => ({
                  name: button.getAttribute("aria-label"),
                  text: button.textContent?.trim().slice(0, 80),
                })),
            }))
            results.push({
              route,
              width,
              theme,
              status: response?.status(),
              url: page.url(),
              violations: scan.violations,
              incomplete: scan.incomplete.map((rule) => ({
                id: rule.id,
                nodes: rule.nodes.length,
              })),
              layout,
            })
            console.log(
              JSON.stringify({
                route,
                width,
                theme,
                status: response?.status(),
                violations: scan.violations.map((violation) => ({
                  id: violation.id,
                  count: violation.nodes.length,
                })),
                overflow: layout.scrollWidth > width,
              }),
            )
          } catch (error) {
            results.push({ route, width, theme, error: String(error) })
            console.error(route, String(error))
          }
        }
        await context.close()
      }),
    )
  }
} finally {
  await fs.mkdir(path.dirname(output), { recursive: true })
  await fs.writeFile(
    output,
    JSON.stringify(
      {
        browser: browser.version(),
        startedAt,
        finishedAt: new Date().toISOString(),
        expectedStates,
        results,
      },
      null,
      2,
    ),
  )
  await browser.close()
}
if (
  results.length !== expectedStates ||
  results.some(
    (result) =>
      result.error ||
      result.violations?.length ||
      result.layout.scrollWidth > result.width ||
      result.status !== (result.route === "/404" ? 404 : 200),
  )
)
  process.exitCode = 1
