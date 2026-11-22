import * as Effect from "effect/Effect"
import * as Logger from "effect/Logger"
import * as Queue from "effect/Queue"
import * as References from "effect/References"
import * as Stream from "effect/Stream"
import { TestClock } from "effect/testing"
import { assert, describe, test } from "vite-plus/test"
import { openLspSession } from "../src/LspSession.ts"
import { makeFakeLspStdio } from "../src/LspStdio.ts"

describe("LspSession", () => {
  test("forwards JSON-RPC messages and answers client/registerCapability with null without forwarding to client", async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const fake = yield* makeFakeLspStdio()
          const session = yield* openLspSession().pipe(
            Effect.provide(fake.layer),
          )

          const received = yield* Queue.unbounded<unknown>()
          yield* session.incoming.pipe(
            Stream.runForEach((raw) =>
              Queue.offer(received, JSON.parse(raw)).pipe(Effect.asVoid),
            ),
            Effect.forkScoped,
          )

          // Client -> Server
          const initReq = {
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: { processId: null, rootUri: null, capabilities: {} },
          }
          yield* session.send(JSON.stringify(initReq))
          const stdinInit = yield* fake.takeStdinMessage
          assert.deepStrictEqual(stdinInit, initReq)

          // Server -> Client: client/registerCapability (must be intercepted)
          yield* fake.pushStdoutMessage({
            jsonrpc: "2.0",
            id: "reg-1",
            method: "client/registerCapability",
            params: { registrations: [] },
          })

          // Bridge must answer { result: null } on stdin
          const regReply = yield* fake.takeStdinMessage
          assert.deepStrictEqual(regReply, {
            jsonrpc: "2.0",
            id: "reg-1",
            result: null,
          })

          // Server -> Client: normal initialize response (must be forwarded)
          const initRes = {
            jsonrpc: "2.0",
            id: 1,
            result: { capabilities: {} },
          }
          yield* fake.pushStdoutMessage(initRes)

          // Client should only see initRes, never client/registerCapability
          const firstClientMsg = yield* Queue.take(received)
          assert.deepStrictEqual(firstClientMsg, initRes)
        }),
      ),
    )
  })

  test("strips params: null from shutdown and exit and forwards $/cancelRequest untouched", async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const fake = yield* makeFakeLspStdio()
          const session = yield* openLspSession().pipe(
            Effect.provide(fake.layer),
          )

          const cancelReq = {
            jsonrpc: "2.0",
            method: "$/cancelRequest",
            params: { id: 42 },
          }
          yield* session.send(JSON.stringify(cancelReq))
          assert.deepStrictEqual(yield* fake.takeStdinMessage, cancelReq)

          yield* session.send(
            JSON.stringify({
              jsonrpc: "2.0",
              id: 9,
              method: "shutdown",
              params: null,
            }),
          )
          assert.deepStrictEqual(yield* fake.takeStdinMessage, {
            jsonrpc: "2.0",
            id: 9,
            method: "shutdown",
          })

          yield* session.send(
            JSON.stringify({
              jsonrpc: "2.0",
              method: "exit",
              params: null,
            }),
          )
          assert.deepStrictEqual(yield* fake.takeStdinMessage, {
            jsonrpc: "2.0",
            method: "exit",
          })
        }),
      ),
    )
  })

  test("fires textDocument/diagnostic immediately on didOpen, drops empty server publishDiagnostics, and emits pull result as publishDiagnostics", async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const fake = yield* makeFakeLspStdio()
          const session = yield* openLspSession().pipe(
            Effect.provide(fake.layer),
          )

          const received = yield* Queue.unbounded<unknown>()
          yield* session.incoming.pipe(
            Stream.runForEach((raw) =>
              Queue.offer(received, JSON.parse(raw)).pipe(Effect.asVoid),
            ),
            Effect.forkScoped,
          )

          const uri = "file:///workspace/main.ts"
          const didOpen = {
            jsonrpc: "2.0",
            method: "textDocument/didOpen",
            params: {
              textDocument: {
                uri,
                languageId: "typescript",
                version: 1,
                text: "const x: number = 'oops'",
              },
            },
          }

          yield* session.send(JSON.stringify(didOpen))

          // Server gets didOpen, then immediately gets synthetic textDocument/diagnostic
          assert.deepStrictEqual(yield* fake.takeStdinMessage, didOpen)

          const pullReq = (yield* fake.takeStdinMessage) as {
            jsonrpc: string
            id: string
            method: string
            params: { textDocument: { uri: string } }
          }
          assert.strictEqual(pullReq.jsonrpc, "2.0")
          assert.strictEqual(pullReq.method, "textDocument/diagnostic")
          assert.isTrue(
            typeof pullReq.id === "string" && pullReq.id.startsWith("bridge:"),
          )
          assert.deepStrictEqual(pullReq.params, { textDocument: { uri } })

          // Server emits empty publishDiagnostics on open -> must be dropped
          yield* fake.pushStdoutMessage({
            jsonrpc: "2.0",
            method: "textDocument/publishDiagnostics",
            params: { uri, diagnostics: [] },
          })

          // Server responds to synthetic pull with a diagnostic
          const diag = {
            range: {
              start: { line: 0, character: 6 },
              end: { line: 0, character: 7 },
            },
            severity: 1,
            code: 2322,
            message: "Type 'string' is not assignable to type 'number'.",
          }
          yield* fake.pushStdoutMessage({
            jsonrpc: "2.0",
            id: pullReq.id,
            result: { kind: "full", items: [diag] },
          })

          // Client should receive only the synthesized publishDiagnostics
          const clientMsg = yield* Queue.take(received)
          assert.deepStrictEqual(clientMsg, {
            jsonrpc: "2.0",
            method: "textDocument/publishDiagnostics",
            params: {
              uri,
              version: 1,
              diagnostics: [diag],
            },
          })

          // No leaked bridge:... response or dropped empty notification
          const remaining = yield* Queue.clear(received)
          assert.deepStrictEqual(remaining, [])
        }),
      ),
    )
  })

  test("debounces didChange pulls by 150ms via TestClock, cancels in-flight synthetic pulls, and never leaks bridge IDs", async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const fake = yield* makeFakeLspStdio()
          const session = yield* openLspSession().pipe(
            Effect.provide(fake.layer),
          )

          const received = yield* Queue.unbounded<unknown>()
          yield* session.incoming.pipe(
            Stream.runForEach((raw) =>
              Queue.offer(received, JSON.parse(raw)).pipe(Effect.asVoid),
            ),
            Effect.forkScoped,
          )

          const uri = "file:///workspace/main.ts"

          // 1. didOpen fires immediate pull (in-flight)
          yield* session.send(
            JSON.stringify({
              jsonrpc: "2.0",
              method: "textDocument/didOpen",
              params: {
                textDocument: {
                  uri,
                  languageId: "typescript",
                  version: 1,
                  text: "const a = 1",
                },
              },
            }),
          )
          yield* fake.takeStdinMessage // didOpen
          const pull1 = (yield* fake.takeStdinMessage) as {
            id: string
            method: string
          }
          assert.strictEqual(pull1.method, "textDocument/diagnostic")
          assert.isTrue(pull1.id.startsWith("bridge:"))

          // 2. didChange v2 arrives while pull1 is in-flight -> must send $/cancelRequest
          yield* session.send(
            JSON.stringify({
              jsonrpc: "2.0",
              method: "textDocument/didChange",
              params: {
                textDocument: { uri, version: 2 },
                contentChanges: [{ text: "const a = 2" }],
              },
            }),
          )
          yield* fake.takeStdinMessage // didChange v2
          const cancelMsg = yield* fake.takeStdinMessage
          assert.deepStrictEqual(cancelMsg, {
            jsonrpc: "2.0",
            method: "$/cancelRequest",
            params: { id: pull1.id },
          })

          // 3. Advance 100ms (< 150ms) -> no pull yet
          yield* TestClock.adjust("100 millis")
          yield* Effect.yieldNow
          assert.deepStrictEqual(yield* fake.pollStdinMessages, [])

          // 4. Another didChange v3 resets the 150ms debounce timer
          yield* session.send(
            JSON.stringify({
              jsonrpc: "2.0",
              method: "textDocument/didChange",
              params: {
                textDocument: { uri, version: 3 },
                contentChanges: [{ text: "const a: number = 'bad'" }],
              },
            }),
          )
          yield* fake.takeStdinMessage // didChange v3

          // 5. Advance 100ms (200ms since v2, 100ms since v3) -> still no pull
          yield* TestClock.adjust("100 millis")
          yield* Effect.yieldNow
          assert.deepStrictEqual(yield* fake.pollStdinMessages, [])

          // 6. Advance final 50ms (150ms since v3) -> fires pull2
          yield* TestClock.adjust("50 millis")
          const pull2 = (yield* fake.takeStdinMessage) as {
            id: string
            method: string
            params: { textDocument: { uri: string } }
          }
          assert.strictEqual(pull2.method, "textDocument/diagnostic")
          assert.isTrue(pull2.id.startsWith("bridge:"))
          assert.notStrictEqual(pull2.id, pull1.id)

          // 7. Late cancelled response for pull1 must be swallowed and never leaked
          yield* fake.pushStdoutMessage({
            jsonrpc: "2.0",
            id: pull1.id,
            error: { code: -32800, message: "Request cancelled" },
          })

          // 8. Empty publishDiagnostics on change must be dropped
          yield* fake.pushStdoutMessage({
            jsonrpc: "2.0",
            method: "textDocument/publishDiagnostics",
            params: { uri, diagnostics: [] },
          })

          // 9. Response for pull2 emits publishDiagnostics with version 3
          const diag = {
            range: {
              start: { line: 0, character: 6 },
              end: { line: 0, character: 7 },
            },
            severity: 1,
            message: "Type error",
          }
          yield* fake.pushStdoutMessage({
            jsonrpc: "2.0",
            id: pull2.id,
            result: { kind: "full", items: [diag] },
          })

          const clientMsg = yield* Queue.take(received)
          assert.deepStrictEqual(clientMsg, {
            jsonrpc: "2.0",
            method: "textDocument/publishDiagnostics",
            params: {
              uri,
              version: 3,
              diagnostics: [diag],
            },
          })

          assert.deepStrictEqual(yield* Queue.clear(received), [])
        }),
      ).pipe(Effect.provide(TestClock.layer())),
    )
  })

  test("fails the session cleanly with InvalidLspFrameError on invalid stdout framing", async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const fake = yield* makeFakeLspStdio()
          const session = yield* openLspSession().pipe(
            Effect.provide(fake.layer),
          )

          yield* fake.pushStdout(Buffer.from("Invalid-Header: oops\r\n\r\n{}"))

          const streamErr = yield* session.incoming.pipe(
            Stream.runDrain,
            Effect.flip,
          )
          const exitErr = yield* Effect.flip(session.awaitExit)

          assert.strictEqual(streamErr._tag, "InvalidLspFrameError")
          assert.strictEqual(exitErr._tag, "InvalidLspFrameError")
        }),
      ),
    )
  })

  test("fails the session cleanly on child process exit and drains stderr to structured server logs", async () => {
    const logged: Array<{
      readonly message: unknown
      readonly annotations: Record<string, unknown>
    }> = []

    const testLogger = Logger.make(({ message, fiber }) => {
      const annotations: Record<string, unknown> = {
        ...fiber.getRef(References.CurrentLogAnnotations),
      }
      logged.push({ message, annotations })
    })

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const fake = yield* makeFakeLspStdio()
          const session = yield* openLspSession().pipe(
            Effect.provide(fake.layer),
          )

          yield* fake.pushStderr("tsrs warning: slow typecheck\n")
          yield* fake.pushStderr("tsrs fatal: out of memory\n")
          yield* fake.exit(137)

          const streamErr = yield* session.incoming.pipe(
            Stream.runDrain,
            Effect.flip,
          )
          const exitErr = yield* Effect.flip(session.awaitExit)

          assert.strictEqual(streamErr._tag, "LspProcessExitedError")
          if (streamErr._tag === "LspProcessExitedError") {
            assert.strictEqual(streamErr.exitCode, 137)
          }
          assert.strictEqual(exitErr._tag, "LspProcessExitedError")

          const stderrLogs = logged.filter(
            (entry) => entry.annotations.stream === "stderr",
          )
          assert.isAtLeast(stderrLogs.length, 2)
          assert.isTrue(
            stderrLogs.some((entry) =>
              String(entry.message).includes("tsrs warning: slow typecheck"),
            ),
          )
          assert.isTrue(
            stderrLogs.some((entry) =>
              String(entry.message).includes("tsrs fatal: out of memory"),
            ),
          )
        }),
      ).pipe(Effect.provide(Logger.layer([testLogger]))),
    )
  })
})
