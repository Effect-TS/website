import * as NodeWS from "@effect/platform-node/NodeWS"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { TestClock } from "effect/testing"
import { assert, describe, test } from "vite-plus/test"
import { startBridgeServer } from "../src/BridgeServer.ts"
import { LspStdio, makeFakeLspStdio } from "../src/LspStdio.ts"

interface TestWsClient {
  readonly ws: NodeWS.WebSocket
  readonly send: (data: string) => void
  readonly ping: () => Promise<void>
  readonly nextMessage: () => Promise<string>
  readonly waitForClose: () => Promise<{
    readonly code: number
    readonly reason: string
  }>
  readonly close: () => void
}

const connectWs = (url: string): Promise<TestWsClient> =>
  new Promise((resolve, reject) => {
    const ws = new NodeWS.WebSocket(url)
    const messageQueue: Array<string> = []
    const messageWaiters: Array<(msg: string) => void> = []
    let closeInfo:
      | { readonly code: number; readonly reason: string }
      | undefined
    const closeWaiters: Array<
      (info: { readonly code: number; readonly reason: string }) => void
    > = []

    ws.on("message", (data) => {
      const text =
        typeof data === "string"
          ? data
          : Buffer.isBuffer(data)
            ? data.toString("utf8")
            : Array.isArray(data)
              ? Buffer.concat(data).toString("utf8")
              : Buffer.from(data).toString("utf8")
      const waiter = messageWaiters.shift()
      if (waiter) {
        waiter(text)
      } else {
        messageQueue.push(text)
      }
    })

    ws.on("close", (code, reasonBuf) => {
      closeInfo = { code, reason: reasonBuf.toString("utf8") }
      for (const waiter of closeWaiters.splice(0)) {
        waiter(closeInfo)
      }
    })

    ws.once("error", (err) => {
      if (ws.readyState === NodeWS.WebSocket.CONNECTING) {
        reject(err)
      }
    })

    ws.once("open", () => {
      resolve({
        ws,
        send: (data) => ws.send(data),
        ping: () =>
          new Promise<void>((res) => {
            ws.once("pong", () => res())
            ws.ping()
          }),
        nextMessage: () => {
          const queued = messageQueue.shift()
          if (queued !== undefined) {
            return Promise.resolve(queued)
          }
          return new Promise<string>((res) => {
            messageWaiters.push(res)
          })
        },
        waitForClose: () => {
          if (closeInfo !== undefined) {
            return Promise.resolve(closeInfo)
          }
          return new Promise((res) => {
            closeWaiters.push(res)
          })
        },
        close: () => {
          if (
            ws.readyState === NodeWS.WebSocket.OPEN ||
            ws.readyState === NodeWS.WebSocket.CONNECTING
          ) {
            ws.close()
          }
        },
      })
    })
  })

describe("BridgeServer", () => {
  test("rewrites editable /workspace/main.ts URIs, allows read-only /workspace targets, and closes with 1008 on malformed JSON or disallowed URIs", async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const fake = yield* makeFakeLspStdio()
          const workspaceDir = "/tmp/bridge-sandbox-test"
          const { url } = yield* startBridgeServer({
            port: 0,
            workspaceDir,
          }).pipe(Effect.provide(fake.layer))

          // 1. Valid editable + read-only requests rewrite URIs both ways
          const client = yield* Effect.promise(() => connectWs(url))

          client.send(
            JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "initialize",
              params: {
                processId: null,
                rootUri: "file:///workspace",
                capabilities: {},
              },
            }),
          )
          const initStdin = (yield* fake.takeStdinMessage) as {
            params: { rootUri: string }
          }
          assert.strictEqual(initStdin.params.rootUri, `file://${workspaceDir}`)

          client.send(
            JSON.stringify({
              jsonrpc: "2.0",
              method: "textDocument/didOpen",
              params: {
                textDocument: {
                  uri: "file:///workspace/main.ts",
                  languageId: "typescript",
                  version: 1,
                  text: "export const a = 1",
                },
              },
            }),
          )
          const didOpenStdin = (yield* fake.takeStdinMessage) as {
            params: { textDocument: { uri: string } }
          }
          assert.strictEqual(
            didOpenStdin.params.textDocument.uri,
            `file://${workspaceDir}/main.ts`,
          )
          // Consume synthetic diagnostic pull
          const pullStdin = (yield* fake.takeStdinMessage) as {
            id: string
            method: string
            params: { textDocument: { uri: string } }
          }
          assert.strictEqual(pullStdin.method, "textDocument/diagnostic")
          assert.strictEqual(
            pullStdin.params.textDocument.uri,
            `file://${workspaceDir}/main.ts`,
          )

          // Server responds with real workspaceDir URI -> rewritten back to /workspace
          yield* fake.pushStdoutMessage({
            jsonrpc: "2.0",
            id: pullStdin.id,
            result: { kind: "full", items: [] },
          })
          const pushedRaw = yield* Effect.promise(() => client.nextMessage())
          const pushed = JSON.parse(pushedRaw) as {
            method: string
            params: { uri: string }
          }
          assert.strictEqual(pushed.method, "textDocument/publishDiagnostics")
          assert.strictEqual(pushed.params.uri, "file:///workspace/main.ts")

          // Read-only definition target inside /workspace is allowed
          client.send(
            JSON.stringify({
              jsonrpc: "2.0",
              id: 2,
              method: "textDocument/hover",
              params: {
                textDocument: {
                  uri: "file:///workspace/node_modules/effect/dist/Effect.d.ts",
                },
                position: { line: 0, character: 0 },
              },
            }),
          )
          const hoverStdin = (yield* fake.takeStdinMessage) as {
            params: { textDocument: { uri: string } }
          }
          assert.strictEqual(
            hoverStdin.params.textDocument.uri,
            `file://${workspaceDir}/node_modules/effect/dist/Effect.d.ts`,
          )

          client.close()
          yield* Effect.promise(() => client.waitForClose())

          // 2. Malformed JSON closes with 1008 Policy Violation
          const badJsonClient = yield* Effect.promise(() => connectWs(url))
          badJsonClient.send("{not valid json")
          const badJsonClose = yield* Effect.promise(() =>
            badJsonClient.waitForClose(),
          )
          assert.strictEqual(badJsonClose.code, 1008)

          // 3. Editable request targeting non-main.ts inside /workspace closes with 1008
          const badEditClient = yield* Effect.promise(() => connectWs(url))
          badEditClient.send(
            JSON.stringify({
              jsonrpc: "2.0",
              method: "textDocument/didOpen",
              params: {
                textDocument: {
                  uri: "file:///workspace/other.ts",
                  languageId: "typescript",
                  version: 1,
                  text: "export {}",
                },
              },
            }),
          )
          const badEditClose = yield* Effect.promise(() =>
            badEditClient.waitForClose(),
          )
          assert.strictEqual(badEditClose.code, 1008)

          // 4. Path traversal outside /workspace closes with 1008
          const traversalClient = yield* Effect.promise(() => connectWs(url))
          traversalClient.send(
            JSON.stringify({
              jsonrpc: "2.0",
              id: 3,
              method: "textDocument/hover",
              params: {
                textDocument: {
                  uri: "file:///workspace/%2e%2e/etc/passwd",
                },
                position: { line: 0, character: 0 },
              },
            }),
          )
          const traversalClose = yield* Effect.promise(() =>
            traversalClient.waitForClose(),
          )
          assert.strictEqual(traversalClose.code, 1008)
        }),
      ),
    )
  })

  test("closes with 1009 Message Too Big when incoming frame or open document text exceeds 256 KiB UTF-8 bytes", async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const fake = yield* makeFakeLspStdio()
          const { url } = yield* startBridgeServer({
            port: 0,
            workspaceDir: "/tmp/bridge-size-test",
          }).pipe(Effect.provide(fake.layer))

          // 1. Single frame > 256 KiB UTF-8 bytes (multi-byte emoji: 66_000 * 4 = 264_000 > 262_144, .length = 132_000 < 262_144)
          const bigFrameClient = yield* Effect.promise(() => connectWs(url))
          bigFrameClient.send(
            JSON.stringify({
              jsonrpc: "2.0",
              method: "textDocument/didOpen",
              params: {
                textDocument: {
                  uri: "file:///workspace/main.ts",
                  languageId: "typescript",
                  version: 1,
                  text: "🚀".repeat(66_000),
                },
              },
            }),
          )
          const bigFrameClose = yield* Effect.promise(() =>
            bigFrameClient.waitForClose(),
          )
          assert.strictEqual(bigFrameClose.code, 1009)

          // 2. Open document starts < 256 KiB, then grows > 256 KiB via incremental didChange
          const growClient = yield* Effect.promise(() => connectWs(url))
          const initialText = "a".repeat(200_000)
          growClient.send(
            JSON.stringify({
              jsonrpc: "2.0",
              method: "textDocument/didOpen",
              params: {
                textDocument: {
                  uri: "file:///workspace/main.ts",
                  languageId: "typescript",
                  version: 1,
                  text: initialText,
                },
              },
            }),
          )
          yield* fake.takeStdinMessage // didOpen
          yield* fake.takeStdinMessage // synthetic diagnostic pull

          growClient.send(
            JSON.stringify({
              jsonrpc: "2.0",
              method: "textDocument/didChange",
              params: {
                textDocument: {
                  uri: "file:///workspace/main.ts",
                  version: 2,
                },
                contentChanges: [
                  {
                    range: {
                      start: { line: 0, character: 200_000 },
                      end: { line: 0, character: 200_000 },
                    },
                    text: "b".repeat(70_000),
                  },
                ],
              },
            }),
          )
          const growClose = yield* Effect.promise(() =>
            growClient.waitForClose(),
          )
          assert.strictEqual(growClose.code, 1009)
        }),
      ),
    )
  })

  test("closes with 1011 Internal Error and tears down the Effect scope on child crash or invalid stdout framing", async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const fake1 = yield* makeFakeLspStdio()
          const fake2 = yield* makeFakeLspStdio()
          const scopeClosed1 = yield* Deferred.make<void>()
          const scopeClosed2 = yield* Deferred.make<void>()
          let spawnIndex = 0

          const trackedLayer = Layer.succeed(LspStdio, {
            spawn: Effect.gen(function* () {
              const idx = spawnIndex++
              const target = idx === 0 ? fake1 : fake2
              const closedDeferred = idx === 0 ? scopeClosed1 : scopeClosed2
              yield* Effect.addFinalizer(() =>
                Deferred.succeed(closedDeferred, undefined).pipe(Effect.asVoid),
              )
              const stdio = yield* LspStdio.pipe(Effect.provide(target.layer))
              return yield* stdio.spawn
            }),
          })

          const { url } = yield* startBridgeServer({
            port: 0,
            workspaceDir: "/tmp/bridge-crash-test",
          }).pipe(Effect.provide(trackedLayer))

          // 1. Child process crash -> 1011 + scope teardown
          const crashClient = yield* Effect.promise(() => connectWs(url))
          crashClient.send(
            JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "initialize",
              params: { processId: null, rootUri: null, capabilities: {} },
            }),
          )
          yield* fake1.takeStdinMessage
          yield* fake1.exit(137)

          const crashClose = yield* Effect.promise(() =>
            crashClient.waitForClose(),
          )
          assert.strictEqual(crashClose.code, 1011)
          yield* Deferred.await(scopeClosed1)

          // 2. Invalid stdout framing -> 1011 + scope teardown
          const frameClient = yield* Effect.promise(() => connectWs(url))
          frameClient.send(
            JSON.stringify({
              jsonrpc: "2.0",
              id: 2,
              method: "initialize",
              params: { processId: null, rootUri: null, capabilities: {} },
            }),
          )
          yield* fake2.takeStdinMessage
          yield* fake2.pushStdout(Buffer.from("Bad-Header: oops\r\n\r\n{}"))

          const frameClose = yield* Effect.promise(() =>
            frameClient.waitForClose(),
          )
          assert.strictEqual(frameClose.code, 1011)
          yield* Deferred.await(scopeClosed2)
        }),
      ),
    )
  })

  test("evicts idle sessions after 1 minute with close code 4000, resetting only on real LSP frames and not keepalive pings (TestClock)", async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const fake = yield* makeFakeLspStdio()
          const { url } = yield* startBridgeServer({
            port: 0,
            workspaceDir: "/tmp/bridge-idle-test",
          }).pipe(Effect.provide(fake.layer))

          // 1. Keepalive pings must NOT reset the 1-minute idle timer
          const pingClient = yield* Effect.promise(() => connectWs(url))
          // Let server accept and start idle timer
          yield* Effect.promise(
            () => new Promise<void>((res) => setTimeout(res, 20)),
          )

          yield* TestClock.adjust("30 seconds")
          yield* Effect.promise(() => pingClient.ping())
          yield* TestClock.adjust("29 seconds")
          yield* Effect.promise(
            () => new Promise<void>((res) => setTimeout(res, 20)),
          )
          assert.strictEqual(pingClient.ws.readyState, NodeWS.WebSocket.OPEN)

          yield* TestClock.adjust("1 second")
          const pingClose = yield* Effect.promise(() =>
            pingClient.waitForClose(),
          )
          assert.strictEqual(pingClose.code, 4000)

          // 2. Real LSP frame resets the 1-minute idle timer
          const activeClient = yield* Effect.promise(() => connectWs(url))
          yield* Effect.promise(
            () => new Promise<void>((res) => setTimeout(res, 20)),
          )

          yield* TestClock.adjust("45 seconds")
          activeClient.send(
            JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "initialize",
              params: { processId: null, rootUri: null, capabilities: {} },
            }),
          )
          yield* fake.takeStdinMessage

          // 45s after real LSP frame (90s total) -> must still be open
          yield* TestClock.adjust("45 seconds")
          yield* Effect.promise(
            () => new Promise<void>((res) => setTimeout(res, 20)),
          )
          assert.strictEqual(activeClient.ws.readyState, NodeWS.WebSocket.OPEN)

          // 15s later (60s after last real LSP frame) -> evicted with 4000
          yield* TestClock.adjust("15 seconds")
          const activeClose = yield* Effect.promise(() =>
            activeClient.waitForClose(),
          )
          assert.strictEqual(activeClose.code, 4000)
        }),
      ).pipe(Effect.provide(TestClock.layer())),
    )
  })

  test("caps concurrent sessions at 8 per server instance and rejects overflow with 1013 Try Again Later", async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          let spawnCount = 0
          const countingLayer = Layer.succeed(LspStdio, {
            spawn: Effect.gen(function* () {
              spawnCount += 1
              const fake = yield* makeFakeLspStdio()
              const stdio = yield* LspStdio.pipe(Effect.provide(fake.layer))
              return yield* stdio.spawn
            }),
          })

          const { url } = yield* startBridgeServer({
            port: 0,
            workspaceDir: "/tmp/bridge-cap-test",
          }).pipe(Effect.provide(countingLayer))

          const clients: Array<TestWsClient> = []
          for (let i = 0; i < 8; i++) {
            clients.push(yield* Effect.promise(() => connectWs(url)))
          }

          // Allow all 8 handlers to acquire their slots
          yield* Effect.promise(
            () => new Promise<void>((res) => setTimeout(res, 50)),
          )
          assert.strictEqual(spawnCount, 8)

          // 9th connection must be rejected with 1013 without spawning
          const overflow = yield* Effect.promise(() => connectWs(url))
          const overflowClose = yield* Effect.promise(() =>
            overflow.waitForClose(),
          )
          assert.strictEqual(overflowClose.code, 1013)
          assert.strictEqual(spawnCount, 8)

          // Closing 1 connection frees a slot for a new connection
          const released = clients.pop()!
          released.close()
          yield* Effect.promise(() => released.waitForClose())
          yield* Effect.promise(
            () => new Promise<void>((res) => setTimeout(res, 50)),
          )

          const replacement = yield* Effect.promise(() => connectWs(url))
          clients.push(replacement)
          yield* Effect.promise(
            () => new Promise<void>((res) => setTimeout(res, 50)),
          )
          assert.strictEqual(replacement.ws.readyState, NodeWS.WebSocket.OPEN)
          assert.strictEqual(spawnCount, 9)

          for (const client of clients) {
            client.close()
          }
          yield* Effect.promise(() =>
            Promise.all(clients.map((c) => c.waitForClose())),
          )
        }),
      ).pipe(Effect.provide(TestClock.layer())),
    )
  })
})
