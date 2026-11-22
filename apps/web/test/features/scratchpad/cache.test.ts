import type { Transport } from "@codemirror/lsp-client"
import { assert, describe, test } from "vite-plus/test"
import { createCachedLspTransport } from "../../../src/features/scratchpad/cache.ts"

const flushMicrotasks = () => new Promise<void>((r) => queueMicrotask(r))

const makeMockTransport = () => {
  const sent: Array<Record<string, unknown>> = []
  const handlers = new Set<(value: string) => void>()

  const transport: Transport = {
    send(raw) {
      sent.push(JSON.parse(raw) as Record<string, unknown>)
    },
    subscribe(h) {
      handlers.add(h)
    },
    unsubscribe(h) {
      handlers.delete(h)
    },
  }

  const receive = (msg: Record<string, unknown>) => {
    const raw = JSON.stringify(msg)
    for (const h of handlers) {
      h(raw)
    }
  }

  return { transport, sent, receive }
}

const openDoc = (transport: Transport, text: string) => {
  transport.send(
    JSON.stringify({
      jsonrpc: "2.0",
      method: "textDocument/didOpen",
      params: {
        textDocument: {
          uri: "file:///workspace/main.ts",
          languageId: "typescript",
          version: 1,
          text,
        },
      },
    }),
  )
}

const changeDoc = (transport: Transport, version: number, text: string) => {
  transport.send(
    JSON.stringify({
      jsonrpc: "2.0",
      method: "textDocument/didChange",
      params: {
        textDocument: { uri: "file:///workspace/main.ts", version },
        contentChanges: [{ text }],
      },
    }),
  )
}

describe("createCachedLspTransport", () => {
  test("caches repeated hover requests on unchanged buffer without hitting upstream", async () => {
    const mock = makeMockTransport()
    const cached = createCachedLspTransport(mock.transport)
    const received: Array<Record<string, unknown>> = []
    cached.transport.subscribe((raw) => {
      received.push(JSON.parse(raw) as Record<string, unknown>)
    })

    openDoc(cached.transport, "const x = 1\n")
    assert.strictEqual(mock.sent.length, 1)

    // First hover misses and forwards to upstream
    cached.transport.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "textDocument/hover",
        params: {
          textDocument: { uri: "file:///workspace/main.ts" },
          position: { line: 0, character: 6 },
        },
      }),
    )
    assert.strictEqual(mock.sent.length, 2)

    mock.receive({
      jsonrpc: "2.0",
      id: 1,
      result: { contents: { kind: "markdown", value: "const x: 1" } },
    })
    assert.strictEqual(received.length, 1)
    assert.strictEqual(received[0]?.id, 1)

    // Second hover at same position hits cache locally (no upstream send)
    cached.transport.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "textDocument/hover",
        params: {
          position: { character: 6, line: 0 },
          textDocument: { uri: "file:///workspace/main.ts" },
        },
      }),
    )
    assert.strictEqual(mock.sent.length, 2)

    await flushMicrotasks()
    assert.strictEqual(received.length, 2)
    assert.strictEqual(received[1]?.id, 2)
    assert.deepStrictEqual(received[1]?.result, {
      contents: { kind: "markdown", value: "const x: 1" },
    })
    assert.deepStrictEqual(cached.stats(), {
      hits: 1,
      misses: 1,
      coalesced: 0,
      size: 1,
    })
  })

  test("invalidates on document edit and reuses cache if buffer reverts to previous content", async () => {
    const mock = makeMockTransport()
    const cached = createCachedLspTransport(mock.transport)
    const received: Array<Record<string, unknown>> = []
    cached.transport.subscribe((raw) => {
      received.push(JSON.parse(raw) as Record<string, unknown>)
    })

    openDoc(cached.transport, "const x = 1\n")
    cached.transport.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "textDocument/hover",
        params: {
          textDocument: { uri: "file:///workspace/main.ts" },
          position: { line: 0, character: 6 },
        },
      }),
    )
    mock.receive({ jsonrpc: "2.0", id: 1, result: { contents: "v1" } })

    // Edit document -> must miss upstream
    changeDoc(cached.transport, 2, "const x = 2\n")
    cached.transport.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "textDocument/hover",
        params: {
          textDocument: { uri: "file:///workspace/main.ts" },
          position: { line: 0, character: 6 },
        },
      }),
    )
    assert.strictEqual(
      mock.sent.filter((m) => m.method === "textDocument/hover").length,
      2,
    )
    mock.receive({ jsonrpc: "2.0", id: 2, result: { contents: "v2" } })

    // Revert back to original text -> hits v1 cache entry without upstream call
    changeDoc(cached.transport, 3, "const x = 1\n")
    cached.transport.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "textDocument/hover",
        params: {
          textDocument: { uri: "file:///workspace/main.ts" },
          position: { line: 0, character: 6 },
        },
      }),
    )
    assert.strictEqual(
      mock.sent.filter((m) => m.method === "textDocument/hover").length,
      2,
    )

    await flushMicrotasks()
    assert.deepStrictEqual(received[2], {
      jsonrpc: "2.0",
      id: 3,
      result: { contents: "v1" },
    })
  })

  test("coalesces identical in-flight requests and handles partial vs full cancellation", () => {
    const mock = makeMockTransport()
    const cached = createCachedLspTransport(mock.transport)
    const received: Array<Record<string, unknown>> = []
    cached.transport.subscribe((raw) => {
      received.push(JSON.parse(raw) as Record<string, unknown>)
    })

    openDoc(cached.transport, "const x = 1\n")

    const hoverParams = {
      textDocument: { uri: "file:///workspace/main.ts" },
      position: { line: 0, character: 6 },
    }
    cached.transport.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 10,
        method: "textDocument/hover",
        params: hoverParams,
      }),
    )
    cached.transport.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 11,
        method: "textDocument/hover",
        params: hoverParams,
      }),
    )

    // Only one upstream hover sent
    assert.strictEqual(
      mock.sent.filter((m) => m.method === "textDocument/hover").length,
      1,
    )

    // Cancelling one waiter does not cancel the upstream request
    cached.transport.send(
      JSON.stringify({
        jsonrpc: "2.0",
        method: "$/cancelRequest",
        params: { id: 10 },
      }),
    )
    assert.strictEqual(
      mock.sent.filter((m) => m.method === "$/cancelRequest").length,
      0,
    )

    // Upstream response resolves the remaining waiter (id 11)
    mock.receive({ jsonrpc: "2.0", id: 10, result: { contents: "ok" } })
    assert.strictEqual(received.length, 1)
    assert.deepStrictEqual(received[0], {
      jsonrpc: "2.0",
      id: 11,
      result: { contents: "ok" },
    })
  })

  test("never caches error responses or non-cacheable methods and enforces LRU maxEntries", async () => {
    const mock = makeMockTransport()
    const cached = createCachedLspTransport(mock.transport, { maxEntries: 2 })
    const received: Array<Record<string, unknown>> = []
    cached.transport.subscribe((raw) => {
      received.push(JSON.parse(raw) as Record<string, unknown>)
    })

    openDoc(cached.transport, "const a = 1\nconst b = 2\nconst c = 3\n")

    // Error response is not cached
    cached.transport.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "textDocument/hover",
        params: {
          textDocument: { uri: "file:///workspace/main.ts" },
          position: { line: 0, character: 6 },
        },
      }),
    )
    mock.receive({
      jsonrpc: "2.0",
      id: 1,
      error: { code: -32603, message: "boom" },
    })
    assert.strictEqual(cached.stats().size, 0)

    // Mutating request (rename) is never cached
    cached.transport.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "textDocument/rename",
        params: {
          textDocument: { uri: "file:///workspace/main.ts" },
          position: { line: 0, character: 6 },
          newName: "a2",
        },
      }),
    )
    mock.receive({ jsonrpc: "2.0", id: 2, result: { changes: {} } })
    assert.strictEqual(cached.stats().size, 0)

    // Fill LRU beyond maxEntries=2
    for (const [idx, line] of [0, 1, 2].entries()) {
      const id = 10 + idx
      cached.transport.send(
        JSON.stringify({
          jsonrpc: "2.0",
          id,
          method: "textDocument/hover",
          params: {
            textDocument: { uri: "file:///workspace/main.ts" },
            position: { line, character: 6 },
          },
        }),
      )
      mock.receive({ jsonrpc: "2.0", id, result: { line } })
    }
    assert.strictEqual(cached.stats().size, 2)

    // Line 0 was evicted -> re-querying it must hit upstream
    const before = mock.sent.length
    cached.transport.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 20,
        method: "textDocument/hover",
        params: {
          textDocument: { uri: "file:///workspace/main.ts" },
          position: { line: 0, character: 6 },
        },
      }),
    )
    assert.strictEqual(mock.sent.length, before + 1)

    // Line 2 is still cached -> re-querying hits locally
    cached.transport.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 21,
        method: "textDocument/hover",
        params: {
          textDocument: { uri: "file:///workspace/main.ts" },
          position: { line: 2, character: 6 },
        },
      }),
    )
    assert.strictEqual(mock.sent.length, before + 1)
    await flushMicrotasks()
    assert.deepStrictEqual(received[received.length - 1], {
      jsonrpc: "2.0",
      id: 21,
      result: { line: 2 },
    })
  })
})
