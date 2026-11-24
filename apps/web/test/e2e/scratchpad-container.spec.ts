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
  terminalOf,
  TYPES_TIMEOUT,
} from "./scratchpad-helpers.ts"

// The Scratchpad against a real WebContainer: boot,
// install, installed types, the watch runner in the terminal and the type
// errors it prints, two-way sync, Ctrl+C and `pnpm add` in the shell, legacy
// shares, Restart, Traces. See playwright.scratchpad-container.config.ts.
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

/**
 * Waits for the `id`th Run (internal id, never shown) and for the terminal to
 * print `text`. The runner clears the screen before each Run.
 */
const expectRun = async (page: Page, id: number, text: string) => {
  const output = runOutputOf(page)
  await expect(output).toHaveAttribute("data-run-id", String(id), {
    timeout: RUN_TIMEOUT,
  })
  await expect(terminalOf(page)).toContainText(text, { timeout: RUN_TIMEOUT })
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
    {
      timeout: LSP_TIMEOUT,
    },
  )
  await dismissTooltips(page)
  // Warnings (unstableApiUsage) are expected; errors are not.
  await page.waitForTimeout(2_000)
  await expect(editorOf(page).locator(".cm-lintRange-error")).toHaveCount(0)
  await openFile(page, "src/DevTools.ts")
  await page.waitForTimeout(1_000)
  await expect(editorOf(page).locator(".cm-lintRange-error")).toHaveCount(0)
})

test("the watch runner runs the seed, and an edit runs again on a cleared screen", async ({
  page,
}) => {
  await openSeedReady(page)
  const output = runOutputOf(page)
  await expectRun(page, 1, WELCOME)
  const terminal = terminalOf(page)
  await expect(output).toHaveAttribute("data-runner", "true")
  await expect(terminal).toContainText(
    /\[\d\d:\d\d:\d\d\] Starting in watch mode\./,
  )
  await expect(terminal).toContainText(
    /\[\d\d:\d\d:\d\d\] Exited with code 0\. Watching for file changes\./,
    { timeout: RUN_TIMEOUT },
  )
  await expect(output).toHaveAttribute("data-run-status", "exited")
  // No Run bar, banner or chip: just the terminal.
  await expect(page.getByTestId("run-bar")).toHaveCount(0)

  const edited = "Edited by the container e2e"
  await openFile(page, "src/main.ts")
  await replaceDocument(page, seedMainLogging(edited))
  await expectRun(page, 2, edited)
  await expect(terminal).toContainText("File change detected.")
  // The screen was cleared: the first Run's output is gone.
  await expect(terminal).not.toContainText(WELCOME)
  await expect(terminal).not.toContainText("Starting in watch mode")
})

test("a type error is printed tsc-style and doesn't run; fixing it runs", async ({
  page,
}) => {
  await openSeedReady(page)
  await expectRun(page, 1, WELCOME)
  const terminal = terminalOf(page)

  await openFile(page, "src/main.ts")
  await editorOf(page).locator(".cm-content").click()
  await page.keyboard.press("ControlOrMeta+End")
  await page.keyboard.insertText('\nconst broken: number = "nope"\n')

  await expect(terminal).toContainText(
    /src\/main\.ts:\d+:7 - error TS2322: Type 'string' is not assignable to type 'number'\./,
    { timeout: RUN_TIMEOUT },
  )
  await expect(terminal).toContainText('const broken: number = "nope"')
  await expect(terminal).toContainText("~~~~~~")
  await expect(terminal).toContainText(
    /Found 1 error\. Not running\. Watching for file changes\./,
  )
  await expect(terminal).not.toContainText(WELCOME)
  // Not a Run: the internal id stays.
  expect(await runIdOf(page)).toBe(1)

  // Fixing it runs again.
  await lineWith(page, "const broken").click()
  await page.keyboard.press("End")
  await page.keyboard.press("Shift+Home")
  await page.keyboard.press("Backspace")
  await expectRun(page, 2, WELCOME)
  await expect(terminal).not.toContainText("Not running")
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

test("pnpm add typed into the terminal installs the package; package.json and the lockfile sync back, types reload, and the import resolves and runs", async ({
  page,
}) => {
  await openSeedReady(page)
  await expectRun(page, 1, WELCOME)
  const output = runOutputOf(page)
  await expect(output).toHaveAttribute("data-run-status", "exited", {
    timeout: RUN_TIMEOUT,
  })

  // Ctrl+C stops the runner and gives the shell back; Restart has nothing to
  // restart.
  const terminal = terminalOf(page)
  await terminal.click()
  await page.keyboard.press("Control+C")
  await expect(output).toHaveAttribute("data-runner", "false")
  await expect(page.getByTestId("run-restart")).toBeDisabled()
  await expect(terminal).toContainText("❯")
  await page.keyboard.type(`pnpm add ${ADDED_PACKAGE}@${ADDED_VERSION}`)
  await page.keyboard.press("Enter")
  await expect(terminal).toContainText(
    new RegExp(`\\+ ${ADDED_PACKAGE} ${ADDED_VERSION.replaceAll(".", "\\.")}`),
    { timeout: TYPES_TIMEOUT },
  )
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
    {
      timeout: TYPES_TIMEOUT,
    },
  )

  // Import it: the types resolve (no errors). Nothing runs while the shell
  // has the terminal; `../run` starts the runner again, which runs it.
  const message = "kleur resolved in the Container"
  await openFile(page, "src/main.ts")
  await replaceDocument(
    page,
    `import kleur from "${ADDED_PACKAGE}"\n\nconst message: string = kleur.bold("${message}")\nconsole.log(message)\n`,
  )
  const importLine = lineWith(page, `from "${ADDED_PACKAGE}"`)
  await expect(importLine).toBeVisible()
  await page.waitForTimeout(1_000)
  expect(await runIdOf(page)).toBe(1)
  await terminal.click()
  await page.keyboard.type("../run src/main.ts")
  await page.keyboard.press("Enter")
  await expect(output).toHaveAttribute("data-runner", "true", {
    timeout: RUN_TIMEOUT,
  })
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

test("switching to Effect v3 reinstalls, and the v3 seed runs without type errors", async ({
  page,
}) => {
  await openSeedReady(page)
  await expectRun(page, 1, WELCOME)

  await page
    .getByTestId("scratchpad-version-toggle")
    .getByRole("button", { name: "v3" })
    .click()
  await page
    .getByTestId("confirm-dialog")
    .getByRole("button", { name: "Switch" })
    .click()
  await expect(
    lineWith(page, "Welcome to the Effect Playground!"),
  ).toBeVisible()

  // The new package.json reinstalls; the v3 seed runs once it lands. Wait
  // for the reinstall to start, so the old `ready` doesn't count.
  await expect(containerOf(page)).toHaveAttribute(
    "data-container-phase",
    /installing|loading-types/,
    { timeout: TYPES_TIMEOUT },
  )
  await awaitInstalledTypes(page)
  await expect(runOutputOf(page)).toContainText(
    "Welcome to the Effect Playground!",
    {
      timeout: TYPES_TIMEOUT,
    },
  )
  await expect(runOutputOf(page)).not.toContainText(WELCOME)
  // The installed v3 types resolve: no errors in either seed file.
  await page.waitForTimeout(2_000)
  await expect(editorOf(page).locator(".cm-lintRange-error")).toHaveCount(0)
  await openFile(page, "src/DevTools.ts")
  await page.waitForTimeout(1_000)
  await expect(editorOf(page).locator(".cm-lintRange-error")).toHaveCount(0)
})

const TICKER = `let ticks = 0
setInterval(() => {
  ticks += 1
  console.log(\`tick \${ticks}\`)
}, 200)
`

test("Restart runs a long-running program again, and Ctrl+C stops it and leaves a shell", async ({
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

  // Restart kills it and runs it again on a cleared screen.
  const restart = page.getByTestId("run-restart")
  await expect(restart).toBeEnabled()
  await restart.click()
  await expectRun(page, 3, "Restarting.")
  await expect(terminalOf(page)).toContainText("tick 2", {
    timeout: RUN_TIMEOUT,
  })
  await expect(terminalOf(page)).not.toContainText("tick 9")
  await expect(output).toHaveAttribute("data-run-status", "running")

  // Ctrl+C stops the program and the runner.
  await terminalOf(page).click()
  await page.keyboard.press("Control+C")
  await expect(output).toHaveAttribute("data-runner", "false")
  await expect(output).toHaveAttribute("data-run-status", /exited|stopped/)
  await expect(containerOf(page)).toHaveAttribute("data-run-state", "idle")
  await expect(restart).toBeDisabled()
  // Nothing more is printed once it is stopped.
  const terminal = terminalOf(page)
  await page.waitForTimeout(500)
  const stoppedText = await terminal.innerText()
  await page.waitForTimeout(1_000)
  expect(await terminal.innerText()).toBe(stoppedText)
  // Edits don't run while the shell has the terminal.
  await replaceDocument(page, seedMainLogging("not run"))
  await page.waitForTimeout(2_000)
  expect(await runIdOf(page)).toBe(3)
  await expect(terminal).not.toContainText("not run")
})

/** The seed's `src/main.ts` with its span renamed. */
const seedMainWithSpan = (name: string) =>
  seedMainLogging(WELCOME).replace(
    'Effect.withSpan("program"',
    `Effect.withSpan("${name}"`,
  )

test("the seed's spans appear in Traces, and a new Run replaces them", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "scratchpad-output-panel",
      JSON.stringify({ height: 360, collapsed: false }),
    ),
  )
  await openSeedReady(page)
  await expectRun(page, 1, WELCOME)

  // The seed provides `DevToolsLayer`, so its "program" span arrives with no
  // setup.
  await page.getByTestId("panel-tab-traces").click()
  const traces = page.getByTestId("traces-panel")
  await expect(traces).toHaveAttribute("data-trace-count", "1", {
    timeout: RUN_TIMEOUT,
  })
  await expect(traces).toContainText("program")
  await expect(traces).toContainText("1 span")
  await expect(runOutputOf(page)).toBeHidden()
  const screenshot = process.env.SCRATCHPAD_TRACES_SCREENSHOT
  if (screenshot !== undefined) {
    await traces.getByText("program").first().click()
    await page.screenshot({ path: screenshot })
  }

  // The next Run starts with an empty trace list: only its own span shows.
  await openFile(page, "src/main.ts")
  await replaceDocument(page, seedMainWithSpan("edited-span"))
  // The Traces tab stays open; the terminal is hidden.
  await expect(runOutputOf(page)).toHaveAttribute("data-run-id", "2", {
    timeout: RUN_TIMEOUT,
  })
  await expect(traces).toContainText("edited-span", { timeout: RUN_TIMEOUT })
  await expect(traces).toHaveAttribute("data-trace-count", "1")
  await expect(traces).not.toContainText(/\bprogram\b/)

  // Back on the Terminal tab, it shows Run #2's output.
  await page.getByTestId("panel-tab-terminal").click()
  await expect(runOutputOf(page)).toBeVisible()
  await expect(runOutputOf(page)).toContainText(WELCOME, {
    timeout: RUN_TIMEOUT,
  })
})
