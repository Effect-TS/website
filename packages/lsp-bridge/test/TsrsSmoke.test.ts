import * as NodeChildProcessSpawner from "@effect/platform-node/NodeChildProcessSpawner"
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as NodeWS from "@effect/platform-node/NodeWS"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { assert, describe, test } from "vite-plus/test"
import { startBridgeServer } from "../src/BridgeServer.ts"
import { makeTsrsLspStdioLayer } from "../src/TsrsProcess.ts"
import {
  createLocalReadOnlyWorkspace,
  resolveTsrsBinary,
} from "../src/Workspace.ts"

interface RpcMessage {
  readonly jsonrpc?: string
  readonly id?: number | string
  readonly method?: string
  readonly params?: unknown
  readonly result?: unknown
  readonly error?: unknown
}

const isPidAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    return (err as NodeJS.ErrnoException).code !== "ESRCH"
  }
}

const waitForPidExit = async (
  pid: number,
  timeoutMs: number,
): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!isPidAlive(pid)) {
      return true
    }
    await new Promise((res) => setTimeout(res, 25))
  }
  return !isPidAlive(pid)
}

interface LspWsClient {
  readonly ws: NodeWS.WebSocket
  readonly request: (
    method: string,
    params?: unknown,
    includeNullParams?: boolean,
  ) => Promise<RpcMessage>
  readonly notify: (
    method: string,
    params?: unknown,
    includeNullParams?: boolean,
  ) => void
  readonly waitForNotification: (
    predicate: (msg: RpcMessage) => boolean,
    timeoutMs: number,
  ) => Promise<RpcMessage>
  readonly serverRequests: ReadonlyArray<RpcMessage>
  readonly close: () => void
  readonly terminate: () => void
}

const openLspWsClient = (url: string): Promise<LspWsClient> =>
  new Promise((resolve, reject) => {
    const ws = new NodeWS.WebSocket(url)
    let nextId = 1
    const pending = new Map<number, (msg: RpcMessage) => void>()
    const notifications: Array<RpcMessage> = []
    const serverRequests: Array<RpcMessage> = []
    const notificationWaiters: Array<{
      readonly predicate: (msg: RpcMessage) => boolean
      readonly resolve: (msg: RpcMessage) => void
    }> = []

    ws.on("message", (data) => {
      const text =
        typeof data === "string"
          ? data
          : Buffer.isBuffer(data)
            ? data.toString("utf8")
            : Array.isArray(data)
              ? Buffer.concat(data).toString("utf8")
              : Buffer.from(data).toString("utf8")
      const msg = JSON.parse(text) as RpcMessage

      if (typeof msg.id === "number" && msg.method === undefined) {
        const resolver = pending.get(msg.id)
        if (resolver) {
          pending.delete(msg.id)
          resolver(msg)
        }
        return
      }

      if (msg.method !== undefined && msg.id !== undefined) {
        serverRequests.push(msg)
        return
      }

      if (msg.method !== undefined) {
        notifications.push(msg)
        for (let i = notificationWaiters.length - 1; i >= 0; i--) {
          const waiter = notificationWaiters[i]!
          if (waiter.predicate(msg)) {
            notificationWaiters.splice(i, 1)
            waiter.resolve(msg)
          }
        }
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
        serverRequests,
        request: (method, params, includeNullParams = false) =>
          new Promise((res) => {
            const id = nextId++
            pending.set(id, res)
            const payload: Record<string, unknown> = {
              jsonrpc: "2.0",
              id,
              method,
            }
            if (params !== undefined) {
              payload.params = params
            } else if (includeNullParams) {
              payload.params = null
            }
            ws.send(JSON.stringify(payload))
          }),
        notify: (method, params, includeNullParams = false) => {
          const payload: Record<string, unknown> = {
            jsonrpc: "2.0",
            method,
          }
          if (params !== undefined) {
            payload.params = params
          } else if (includeNullParams) {
            payload.params = null
          }
          ws.send(JSON.stringify(payload))
        },
        waitForNotification: (predicate, timeoutMs) => {
          const existing = notifications.find(predicate)
          if (existing !== undefined) {
            return Promise.resolve(existing)
          }
          return new Promise((res, rej) => {
            const timer = setTimeout(() => {
              rej(
                new Error(
                  `Timed out after ${timeoutMs}ms waiting for LSP notification`,
                ),
              )
            }, timeoutMs)
            notificationWaiters.push({
              predicate,
              resolve: (msg) => {
                clearTimeout(timer)
                res(msg)
              },
            })
          })
        },
        close: () => {
          if (ws.readyState === NodeWS.WebSocket.OPEN) {
            ws.close()
          }
        },
        terminate: () => {
          ws.terminate()
        },
      })
    })
  })

describe("Live tsrs WebSocket smoke", () => {
  test(
    "delivers Effect TS377xxx diagnostics, Effect quickinfo, quirk parity, and clean process teardown",
    { timeout: 20_000 },
    async () => {
      const binaryPath = resolveTsrsBinary()
      const workspace = createLocalReadOnlyWorkspace()
      const spawnedPids: Array<number> = []

      try {
        await Effect.runPromise(
          Effect.scoped(
            Effect.gen(function* () {
              const stdioLayer = makeTsrsLspStdioLayer({
                binaryPath,
                workspaceDir: workspace.rootDir,
                onSpawn: (pid) => spawnedPids.push(pid),
              })

              const { url } = yield* startBridgeServer({
                port: 0,
                workspaceDir: workspace.rootDir,
              }).pipe(Effect.provide(stdioLayer))

              const client = yield* Effect.promise(() => openLspWsClient(url))

              const initRes = yield* Effect.promise(() =>
                client.request("initialize", {
                  processId: null,
                  rootUri: "file:///workspace",
                  capabilities: {
                    textDocument: {
                      hover: { contentFormat: ["markdown", "plaintext"] },
                      diagnostic: {},
                    },
                  },
                }),
              )
              assert.isUndefined(initRes.error)
              assert.isDefined(initRes.result)

              client.notify("initialized", {})

              const source = [
                'import { Effect } from "effect"',
                "",
                "export const program = Effect.gen(function* () {",
                "  Effect.succeed(42)",
                '  return yield* Effect.succeed("ok")',
                "})",
                "",
              ].join("\n")

              client.notify("textDocument/didOpen", {
                textDocument: {
                  uri: "file:///workspace/main.ts",
                  languageId: "typescript",
                  version: 1,
                  text: source,
                },
              })

              // Verify synthesized pull-to-push Effect TS377xxx diagnostic
              const diagNotification = yield* Effect.promise(() =>
                client.waitForNotification((msg) => {
                  if (msg.method !== "textDocument/publishDiagnostics") {
                    return false
                  }
                  const params = msg.params as {
                    uri?: string
                    diagnostics?: ReadonlyArray<{ code?: unknown }>
                  }
                  return (
                    params.uri === "file:///workspace/main.ts" &&
                    Array.isArray(params.diagnostics) &&
                    params.diagnostics.length > 0
                  )
                }, 15_000),
              )

              const diagnostics = (
                diagNotification.params as {
                  diagnostics: ReadonlyArray<{
                    code?: unknown
                    message?: string
                  }>
                }
              ).diagnostics
              assert.isTrue(
                diagnostics.some((d) => String(d.code).includes("377")),
                `Expected Effect TS377xxx diagnostic, got: ${JSON.stringify(diagnostics)}`,
              )

              // Verify Effect quickinfo hover
              const hoverRes = yield* Effect.promise(() =>
                client.request("textDocument/hover", {
                  textDocument: { uri: "file:///workspace/main.ts" },
                  position: { line: 2, character: 15 },
                }),
              )
              assert.isUndefined(hoverRes.error)
              const hoverText = JSON.stringify(hoverRes.result)
              assert.isTrue(
                hoverText.includes("Effect"),
                `Expected Effect quickinfo in hover, got: ${hoverText}`,
              )

              // Verify quirk parity: no client/registerCapability leaked to client
              assert.isFalse(
                client.serverRequests.some(
                  (req) => req.method === "client/registerCapability",
                ),
              )

              // Verify quirk parity: shutdown/exit with params: null succeed cleanly
              const shutdownRes = yield* Effect.promise(() =>
                client.request("shutdown", undefined, true),
              )
              assert.isUndefined(shutdownRes.error)
              client.notify("exit", undefined, true)
              client.close()
            }),
          ).pipe(
            Effect.provide(
              NodeChildProcessSpawner.layer.pipe(
                Layer.provide(NodeServices.layer),
              ),
            ),
          ),
        )

        assert.isAtLeast(spawnedPids.length, 1)
        for (const pid of spawnedPids) {
          const exited = await waitForPidExit(pid, 5_000)
          assert.isTrue(exited, `tsrs process ${pid} leaked after disconnect`)
        }
      } finally {
        workspace.cleanup()
      }
    },
  )

  test(
    "kills tsrs child process cleanly with zero leaked PIDs on abrupt WebSocket disconnect",
    { timeout: 20_000 },
    async () => {
      const binaryPath = resolveTsrsBinary()
      const workspace = createLocalReadOnlyWorkspace()
      const spawnedPids: Array<number> = []

      try {
        await Effect.runPromise(
          Effect.scoped(
            Effect.gen(function* () {
              const stdioLayer = makeTsrsLspStdioLayer({
                binaryPath,
                workspaceDir: workspace.rootDir,
                onSpawn: (pid) => spawnedPids.push(pid),
              })

              const { url } = yield* startBridgeServer({
                port: 0,
                workspaceDir: workspace.rootDir,
              }).pipe(Effect.provide(stdioLayer))

              const client = yield* Effect.promise(() => openLspWsClient(url))
              const initRes = yield* Effect.promise(() =>
                client.request("initialize", {
                  processId: null,
                  rootUri: "file:///workspace",
                  capabilities: {},
                }),
              )
              assert.isUndefined(initRes.error)
              assert.strictEqual(spawnedPids.length, 1)
              assert.isTrue(isPidAlive(spawnedPids[0]!))

              // Abruptly sever the WebSocket without shutdown/exit
              client.terminate()

              // Even while the server stays running, the disconnected session's tsrs PID must exit
              const exited = yield* Effect.promise(() =>
                waitForPidExit(spawnedPids[0]!, 5_000),
              )
              assert.isTrue(
                exited,
                `tsrs process ${spawnedPids[0]} leaked after abrupt disconnect`,
              )
            }),
          ).pipe(
            Effect.provide(
              NodeChildProcessSpawner.layer.pipe(
                Layer.provide(NodeServices.layer),
              ),
            ),
          ),
        )
      } finally {
        workspace.cleanup()
      }
    },
  )

  test(
    "resolves cross-file imports, definition jumps, and live cross-file diagnostics across in-memory didOpen files",
    { timeout: 20_000 },
    async () => {
      const binaryPath = resolveTsrsBinary()
      const workspace = createLocalReadOnlyWorkspace()

      try {
        await Effect.runPromise(
          Effect.scoped(
            Effect.gen(function* () {
              const stdioLayer = makeTsrsLspStdioLayer({
                binaryPath,
                workspaceDir: workspace.rootDir,
              })

              const { url } = yield* startBridgeServer({
                port: 0,
                workspaceDir: workspace.rootDir,
              }).pipe(Effect.provide(stdioLayer))

              const client = yield* Effect.promise(() => openLspWsClient(url))
              const initRes = yield* Effect.promise(() =>
                client.request("initialize", {
                  processId: null,
                  rootUri: "file:///workspace",
                  capabilities: {},
                }),
              )
              assert.isUndefined(initRes.error)
              client.notify("initialized", {})

              const greeterUri = "file:///workspace/src/greeter.ts"
              const mainUri = "file:///workspace/src/main.ts"

              client.notify("textDocument/didOpen", {
                textDocument: {
                  uri: greeterUri,
                  languageId: "typescript",
                  version: 1,
                  text: [
                    'import { Effect } from "effect"',
                    "export const greet = (name: string) => Effect.succeed(`Hello, ${name}!`)",
                    "",
                  ].join("\n"),
                },
              })

              client.notify("textDocument/didOpen", {
                textDocument: {
                  uri: mainUri,
                  languageId: "typescript",
                  version: 1,
                  text: [
                    'import { Effect } from "effect"',
                    'import { greet } from "./greeter.ts"',
                    'export const program = greet("Effect")',
                    "",
                  ].join("\n"),
                },
              })

              // Definition on `greet` in src/main.ts resolves to rewritten virtual URI src/greeter.ts
              const defRes = yield* Effect.promise(() =>
                client.request("textDocument/definition", {
                  textDocument: { uri: mainUri },
                  position: { line: 2, character: 25 },
                }),
              )
              assert.isUndefined(defRes.error)
              assert.include(JSON.stringify(defRes.result), greeterUri)

              // Edit greeter.ts to require a number -> cross-file pull must push TS2345 on src/main.ts
              client.notify("textDocument/didChange", {
                textDocument: { uri: greeterUri, version: 2 },
                contentChanges: [
                  {
                    text: [
                      'import { Effect } from "effect"',
                      "export const greet = (count: number) => Effect.succeed(count)",
                      "",
                    ].join("\n"),
                  },
                ],
              })

              const mainDiag = yield* Effect.promise(() =>
                client.waitForNotification((msg) => {
                  if (msg.method !== "textDocument/publishDiagnostics") {
                    return false
                  }
                  const params = msg.params as {
                    uri?: string
                    diagnostics?: ReadonlyArray<{ code?: unknown }>
                  }
                  return (
                    params.uri === mainUri &&
                    Array.isArray(params.diagnostics) &&
                    params.diagnostics.some((d) => String(d.code) === "2345")
                  )
                }, 15_000),
              )
              assert.isDefined(mainDiag)

              client.close()
            }),
          ).pipe(
            Effect.provide(
              NodeChildProcessSpawner.layer.pipe(
                Layer.provide(NodeServices.layer),
              ),
            ),
          ),
        )
      } finally {
        workspace.cleanup()
      }
    },
  )
})
