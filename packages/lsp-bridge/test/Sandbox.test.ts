import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { assert, describe, test } from "vite-plus/test"
import {
  createWorkspaceSandbox,
  MAX_OPEN_FILES,
  MAX_WORKSPACE_BYTES,
} from "../src/Sandbox.ts"

describe("Sandbox multi-file policy and limits", () => {
  const sandbox = createWorkspaceSandbox("/tmp/sandbox-unit-test")

  const didOpen = (uri: string, text: string) =>
    JSON.stringify({
      jsonrpc: "2.0",
      method: "textDocument/didOpen",
      params: {
        textDocument: {
          uri,
          languageId: "typescript",
          version: 1,
          text,
        },
      },
    })

  const didClose = (uri: string) =>
    JSON.stringify({
      jsonrpc: "2.0",
      method: "textDocument/didClose",
      params: {
        textDocument: { uri },
      },
    })

  test("allows nested .ts and .tsx editable URIs and rejects tsconfig.json, node_modules, and non-ts extensions", async () => {
    const validator = sandbox.makeSessionValidator()

    const tsRes = await Effect.runPromise(
      validator.validateAndRewriteClientMessage(
        didOpen(
          "file:///workspace/src/nested/greeter.ts",
          "export const x = 1",
        ),
      ),
    )
    assert.include(tsRes, "file:///tmp/sandbox-unit-test/src/nested/greeter.ts")

    const tsxRes = await Effect.runPromise(
      validator.validateAndRewriteClientMessage(
        didOpen(
          "file:///workspace/src/App.tsx",
          "export const App = () => null",
        ),
      ),
    )
    assert.include(tsxRes, "file:///tmp/sandbox-unit-test/src/App.tsx")

    for (const badUri of [
      "file:///workspace/tsconfig.json",
      "file:///workspace/node_modules/effect/index.ts",
      "file:///workspace/README.md",
      "file:///workspace/src/script.js",
      "file:///workspace",
    ]) {
      const exit = await Effect.runPromiseExit(
        validator.validateAndRewriteClientMessage(didOpen(badUri, "export {}")),
      )
      assert.isTrue(Exit.isFailure(exit), `expected failure for ${badUri}`)
    }
  })

  test("enforces MAX_OPEN_FILES and reclaims slots on didClose", async () => {
    const validator = sandbox.makeSessionValidator()

    for (let i = 0; i < MAX_OPEN_FILES; i++) {
      await Effect.runPromise(
        validator.validateAndRewriteClientMessage(
          didOpen(
            `file:///workspace/src/file-${i}.ts`,
            `export const n = ${i}`,
          ),
        ),
      )
    }

    const overflow = await Effect.runPromiseExit(
      validator.validateAndRewriteClientMessage(
        didOpen("file:///workspace/src/overflow.ts", "export const x = 1"),
      ),
    )
    assert.isTrue(Exit.isFailure(overflow))

    // Closing one file frees a slot
    await Effect.runPromise(
      validator.validateAndRewriteClientMessage(
        didClose("file:///workspace/src/file-0.ts"),
      ),
    )
    await Effect.runPromise(
      validator.validateAndRewriteClientMessage(
        didOpen("file:///workspace/src/overflow.ts", "export const x = 1"),
      ),
    )
  })

  test("enforces MAX_WORKSPACE_BYTES across multiple open documents", async () => {
    const validator = sandbox.makeSessionValidator()
    const chunk = "a".repeat(200 * 1024) // 200 KiB (< 256 KiB per-file limit)

    // 5 files * 200 KiB = 1000 KiB (< 1024 KiB)
    for (let i = 0; i < 5; i++) {
      await Effect.runPromise(
        validator.validateAndRewriteClientMessage(
          didOpen(`file:///workspace/src/big-${i}.ts`, chunk),
        ),
      )
    }

    // 6th file of 100 KiB pushes total to 1100 KiB > MAX_WORKSPACE_BYTES (1024 KiB)
    const overflow = await Effect.runPromiseExit(
      validator.validateAndRewriteClientMessage(
        didOpen("file:///workspace/src/big-5.ts", "b".repeat(100 * 1024)),
      ),
    )
    assert.isTrue(Exit.isFailure(overflow))
    assert.strictEqual(MAX_WORKSPACE_BYTES, 1024 * 1024)
  })
})
