import * as zip from "@zip.js/zip.js"
import { readFile } from "node:fs/promises"
import { expect, test, type Page } from "playwright/test"
import { editorOf, replaceDocument } from "./scratchpad-helpers.ts"

// Share and autosave in the Scratchpad, against `astro dev` (whose shortener
// keeps shares in memory): see playwright.scratchpad-worker.config.ts. What
// gets shared and saved is unit-tested (test/features/scratchpad); these
// cover the real shortener, clipboard, URL, download and localStorage.

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

const contentOf = (page: Page) => editorOf(page).locator(".cm-content")

/** Shares the Workspace and returns the share URL's hash. */
const share = async (page: Page) => {
  await page.getByTestId("scratchpad-share").click()
  const url = page.getByTestId("scratchpad-share-url")
  await expect(url).toHaveValue(/\/scratchpad#.+/, { timeout: 30_000 })
  return new URL(await url.inputValue()).hash
}

/** Opens `/scratchpad<hash>` as a fresh visitor (no autosave). */
const visit = async (page: Page, hash: string) => {
  const other = await page.context().browser()!.newContext()
  const visitor = await other.newPage()
  await openScratchpad(visitor, `/scratchpad${hash}`)
  return { visitor, close: () => other.close() }
}

test("a share link is copied, opens the shared files for a fresh visitor, and the popover downloads them as a zip", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await openScratchpad(page)
  await replaceDocument(page, EDIT)

  const hash = await share(page)
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    hash,
  )

  const { visitor, close } = await visit(page, hash)
  await expect(contentOf(visitor)).toContainText("export const shared = 42")
  await close()

  const downloading = page.waitForEvent("download")
  await page
    .getByTestId("scratchpad-share-popover")
    .getByTestId("scratchpad-download")
    .click()
  const download = await downloading
  const reader = new zip.ZipReader(
    new zip.Uint8ArrayReader(
      new Uint8Array(await readFile(await download.path())),
    ),
  )
  const main = (await reader.getEntries()).find(
    (entry) => entry.filename === "playground-v4/src/main.ts",
  )
  expect(
    main !== undefined && !main.directory
      ? await main.getData(new zip.TextWriter())
      : undefined,
  ).toBe(EDIT)
  await reader.close()
})

test("edits survive a reload until Reset restores the seed", async ({
  page,
}) => {
  await openScratchpad(page)
  await replaceDocument(page, EDIT)
  // The autosave lags edits by a couple of seconds.
  await expect
    .poll(
      () => page.evaluate(() => localStorage.getItem("scratchpad-autosave")),
      { timeout: 10_000 },
    )
    .toContain("export const shared = 42")

  await openScratchpad(page)
  await expect(contentOf(page)).toContainText("export const shared = 42")

  await page.getByTestId("scratchpad-reset").click()
  await page
    .getByTestId("confirm-dialog")
    .getByRole("button", { name: "Reset" })
    .click()
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("scratchpad-autosave")),
    )
    .not.toContain("export const shared = 42")
  await openScratchpad(page)
  await expect(contentOf(page)).toContainText(
    "Welcome to the Effect v4 Playground!",
  )
})

test("switching to v3 loads the v3 seed and is remembered, and a v3 share opens as v3", async ({
  page,
  context,
}) => {
  const v3Button = (page: Page) =>
    page
      .getByTestId("scratchpad-version-toggle")
      .getByRole("button", { name: "v3" })
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await openScratchpad(page)

  await v3Button(page).click()
  await page
    .getByTestId("confirm-dialog")
    .getByRole("button", { name: "Switch" })
    .click()
  await expect(contentOf(page)).toContainText(
    "Welcome to the Effect Playground!",
  )

  // Remembered: a fresh load opens the v3 seed.
  await openScratchpad(page)
  await expect(v3Button(page)).toHaveAttribute("aria-pressed", "true")

  await replaceDocument(
    page,
    'import { Effect } from "effect"\n\nEffect.runFork(Effect.log("v3 shared"))\n',
  )
  const { visitor, close } = await visit(page, await share(page))
  await expect(contentOf(visitor)).toContainText("v3 shared")
  await expect(v3Button(visitor)).toHaveAttribute("aria-pressed", "true")
  await close()
})
