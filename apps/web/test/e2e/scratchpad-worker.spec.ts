import { expect, test, type Page } from "playwright/test"

// The Scratchpad with the Effect tsrs language server running in a Web Worker
// on the page: see playwright.scratchpad-worker.config.ts.
//
// Types come from the packages the real Container installs (ADR 0004), so
// tests that need Effect's types wait for the Container to reach `ready`.
// Booting needs StackBlitz's servers and installing needs the npm registry:
// when the Container cannot get there, those tests skip rather than fail.

const READY_TIMEOUT = 60_000
const LSP_TIMEOUT = 20_000
/** Boot, `pnpm install` and the types copy. */
const TYPES_TIMEOUT = 120_000

test.describe.configure({ timeout: 240_000 })

const GREETER = `import { Effect } from "effect"

export const greet = (name: string) =>
  Effect.succeed(\`Hello, \${name}!\`)
`

const MAIN = `import { Effect } from "effect"
import { greet } from "./greeter.ts"

const program = Effect.gen(function* () {
  // Floating Effect (Effect TS377001) — yield* or remove to resolve
  Effect.succeed("unhandled")

  const greeting = yield* greet("Effect")
  return greeting
})

export { program }
`

/**
 * A two-file Workspace with a cross-file import and one Effect diagnostic,
 * stored as the Scratchpad autosave (`Option<Workspace>` in the share format)
 * so it loads instead of the seed.
 */
const GREETER_AUTOSAVE = JSON.stringify({
  _tag: "Some",
  value: {
    name: "playground-v4",
    initialFilePath: "src/main.ts",
    prepare: "pnpm install",
    shells: [{ command: "../run src/main.ts" }],
    snapshots: [],
    tree: [
      {
        _tag: "File",
        name: "package.json",
        language: "json",
        initialContent: JSON.stringify(
          { type: "module", dependencies: { effect: "latest" } },
          undefined,
          2,
        ),
      },
      {
        _tag: "File",
        name: "tsconfig.json",
        language: "json",
        initialContent: JSON.stringify(
          {
            // The language server's built-in defaults, on NodeNext (which
            // the share format's normalization enforces).
            compilerOptions: {
              strict: true,
              exactOptionalPropertyTypes: true,
              noEmit: true,
              target: "ES2022",
              module: "NodeNext",
              moduleResolution: "NodeNext",
              allowImportingTsExtensions: true,
              types: [],
            },
            include: ["src"],
          },
          undefined,
          2,
        ),
      },
      {
        _tag: "Directory",
        name: "src",
        children: [
          { _tag: "File", name: "main.ts", initialContent: MAIN },
          { _tag: "File", name: "greeter.ts", initialContent: GREETER },
        ],
      },
    ],
  },
})

const useGreeterWorkspace = (page: Page) =>
  page.addInitScript((autosave) => {
    localStorage.setItem("scratchpad-autosave", autosave)
  }, GREETER_AUTOSAVE)

const editorOf = (page: Page) => page.getByTestId("scratchpad-editor")
const statusOf = (page: Page) => page.getByTestId("lsp-status")

const lineWith = (page: Page, text: string) =>
  editorOf(page).locator(".cm-line").filter({ hasText: text }).first()

const lintMessages = async (page: Page, text: string) => {
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

const dismissTooltips = (page: Page) => page.mouse.move(0, 0)

const containerOf = (page: Page) => page.getByTestId("container-status")

/**
 * Waits until the Container settles. Skips the test when it did not get to
 * `ready` (no network to boot or install), since Effect's types are missing.
 */
const awaitInstalledTypes = async (page: Page) => {
  const badge = containerOf(page)
  await expect(badge).toHaveAttribute(
    "data-container-phase",
    /^(ready|failed|install-failed|dependencies-unavailable)$/,
    { timeout: TYPES_TIMEOUT },
  )
  const phase = await badge.getAttribute("data-container-phase")
  test.skip(
    phase !== "ready",
    `The Container did not install (offline?): ${phase}: ${await badge.getAttribute("title")}`,
  )
}

const openReady = async (page: Page) => {
  await useGreeterWorkspace(page)
  await page.goto("/scratchpad", { waitUntil: "domcontentloaded" })
  await expect(statusOf(page)).toHaveAttribute("data-lsp-status", "ready", {
    timeout: READY_TIMEOUT,
  })
  await awaitInstalledTypes(page)
  await expect(
    lineWith(page, 'Effect.succeed("unhandled")').locator(".cm-lintRange"),
  ).toBeVisible({ timeout: LSP_TIMEOUT })
}

/** Replaces the active editor's text in one transaction (like a paste). */
const replaceDocument = async (page: Page, text: string) => {
  await editorOf(page).locator(".cm-content").click()
  await page.keyboard.press("ControlOrMeta+a")
  await page.keyboard.insertText(text)
}

const openFile = async (page: Page, path: string) => {
  await page.getByTestId(`explorer-file-${path}`).click()
  await expect(page.getByTestId(`editor-tab-${path}`)).toBeVisible()
}

test("loads the in-browser language server on the cross-origin isolated page and shows the floating Effect diagnostic", async ({
  page,
  browserName,
}) => {
  const assets: Array<Record<string, unknown>> = []
  page.on("response", async (response) => {
    const url = response.url()
    if (!/tsrs-effect-lsp|lsp\.worker/.test(url)) return
    const headers = await response.allHeaders()
    const body = await response.body().catch(() => undefined)
    assets.push({
      url: url.replace(/^https?:\/\/[^/]+/, ""),
      status: response.status(),
      contentType: headers["content-type"],
      cacheControl: headers["cache-control"],
      contentEncoding: headers["content-encoding"],
      contentLength: headers["content-length"],
      bodyBytes: body?.byteLength,
    })
  })

  // Note when the first diagnostic squiggle renders, in page time.
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      if (document.querySelector(".cm-lintRange") === null) return
      ;(window as { __firstLintAt?: number }).__firstLintAt = performance.now()
      observer.disconnect()
    })
    observer.observe(document, { childList: true, subtree: true })
  })
  await useGreeterWorkspace(page)
  await page.goto("/scratchpad", { waitUntil: "domcontentloaded" })
  const status = statusOf(page)
  // The editor is usable while the server loads.
  await expect(
    editorOf(page).locator('.cm-content[contenteditable="true"]'),
  ).toContainText('Effect.succeed("unhandled")')

  await expect(status).toHaveAttribute("data-lsp-status", "ready", {
    timeout: READY_TIMEOUT,
  })
  const readyAt = await page.evaluate(() => performance.now())
  await awaitInstalledTypes(page)
  const typesAt = await page.evaluate(() => performance.now())

  await expect(
    lineWith(page, 'Effect.succeed("unhandled")').locator(".cm-lintRange"),
  ).toBeVisible({ timeout: LSP_TIMEOUT })
  const firstDiagnosticAt = await page.evaluate(() => performance.now())
  const tooltip = await lintMessages(page, 'Effect.succeed("unhandled")')
  // TS377001 is Effect's floatingEffect rule; the tooltip shows its message.
  await expect(tooltip).toContainText("floatingEffect")
  await expect(tooltip).toContainText("neither yielded nor used")

  const isolation = await page.evaluate(() => ({
    crossOriginIsolated: globalThis.crossOriginIsolated,
    sharedArrayBuffer: typeof SharedArrayBuffer,
  }))
  // Isolated for the Container (ADR 0004); the worker must still load.
  expect(isolation.crossOriginIsolated).toBe(true)
  expect(isolation.sharedArrayBuffer).toBe("function")
  const worker = page
    .workers()
    .find((w) => w.url().includes("lsp.worker") || w.url().includes("lsp"))
  expect(worker).toBeDefined()
  expect(await worker!.evaluate(() => globalThis.crossOriginIsolated)).toBe(
    true,
  )

  const wasm = assets.find(
    (a) =>
      String(a.url).includes(".wasm") &&
      a.status === 200 &&
      !String(a.url).includes("?import"),
  )
  expect(wasm, JSON.stringify(assets)).toBeDefined()
  expect(wasm!.contentType).toContain("application/wasm")
  // The module is fetched as its own file (at least a megabyte even when
  // compressed on the wire), not inlined into the worker script. Firefox does
  // not expose worker response bodies, so fall back to Content-Length.
  const size = (asset: Record<string, unknown>) =>
    Number(asset.bodyBytes ?? asset.contentLength)
  expect(size(wasm!)).toBeGreaterThan(1_000_000)
  const workerScript = assets.find((a) => String(a.url).includes("lsp.worker"))
  if (workerScript !== undefined) {
    expect(size(workerScript)).toBeLessThan(1_000_000)
  }

  const { ready, firstLintAt } = await page.evaluate(() => {
    const w = window as {
      __scratchpadLspReady?: { readonly at: number }
      __firstLintAt?: number
    }
    return { ready: w.__scratchpadLspReady, firstLintAt: w.__firstLintAt }
  })
  console.log(
    `[scratchpad-worker ${browserName}] ` +
      JSON.stringify({
        // Page time (ms since navigation start).
        workerReadyAt: ready === undefined ? undefined : Math.round(ready.at),
        firstDiagnosticAt:
          firstLintAt === undefined ? undefined : Math.round(firstLintAt),
        workerReadyToFirstDiagnosticMs:
          ready === undefined || firstLintAt === undefined
            ? undefined
            : Math.round(firstLintAt - ready.at),
        statusReadySeenAt: Math.round(readyAt),
        containerReadySeenAt: Math.round(typesAt),
        squiggleSeenAt: Math.round(firstDiagnosticAt),
        worker: ready,
        assets,
      }),
  )
})

test("reports a type error and clears it on edit, hovers types and completes Effect members", async ({
  page,
}) => {
  await openReady(page)

  const exportLine = lineWith(page, "export { program }")
  await exportLine.click()
  await page.keyboard.press("End")
  await page.keyboard.type('\nexport const broken: number = "oops"')
  const tooltip = await lintMessages(
    page,
    'export const broken: number = "oops"',
  )
  await expect(tooltip).toContainText(/not assignable to type 'number'/)
  await dismissTooltips(page)

  // Fix the line: the error goes away, the floating Effect stays.
  await lineWith(page, 'export const broken: number = "oops"').click()
  await page.keyboard.press("End")
  for (let i = 0; i < '"oops"'.length; i++) {
    await page.keyboard.press("Backspace")
  }
  await page.keyboard.type("1")
  await expect(
    lineWith(page, "export const broken: number = 1").locator(".cm-lintRange"),
  ).toHaveCount(0, { timeout: LSP_TIMEOUT })
  await expect(
    lineWith(page, 'Effect.succeed("unhandled")').locator(".cm-lintRange"),
  ).toBeVisible()

  // Hover: Effect quickinfo for `program`.
  const programToken = lineWith(page, "const program =")
    .getByText("program", { exact: true })
    .first()
  await programToken.hover()
  const hover = page.locator(".cm-tooltip-hover")
  await expect(hover).toBeVisible({ timeout: LSP_TIMEOUT })
  await expect(hover).toContainText(/Effect<string/)
  await dismissTooltips(page)

  // Completion after `Effect.`.
  await lineWith(page, "return greeting").click()
  await page.keyboard.press("Home")
  await page.keyboard.type("Effect.")
  const completions = page.locator(".cm-tooltip-autocomplete")
  if (!(await completions.isVisible())) {
    await page.keyboard.press("Control+Space")
  }
  await expect(completions).toBeVisible({ timeout: LSP_TIMEOUT })
  await expect(
    completions
      .locator(".cm-completionLabel")
      .filter({ hasText: /^succeed$/ })
      .first(),
  ).toBeVisible({ timeout: LSP_TIMEOUT })
})

test("updates diagnostics across files when another file changes, is created, renamed or deleted", async ({
  page,
}) => {
  await openReady(page)
  const importLine = 'import { greet } from "./greeter.ts"'

  // Change greeter.ts's export: main.ts's import breaks.
  await openFile(page, "src/greeter.ts")
  await replaceDocument(page, GREETER.replace("const greet", "const greetUser"))
  await openFile(page, "src/main.ts")
  const broken = await lintMessages(page, importLine)
  await expect(broken).toContainText(/has no exported member 'greet'/)
  await dismissTooltips(page)

  // Restore it: the import resolves again.
  await openFile(page, "src/greeter.ts")
  await replaceDocument(page, GREETER)
  await openFile(page, "src/main.ts")
  await expect(lineWith(page, importLine).locator(".cm-lintRange")).toHaveCount(
    0,
    { timeout: LSP_TIMEOUT },
  )

  // Create src/extra.ts and import it from main.ts.
  await page.getByTestId("explorer-new-file").click()
  await page.getByPlaceholder("file-name").fill("src/extra.ts")
  await page.keyboard.press("Enter")
  await expect(page.getByTestId("editor-tab-src/extra.ts")).toBeVisible()
  await editorOf(page).locator(".cm-content").click()
  await page.keyboard.insertText("export const extra = 1\n")
  await openFile(page, "src/main.ts")
  await lineWith(page, "export { program }").click()
  await page.keyboard.press("End")
  await page.keyboard.insertText(
    '\nimport { extra } from "./extra.ts"\nexport const useExtra: number = extra',
  )
  const extraImport = 'import { extra } from "./extra.ts"'
  await expect(lineWith(page, extraImport)).toBeVisible()
  // Give the server a pull, then check the import resolved.
  await page.waitForTimeout(1_000)
  await expect(
    lineWith(page, extraImport).locator(".cm-lintRange"),
  ).toHaveCount(0)

  // Rename it: the import no longer resolves.
  const extraRow = page.getByTestId("explorer-file-src/extra.ts").locator("..")
  await extraRow.hover()
  await extraRow.getByTitle("Rename file").click()
  const renameInput = page.getByPlaceholder("file-name")
  await renameInput.fill("renamed.ts")
  await renameInput.press("Enter")
  await expect(page.getByTestId("explorer-file-src/renamed.ts")).toBeVisible()
  await openFile(page, "src/main.ts")
  const missing = await lintMessages(page, extraImport)
  await expect(missing).toContainText(/Cannot find module '\.\/extra\.ts'/)
  await dismissTooltips(page)

  // Delete greeter.ts, which is not the open tab: main.ts loses it too.
  const greeterRow = page
    .getByTestId("explorer-file-src/greeter.ts")
    .locator("..")
  await greeterRow.hover()
  await greeterRow.getByTitle("Delete file").click()
  await greeterRow.getByTitle("Confirm delete").click()
  await expect(page.getByTestId("explorer-file-src/greeter.ts")).toHaveCount(0)
  const gone = await lintMessages(page, importLine)
  await expect(gone).toContainText(/Cannot find module '\.\/greeter\.ts'/)
})

test("recovers from a document that crashes the language server and works again after the fix", async ({
  page,
}) => {
  await openReady(page)

  const deep = `export const deep = ${"[".repeat(20_000)}${"]".repeat(20_000)}\n`
  await replaceDocument(page, deep)

  // Recovery is visible in the status badge, and the file says why it has no
  // language features.
  await expect(statusOf(page)).toHaveAttribute("data-lsp-status", "recovered", {
    timeout: LSP_TIMEOUT,
  })
  await expect(statusOf(page)).toHaveAttribute(
    "title",
    /crashed.*restarted.*main\.ts until its next edit/,
  )
  const paused = await lintMessages(page, "export const deep")
  await expect(paused).toContainText("Language features are paused")
  await dismissTooltips(page)

  // Fix the file: diagnostics and hover come back.
  await replaceDocument(
    page,
    `import { Effect } from "effect"\n\nconst program = Effect.gen(function* () {\n  Effect.succeed("unhandled")\n  return 1\n})\n\nexport { program }\n`,
  )
  const tooltip = await lintMessages(page, 'Effect.succeed("unhandled")')
  await expect(tooltip).toContainText("floatingEffect")
  await dismissTooltips(page)
  await lineWith(page, "const program =")
    .getByText("program", { exact: true })
    .first()
    .hover()
  await expect(page.locator(".cm-tooltip-hover")).toContainText(
    /Effect<number/,
    { timeout: LSP_TIMEOUT },
  )
  await expect(statusOf(page)).toHaveAttribute(
    "data-lsp-status",
    /recovered|ready/,
  )
})

test("opens the Playground v4 seed when nothing else is saved", async ({
  page,
}) => {
  await page.goto("/scratchpad", { waitUntil: "domcontentloaded" })
  for (const path of [
    "package.json",
    "tsconfig.json",
    "dprint.json",
    "src/main.ts",
    "src/DevTools.ts",
  ]) {
    await expect(page.getByTestId(`explorer-file-${path}`)).toBeVisible()
  }
  await expect(page.getByTestId("editor-tab-src/main.ts")).toBeVisible()
  await expect(
    lineWith(page, "Welcome to the Effect v4 Playground"),
  ).toBeVisible()
  await expect(page.getByTestId("scratchpad-load-notice")).toHaveCount(0)
})

test("a v3 ?code link shows a notice linking to the Playground", async ({
  page,
}) => {
  const code = Buffer.from('import { Effect } from "effect"\n').toString(
    "base64url",
  )
  await page.goto(`/scratchpad?code=${code}`, {
    waitUntil: "domcontentloaded",
  })
  const notice = page.getByTestId("scratchpad-load-notice")
  await expect(notice).toHaveAttribute("data-reason", "v3")
  await expect(
    notice.getByRole("link", { name: "Open in Playground" }),
  ).toHaveAttribute("href", `/play?code=${code}`)
  await expect(page.getByTestId("explorer-file-src/DevTools.ts")).toBeVisible()
  await notice.getByRole("button", { name: "Dismiss notice" }).click()
  await expect(notice).toHaveCount(0)
})

// Smoke check for the real Container. Booting needs StackBlitz's servers and
// installing needs the npm registry, so a failed boot or install skips rather
// than fails. The full real-Container suite is ticket 13.
test("boots the Container, installs the seed's dependencies and loads their types with no error diagnostics", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "WebContainer smoke runs in Chromium")
  await page.goto("/scratchpad", { waitUntil: "domcontentloaded" })
  const badge = containerOf(page)
  await expect(badge).toBeVisible({ timeout: READY_TIMEOUT })
  // Diagnostics stay hidden until the installed types land.
  const phases = new Set<string>()
  const started = Date.now()
  while (Date.now() - started < TYPES_TIMEOUT) {
    const phase = (await badge.getAttribute("data-container-phase")) ?? ""
    phases.add(phase)
    if (
      /^(ready|failed|install-failed|dependencies-unavailable)$/.test(phase)
    ) {
      break
    }
    if (phase === "booting" || phase === "installing") {
      await expect(editorOf(page).locator(".cm-lintRange")).toHaveCount(0)
    }
    await page.waitForTimeout(250)
  }
  const phase = await badge.getAttribute("data-container-phase")
  test.skip(
    phase === "failed" || phase === "install-failed",
    `Container did not boot or install (offline?): ${await badge.getAttribute("title")}`,
  )
  expect(phase, (await badge.getAttribute("title")) ?? "").toBe("ready")
  expect(phases.has("installing") || phases.has("loading-types")).toBe(true)

  // The lockfile came back from the Container into the Workspace.
  await expect(page.getByTestId("explorer-file-pnpm-lock.yaml")).toBeVisible()

  // The seed type-checks against the installed packages: hover resolves
  // Effect's types and there are no error squiggles in either file.
  await expect(statusOf(page)).toHaveAttribute("data-lsp-status", "ready")
  await lineWith(page, "NodeRuntime.runMain")
    .getByText("NodeRuntime", { exact: true })
    .first()
    .hover()
  await expect(page.locator(".cm-tooltip-hover")).toContainText(
    /platform-node/,
    { timeout: LSP_TIMEOUT },
  )
  await dismissTooltips(page)
  // Warnings (unstableApiUsage) are expected; errors are not.
  await page.waitForTimeout(2_000)
  await expect(editorOf(page).locator(".cm-lintRange-error")).toHaveCount(0)
  await openFile(page, "src/DevTools.ts")
  await page.waitForTimeout(1_000)
  await expect(editorOf(page).locator(".cm-lintRange-error")).toHaveCount(0)
})

// Serving the page without COOP/COEP is how an unsupported browser looks to
// the Scratchpad (no cross-origin isolation), so no test-only flag is needed.
test("without cross-origin isolation, shows the unsupported strip with help and no Retry, and editing still works", async ({
  page,
}) => {
  await page.route(
    (url) => url.pathname === "/scratchpad",
    async (route) => {
      const response = await route.fetch()
      const headers = { ...response.headers() }
      delete headers["cross-origin-opener-policy"]
      delete headers["cross-origin-embedder-policy"]
      await route.fulfill({ response, headers })
    },
  )
  await page.goto("/scratchpad", { waitUntil: "domcontentloaded" })
  expect(await page.evaluate(() => globalThis.crossOriginIsolated)).toBe(false)

  const strip = page.getByTestId("container-failure")
  await expect(strip).toHaveAttribute("data-failure-kind", "unsupported", {
    timeout: READY_TIMEOUT,
  })
  await expect(containerOf(page)).toHaveAttribute(
    "data-container-phase",
    "failed",
  )
  await expect(strip.getByTestId("container-failure-retry")).toHaveCount(0)
  await expect(
    strip.getByRole("link", { name: "Browser support" }),
  ).toHaveAttribute("href", "https://webcontainers.io/guides/browser-support")

  // Editing and the language server keep working.
  await expect(statusOf(page)).toHaveAttribute("data-lsp-status", "ready", {
    timeout: READY_TIMEOUT,
  })
  await replaceDocument(page, "export const stillEditing = 1\n")
  await expect(lineWith(page, "stillEditing")).toBeVisible()

  // Hide it, and the badge brings it back.
  await strip.getByRole("button", { name: "Hide" }).click()
  await expect(strip).toHaveCount(0)
  await containerOf(page).click()
  await expect(strip).toBeVisible()
})
