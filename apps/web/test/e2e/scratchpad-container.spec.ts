import { deflateRawSync } from "node:zlib"
import { expect, test, type Page } from "playwright/test"
import type { ScratchpadTestSpawnResult } from "../../src/features/scratchpad/test-hook.tsx"
import {
  awaitInstalledTypes,
  containerOf,
  dismissTooltips,
  editorOf,
  LSP_TIMEOUT,
  lineWith,
  openFile,
  READY_TIMEOUT,
  replaceDocument,
  RUN_TIMEOUT,
  runIdOf,
  runOutputOf,
  skipUnlessContainerReachable,
  statusOf,
  TYPES_TIMEOUT,
} from "./scratchpad-helpers.ts"

// The Scratchpad against a real WebContainer (ADRs 0004, 0005): boot,
// install, installed types, Runs, two-way sync, `pnpm add`, legacy shares,
// Stop and Restart. See playwright.scratchpad-container.config.ts.
//
// Booting needs StackBlitz's servers and installing needs the npm registry.
// When the Container cannot get there, every test skips rather than fails
// (`awaitInstalledTypes`). Each test boots and installs its own Container.

test.describe.configure({ timeout: 240_000 })

test.beforeAll(skipUnlessContainerReachable)

test.beforeEach(({ browserName }) => {
  test.skip(browserName !== "chromium", "WebContainer runs in Chromium here")
})

const WELCOME = "Welcome to the Effect v4 Playground!"

/** The seed's `src/main.ts` with another log message. */
const seedMainLogging = (
  message: string,
) => `import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as Effect from "effect/Effect"
import { DevToolsLayer } from "./DevTools.js"

const program = Effect.gen(function*() {
  yield* Effect.log("${message}")
}).pipe(Effect.withSpan("program", {
  attributes: { source: "Playground" }
}))

NodeRuntime.runMain(program.pipe(
  Effect.provide(DevToolsLayer)
))
`

/** Opens the seed and waits for the Container to install it (or skips). */
const openSeedReady = async (page: Page) => {
  await page.goto("/scratchpad", { waitUntil: "domcontentloaded" })
  await expect(statusOf(page)).toHaveAttribute("data-lsp-status", "ready", {
    timeout: READY_TIMEOUT,
  })
  await awaitInstalledTypes(page)
}

/** Waits for the `id`th Run (internal id, never shown) to print `text`. */
const expectRun = async (page: Page, id: number, text: string) => {
  const output = runOutputOf(page)
  await expect(output).toHaveAttribute("data-run-id", String(id), {
    timeout: RUN_TIMEOUT,
  })
  await expect(output).toContainText(text, { timeout: RUN_TIMEOUT })
}

test("boots the Container, installs the seed's dependencies and loads their types with no error diagnostics", async ({
  page,
}) => {
  const started = Date.now()
  await page.goto("/scratchpad", { waitUntil: "domcontentloaded" })
  const badge = containerOf(page)
  await expect(badge).toBeVisible({ timeout: READY_TIMEOUT })
  // Diagnostics stay hidden until the installed types land.
  const phases = new Set<string>()
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
  await awaitInstalledTypes(page)
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

test("runs the seed, and an edit runs it again with the new output", async ({
  page,
}) => {
  await openSeedReady(page)
  const output = runOutputOf(page)
  await expectRun(page, 1, WELCOME)
  await expect(output).toContainText("initial")

  const edited = "Edited by the container e2e"
  await openFile(page, "src/main.ts")
  await replaceDocument(page, seedMainLogging(edited))
  await expectRun(page, 2, edited)
  await expect(output).toContainText("src/main.ts changed")
  // Each Run clears the previous Run's output.
  await expect(output).not.toContainText(WELCOME)
  await expect(output).toHaveAttribute("data-run-skipped", "false")
})

test("a type error skips the Run with the reason, and fixing it runs again", async ({
  page,
}) => {
  // Tall enough to show the report and the previous output.
  await page.addInitScript(() =>
    localStorage.setItem(
      "scratchpad-output-panel",
      JSON.stringify({ height: 400, collapsed: false }),
    ),
  )
  await openSeedReady(page)
  const output = runOutputOf(page)
  await expectRun(page, 1, WELCOME)

  // A type error skips the next Run and says why, with the error clickable.
  await openFile(page, "src/main.ts")
  await editorOf(page).locator(".cm-content").click()
  await page.keyboard.press("ControlOrMeta+End")
  await page.keyboard.insertText('\nconst broken: number = "nope"\n')
  // The report is printed in the terminal, like tsc, above the previous
  // output.
  const terminal = page.getByTestId("run-output-terminal")
  await expect(output).toHaveAttribute("data-run-skipped", "true", {
    timeout: RUN_TIMEOUT,
  })
  await expect(terminal).toContainText("Run skipped")
  await expect(terminal).toContainText(/src\/main\.ts:\d+:\d+ error TS2322/)
  await expect(terminal).toContainText('const broken: number = "nope"')
  await expect(terminal).toContainText(/previous output · \d\d:\d\d:\d\d/)
  await expect(terminal).toContainText(WELCOME)
  // A skip is not a Run: the internal id stays.
  expect(await runIdOf(page)).toBe(1)

  // The error's location is a link that opens the file.
  await openFile(page, "src/DevTools.ts")
  const location = terminal
    .locator(".xterm-rows > div")
    .filter({ hasText: /^src\/main\.ts:\d+:\d+ error/ })
    .first()
  // xterm's screen layer sits over its text rows, so point at the row.
  const box = (await location.boundingBox())!
  await page.mouse.move(box.x + 12, box.y + box.height / 2)
  await page.mouse.move(box.x + 16, box.y + box.height / 2)
  await page.mouse.click(box.x + 16, box.y + box.height / 2)
  await expect(page.getByTestId("editor-tab-src/main.ts")).toHaveAttribute(
    "aria-selected",
    "true",
  )

  // Fixing it runs again.
  await editorOf(page).locator(".cm-content").click()
  await page.keyboard.press("ControlOrMeta+End")
  await page.keyboard.press("ArrowUp")
  await page.keyboard.press("Shift+End")
  await page.keyboard.press("Backspace")
  await expectRun(page, 2, WELCOME)
  await expect(terminal).not.toContainText("Run skipped")
  await expect(output).toHaveAttribute("data-run-skipped", "false")
})

/**
 * A tiny, stable package with its own types and no dependencies. Pinned so
 * the lockfile assertion and the import's types don't move.
 */
const ADDED_PACKAGE = "kleur"
const ADDED_VERSION = "4.1.5"

/** A file's content in the Scratchpad autosave (the Workspace, 2 s behind). */
const autosavedFile = (page: Page, name: string) =>
  page.evaluate((name) => {
    const raw = localStorage.getItem("scratchpad-autosave")
    if (raw === null) return undefined
    const tree = (
      JSON.parse(raw) as {
        readonly value?: {
          readonly tree: ReadonlyArray<{
            readonly name: string
            readonly initialContent?: string
          }>
        }
      }
    ).value?.tree
    return tree?.find((node) => node.name === name)?.initialContent
  }, name)

test("a file written in the Container appears in the explorer and the editor, and its deletion closes the tab", async ({
  page,
}) => {
  await openSeedReady(page)
  await page.waitForFunction(() => window.__scratchpadTest !== undefined)

  const wrote: ScratchpadTestSpawnResult = await page.evaluate(() =>
    window.__scratchpadTest!.spawn("jsh", [
      "-c",
      "echo 'export const extra = 1' > src/extra.ts",
    ]),
  )
  expect(wrote.exitCode, wrote.output).toBe(0)
  const entry = page.getByTestId("explorer-file-src/extra.ts")
  await expect(entry).toBeVisible({ timeout: LSP_TIMEOUT })
  await openFile(page, "src/extra.ts")
  await expect(lineWith(page, "export const extra = 1")).toBeVisible()

  // An edit in the Container shows up in the open editor.
  await page.evaluate(() =>
    window.__scratchpadTest!.spawn("jsh", [
      "-c",
      "echo 'export const extra = 2' > src/extra.ts",
    ]),
  )
  await expect(lineWith(page, "export const extra = 2")).toBeVisible({
    timeout: LSP_TIMEOUT,
  })

  await page.evaluate(() =>
    window.__scratchpadTest!.spawn("rm", ["src/extra.ts"]),
  )
  await expect(entry).toHaveCount(0, { timeout: LSP_TIMEOUT })
  await expect(page.getByTestId("editor-tab-src/extra.ts")).toHaveCount(0)
})

test("pnpm add in the Container syncs package.json and the lockfile back, reloads types, and the import resolves and runs", async ({
  page,
}) => {
  await openSeedReady(page)
  await expectRun(page, 1, WELCOME)
  // The dev-only hook from src/features/scratchpad/test-hook.tsx.
  await page.waitForFunction(() => window.__scratchpadTest !== undefined)

  const added: ScratchpadTestSpawnResult = await page.evaluate(
    (spec) => window.__scratchpadTest!.spawn("pnpm", ["add", spec]),
    `${ADDED_PACKAGE}@${ADDED_VERSION}`,
  )
  expect(added.exitCode, added.output).toBe(0)
  // `pnpm add` changed the Container's package.json. The two-way sync pulls
  // it and the lockfile back and the types reload, with no page install.

  await openFile(page, "package.json")
  await expect(lineWith(page, `"${ADDED_PACKAGE}"`)).toBeVisible({
    timeout: TYPES_TIMEOUT,
  })
  // The lockfile travels with the Workspace (here, via its autosave).
  await expect
    .poll(() => autosavedFile(page, "pnpm-lock.yaml"), {
      timeout: TYPES_TIMEOUT,
    })
    .toContain(`${ADDED_PACKAGE}@${ADDED_VERSION}`)
  expect(await autosavedFile(page, "package.json")).toContain(
    `"${ADDED_PACKAGE}"`,
  )
  await expect(containerOf(page)).toHaveAttribute(
    "data-container-phase",
    "ready",
    { timeout: TYPES_TIMEOUT },
  )

  // Import it: the types resolve (no errors) and the Run prints its output.
  const message = "kleur resolved in the Container"
  await openFile(page, "src/main.ts")
  await replaceDocument(
    page,
    `import kleur from "${ADDED_PACKAGE}"\n\nconst message: string = kleur.bold("${message}")\nconsole.log(message)\n`,
  )
  const importLine = lineWith(page, `from "${ADDED_PACKAGE}"`)
  await expect(importLine).toBeVisible()
  await expectRun(page, 2, message)
  await expect(editorOf(page).locator(".cm-lintRange-error")).toHaveCount(0)
  // Hover proves the types came from the installed package.
  await lineWith(page, "kleur.bold")
    .getByText("bold", { exact: true })
    .first()
    .hover()
  await expect(page.locator(".cm-tooltip-hover")).toContainText(/bold/, {
    timeout: LSP_TIMEOUT,
  })
})

/**
 * A share as `/play` wrote it during the v4 beta: no language-service plugin
 * or `verbatimModuleSyntax` in `tsconfig.json`, an extensionless relative
 * import, and `pnpm install -E` as the prepare step. The loader repairs it
 * (ticket 11). Effect is on `latest` so the Run uses a current release.
 */
const LEGACY_V4_SHARE = {
  name: "playground-v4",
  initialFilePath: "src/Program.ts",
  prepare: "pnpm install -E effect@latest",
  shells: [{ command: "../run src/main.ts" }],
  snapshots: [],
  tree: [
    {
      _tag: "File",
      name: "package.json",
      language: "json",
      userManaged: false,
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
          compilerOptions: {
            module: "NodeNext",
            moduleResolution: "NodeNext",
            strict: true,
          },
        },
        undefined,
        2,
      ),
    },
    {
      _tag: "Directory",
      name: "src",
      userManaged: true,
      children: [
        {
          _tag: "File",
          name: "main.ts",
          initialContent:
            'import { program } from "./Program"\nimport * as Effect from "effect/Effect"\nEffect.runFork(program)\n',
        },
        {
          _tag: "File",
          name: "Program.ts",
          userManaged: true,
          initialContent:
            'import * as Effect from "effect/Effect"\nexport const program = Effect.log("legacy v4 share ran")\n',
        },
      ],
    },
  ],
}

test("a legacy v4 share loads, is repaired, and runs", async ({
  page,
  request,
}) => {
  // `WorkspaceCompression`'s encoding (deflate-raw, then base64), stored in
  // the dev server's in-memory shortener.
  const text = deflateRawSync(JSON.stringify(LEGACY_V4_SHARE)).toString(
    "base64",
  )
  const response = await request.post("/api/playground/shorten", {
    data: { text },
  })
  expect(response.ok(), await response.text()).toBe(true)
  const hash = (await response.json()) as string

  await page.goto(`/scratchpad#${hash}`, { waitUntil: "domcontentloaded" })
  await expect(page.getByTestId("editor-tab-src/Program.ts")).toBeVisible({
    timeout: READY_TIMEOUT,
  })
  await expect(page.getByTestId("scratchpad-load-notice")).toHaveCount(0)
  await expect(lineWith(page, "legacy v4 share ran")).toBeVisible()
  await expect(statusOf(page)).toHaveAttribute("data-lsp-status", "ready", {
    timeout: READY_TIMEOUT,
  })
  await awaitInstalledTypes(page)

  // The extensionless import was rewritten for NodeNext.
  await openFile(page, "src/main.ts")
  await expect(lineWith(page, 'from "./Program.js"')).toBeVisible()
  await expectRun(page, 1, "legacy v4 share ran")
  await expect(editorOf(page).locator(".cm-lintRange-error")).toHaveCount(0)
})

const TICKER = `let ticks = 0
setInterval(() => {
  ticks += 1
  console.log(\`tick \${ticks}\`)
}, 200)
`

test("Stop ends a long-running program, and Restart runs it again", async ({
  page,
}) => {
  await openSeedReady(page)
  await expectRun(page, 1, WELCOME)
  const output = runOutputOf(page)

  await openFile(page, "src/main.ts")
  await replaceDocument(page, TICKER)
  await expectRun(page, 2, "tick 5")
  await expect(output).toHaveAttribute("data-run-status", "running")
  await expect(containerOf(page)).toHaveAttribute("data-run-state", "running")

  const stop = page.getByTestId("run-stop")
  await expect(stop).toBeEnabled()
  await stop.click()
  await expect(output).toHaveAttribute("data-run-status", "stopped")
  await expect(output).toContainText("stopped")
  await expect(containerOf(page)).toHaveAttribute("data-run-state", "idle")
  await expect(stop).toBeDisabled()
  // Nothing more is printed once it is stopped.
  const stoppedText = await output.innerText()
  await page.waitForTimeout(1_000)
  expect(await output.innerText()).toBe(stoppedText)

  await page.getByTestId("run-restart").click()
  await expectRun(page, 3, "tick 3")
  await expect(output).toContainText("restart")
  await expect(output).toHaveAttribute("data-run-status", "running")

  // Restart while running replaces the process with a new Run.
  await page.getByTestId("run-restart").click()
  await expectRun(page, 4, "tick 2")
  await expect(output).toHaveAttribute("data-run-status", "running")
  await stop.click()
  await expect(output).toHaveAttribute("data-run-status", "stopped")
})
