import { expect, test, type Page } from "playwright/test"

// Share and autosave in the Scratchpad, against `astro dev` (whose shortener
// keeps shares in memory): see playwright.scratchpad-worker.config.ts.

const EDIT =
  'import * as Effect from "effect/Effect"\n\nexport const shared = 42\n'

const editorOf = (page: Page) => page.getByTestId("scratchpad-editor")

const openScratchpad = async (page: Page, path = "/scratchpad") => {
  await page.goto(path, { waitUntil: "domcontentloaded" })
  await expect(
    editorOf(page).locator('.cm-content[contenteditable="true"]'),
  ).toBeVisible({ timeout: 60_000 })
}

/** Replaces the active editor's text in one transaction (like a paste). */
const replaceDocument = async (page: Page, text: string) => {
  await editorOf(page).locator(".cm-content").click()
  await page.keyboard.press("ControlOrMeta+a")
  await page.keyboard.insertText(text)
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

test("a share over the size limit shows an error", async ({ page }) => {
  await openScratchpad(page)
  // Random text doesn't compress: ~200 KB stays over the 128 KB limit.
  const noise = await page.evaluate(() =>
    Array.from({ length: 200 * 1024 }, () =>
      String.fromCharCode(33 + Math.floor(Math.random() * 90)),
    ).join(""),
  )
  await replaceDocument(page, `export const noise = ${JSON.stringify(noise)}\n`)
  await page.getByTestId("scratchpad-share").click()
  await expect(page.getByTestId("scratchpad-share-error")).toContainText(
    "too large to share",
    { timeout: 30_000 },
  )
})

test("edits are autosaved and restored on reload", async ({ page }) => {
  await openScratchpad(page)
  // Nothing is saved while the Workspace is the seed.
  await page.waitForTimeout(2_500)
  expect(
    await page.evaluate(() => localStorage.getItem("scratchpad-autosave")),
  ).toBeNull()

  await replaceDocument(page, EDIT)
  await expect
    .poll(
      () => page.evaluate(() => localStorage.getItem("scratchpad-autosave")),
      { timeout: 10_000 },
    )
    .toContain("export const shared = 42")
  expect(
    await page.evaluate(() => localStorage.getItem("workspace-autosave")),
  ).toBeNull()

  await openScratchpad(page)
  await expect(editorOf(page).locator(".cm-content")).toContainText(
    "export const shared = 42",
  )
})
