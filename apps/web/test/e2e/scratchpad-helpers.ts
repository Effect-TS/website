import { expect, test, type Page } from "playwright/test"

// Shared by the Scratchpad e2e specs (scratchpad-worker, scratchpad-container).

export const READY_TIMEOUT = 60_000
export const LSP_TIMEOUT = 20_000
/** Boot, `pnpm install` and the types copy. */
export const TYPES_TIMEOUT = 120_000
/** A Run's start to its first output in the Container (about 5 s). */
export const RUN_TIMEOUT = 60_000

export const editorOf = (page: Page) => page.getByTestId("scratchpad-editor")
export const statusOf = (page: Page) => page.getByTestId("lsp-status")
export const containerOf = (page: Page) => page.getByTestId("container-status")
export const runOutputOf = (page: Page) => page.getByTestId("run-output")

export const lineWith = (page: Page, text: string) =>
  editorOf(page).locator(".cm-line").filter({ hasText: text }).first()

export const lintMessages = async (page: Page, text: string) => {
  const range = lineWith(page, text).locator(".cm-lintRange").first()
  await expect(range).toBeVisible({ timeout: LSP_TIMEOUT })
  // On very long lines the range's centre sits far off-screen and the editor
  // is scrolled to the cursor at the line's end, so Playwright's hover lands
  // on the gutter or file explorer. Scroll back and hover the range's start.
  await editorOf(page)
    .locator(".cm-scroller")
    .evaluate((el) => {
      el.scrollLeft = 0
    })
  await range.hover({ position: { x: 4, y: 4 } })
  const tooltip = page.locator(".cm-tooltip-lint")
  await expect(tooltip).toBeVisible({ timeout: LSP_TIMEOUT })
  return tooltip
}

export const dismissTooltips = (page: Page) => page.mouse.move(0, 0)

/** Replaces the active editor's text in one transaction (like a paste). */
export const replaceDocument = async (page: Page, text: string) => {
  await editorOf(page).locator(".cm-content").click()
  await page.keyboard.press("ControlOrMeta+a")
  await page.keyboard.insertText(text)
}

export const openFile = async (page: Page, path: string) => {
  await page.getByTestId(`explorer-file-${path}`).click()
  await expect(page.getByTestId(`editor-tab-${path}`)).toBeVisible()
}

/** Stores `workspace` (share-format JSON) as the Scratchpad autosave, so it loads instead of the seed. */
export const useAutosave = (page: Page, workspace: unknown) =>
  page.addInitScript(
    (autosave) => {
      localStorage.setItem("scratchpad-autosave", autosave)
    },
    JSON.stringify({ _tag: "Some", value: workspace }),
  )

/**
 * Hosts the real Container needs: StackBlitz serves the WebContainer boot
 * iframe (`/headless`), and installs go to the npm registry.
 */
const CONTAINER_HOSTS = ["https://stackblitz.com", "https://registry.npmjs.org"]

let reachability: Promise<string | undefined> | undefined

/**
 * Why the Container cannot work from here, or `undefined` when its hosts
 * answer. Any HTTP response counts: only network errors and timeouts mean
 * offline. Checked once per test worker.
 */
export const containerUnreachable = (): Promise<string | undefined> =>
  (reachability ??= Promise.all(
    CONTAINER_HOSTS.map((url) =>
      fetch(url, { method: "HEAD", signal: AbortSignal.timeout(10_000) }).then(
        () => undefined,
        (error: unknown) => `${url}: ${String(error)}`,
      ),
    ),
  ).then((errors) => errors.find((error) => error !== undefined)))

/**
 * Skips the current test (or, in `beforeAll`, the file) when the Container's
 * hosts are unreachable. Without this an offline boot never fails: it stays
 * `booting`, and the test would time out instead of skipping.
 */
export const skipUnlessContainerReachable = async () => {
  const reason = await containerUnreachable()
  test.skip(
    reason !== undefined,
    `The Container's hosts are unreachable: ${reason}`,
  )
}

const SETTLED_PHASE = /^(ready|failed|install-failed|dependencies-unavailable)$/

/**
 * Waits until the Container settles. Skips the test when the Container's
 * hosts are unreachable, or when it did not get to `ready` (boot or install
 * failed), since Effect's types are missing.
 */
export const awaitInstalledTypes = async (page: Page) => {
  await skipUnlessContainerReachable()
  const badge = containerOf(page)
  await expect(badge).toHaveAttribute("data-container-phase", SETTLED_PHASE, {
    timeout: TYPES_TIMEOUT,
  })
  const phase = await badge.getAttribute("data-container-phase")
  test.skip(
    phase !== "ready",
    `The Container did not install (offline?): ${phase}: ${await badge.getAttribute("title")}`,
  )
}

/** The latest Run's number (`data-run-id`, 0 before the first Run). */
export const runIdOf = async (page: Page) =>
  Number((await runOutputOf(page).getAttribute("data-run-id")) ?? "0")
