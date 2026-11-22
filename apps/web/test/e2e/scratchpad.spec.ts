import { expect, test, type WebSocketRoute } from "playwright/test"

const bridgePort = process.env.SCRATCHPAD_BRIDGE_PORT ?? "18787"

const isLspWebSocketUrl = (url: URL): boolean =>
  url.pathname === "/api/lsp" || url.port === bridgePort

test("mounts an editable CodeMirror editor before LSP reaches ready", async ({
  page,
}) => {
  await page.routeWebSocket(isLspWebSocketUrl, () => {
    // Hold the LSP WebSocket handshake open so the editor is exercised
    // deterministically before LSP transitions to `ready`.
  })

  await page.goto("/scratchpad", { waitUntil: "domcontentloaded" })

  const editorContent = page.locator(
    '[data-testid="scratchpad-editor"] .cm-content[contenteditable="true"]',
  )
  const statusBadge = page.getByTestId("lsp-status")

  await expect(editorContent).toBeVisible()
  await expect(editorContent).toContainText('Effect.succeed("unhandled")')
  await expect(statusBadge).toHaveAttribute("data-lsp-status", "connecting")

  await editorContent.click()
  await page.keyboard.press("End")
  await page.keyboard.type("\n// typed before lsp ready")

  await expect(editorContent).toContainText("// typed before lsp ready")
  await expect(statusBadge).toHaveAttribute("data-lsp-status", "connecting")
})

test("renders Effect TS377xxx diagnostics, hover quickinfo, and completions on edits", async ({
  page,
}) => {
  await page.goto("/scratchpad", { waitUntil: "domcontentloaded" })

  const editor = page.getByTestId("scratchpad-editor")
  const statusBadge = page.getByTestId("lsp-status")

  await expect(statusBadge).toHaveAttribute("data-lsp-status", "ready", {
    timeout: 20_000,
  })

  // 1. Preloaded Effect snippet renders inline Effect TS377xxx diagnostic squiggle.
  const floatingEffectLine = editor
    .locator(".cm-line")
    .filter({ hasText: 'Effect.succeed("unhandled")' })
    .first()
  const lintRange = floatingEffectLine.locator(".cm-lintRange").first()
  await expect(lintRange).toBeVisible({ timeout: 15_000 })

  await lintRange.hover()
  const lintTooltip = page.locator(".cm-tooltip-lint")
  await expect(lintTooltip).toBeVisible({ timeout: 10_000 })
  await expect(lintTooltip).toContainText(/floating|not yielded|effect/i)

  // Move pointer away to dismiss the lint tooltip before testing hover quickinfo.
  await page.mouse.move(0, 0)

  // 2. Hover displays Effect quickinfo for `program`.
  const programToken = editor
    .locator(".cm-line")
    .filter({ hasText: "const program =" })
    .getByText("program", { exact: true })
    .first()
  await expect(programToken).toBeVisible()
  await programToken.hover()

  const hoverTooltip = page.locator(".cm-tooltip-hover")
  await expect(hoverTooltip).toBeVisible({ timeout: 10_000 })
  await expect(hoverTooltip).toContainText(/Effect\.Effect<string/)

  // 3. Completions work on live edits.
  const returnLine = editor
    .locator(".cm-line")
    .filter({ hasText: "return greeting" })
    .first()
  await returnLine.click()
  await page.keyboard.press("Home")
  await page.keyboard.type("Effect.")
  await page.keyboard.press("Control+Space")

  const autocompleteTooltip = page.locator(".cm-tooltip-autocomplete")
  await expect(autocompleteTooltip).toBeVisible({ timeout: 10_000 })
  await expect(
    autocompleteTooltip
      .locator(".cm-completionLabel")
      .filter({ hasText: /^succeed$/ })
      .first(),
  ).toBeVisible({ timeout: 10_000 })
})

test("recovers from a dropped WebSocket connection and resyncs diagnostics on the live edited buffer", async ({
  page,
}) => {
  let connectionCount = 0
  let firstClientWs: WebSocketRoute | undefined
  let allowReconnect = false
  let pendingReconnect: (() => void) | undefined

  await page.routeWebSocket(isLspWebSocketUrl, (ws) => {
    connectionCount += 1
    if (connectionCount === 1) {
      firstClientWs = ws
      ws.connectToServer()
      return
    }

    if (!allowReconnect) {
      pendingReconnect = () => {
        ws.connectToServer()
      }
      return
    }

    ws.connectToServer()
  })

  await page.goto("/scratchpad", { waitUntil: "domcontentloaded" })

  const editor = page.getByTestId("scratchpad-editor")
  const editorContent = editor.locator('.cm-content[contenteditable="true"]')
  const statusBadge = page.getByTestId("lsp-status")

  await expect(statusBadge).toHaveAttribute("data-lsp-status", "ready", {
    timeout: 20_000,
  })
  await expect(editor.locator(".cm-lintRange").first()).toBeVisible({
    timeout: 15_000,
  })

  // Drop the active WebSocket connection with a retryable server error code.
  expect(firstClientWs).toBeDefined()
  await firstClientWs!.close({ code: 1011, reason: "Simulated disconnect" })

  await expect(statusBadge).toHaveAttribute("data-lsp-status", "reconnecting", {
    timeout: 10_000,
  })

  // Edit the live buffer while disconnected, introducing a new type error.
  const exportLine = editor
    .locator(".cm-line")
    .filter({ hasText: "export { program }" })
    .first()
  await exportLine.click()
  await page.keyboard.press("End")
  await page.keyboard.type('\nconst broken: number = "resynced-error"')
  await expect(editorContent).toContainText(
    'const broken: number = "resynced-error"',
  )

  // Allow the reconnect attempt to reach the real LSP server.
  allowReconnect = true
  pendingReconnect?.()

  await expect(statusBadge).toHaveAttribute("data-lsp-status", "ready", {
    timeout: 20_000,
  })

  // Verify the edited buffer is preserved and diagnostics resynced on the new line.
  await expect(editorContent).toContainText(
    'const broken: number = "resynced-error"',
  )
  const brokenLine = editor
    .locator(".cm-line")
    .filter({ hasText: "resynced-error" })
    .first()
  const brokenLintRange = brokenLine.locator(".cm-lintRange").first()
  await expect(brokenLintRange).toBeVisible({ timeout: 15_000 })

  await brokenLintRange.hover()
  await expect(page.locator(".cm-tooltip-lint")).toContainText(
    /not assignable to type 'number'/i,
    { timeout: 10_000 },
  )
})
