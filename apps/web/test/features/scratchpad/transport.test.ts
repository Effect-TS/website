import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Socket from "effect/socket/Socket"
import * as Stream from "effect/Stream"
import { assert, describe, test } from "vite-plus/test"
import {
  layerSocket,
  LspTransport,
  makeFakeLspTransport,
  TransportClosedError,
  TransportConnectError,
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

          // Server closes with close code and reason
          yield* fake.controller.close(4000, "idle timeout")
          const closed = yield* Queue.take(events)
          assert.equal(closed._tag, "Disconnected")
          if (closed._tag === "Disconnected") {
            assert.instanceOf(closed.error, TransportClosedError)
            if (closed.error._tag === "TransportClosedError") {
              assert.equal(closed.error.code, 4000)
              assert.equal(closed.error.reason, "idle timeout")
            }
          }
          assert.equal(yield* fake.controller.isConnected, false)
        }).pipe(Effect.provide(fake.layer)),
      ),
    )
  })

  test("injects connection failures as TransportConnectError and supports autoHandshake and stallRequest", async () => {
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

          // Inject connect failure
          yield* fake.controller.failNextConnect("ECONNREFUSED")
          yield* lsp.reconnect
          const failed = yield* Queue.take(events)
          assert.equal(failed._tag, "Disconnected")
          if (failed._tag === "Disconnected") {
            assert.instanceOf(failed.error, TransportConnectError)
            assert.equal(failed.error.message, "ECONNREFUSED")
          }
          assert.equal(yield* fake.controller.isConnected, false)

          // Next connect succeeds and autoHandshake replies to initialize
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

  test("layerSocket maps SocketOpenError and SocketCloseError to tagged transport errors", async () => {
    let dialAttempt = 0

    const mockSocket = Socket.make({
      reader: Effect.suspend(() => {
        dialAttempt += 1
        if (dialAttempt === 1) {
          return Effect.fail(
            new Socket.SocketError({
              reason: new Socket.SocketOpenError({
                kind: "Unknown",
                cause: new Error("socket open failed"),
              }),
            }),
          )
        }
        return Effect.succeed<Socket.Reader>({
          pull: Effect.fail(
            new Socket.SocketError({
              reason: new Socket.SocketCloseError({
                code: 1013,
                closeReason: "at capacity",
              }),
            }),
          ),
          upgrade: Socket.SocketUpgradeError.unsupported,
        })
      }),
      writer: Effect.succeed<Socket.Writer>({
        write: () => Effect.void,
        writeAll: () => Effect.void,
      }),
    })

    const transportLayer = layerSocket.pipe(
      Layer.provide(Layer.succeed(Socket.Socket, mockSocket)),
    )

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

          // First dial fails on open -> TransportConnectError
          yield* lsp.reconnect
          const ev1 = yield* Queue.take(events)
          assert.equal(ev1._tag, "Disconnected")
          if (ev1._tag === "Disconnected") {
            assert.instanceOf(ev1.error, TransportConnectError)
          }

          // Second dial opens then closes with 1013 -> Connected then TransportClosedError
          yield* lsp.reconnect
          const ev2 = yield* Queue.take(events)
          assert.equal(ev2._tag, "Connected")
          const ev3 = yield* Queue.take(events)
          assert.equal(ev3._tag, "Disconnected")
          if (ev3._tag === "Disconnected") {
            assert.instanceOf(ev3.error, TransportClosedError)
            if (ev3.error._tag === "TransportClosedError") {
              assert.equal(ev3.error.code, 1013)
              assert.equal(ev3.error.reason, "at capacity")
            }
          }
        }).pipe(Effect.provide(transportLayer)),
      ),
    )
  })
})
