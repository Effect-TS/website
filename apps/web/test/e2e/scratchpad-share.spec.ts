import * as zip from "@zip.js/zip.js"
import { readFile } from "node:fs/promises"
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
  ).toBeVisible({
    timeout: 60_000,
  })
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
      {
        timeout: 10_000,
      },
    )
    .toContain("export const shared = 42")

  await openScratchpad(page)
  await expect(editorOf(page).locator(".cm-content")).toContainText(
    "export const shared = 42",
  )
})

test("the Share popover's download saves the Workspace as a zip", async ({
  page,
}) => {
  await openScratchpad(page)
  await replaceDocument(page, EDIT)

  await page.getByTestId("scratchpad-share").click()
  const downloading = page.waitForEvent("download")
  await page
    .getByTestId("scratchpad-share-popover")
    .getByTestId("scratchpad-download")
    .click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe("playground-v4.zip")

  const reader = new zip.ZipReader(
    new zip.Uint8ArrayReader(
      new Uint8Array(await readFile(await download.path())),
    ),
  )
  const entries: Record<string, string> = {}
  for (const entry of await reader.getEntries()) {
    if (!entry.directory) {
      entries[entry.filename] = await entry.getData!(new zip.TextWriter())
    }
  }
  await reader.close()
  expect(Object.keys(entries)).toEqual(
    expect.arrayContaining([
      "playground-v4/package.json",
      "playground-v4/tsconfig.json",
      "playground-v4/dprint.json",
      "playground-v4/src/main.ts",
    ]),
  )
  expect(entries["playground-v4/src/main.ts"]).toBe(EDIT)
})

const versionButton = (page: Page, version: "v3" | "v4") =>
  page
    .getByTestId("scratchpad-version-toggle")
    .getByRole("button", { name: version })

const confirm = (page: Page, label: string) =>
  page.getByTestId("confirm-dialog").getByRole("button", { name: label })

const V4_WELCOME = "Welcome to the Effect v4 Playground!"
const V3_WELCOME = "Welcome to the Effect Playground!"

test("Reset asks, then restores the seed, clears the autosave and the share hash", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await openScratchpad(page)
  await replaceDocument(page, EDIT)
  await page.getByTestId("scratchpad-share").click()
  await expect(page.getByTestId("scratchpad-share-url")).toHaveValue(/#.+/, {
    timeout: 30_000,
  })
  await page.keyboard.press("Escape")
  await expect
    .poll(
      () => page.evaluate(() => localStorage.getItem("scratchpad-autosave")),
      {
        timeout: 10_000,
      },
    )
    .toContain("export const shared = 42")

  // Cancel keeps the edit.
  await page.getByTestId("scratchpad-reset").click()
  await confirm(page, "Cancel").click()
  await expect(page.getByTestId("confirm-dialog")).toHaveCount(0)
  await expect(editorOf(page).locator(".cm-content")).toContainText(
    "export const shared = 42",
  )

  await page.getByTestId("scratchpad-reset").click()
  await confirm(page, "Reset").click()
  await expect(editorOf(page).locator(".cm-content")).toContainText(V4_WELCOME)
  expect(new URL(page.url()).hash).toBe("")
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("scratchpad-autosave")),
    )
    .not.toContain("export const shared = 42")

  // A reload opens the seed too.
  await openScratchpad(page)
  await expect(editorOf(page).locator(".cm-content")).toContainText(V4_WELCOME)
})

test("switching to v3 asks, loads the v3 seed and is remembered; a v3 share opens as v3", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await openScratchpad(page)
  await expect(versionButton(page, "v4")).toHaveAttribute(
    "aria-pressed",
    "true",
  )

  await versionButton(page, "v3").click()
  await confirm(page, "Cancel").click()
  await expect(versionButton(page, "v4")).toHaveAttribute(
    "aria-pressed",
    "true",
  )

  await versionButton(page, "v3").click()
  await confirm(page, "Switch").click()
  await expect(editorOf(page).locator(".cm-content")).toContainText(V3_WELCOME)
  await expect(versionButton(page, "v3")).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await expect(page.getByTestId("explorer-file-src/DevTools.ts")).toBeVisible()

  // Remembered: a fresh load opens the v3 seed.
  await openScratchpad(page)
  await expect(editorOf(page).locator(".cm-content")).toContainText(V3_WELCOME)

  // Share the v3 Workspace; a fresh visitor opens it as v3, with no notice.
  await replaceDocument(
    page,
    'import { Effect } from "effect"\n\nEffect.runFork(Effect.log("v3 shared"))\n',
  )
  await page.getByTestId("scratchpad-share").click()
  const url = page.getByTestId("scratchpad-share-url")
  await expect(url).toHaveValue(/\/scratchpad#.+/, { timeout: 30_000 })
  const hash = new URL(await url.inputValue()).hash

  const other = await context.browser()!.newContext()
  const visitor = await other.newPage()
  await openScratchpad(visitor, `/scratchpad${hash}`)
  await expect(editorOf(visitor).locator(".cm-content")).toContainText(
    "v3 shared",
  )
  await expect(visitor.getByTestId("scratchpad-load-notice")).toHaveCount(0)
  await expect(versionButton(visitor, "v3")).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await other.close()
})
