import { expect, test, type Page } from "playwright/test"
import { editorOf, replaceDocument } from "./scratchpad-helpers.ts"

// Share and autosave in the Scratchpad, against `astro dev` (whose shortener
// keeps shares in memory): see playwright.scratchpad-worker.config.ts. What
// gets shared and saved is unit-tested (test/features/scratchpad); these
// cover the real shortener, clipboard, URL and localStorage.

const EDIT =
  'import * as Effect from "effect/Effect"\n\nexport const shared = 42\n'

const openScratchpad = async (page: Page, path = "/scratchpad") => {
  await page.goto(path, { waitUntil: "domcontentloaded" })
  await expect(
    editorOf(page).locator('.cm-content[contenteditable="true"]'),
  ).toBeVisible({ timeout: 60_000 })
}

test("a share opens in a new page with the shared files", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await openScratchpad(page)
  await replaceDocument(page, EDIT)

  await page.getByTestId("scratchpad-share").click()
  const url = page.getByTestId("scratchpad-share-url")
  await expect(url).toHaveValue(/\/scratchpad#.+/, { timeout: 30_000 })
  const shareUrl = await url.inputValue()
  const hash = new URL(shareUrl).hash
  // The page URL carries the share, and the link is on the clipboard.
  expect(new URL(page.url()).hash).toBe(hash)
  await expect(page.getByTestId("scratchpad-share-status")).toContainText(
    "copied",
  )
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    shareUrl,
  )

  // A fresh visitor (no autosave) gets the shared Workspace.
  const other = await context.browser()!.newContext()
  const visitor = await other.newPage()
  await openScratchpad(visitor, `/scratchpad${hash}`)
  await expect(editorOf(visitor).locator(".cm-content")).toContainText(
    "export const shared = 42",
  )
  await other.close()
})

test("a failed share tells the visitor", async ({ page }) => {
  await page.route("**/api/playground/shorten", (route) =>
    route.fulfill({ status: 500, body: "boom" }),
  )
  await openScratchpad(page)
  await page.getByTestId("scratchpad-share").click()
  await expect(page.getByTestId("scratchpad-share-error")).toBeVisible({
    timeout: 30_000,
  })
})

test("edits are autosaved and restored on reload", async ({ page }) => {
  await openScratchpad(page)
  await replaceDocument(page, EDIT)
  await expect
    .poll(
      () => page.evaluate(() => localStorage.getItem("scratchpad-autosave")),
      { timeout: 10_000 },
    )
    .toContain("export const shared = 42")

  await openScratchpad(page)
  await expect(editorOf(page).locator(".cm-content")).toContainText(
    "export const shared = 42",
  )
})
