import { deflateRawSync } from "node:zlib"
import { expect, test, type Page } from "playwright/test"
import {
  awaitInstalledTypes,
  containerOf,
  editorOf,
  LSP_TIMEOUT,
  lineWith,
  openFile,
  READY_TIMEOUT,
  replaceDocument,
  RUN_TIMEOUT,
  runOutputOf,
  skipUnlessContainerReachable,
  statusOf,
  terminalOf,
  TYPES_TIMEOUT,
} from "./scratchpad-helpers.ts"

// The Scratchpad against a real WebContainer: install, installed types, the
// watch runner and the type errors it prints, Traces, Restart, Ctrl+C and
// `pnpm add` in the shell, legacy shares, the v3 switch. See
// playwright.scratchpad-container.config.ts.
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

/** The seed's `src/main.ts`, logging `message` in the span `span`. */
const seedMain = (
  message: string,
  span = "program",
) => `import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as Effect from "effect/Effect"
import { DevToolsLayer } from "./DevTools.js"

const program = Effect.gen(function*() {
  yield* Effect.log("${message}")
}).pipe(Effect.withSpan("${span}", {
  attributes: { source: "Playground" }
}))

NodeRuntime.runMain(program.pipe(
  Effect.provide(DevToolsLayer)
))
`

const errorsOf = (page: Page) => editorOf(page).locator(".cm-lintRange-error")

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
  await expect(runOutputOf(page)).toHaveAttribute("data-run-id", String(id), {
    timeout: RUN_TIMEOUT,
  })
  await expect(terminalOf(page)).toContainText(text, { timeout: RUN_TIMEOUT })
}

test("the seed installs, type-checks clean and runs with its spans in Traces; a type error holds the next Run back until it is fixed", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "scratchpad-output-panel",
      JSON.stringify({ height: 360, collapsed: false }),
    ),
  )
  await openSeedReady(page)
  const terminal = terminalOf(page)

  // Effect's types come from the installed packages: no errors.
  await expect(page.getByTestId("explorer-file-pnpm-lock.yaml")).toBeVisible()
  await page.waitForTimeout(2_000)
  await expect(errorsOf(page)).toHaveCount(0)
  await expectRun(page, 1, WELCOME)

  // The seed provides `DevToolsLayer`, so its "program" span arrives.
  await page.getByTestId("panel-tab-traces").click()
  const traces = page.getByTestId("traces-panel")
  await expect(traces).toContainText("program", { timeout: RUN_TIMEOUT })
  const screenshot = process.env.SCRATCHPAD_TRACES_SCREENSHOT
  if (screenshot !== undefined) {
    await traces.getByText("program").first().click()
    await page.screenshot({ path: screenshot })
  }
  await page.getByTestId("panel-tab-terminal").click()

  // A type error is printed tsc-style and nothing runs.
  await openFile(page, "src/main.ts")
  await editorOf(page).locator(".cm-content").click()
  await page.keyboard.press("ControlOrMeta+End")
  await page.keyboard.insertText('\nconst broken: number = "nope"\n')
  await expect(terminal).toContainText(
    /src\/main\.ts:\d+:7 - error TS2322: Type 'string' is not assignable to type 'number'\./,
    { timeout: RUN_TIMEOUT },
  )
  await expect(terminal).toContainText(/Found 1 error\. Not running\./)
  await expect(terminal).not.toContainText(WELCOME)

  // The fix runs on a cleared screen, and its span replaces the old one.
  const edited = "Edited by the container e2e"
  await replaceDocument(page, seedMain(edited, "edited-span"))
  await expectRun(page, 2, edited)
  await expect(terminal).not.toContainText("Not running")
  await page.getByTestId("panel-tab-traces").click()
  await expect(traces).toContainText("edited-span", { timeout: RUN_TIMEOUT })
  await expect(traces).not.toContainText(/\bprogram\b/)
})

const TICKER = `let ticks = 0
setInterval(() => {
  ticks += 1
  console.log(\`tick \${ticks}\`)
}, 200)
`

/**
 * A tiny, stable package with its own types and no dependencies, pinned so
 * its types don't move.
 */
const ADDED_PACKAGE = "kleur"
const ADDED_VERSION = "4.1.5"

test("Restart runs a long-running program again; Ctrl+C stops it and leaves a shell where pnpm add installs a package the program can import", async ({
  page,
}) => {
  await openSeedReady(page)
  await expectRun(page, 1, WELCOME)
  const output = runOutputOf(page)
  const terminal = terminalOf(page)

  await openFile(page, "src/main.ts")
  await replaceDocument(page, TICKER)
  await expectRun(page, 2, "tick 5")

  // Restart kills it and runs it again on a cleared screen.
  await page.getByTestId("run-restart").click()
  await expectRun(page, 3, "Restarting.")
  await expect(terminal).toContainText("tick 2", { timeout: RUN_TIMEOUT })
  await expect(terminal).not.toContainText("tick 9")

  // Ctrl+C stops the program and the runner, and gives the shell back.
  await terminal.click()
  await page.keyboard.press("Control+C")
  await expect(output).toHaveAttribute("data-runner", "false")
  await expect(containerOf(page)).toHaveAttribute("data-run-state", "idle")
  await expect(terminal).toContainText("❯")

  await page.keyboard.type(`pnpm add ${ADDED_PACKAGE}@${ADDED_VERSION}`)
  await page.keyboard.press("Enter")
  await expect(terminal).toContainText(
    new RegExp(`\\+ ${ADDED_PACKAGE} ${ADDED_VERSION.replaceAll(".", "\\.")}`),
    { timeout: TYPES_TIMEOUT },
  )
  // The Container's package.json syncs back to the Workspace.
  await openFile(page, "package.json")
  await expect(lineWith(page, `"${ADDED_PACKAGE}"`)).toBeVisible({
    timeout: TYPES_TIMEOUT,
  })
  await expect(containerOf(page)).toHaveAttribute(
    "data-container-phase",
    "ready",
    { timeout: TYPES_TIMEOUT },
  )

  // The import type-checks against the installed package, and `../run`
  // starts the runner again, which runs it.
  const message = "kleur resolved in the Container"
  await openFile(page, "src/main.ts")
  await replaceDocument(
    page,
    `import kleur from "${ADDED_PACKAGE}"\n\nconst message: string = kleur.bold("${message}")\nconsole.log(message)\n`,
  )
  await terminal.click()
  await page.keyboard.type("../run src/main.ts")
  await page.keyboard.press("Enter")
  await expectRun(page, 4, message)
  await expect(errorsOf(page)).toHaveCount(0)
})

/**
 * A share as `/play` wrote it during the v4 beta: no language-service plugin
 * or `verbatimModuleSyntax` in `tsconfig.json`, an extensionless relative
 * import, and `pnpm install -E` as the prepare step. Effect is on `latest`
 * so the Run uses a current release.
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

test("a legacy v4 share loads, is repaired, and runs without type errors", async ({
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
  await expect(lineWith(page, "legacy v4 share ran")).toBeVisible({
    timeout: READY_TIMEOUT,
  })
  await awaitInstalledTypes(page)

  await expectRun(page, 1, "legacy v4 share ran")
  await openFile(page, "src/main.ts")
  await expect(errorsOf(page)).toHaveCount(0, { timeout: LSP_TIMEOUT })
})

test("switching to Effect v3 reinstalls, and the v3 seed runs without type errors", async ({
  page,
}) => {
  const v3Welcome = "Welcome to the Effect Playground!"
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

  // Wait for the reinstall to start, so the old `ready` doesn't count.
  await expect(containerOf(page)).toHaveAttribute(
    "data-container-phase",
    /installing|loading-types/,
    { timeout: TYPES_TIMEOUT },
  )
  await awaitInstalledTypes(page)
  await expect(terminalOf(page)).toContainText(v3Welcome, {
    timeout: TYPES_TIMEOUT,
  })
  await page.waitForTimeout(2_000)
  await expect(errorsOf(page)).toHaveCount(0)
})
