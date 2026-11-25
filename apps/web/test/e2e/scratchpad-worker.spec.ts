import { expect, test, type Page } from "playwright/test"
import {
  awaitInstalledTypes,
  dismissTooltips,
  editorOf,
  LSP_TIMEOUT,
  lineWith,
  lintMessages,
  openFile,
  READY_TIMEOUT,
  replaceDocument,
  statusOf,
} from "./scratchpad-helpers.ts"

// The Scratchpad with the Effect tsrs language server running in a Web Worker
// on the page: see playwright.scratchpad-worker.config.ts.
//
// Types come from the packages the real Container installs, so
// tests that need Effect's types wait for the Container to reach `ready`.
// Booting needs StackBlitz's servers and installing needs the npm registry:
// when the Container cannot get there, those tests skip rather than fail.
// Tests about the Container itself (the watch runner, installs, `pnpm add`,
// Restart, and the type errors it prints from tsrs's diagnostics) live in
// scratchpad-container.spec.ts.

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

const openReady = async (page: Page) => {
  await useGreeterWorkspace(page)
  await page.goto("/scratchpad", { waitUntil: "domcontentloaded" })
  await expect(statusOf(page)).toHaveAttribute("data-lsp-status", "ready", {
    timeout: READY_TIMEOUT,
  })
  await awaitInstalledTypes(page)
  await expect(
    lineWith(page, 'Effect.succeed("unhandled")').locator(".cm-lintRange"),
  ).toBeVisible({
    timeout: LSP_TIMEOUT,
  })
}

/** Clicks the middle of the first whole-word `word` in `line`. */
const clickWord = async (
  line: ReturnType<typeof lineWith>,
  word: string,
  modifiers: Array<"ControlOrMeta"> = [],
) => {
  const position = await line.evaluate((el, target) => {
    const pattern = new RegExp(`\\b${target}\\b`)
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    const origin = el.getBoundingClientRect()
    for (
      let node = walker.nextNode();
      node !== null;
      node = walker.nextNode()
    ) {
      const index = (node.textContent ?? "").search(pattern)
      if (index === -1) continue
      const range = document.createRange()
      range.setStart(node, index)
      range.setEnd(node, index + target.length)
      const rect = range.getBoundingClientRect()
      return {
        x: rect.left - origin.left + rect.width / 2,
        y: rect.top - origin.top + rect.height / 2,
      }
    }
    return null
  }, word)
  expect(position, `"${word}" in the line`).not.toBeNull()
  await line.click({ position: position!, modifiers })
}

test("the language server reports Effect diagnostics and type errors, hovers types, completes members and opens library declarations read-only", async ({
  page,
}) => {
  await openReady(page)

  // TS377001 is Effect's floatingEffect rule.
  const floating = await lintMessages(page, 'Effect.succeed("unhandled")')
  await expect(floating).toContainText("floatingEffect")
  await dismissTooltips(page)

  // A type error appears, and fixing the line clears it.
  await lineWith(page, "export { program }").click()
  await page.keyboard.press("End")
  await page.keyboard.type('\nexport const broken: number = "oops"')
  const error = await lintMessages(page, 'export const broken: number = "oops"')
  await expect(error).toContainText(/not assignable to type number/)
  await dismissTooltips(page)
  await lineWith(page, 'export const broken: number = "oops"').click()
  await page.keyboard.press("End")
  for (let i = 0; i < '"oops"'.length; i++) {
    await page.keyboard.press("Backspace")
  }
  await page.keyboard.type("1")
  await expect(
    lineWith(page, "export const broken: number = 1").locator(".cm-lintRange"),
  ).toHaveCount(0, { timeout: LSP_TIMEOUT })

  // Hover shows Effect's types.
  await lineWith(page, "const program =")
    .getByText("program", { exact: true })
    .first()
    .hover()
  await expect(page.locator(".cm-tooltip-hover")).toContainText(
    /Effect<string/,
    { timeout: LSP_TIMEOUT },
  )
  await dismissTooltips(page)

  // Completion after `Effect.`.
  await lineWith(page, "return greeting").click()
  await page.keyboard.press("Home")
  await page.keyboard.type("Effect.")
  const completions = page.locator(".cm-tooltip-autocomplete")
  if (!(await completions.isVisible())) {
    await page.keyboard.press("Control+Space")
  }
  await expect(
    completions
      .locator(".cm-completionLabel")
      .filter({ hasText: /^succeed$/ })
      .first(),
  ).toBeVisible({ timeout: LSP_TIMEOUT })
  await page.keyboard.press("Escape")

  // Cmd/Ctrl-click into the library opens its declarations, read-only.
  await clickWord(lineWith(page, 'import { Effect } from "effect"'), "Effect", [
    "ControlOrMeta",
  ])
  const effectTab = page.locator(
    '[data-testid^="editor-tab-node_modules/effect/"][data-testid$="/Effect.d.ts"]',
  )
  await expect(effectTab).toHaveAttribute("aria-selected", "true", {
    timeout: LSP_TIMEOUT,
  })
  await expect(editorOf(page).locator(".cm-content")).toHaveAttribute(
    "aria-readonly",
    "true",
  )
})

test("diagnostics follow changes to another file, and its deletion", async ({
  page,
}) => {
  await openReady(page)
  const importLine = 'import { greet } from "./greeter.ts"'

  await openFile(page, "src/greeter.ts")
  await replaceDocument(page, GREETER.replace("const greet", "const greetUser"))
  await openFile(page, "src/main.ts")
  const renamed = await lintMessages(page, importLine)
  await expect(renamed).toContainText(/has no exported member greet/)
  await dismissTooltips(page)

  const greeterRow = page
    .getByTestId("explorer-file-src/greeter.ts")
    .locator("..")
  await greeterRow.hover()
  await greeterRow.getByTitle("Delete file").click()
  await greeterRow.getByTitle("Confirm delete").click()
  // The error moves from `greet` to the module specifier.
  await expect(
    lineWith(page, importLine).locator(".cm-lintRange", {
      hasText: "greeter.ts",
    }),
  ).toBeVisible({ timeout: LSP_TIMEOUT })
  const gone = await lintMessages(page, importLine)
  await expect(gone).toContainText(/Cannot find module \.\/greeter\.ts/)
})

test("a diagnostic's Fix menu and Ctrl/Cmd+. apply code actions", async ({
  page,
}) => {
  await openReady(page)
  const floating = 'Effect.succeed("unhandled")'
  const card = page.locator(".cm-diagnosticCard")
  const fixButton = card.getByRole("button", { name: "Fix" })
  // The fixes are asked for after the diagnostics render.
  await expect(async () => {
    await dismissTooltips(page)
    await lintMessages(page, floating)
    await expect(fixButton).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: LSP_TIMEOUT })
  await fixButton.click()
  await card
    .getByRole("menuitem", {
      name: "Disable floatingEffect for this line",
    })
    .click()
  await expect(lineWith(page, floating).locator(".cm-lintRange")).toHaveCount(
    0,
    { timeout: LSP_TIMEOUT },
  )

  await clickWord(lineWith(page, floating), "succeed")
  await page.keyboard.press("ControlOrMeta+.")
  const menu = page.getByRole("listbox", { name: "Code actions" })
  await menu
    .getByRole("option", { name: "Wrap with Effect.gen" })
    .click({ timeout: LSP_TIMEOUT })
  await expect(
    lineWith(page, 'return yield* Effect.succeed("unhandled")'),
  ).toBeVisible()
})

test("recovers from a document that crashes the language server and works again after the fix", async ({
  page,
}) => {
  await openReady(page)

  const deep = `export const deep = ${"[".repeat(20_000)}${"]".repeat(20_000)}\n`
  await replaceDocument(page, deep)
  await expect(statusOf(page)).toHaveAttribute("data-lsp-status", "recovered", {
    timeout: LSP_TIMEOUT,
  })

  await replaceDocument(
    page,
    `import { Effect } from "effect"\n\nconst program = Effect.gen(function* () {\n  Effect.succeed("unhandled")\n  return 1\n})\n\nexport { program }\n`,
  )
  const tooltip = await lintMessages(page, 'Effect.succeed("unhandled")')
  await expect(tooltip).toContainText("floatingEffect")
})

// Serving the page without COOP/COEP is how an unsupported browser looks to
// the Scratchpad (no cross-origin isolation), so no test-only flag is needed.
test("without cross-origin isolation, the Container is unsupported and points to browser-support help", async ({
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

  const strip = page.getByTestId("container-failure")
  await expect(strip).toHaveAttribute("data-failure-kind", "unsupported", {
    timeout: READY_TIMEOUT,
  })
  await expect(
    strip.getByRole("link", { name: "Browser support" }),
  ).toHaveAttribute("href", "https://webcontainers.io/guides/browser-support")
})

test("Ctrl/Cmd+S formats the active file with the Workspace's dprint.json", async ({
  page,
}) => {
  // The plugins come from plugins.dprint.dev through /api/dprint/plugins.
  const offline = await fetch("https://plugins.dprint.dev", {
    method: "HEAD",
    signal: AbortSignal.timeout(10_000),
  }).then(
    () => undefined,
    (error: unknown) => String(error),
  )
  test.skip(offline !== undefined, `plugins.dprint.dev unreachable: ${offline}`)

  // The seed's dprint.json has `quoteStyle: "alwaysDouble"` and
  // `semiColons: "asi"`.
  await page.goto("/scratchpad", { waitUntil: "domcontentloaded" })
  await expect(page.getByTestId("editor-tab-src/main.ts")).toBeVisible({
    timeout: READY_TIMEOUT,
  })
  await replaceDocument(
    page,
    "const   greeting='hello';\nexport   {greeting}\n",
  )
  await page.keyboard.press("ControlOrMeta+s")

  const lines = editorOf(page).locator(".cm-line")
  await expect(lines.nth(0)).toHaveText('const greeting = "hello"', {
    timeout: LSP_TIMEOUT,
  })
  await expect(lines.nth(1)).toHaveText("export { greeting }")
})
