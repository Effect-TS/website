import {
  encodeTypesPack,
  MemoryFileSystem,
  REQUEST_FAILED,
} from "@website/tsrs-lsp-wasm"
import { assert, describe, test } from "vite-plus/test"
import {
  CROSS_FILE_PULL_DELAY_MS,
  makeLspWorkerBridge,
  OWN_PULL_DELAY_MS,
  QUARANTINE_DIAGNOSTIC_CODE,
  type BridgeTimers,
} from "../../../src/features/scratchpad/lsp-worker-bridge.ts"
import type { TypesMountResult } from "../../../src/features/scratchpad/worker-protocol.ts"

interface Message {
  readonly jsonrpc?: string
  readonly id?: number | string
  readonly method?: string
  readonly params?: Record<string, unknown>
  readonly result?: unknown
  readonly error?: { readonly code: number; readonly message: string }
}

const MAIN_URI = "file:///workspace/src/main.ts"
const GREETER_URI = "file:///workspace/src/greeter.ts"

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
  const quarantined = new Set<string>()
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
    quarantined,
  }
  const client = (message: Message) =>
    bridge.handleClientMessage(JSON.stringify({ jsonrpc: "2.0", ...message }))
  const reply = (message: Message) =>
    bridge.handleServerMessage(JSON.stringify({ jsonrpc: "2.0", ...message }))
  const pulls = () =>
    toServer.filter((m) => m.method === "textDocument/diagnostic")
  const pullUris = () =>
    pulls().map(
      (m) => (m.params as { textDocument: { uri: string } }).textDocument.uri,
    )
  const lastPull = (uri: string) =>
    [...pulls()]
      .reverse()
      .find(
        (m) =>
          (m.params as { textDocument: { uri: string } }).textDocument.uri ===
          uri,
      )!
  const pushes = () =>
    toPage.filter((m) => m.method === "textDocument/publishDiagnostics")
  const open = (uri: string, text: string, version = 1) =>
    client({
      method: "textDocument/didOpen",
      params: {
        textDocument: { uri, languageId: "typescript", version, text },
      },
    })
  const change = (uri: string, version: number, text: string) =>
    client({
      method: "textDocument/didChange",
      params: {
        textDocument: { uri, version },
        contentChanges: [{ text }],
      },
    })
  return {
    fs,
    bridge,
    types,
    server,
    quarantined,
    advance,
    toPage,
    toServer,
    client,
    reply,
    pulls,
    pullUris,
    lastPull,
    pushes,
    open,
    change,
  }
}

const diagnostic = (code: number, message: string) => ({
  range: {
    start: { line: 0, character: 0 },
    end: { line: 0, character: 1 },
  },
  severity: 1,
  code,
  message,
})

describe("LspWorkerBridge pull-to-push diagnostics", () => {
  test("queues client messages until connected, then pulls an opened document and pushes the result with its version", () => {
    const ctx = setup()
    ctx.client({ id: 1, method: "initialize", params: {} })
    ctx.open(MAIN_URI, "const a = 1\n", 1)
    ctx.advance(1_000)
    assert.deepEqual(ctx.toServer, [])

    ctx.bridge.connect(ctx.server)
    assert.deepEqual(
      ctx.toServer.map((m) => m.method),
      ["initialize", "textDocument/didOpen"],
    )
    ctx.advance(0)
    assert.deepEqual(ctx.pullUris(), [MAIN_URI])
    const pull = ctx.lastPull(MAIN_URI)
    assert.match(String(pull.id), /^worker:/)

    ctx.reply({
      id: pull.id!,
      result: {
        kind: "full",
        items: [diagnostic(377001, "effect(floatingEffect)")],
      },
    })
    assert.deepEqual(ctx.pushes(), [
      {
        jsonrpc: "2.0",
        method: "textDocument/publishDiagnostics",
        params: {
          uri: MAIN_URI,
          version: 1,
          diagnostics: [diagnostic(377001, "effect(floatingEffect)")],
        },
      },
    ])
    // The pull's own response never reaches the page.
    assert.isFalse(ctx.toPage.some((m) => m.id === pull.id))
  })

  test("debounces pulls after edits, re-pulls other open documents later, and drops stale results", () => {
    const ctx = setup()
    ctx.bridge.connect(ctx.server)
    ctx.open(MAIN_URI, "a\n")
    ctx.open(GREETER_URI, "b\n")
    ctx.advance(CROSS_FILE_PULL_DELAY_MS)
    const initial = ctx.pulls().length
    assert.sameMembers(ctx.pullUris(), [MAIN_URI, GREETER_URI])

    ctx.change(GREETER_URI, 2, "bb\n")
    ctx.change(GREETER_URI, 3, "bbb\n")
    ctx.advance(OWN_PULL_DELAY_MS)
    assert.deepEqual(ctx.pullUris().slice(initial), [GREETER_URI])
    const greeterPull = ctx.lastPull(GREETER_URI)

    ctx.advance(CROSS_FILE_PULL_DELAY_MS)
    assert.deepEqual(ctx.pullUris().slice(initial), [GREETER_URI, MAIN_URI])

    // A result for an older version than the editor has is dropped.
    ctx.change(GREETER_URI, 4, "bbbb\n")
    ctx.reply({ id: greeterPull.id!, result: { kind: "full", items: [] } })
    assert.isFalse(
      ctx
        .pushes()
        .some((m) => m.params?.uri === GREETER_URI && m.params.version === 3),
    )
  })

  test("didClose pushes empty diagnostics and re-pulls the rest; empty server pushes are dropped and others forwarded", () => {
    const ctx = setup()
    ctx.bridge.connect(ctx.server)
    ctx.open(MAIN_URI, "a\n")
    ctx.open(GREETER_URI, "b\n")
    ctx.advance(1_000)
    const before = ctx.pulls().length

    ctx.client({
      method: "textDocument/didClose",
      params: { textDocument: { uri: GREETER_URI } },
    })
    assert.deepEqual(ctx.pushes().at(-1)?.params, {
      uri: GREETER_URI,
      diagnostics: [],
    })
    ctx.advance(CROSS_FILE_PULL_DELAY_MS)
    assert.deepEqual(ctx.pullUris().slice(before), [MAIN_URI])

    ctx.reply({
      method: "textDocument/publishDiagnostics",
      params: { uri: "file:///workspace/tsconfig.json", diagnostics: [] },
    })
    ctx.reply({ id: 7, result: { contents: "hover" } })
    assert.deepEqual(ctx.toPage.at(-1), {
      jsonrpc: "2.0",
      id: 7,
      result: { contents: "hover" },
    })
    assert.isFalse(
      ctx.toPage.some(
        (m) => m.params?.uri === "file:///workspace/tsconfig.json",
      ),
    )
  })

  test("strips params: null from shutdown and exit", () => {
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

describe("LspWorkerBridge crashes and quarantine", () => {
  test("a pull that crashed the server is retried once, and a quarantined document gets a warning that explains why", () => {
    const ctx = setup()
    ctx.bridge.connect(ctx.server)
    ctx.open(MAIN_URI, "export const deep = [[[[\nmore\n")
    ctx.advance(0)

    ctx.reply({
      id: ctx.lastPull(MAIN_URI).id!,
      error: { code: REQUEST_FAILED, message: "the server crashed" },
    })
    ctx.advance(0)
    assert.equal(ctx.pulls().length, 2)
    assert.deepEqual(ctx.pushes(), [])

    // The second crash quarantines the document in the host.
    ctx.quarantined.add(MAIN_URI)
    ctx.reply({
      id: ctx.lastPull(MAIN_URI).id!,
      error: { code: REQUEST_FAILED, message: "quarantined" },
    })
    ctx.advance(1_000)
    assert.equal(ctx.pulls().length, 2)
    const push = ctx.pushes().at(-1)!
    const items = push.params?.diagnostics as Array<{
      code: string
      severity: number
      message: string
      range: { end: { character: number } }
    }>
    assert.equal(items.length, 1)
    assert.equal(items[0]!.code, QUARANTINE_DIAGNOSTIC_CODE)
    assert.equal(items[0]!.severity, 2)
    assert.match(items[0]!.message, /Edit the file/)
    assert.equal(
      items[0]!.range.end.character,
      "export const deep = [[[[".length,
    )

    // An edit lifts the quarantine in the host; the bridge pulls again.
    ctx.quarantined.delete(MAIN_URI)
    ctx.change(MAIN_URI, 2, "export const ok = 1\n")
    ctx.advance(OWN_PULL_DELAY_MS)
    assert.equal(ctx.pulls().length, 3)
  })
})

describe("LspWorkerBridge workspace file system", () => {
  test("Reset and writes materialize files that are not open, and file changes re-pull open documents", () => {
    const ctx = setup()
    ctx.bridge.applyFsOp({
      _tag: "Reset",
      files: { "src/main.ts": "main", "src/greeter.ts": "greeter" },
    })
    assert.equal(ctx.fs.readTextFile("/workspace/src/main.ts"), "main")
    assert.equal(ctx.fs.readTextFile("/workspace/src/greeter.ts"), "greeter")

    ctx.bridge.connect(ctx.server)
    ctx.open(MAIN_URI, "main")
    ctx.advance(1_000)
    const before = ctx.pulls().length

    ctx.bridge.applyFsOp({
      _tag: "WriteFile",
      path: "src/greeter.ts",
      content: "greeter v2",
    })
    assert.equal(ctx.fs.readTextFile("/workspace/src/greeter.ts"), "greeter v2")
    ctx.advance(CROSS_FILE_PULL_DELAY_MS)
    assert.deepEqual(ctx.pullUris().slice(before), [MAIN_URI])
  })

  test("writes to open documents wait until they close; renames and removes apply at once", () => {
    const ctx = setup()
    ctx.bridge.applyFsOp({
      _tag: "Reset",
      files: { "src/main.ts": "v1", "src/old.ts": "old" },
    })
    ctx.bridge.connect(ctx.server)
    ctx.open(MAIN_URI, "v1")

    ctx.bridge.applyFsOp({
      _tag: "WriteFile",
      path: "src/main.ts",
      content: "v2",
    })
    assert.equal(ctx.fs.readTextFile("/workspace/src/main.ts"), "v1")
    ctx.client({
      method: "textDocument/didClose",
      params: { textDocument: { uri: MAIN_URI } },
    })
    assert.equal(ctx.fs.readTextFile("/workspace/src/main.ts"), "v2")

    ctx.bridge.applyFsOp({
      _tag: "Rename",
      from: "src/old.ts",
      to: "src/lib/new.ts",
    })
    assert.isFalse(ctx.fs.exists("/workspace/src/old.ts"))
    assert.equal(ctx.fs.readTextFile("/workspace/src/lib/new.ts"), "old")

    ctx.bridge.applyFsOp({ _tag: "Remove", path: "src/lib/new.ts" })
    assert.isFalse(ctx.fs.exists("/workspace/src/lib/new.ts"))

    // A Reset drops files that are gone but keeps the installed types.
    ctx.fs.writeFile("/workspace/node_modules/effect/package.json", "{}")
    ctx.bridge.applyFsOp({ _tag: "Reset", files: { "src/b.ts": "b" } })
    assert.deepEqual(ctx.fs.listFiles("/workspace").sort(), [
      "/workspace/node_modules/effect/package.json",
      "/workspace/src/b.ts",
    ])
  })

  test("a rename of an open document carries its held-back content", () => {
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
})

const packOf = (
  files: Readonly<Record<string, string>>,
  packages = [{ name: "effect", version: "4.1.5" }],
): ArrayBuffer => {
  const encoder = new TextEncoder()
  const bytes = encodeTypesPack({
    packages,
    files: Object.entries(files).map(([path, text]) => ({
      path,
      data: encoder.encode(text),
    })),
  })
  return bytes.slice().buffer
}

describe("LspWorkerBridge tsconfig.json", () => {
  test("is a Workspace file: written, changed, removed, and dropped by a Reset without it", () => {
    const ctx = setup()
    ctx.bridge.applyFsOp({
      _tag: "Reset",
      files: { "src/main.ts": "main", "tsconfig.json": '{"a":1}' },
    })
    assert.equal(ctx.fs.readTextFile("/workspace/tsconfig.json"), '{"a":1}')

    ctx.bridge.applyFsOp({
      _tag: "WriteFile",
      path: "tsconfig.json",
      content: '{"a":2}',
    })
    assert.equal(ctx.fs.readTextFile("/workspace/tsconfig.json"), '{"a":2}')

    ctx.bridge.applyFsOp({ _tag: "Remove", path: "tsconfig.json" })
    assert.isFalse(ctx.fs.exists("/workspace/tsconfig.json"))

    ctx.bridge.applyFsOp({
      _tag: "WriteFile",
      path: "tsconfig.json",
      content: "{}",
    })
    ctx.bridge.applyFsOp({ _tag: "Reset", files: { "src/main.ts": "main" } })
    assert.isFalse(
      ctx.fs.exists("/workspace/tsconfig.json"),
      "no stale tsconfig survives a Reset",
    )
  })
})

describe("LspWorkerBridge ReplaceNodeModules", () => {
  test("replaces everything below node_modules, answers TypesMounted and re-pulls open documents", () => {
    const ctx = setup()
    ctx.bridge.applyFsOp({ _tag: "Reset", files: { "src/main.ts": "main" } })
    ctx.bridge.connect(ctx.server)
    ctx.open(MAIN_URI, "main")
    ctx.advance(1_000)

    ctx.bridge.applyFsOp({
      _tag: "ReplaceNodeModules",
      id: 1,
      pack: packOf({
        "effect/package.json": '{"name":"effect"}',
        "effect/dist/Old.d.ts": "old",
      }),
    })
    assert.equal(
      ctx.fs.readTextFile("/workspace/node_modules/effect/dist/Old.d.ts"),
      "old",
    )
    const before = ctx.pulls().length

    ctx.bridge.applyFsOp({
      _tag: "ReplaceNodeModules",
      id: 2,
      pack: packOf(
        {
          "effect/package.json": '{"name":"effect"}',
          "effect/dist/New.d.ts": "export {}",
          "@types/node/package.json": "{}",
        },
        [
          { name: "@types/node", version: "24.0.0" },
          { name: "effect", version: "4.1.6" },
        ],
      ),
    })
    assert.deepEqual(ctx.fs.listFiles("/workspace").sort(), [
      "/workspace/node_modules/@types/node/package.json",
      "/workspace/node_modules/effect/dist/New.d.ts",
      "/workspace/node_modules/effect/package.json",
      "/workspace/src/main.ts",
    ])
    assert.deepEqual(ctx.types[1], {
      _tag: "TypesMounted",
      id: 2,
      files: 3,
      bytes: '{"name":"effect"}'.length + "export {}".length + 2,
      packages: [
        { name: "@types/node", version: "24.0.0" },
        { name: "effect", version: "4.1.6" },
      ],
    })
    ctx.advance(CROSS_FILE_PULL_DELAY_MS)
    assert.deepEqual(ctx.pullUris().slice(before), [MAIN_URI])
  })

  test("a pack that does not decode is rejected and keeps the previous types", () => {
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
    assert.equal(ctx.types[1]?._tag, "TypesRejected")
    assert.equal(ctx.types[1]?.id, 2)
    assert.isTrue(ctx.fs.exists("/workspace/node_modules/effect/package.json"))
  })

  test("works before the server is connected, and a Reset keeps the types", () => {
    const ctx = setup()
    ctx.bridge.applyFsOp({
      _tag: "ReplaceNodeModules",
      id: 7,
      pack: packOf({ "effect/package.json": "{}" }),
    })
    ctx.bridge.applyFsOp({ _tag: "Reset", files: { "src/main.ts": "main" } })
    assert.equal(ctx.types[0]?._tag, "TypesMounted")
    assert.isTrue(ctx.fs.exists("/workspace/node_modules/effect/package.json"))
  })
})
