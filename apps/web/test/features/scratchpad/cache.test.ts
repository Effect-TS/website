import type { Transport } from "@codemirror/lsp-client"
import { assert, describe, test } from "vite-plus/test"
import { createCachedLspTransport } from "../../../src/features/scratchpad/cache.ts"

const MAIN = "file:///workspace/src/main.ts"
const GREETER = "file:///workspace/src/greeter.ts"

const flushMicrotasks = () => new Promise<void>((r) => queueMicrotask(r))

/** A cached transport over a fake language server connection. */
const setup = () => {
  const sent: Array<Record<string, unknown>> = []
  const handlers = new Set<(value: string) => void>()
  const server: Transport = {
    send: (raw) => sent.push(JSON.parse(raw) as Record<string, unknown>),
    subscribe: (h) => handlers.add(h),
    unsubscribe: (h) => handlers.delete(h),
  }
  const { transport } = createCachedLspTransport(server)
  const received: Array<Record<string, unknown>> = []
  transport.subscribe((raw) =>
    received.push(JSON.parse(raw) as Record<string, unknown>),
  )
  const send = (message: Record<string, unknown>) =>
    transport.send(JSON.stringify({ jsonrpc: "2.0", ...message }))
  const reply = (message: Record<string, unknown>) => {
    const raw = JSON.stringify({ jsonrpc: "2.0", ...message })
    for (const h of handlers) h(raw)
  }
  const open = (uri: string, text: string) =>
    send({
      method: "textDocument/didOpen",
      params: {
        textDocument: { uri, languageId: "typescript", version: 1, text },
      },
    })
  const hover = (id: number) =>
    send({
      id,
      method: "textDocument/hover",
      params: {
        textDocument: { uri: MAIN },
        position: { line: 0, character: 6 },
      },
    })
  const serverHovers = () =>
    sent.filter((m) => m.method === "textDocument/hover").length
  return { sent, received, send, reply, open, hover, serverHovers }
}

describe("cached LSP transport", () => {
  test("a repeated hover on unchanged documents is answered without asking the server", async () => {
    const lsp = setup()
    lsp.open(MAIN, "const x = 1\n")
    lsp.hover(1)
    lsp.reply({ id: 1, result: { contents: "const x: 1" } })
    lsp.hover(2)
    await flushMicrotasks()
    assert.deepStrictEqual(lsp.received.at(-1), {
      jsonrpc: "2.0",
      id: 2,
      result: { contents: "const x: 1" },
    })
    assert.strictEqual(lsp.serverHovers(), 1)
  })

  test("an edit to another open file makes the next hover ask the server", () => {
    const lsp = setup()
    lsp.open(MAIN, 'import { greet } from "./greeter.ts"\n')
    lsp.open(GREETER, "export const greet = (name: string) => name\n")
    lsp.hover(1)
    lsp.reply({ id: 1, result: { contents: "greet(name: string)" } })
    lsp.send({
      method: "textDocument/didChange",
      params: {
        textDocument: { uri: GREETER, version: 2 },
        contentChanges: [{ text: "export const greet = (n: number) => n\n" }],
      },
    })
    lsp.hover(2)
    assert.strictEqual(lsp.serverHovers(), 2)
  })

  test("identical concurrent hovers share one server request, which outlives cancelling one of them", () => {
    const lsp = setup()
    lsp.open(MAIN, "const x = 1\n")
    lsp.hover(10)
    lsp.hover(11)
    lsp.send({ method: "$/cancelRequest", params: { id: 10 } })
    lsp.reply({ id: 10, result: { contents: "ok" } })
    assert.deepStrictEqual(lsp.received, [
      { jsonrpc: "2.0", id: 11, result: { contents: "ok" } },
    ])
  })

  test("an error response is not cached", () => {
    const lsp = setup()
    lsp.open(MAIN, "const x = 1\n")
    lsp.hover(1)
    lsp.reply({ id: 1, error: { code: -32603, message: "boom" } })
    lsp.hover(2)
    assert.strictEqual(lsp.serverHovers(), 2)
  })
})
