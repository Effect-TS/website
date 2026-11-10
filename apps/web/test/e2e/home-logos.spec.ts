import { expect, test } from "playwright/test"
import { storeTheme } from "./theme-helpers.ts"

test.use({ contextOptions: { reducedMotion: "reduce" } })

const minimumWidths = { opencode: 60, Cloudflare: 60, T3: 14 }

// Inline SVGs share one id namespace per document. If a mark's clip path, mask
// or gradient resolves into another mark's definitions, the artwork breaks in
// ways that depend on what else is on the page, so every url(#id) reference
// must point inside its own <svg>.
const crossSvgReferences = () =>
  Array.from(document.querySelectorAll("svg")).flatMap((svg) =>
    Array.from(svg.querySelectorAll("*")).flatMap((element) =>
      ["clip-path", "mask", "fill", "stroke", "filter"].flatMap((attribute) => {
        const match = element.getAttribute(attribute)?.match(/url\(#([^)]+)\)/)
        const target = match && document.getElementById(match[1]!)
        return target && !svg.contains(target)
          ? [
              `${svg.getAttribute("aria-label") ?? svg.getAttribute("data-pm-icon") ?? "svg"} -> #${match[1]}`,
            ]
          : []
      }),
    ),
  )

for (const theme of ["light", "dark"] as const) {
  test(`production logos keep their size after selecting Bun (${theme})`, async ({
    page,
  }) => {
    await storeTheme(page, theme)
    await page.goto("/", { waitUntil: "networkidle" })

    const selector = page.locator("effect-hero-command").first()
    await selector.getByRole("button", { name: /Package manager/ }).click()
    await selector.getByRole("option", { name: "bun" }).click()
    await expect(
      selector.getByRole("button", { name: "Package manager: bun" }),
    ).toBeVisible()

    for (const [name, minimum] of Object.entries(minimumWidths)) {
      const logo = page
        .locator(".hero-section")
        .getByRole("img", { name, exact: true })
        .filter({ visible: true })
      await expect(logo).toBeVisible()
      expect((await logo.boundingBox())!.width).toBeGreaterThan(minimum)
    }

    expect(await page.evaluate(crossSvgReferences)).toEqual([])
  })
}
