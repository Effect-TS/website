/**
 * A real session against dist/tsrs-effect-lsp.wasm in Node. Build it first:
 *   nix develop -c pnpm --filter @website/tsrs-lsp-wasm build:wasm   (or build:wasm:dev)
 */
import * as fs from "node:fs"
import { afterAll, assert, beforeAll, describe, test } from "vite-plus/test"
import { collectTypesPack } from "../scripts/types-pack.ts"
import { startLspHost, type LspHost } from "../src/LspHost.ts"
import type { RecoveryEvent } from "../src/RecoveringServer.ts"
import { ManualScheduler } from "../src/Scheduler.ts"
import { encodeTypesPack } from "../src/TypesPack.ts"
import { workspaceUri, WORKSPACE_ROOT_URI } from "../src/Workspace.ts"

const WASM_URL = new URL("../dist/tsrs-effect-lsp.wasm", import.meta.url)
const hasWasm = fs.existsSync(WASM_URL)

// Not an obscure failure when the module is missing: a skipped test that says so, loudly.
describe.runIf(!hasWasm)("LspHost against the built module", () => {
  test("SKIPPED: dist/tsrs-effect-lsp.wasm has not been built", (ctx) => {
    const line = "=".repeat(100)
    process.stderr.write(
      `\n${line}\n` +
        "SKIPPING the tsrs-lsp-wasm integration test: dist/tsrs-effect-lsp.wasm has not been built.\n" +
        "Build it with: nix develop -c pnpm --filter @website/tsrs-lsp-wasm build:wasm   (or build:wasm:dev)\n" +
        `${line}\n`,
    )
    ctx.skip("dist/tsrs-effect-lsp.wasm has not been built")
  })
})

interface Diagnostic {
  readonly code?: number | string
  readonly message: string
  readonly range: {
    readonly start: { readonly line: number; readonly character: number }
    readonly end: { readonly line: number; readonly character: number }
  }
}

interface Response {
  readonly id?: number | string
  readonly method?: string
  readonly result?: unknown
  readonly error?: { readonly code: number; readonly message: string }
}

const MAIN = `import { Effect } from "effect"
import { value } from "./dep.ts"

export const program = Effect.gen(function* () {
  Effect.log("floating")
  return 1
})

export const wrong: string = 1

export const fromDep: string = value
`

const MAIN_URI = workspaceUri("src/main.ts")
const DEEP_URI = workspaceUri("src/deep.ts")

const position = (text: string, needle: string, delta = 0) => {
  const i = text.indexOf(needle)
  if (i < 0) throw new Error(`not found: ${needle}`)
  const before = text.slice(0, i + delta)
  const line = before.split("\n").length - 1
  return { line, character: before.length - (before.lastIndexOf("\n") + 1) }
}

const summarize = (items: ReadonlyArray<Diagnostic>) =>
  items
    .map(
      (d) =>
        `${Number(d.code)} ${d.range.start.line}:${d.range.start.character}-${d.range.end.line}:${d.range.end.character}`,
    )
    .sort()

describe.skipIf(!hasWasm)("LspHost against the built module", () => {
  const scheduler = new ManualScheduler()
  const received: Array<Response> = []
  const recoveries: Array<RecoveryEvent> = []
  let host: LspHost
  let nextId = 1

  const request = async (
    method: string,
    params: unknown,
  ): Promise<Response> => {
    const id = nextId++
    await host.send(JSON.stringify({ jsonrpc: "2.0", id, method, params }))
    const response = received.find((m) => m.id === id && m.method === undefined)
    if (response === undefined) throw new Error(`no response to ${method}`)
    return response
  }
  const notify = (method: string, params: unknown) =>
    host.send(JSON.stringify({ jsonrpc: "2.0", method, params }))
  const pull = async (uri: string) => {
    const r = await request("textDocument/diagnostic", {
      textDocument: { uri },
    })
    if (r.error !== undefined)
      throw new Error(`diagnostic error: ${r.error.message}`)
    return (r.result as { items: Array<Diagnostic> }).items
  }

  beforeAll(async () => {
    host = await startLspHost({
      module: fs.readFileSync(WASM_URL),
      typesPacks: [encodeTypesPack(collectTypesPack(["effect"]))],
      files: {
        "src/main.ts": MAIN,
        "src/dep.ts": `export const value: string = "dep"\n`,
      },
      scheduler,
      onMessage: (m) => received.push(JSON.parse(m) as Response),
      onRecovery: (e) => recoveries.push(e),
    })
    const init = await request("initialize", {
      processId: null,
      rootUri: WORKSPACE_ROOT_URI,
      workspaceFolders: [{ uri: WORKSPACE_ROOT_URI, name: "workspace" }],
      capabilities: {
        textDocument: {
          diagnostic: { dynamicRegistration: false },
          hover: { contentFormat: ["markdown", "plaintext"] },
          completion: { completionItem: { snippetSupport: true } },
        },
      },
    })
    assert.isUndefined(init.error)
    await notify("initialized", {})
    await notify("textDocument/didOpen", {
      textDocument: {
        uri: MAIN_URI,
        languageId: "typescript",
        version: 1,
        text: MAIN,
      },
    })
  }, 60_000)

  afterAll(() => host?.dispose())

  test("schedules background ticks instead of running them inline", async () => {
    // The project load queues background work (auto-import registry, snapshot adoption).
    assert.include(scheduler.pending, 0)
    scheduler.runPending()
    await host.idle()
    await host.runBackgroundWork()
    // What is left is the server's idle timers (30 s cache clean).
    assert.isTrue(scheduler.pending.every((ms) => ms > 0))
  }, 60_000)

  test("pulls an Effect diagnostic and a TypeScript error with their ranges", async () => {
    const items = await pull(MAIN_URI)
    const floating = items.find((d) => Number(d.code) === 377001)
    assert.isDefined(floating, JSON.stringify(items))
    assert.match(floating!.message, /floatingEffect/)
    assert.deepStrictEqual(floating!.range, {
      start: position(MAIN, `Effect.log("floating")`),
      end: position(
        MAIN,
        `Effect.log("floating")`,
        `Effect.log("floating")`.length,
      ),
    })
    const ts2322 = items.find((d) => Number(d.code) === 2322)
    assert.isDefined(ts2322, JSON.stringify(items))
    assert.deepStrictEqual(ts2322!.range, {
      start: position(MAIN, "wrong"),
      end: position(MAIN, "wrong", 5),
    })
    assert.strictEqual(items.filter((d) => Number(d.code) === 2322).length, 1)
  }, 60_000)

  test("answers hover with the Effect type", async () => {
    const r = await request("textDocument/hover", {
      textDocument: { uri: MAIN_URI },
      position: position(MAIN, "program", 2),
    })
    const contents = JSON.stringify(r.result)
    assert.include(contents, "program")
    assert.include(contents, "Effect<number")
  }, 60_000)

  test("answers completion with Effect members", async () => {
    const r = await request("textDocument/completion", {
      textDocument: { uri: MAIN_URI },
      position: position(MAIN, `Effect.log`, "Effect.".length),
      context: { triggerKind: 2, triggerCharacter: "." },
    })
    const result = r.result as
      | { items: Array<{ label: string }> }
      | Array<{ label: string }>
    const labels = (Array.isArray(result) ? result : result.items).map(
      (i) => i.label,
    )
    assert.include(labels, "gen")
    assert.include(labels, "succeed")
  }, 60_000)

  test("an edit clears the Effect diagnostic", async () => {
    const at = position(MAIN, `Effect.log("floating")`)
    await notify("textDocument/didChange", {
      textDocument: { uri: MAIN_URI, version: 2 },
      contentChanges: [{ range: { start: at, end: at }, text: "yield* " }],
    })
    const codes = (await pull(MAIN_URI)).map((d) => Number(d.code))
    assert.notInclude(codes, 377001)
    assert.include(codes, 2322)
  }, 60_000)

  test("sees files that change only in the virtual file system", async () => {
    // dep.ts is not open: the server learns about it through workspace/didChangeWatchedFiles.
    assert.strictEqual(
      (await pull(MAIN_URI)).filter((d) => Number(d.code) === 2322).length,
      1,
    )
    host.fs.writeFile(
      "/workspace/src/dep.ts",
      `export const value: number = 1\n`,
    )
    const changed = await pull(MAIN_URI)
    assert.strictEqual(
      changed.filter((d) => Number(d.code) === 2322).length,
      2,
      JSON.stringify(changed),
    )

    host.fs.rename("/workspace/src/dep.ts", "/workspace/src/lib/dep.ts")
    assert.include(
      (await pull(MAIN_URI)).map((d) => Number(d.code)),
      2307,
    )

    host.fs.writeFile("/workspace/src/dep.ts", `export const value = "back"\n`)
    const restored = await pull(MAIN_URI)
    assert.deepStrictEqual(
      restored.map((d) => Number(d.code)),
      [2322],
      JSON.stringify(restored),
    )
  }, 60_000)

  test("recovers from a document that crashes the server, and keeps working", async () => {
    const deep = `export const x = ${"[".repeat(20_000)}${"]".repeat(20_000)}\n`
    await notify("textDocument/didOpen", {
      textDocument: {
        uri: DEEP_URI,
        languageId: "typescript",
        version: 1,
        text: deep,
      },
    })
    assert.strictEqual(recoveries.length, 1, JSON.stringify(recoveries))
    assert.match(recoveries[0]!.reason, /RangeError|RuntimeError|recursion/)
    assert.include(recoveries[0]!.quarantined, DEEP_URI)
    assert.isTrue(host.quarantined.has(DEEP_URI))

    const quarantinedPull = await request("textDocument/diagnostic", {
      textDocument: { uri: DEEP_URI },
    })
    assert.strictEqual(quarantinedPull.error?.code, -32803)

    // The rest of the session came back: main.ts as edited before the crash.
    assert.deepStrictEqual(summarize(await pull(MAIN_URI)), [
      `2322 ${position(MAIN, "wrong").line}:13-${position(MAIN, "wrong").line}:18`,
    ])
    const hover = await request("textDocument/hover", {
      textDocument: { uri: MAIN_URI },
      position: position(MAIN, "program", 2),
    })
    assert.include(JSON.stringify(hover.result), "Effect<number")

    // New text lifts the quarantine.
    await notify("textDocument/didChange", {
      textDocument: { uri: DEEP_URI, version: 2 },
      contentChanges: [{ text: "export const ok: string = 1\n" }],
    })
    assert.isFalse(host.quarantined.has(DEEP_URI))
    assert.deepStrictEqual(
      (await pull(DEEP_URI)).map((d) => Number(d.code)),
      [2322],
    )
  }, 120_000)

  test("never forwards the server requests the host answers", () => {
    assert.isFalse(
      received.some((m) => m.method === "client/registerCapability"),
    )
  })
})
