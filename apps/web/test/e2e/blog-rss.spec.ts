import { expect, test } from "playwright/test"

const viewports = [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
]

test("blog index shows the RSS link without scrolling on desktop and mobile", async ({
  page,
}) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.goto("/blog", { waitUntil: "networkidle" })
    const rss = page.getByRole("link", { name: /rss/i })
    await expect(rss).toHaveAttribute("href", "/rss.xml")
    await expect(rss).toBeInViewport()
  }
})

test("blog index advertises its feed for reader autodiscovery", async ({
  page,
}) => {
  await page.goto("/blog")
  await expect(
    page.locator('link[rel="alternate"][type="application/rss+xml"]'),
  ).toHaveAttribute("href", "/rss.xml")
})
