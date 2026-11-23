import * as Effect from "effect/Effect"
import * as Queue from "effect/Queue"
import * as Stream from "effect/Stream"
import { assert, describe, test } from "vite-plus/test"
import {
  LspTransport,
  makeFakeLspTransport,
  TransportFatalError,
  type TransportEvent,
} from "../../../src/features/scratchpad/transport.ts"

describe("LspTransport and FakeLspController", () => {
  test("connects, inspects outbound messages, replies, pushes notifications, and closes with code and reason", async () => {
    const fake = makeFakeLspTransport()

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const lsp = yield* LspTransport
          const received: Array<string> = []
          const events = yield* Queue.unbounded<TransportEvent>()

          lsp.transport.subscribe((msg) => {
            received.push(msg)
          })

          yield* lsp.events.pipe(
            Stream.runForEach((ev) => Queue.offer(events, ev)),
            Effect.forkScoped,
          )
          // Let subscription attach
          yield* Effect.yieldNow

          yield* lsp.reconnect
          const connected = yield* Queue.take(events)
          assert.equal(connected._tag, "Connected")
          assert.equal(yield* fake.controller.isConnected, true)

          // Client sends an initialize request
          lsp.transport.send(
            JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "initialize",
              params: {},
            }),
          )

          const initReq = yield* fake.controller.waitForRequest("initialize")
          assert.equal(initReq.id, 1)
          assert.equal(initReq.method, "initialize")

          // Server replies
          yield* fake.controller.reply(1, {
            capabilities: { hoverProvider: true },
          })
          assert.equal(received.length, 1)
          assert.deepEqual(JSON.parse(received[0]!), {
            jsonrpc: "2.0",
            id: 1,
            result: { capabilities: { hoverProvider: true } },
          })

          // Server pushes notification
          yield* fake.controller.pushNotification(
            "textDocument/publishDiagnostics",
            { uri: "file:///workspace/main.ts", diagnostics: [] },
          )
          assert.equal(received.length, 2)
          assert.deepEqual(JSON.parse(received[1]!), {
            jsonrpc: "2.0",
            method: "textDocument/publishDiagnostics",
            params: { uri: "file:///workspace/main.ts", diagnostics: [] },
          })

          // Server fails for good
          yield* fake.controller.crash("wasm trap")
          const closed = yield* Queue.take(events)
          assert.equal(closed._tag, "Disconnected")
          if (closed._tag === "Disconnected") {
            assert.instanceOf(closed.error, TransportFatalError)
            assert.equal(closed.error.message, "wasm trap")
          }
          assert.equal(yield* fake.controller.isConnected, false)
        }).pipe(Effect.provide(fake.layer)),
      ),
    )
  })

  test("supports autoHandshake and stallRequest", async () => {
    const fake = makeFakeLspTransport({ autoHandshake: true })

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const lsp = yield* LspTransport
          const received: Array<string> = []
          const events = yield* Queue.unbounded<TransportEvent>()

          lsp.transport.subscribe((msg) => received.push(msg))
          yield* lsp.events.pipe(
            Stream.runForEach((ev) => Queue.offer(events, ev)),
            Effect.forkScoped,
          )
          yield* Effect.yieldNow

          // Connect; autoHandshake replies to initialize
          yield* lsp.reconnect
          const connected = yield* Queue.take(events)
          assert.equal(connected._tag, "Connected")

          lsp.transport.send(
            JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "initialize",
              params: {},
            }),
          )
          yield* fake.controller.waitForRequest("initialize")
          assert.equal(received.length, 1)
          assert.equal(JSON.parse(received[0]!).id, 1)

          // Stall initialize so next initialize does not auto-reply
          yield* fake.controller.stallRequest("initialize")
          lsp.transport.send(
            JSON.stringify({
              jsonrpc: "2.0",
              id: 2,
              method: "initialize",
              params: {},
            }),
          )
          yield* fake.controller.waitForRequest("initialize")
          assert.equal(received.length, 1)
        }).pipe(Effect.provide(fake.layer)),
      ),
    )
  })

  test("clears pending outbound frames on reconnect so stale frames are dropped", async () => {
    const fake = makeFakeLspTransport()

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const lsp = yield* LspTransport
          const events = yield* Queue.unbounded<TransportEvent>()

          yield* lsp.events.pipe(
            Stream.runForEach((ev) => Queue.offer(events, ev)),
            Effect.forkScoped,
          )
          yield* Effect.yieldNow

          // Queue stale frame while disconnected
          lsp.transport.send(
            JSON.stringify({
              jsonrpc: "2.0",
              method: "textDocument/didChange",
              params: { stale: true },
            }),
          )

          yield* lsp.reconnect
          const connected = yield* Queue.take(events)
          assert.equal(connected._tag, "Connected")

          lsp.transport.send(
            JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "initialize",
              params: {},
            }),
          )

          const first = yield* fake.controller.takeSentMessage
          assert.equal(first.method, "initialize")
        }).pipe(Effect.provide(fake.layer)),
      ),
    )
  })
})
