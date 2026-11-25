import { encodeTypesPack, MemoryFileSystem } from "@website/tsrs-lsp-wasm"
import { assert, describe, test } from "vite-plus/test"
import {
  makeLspWorkerBridge,
  type BridgeTimers,
} from "../../../src/features/scratchpad/lsp-worker-bridge.ts"
import type { TypesMountResult } from "../../../src/features/scratchpad/worker-protocol.ts"

interface Message {
  readonly jsonrpc?: string
  readonly id?: number | string
  readonly method?: string
  readonly params?: Record<string, unknown>
  readonly result?: unknown
}

const MAIN_URI = "file:///workspace/src/main.ts"

/** Timers that only move when the test says so. */
const makeManualTimers = () => {
  let now = 0
  let nextHandle = 1
  const pending = new Map<number, { at: number; callback: () => void }>()
  const timers: BridgeTimers = {
    now: () => now,
    setTimeout: (callback, ms) => {
      const handle = nextHandle++
      pending.set(handle, { at: now + ms, callback })
      return handle
    },
    clearTimeout: (handle) => {
      pending.delete(handle as number)
    },
  }
  const advance = (ms: number) => {
    const target = now + ms
    for (;;) {
      const next = [...pending].sort(([, a], [, b]) => a.at - b.at)[0]
      if (next === undefined || next[1].at > target) break
      pending.delete(next[0])
      now = next[1].at
      next[1].callback()
    }
    now = target
  }
  return { timers, advance }
}

const setup = () => {
  const fs = new MemoryFileSystem()
  const { timers, advance } = makeManualTimers()
  const toPage: Array<Message> = []
  const toServer: Array<Message> = []
  const types: Array<TypesMountResult> = []
  const bridge = makeLspWorkerBridge({
    fs,
    timers,
    postToPage: (raw) => toPage.push(JSON.parse(raw) as Message),
    onTypes: (result) => types.push(result),
  })
  const server = {
    send: (raw: string) => {
      toServer.push(JSON.parse(raw) as Message)
      return Promise.resolve()
    },
    quarantined: new Set<string>(),
  }
  const client = (message: Message) =>
    bridge.handleClientMessage(JSON.stringify({ jsonrpc: "2.0", ...message }))
  const reply = (message: Message) =>
    bridge.handleServerMessage(JSON.stringify({ jsonrpc: "2.0", ...message }))
  const lastPull = () =>
    toServer.filter((m) => m.method === "textDocument/diagnostic").at(-1)!
  const open = (uri: string, text: string) =>
    client({
      method: "textDocument/didOpen",
      params: {
        textDocument: { uri, languageId: "typescript", version: 1, text },
      },
    })
  const change = (uri: string, version: number, text: string) =>
    client({
      method: "textDocument/didChange",
      params: { textDocument: { uri, version }, contentChanges: [{ text }] },
    })
  const close = (uri: string) =>
    client({
      method: "textDocument/didClose",
      params: { textDocument: { uri } },
    })
  return {
    fs,
    bridge,
    types,
    server,
    advance,
    toPage,
    toServer,
    client,
    reply,
    lastPull,
    open,
    change,
    close,
  }
}

const diagnostic = {
  range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
  severity: 1,
  code: 377001,
  message: "effect(floatingEffect)",
}

const packOf = (files: Readonly<Record<string, string>>): ArrayBuffer => {
  const encoder = new TextEncoder()
  return encodeTypesPack({
    packages: [{ name: "effect", version: "4.1.5" }],
    files: Object.entries(files).map(([path, text]) => ({
      path,
      data: encoder.encode(text),
    })),
  }).slice().buffer
}

describe("LspWorkerBridge diagnostics", () => {
  test("an opened document's diagnostics reach the page as a push carrying its version", () => {
    const ctx = setup()
    ctx.bridge.connect(ctx.server)
    ctx.open(MAIN_URI, "const a = 1\n")
    ctx.advance(1_000)
    ctx.reply({
      id: ctx.lastPull().id!,
      result: { kind: "full", items: [diagnostic] },
    })
    assert.deepEqual(ctx.toPage, [
      {
        jsonrpc: "2.0",
        method: "textDocument/publishDiagnostics",
        params: { uri: MAIN_URI, version: 1, diagnostics: [diagnostic] },
      },
    ])
  })

  test("messages the page sends before the server starts reach it once connected", () => {
    const ctx = setup()
    ctx.client({ id: 1, method: "initialize", params: {} })
    ctx.open(MAIN_URI, "a\n")
    ctx.bridge.connect(ctx.server)
    assert.deepEqual(
      ctx.toServer.map((m) => m.method),
      ["initialize", "textDocument/didOpen"],
    )
  })

  test("diagnostics for an older version than the editor has are not pushed", () => {
    const ctx = setup()
    ctx.bridge.connect(ctx.server)
    ctx.open(MAIN_URI, "a\n")
    ctx.advance(1_000)
    const pull = ctx.lastPull()
    ctx.change(MAIN_URI, 2, "aa\n")
    ctx.reply({ id: pull.id!, result: { kind: "full", items: [diagnostic] } })
    assert.deepEqual(ctx.toPage, [])
  })

  test("closing a document clears its diagnostics", () => {
    const ctx = setup()
    ctx.bridge.connect(ctx.server)
    ctx.open(MAIN_URI, "a\n")
    ctx.close(MAIN_URI)
    assert.deepEqual(ctx.toPage.at(-1)?.params, {
      uri: MAIN_URI,
      diagnostics: [],
    })
  })

  test("shutdown and exit reach the server without params: null", () => {
    const ctx = setup()
    ctx.bridge.connect(ctx.server)
    ctx.client({ id: 9, method: "shutdown", params: null as never })
    ctx.client({ method: "exit", params: null as never })
    assert.deepEqual(ctx.toServer, [
      { jsonrpc: "2.0", id: 9, method: "shutdown" },
      { jsonrpc: "2.0", method: "exit" },
    ])
  })
})

describe("LspWorkerBridge workspace file system", () => {
  test("a write to an open document reaches the file system when it closes", () => {
    const ctx = setup()
    ctx.bridge.applyFsOp({ _tag: "Reset", files: { "src/main.ts": "v1" } })
    ctx.bridge.connect(ctx.server)
    ctx.open(MAIN_URI, "v1")
    ctx.bridge.applyFsOp({
      _tag: "WriteFile",
      path: "src/main.ts",
      content: "v2",
    })
    ctx.close(MAIN_URI)
    assert.equal(ctx.fs.readTextFile("/workspace/src/main.ts"), "v2")
  })

  test("renaming an open document keeps its newest content", () => {
    const ctx = setup()
    ctx.bridge.applyFsOp({ _tag: "Reset", files: { "src/main.ts": "v1" } })
    ctx.bridge.connect(ctx.server)
    ctx.open(MAIN_URI, "v1")
    ctx.bridge.applyFsOp({
      _tag: "WriteFile",
      path: "src/main.ts",
      content: "v2",
    })
    ctx.bridge.applyFsOp({
      _tag: "Rename",
      from: "src/main.ts",
      to: "src/app.ts",
    })
    assert.equal(ctx.fs.readTextFile("/workspace/src/app.ts"), "v2")
  })

  test("Reset replaces the Workspace files and keeps the installed types", () => {
    const ctx = setup()
    ctx.bridge.applyFsOp({ _tag: "Reset", files: { "src/a.ts": "a" } })
    ctx.bridge.applyFsOp({
      _tag: "ReplaceNodeModules",
      id: 1,
      pack: packOf({ "effect/package.json": "{}" }),
    })
    ctx.bridge.applyFsOp({ _tag: "Reset", files: { "src/b.ts": "b" } })
    assert.deepEqual(ctx.fs.listFiles("/workspace").sort(), [
      "/workspace/node_modules/effect/package.json",
      "/workspace/src/b.ts",
    ])
  })

  test("ReplaceNodeModules replaces everything below node_modules", () => {
    const ctx = setup()
    ctx.bridge.applyFsOp({ _tag: "Reset", files: { "src/main.ts": "main" } })
    ctx.bridge.applyFsOp({
      _tag: "ReplaceNodeModules",
      id: 1,
      pack: packOf({ "effect/dist/Old.d.ts": "old" }),
    })
    ctx.bridge.applyFsOp({
      _tag: "ReplaceNodeModules",
      id: 2,
      pack: packOf({ "effect/dist/New.d.ts": "new" }),
    })
    assert.deepEqual(ctx.fs.listFiles("/workspace").sort(), [
      "/workspace/node_modules/effect/dist/New.d.ts",
      "/workspace/src/main.ts",
    ])
  })

  test("a types pack that does not decode is rejected and the previous types stay", () => {
    const ctx = setup()
    ctx.bridge.applyFsOp({
      _tag: "ReplaceNodeModules",
      id: 1,
      pack: packOf({ "effect/package.json": "{}" }),
    })
    ctx.bridge.applyFsOp({
      _tag: "ReplaceNodeModules",
      id: 2,
      pack: new TextEncoder().encode("not a pack").buffer,
    })
    assert.deepEqual(
      [
        ctx.types[1]?._tag,
        ctx.fs.exists("/workspace/node_modules/effect/package.json"),
      ],
      ["TypesRejected", true],
    )
  })

  test("readFile returns the newest content of an open document", () => {
    const ctx = setup()
    ctx.bridge.applyFsOp({ _tag: "Reset", files: { "src/main.ts": "v1" } })
    ctx.bridge.connect(ctx.server)
    ctx.open(MAIN_URI, "v1")
    ctx.bridge.applyFsOp({
      _tag: "WriteFile",
      path: "src/main.ts",
      content: "v2",
    })
    assert.equal(ctx.bridge.readFile("src/main.ts"), "v2")
  })

  test("readFile answers nothing for a path that leaves the Workspace", () => {
    const ctx = setup()
    ctx.bridge.applyFsOp({ _tag: "Reset", files: { "src/main.ts": "main" } })
    assert.isUndefined(ctx.bridge.readFile("../etc/passwd"))
  })
})
