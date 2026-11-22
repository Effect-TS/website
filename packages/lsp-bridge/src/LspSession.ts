import type * as Cause from "effect/Cause"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Queue from "effect/Queue"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import {
  decodeLspFrames,
  encodeLspFrame,
  type InvalidLspFrameError,
} from "./Framing.ts"
import {
  LspProcessExitedError,
  LspStdio,
  type LspProcessError,
} from "./LspStdio.ts"
import { transformClientToServer, transformServerToClient } from "./Quirks.ts"

export const BRIDGE_REQUEST_ID_PREFIX = "bridge:"
export const DIAGNOSTIC_DEBOUNCE_MS = 150
export const CROSS_FILE_DIAGNOSTIC_DEBOUNCE_MS = 400

export type LspSessionError =
  | InvalidLspFrameError
  | LspProcessError
  | LspProcessExitedError

export interface LspSession {
  readonly send: (message: string) => Effect.Effect<void, LspSessionError>
  readonly incoming: Stream.Stream<string, LspSessionError>
  readonly awaitExit: Effect.Effect<void, LspSessionError>
}

interface PendingDiagnosticPull {
  readonly uri: string
  readonly version?: number | undefined
}

const isBridgeRequestId = (id: unknown): id is string =>
  typeof id === "string" && id.startsWith(BRIDGE_REQUEST_ID_PREFIX)

export const openLspSession = (): Effect.Effect<
  LspSession,
  LspProcessError,
  LspStdio | Scope.Scope
> =>
  Effect.gen(function* () {
    const scope = yield* Scope.Scope
    const stdio = yield* LspStdio
    const proc = yield* stdio.spawn

    const stdinQueue = yield* Queue.unbounded<Uint8Array, Cause.Done>()
    const clientOutQueue = yield* Queue.unbounded<
      string,
      LspSessionError | Cause.Done
    >()
    const exitDeferred = yield* Deferred.make<void, LspSessionError>()

    let nextBridgeId = 1
    let failure: LspSessionError | undefined
    const pendingPulls = new Map<string, PendingDiagnosticPull>()
    const activePullIdByUri = new Map<string, string>()
    const debounceFiberByUri = new Map<string, Fiber.Fiber<void, never>>()
    const openDocuments = new Map<string, number | undefined>()
    let crossFileDebounceFiber: Fiber.Fiber<void, never> | undefined

    const cancelCrossFileDebounce = Effect.gen(function* () {
      const fiber = crossFileDebounceFiber
      crossFileDebounceFiber = undefined
      if (fiber !== undefined) {
        yield* Fiber.interrupt(fiber)
      }
    })

    const failSession = (error: LspSessionError): Effect.Effect<void> =>
      Effect.gen(function* () {
        if (failure !== undefined) {
          return
        }
        failure = error

        yield* cancelCrossFileDebounce
        const fibers = Array.from(debounceFiberByUri.values())
        debounceFiberByUri.clear()
        pendingPulls.clear()
        activePullIdByUri.clear()
        openDocuments.clear()
        for (const fiber of fibers) {
          yield* Fiber.interrupt(fiber)
        }

        yield* Queue.end(stdinQueue)
        yield* Queue.fail(clientOutQueue, error)
        yield* Deferred.fail(exitDeferred, error)
      }).pipe(Effect.asVoid)

    const writeToServer = (json: string): Effect.Effect<void> =>
      Queue.offer(stdinQueue, encodeLspFrame(json)).pipe(Effect.asVoid)

    const cancelPendingForUri = (uri: string): Effect.Effect<void> =>
      Effect.gen(function* () {
        const existingFiber = debounceFiberByUri.get(uri)
        if (existingFiber !== undefined) {
          debounceFiberByUri.delete(uri)
          yield* Fiber.interrupt(existingFiber)
        }

        const inFlightId = activePullIdByUri.get(uri)
        if (inFlightId !== undefined) {
          activePullIdByUri.delete(uri)
          pendingPulls.delete(inFlightId)
          yield* writeToServer(
            JSON.stringify({
              jsonrpc: "2.0",
              method: "$/cancelRequest",
              params: { id: inFlightId },
            }),
          )
        }
      })

    const triggerDiagnosticPull = (
      uri: string,
      version: number | undefined,
    ): Effect.Effect<void> =>
      Effect.suspend(() => {
        if (failure !== undefined) {
          return Effect.void
        }
        const id = `${BRIDGE_REQUEST_ID_PREFIX}diag:${nextBridgeId++}`
        pendingPulls.set(id, { uri, version })
        activePullIdByUri.set(uri, id)
        return writeToServer(
          JSON.stringify({
            jsonrpc: "2.0",
            id,
            method: "textDocument/diagnostic",
            params: { textDocument: { uri } },
          }),
        )
      })

    const scheduleDebouncedDiagnosticPull = (
      uri: string,
      version: number | undefined,
    ): Effect.Effect<void> =>
      Effect.gen(function* () {
        yield* cancelPendingForUri(uri)
        const fiber = yield* Effect.sleep(
          `${DIAGNOSTIC_DEBOUNCE_MS} millis`,
        ).pipe(
          Effect.andThen(
            Effect.sync(() => {
              debounceFiberByUri.delete(uri)
            }),
          ),
          Effect.andThen(triggerDiagnosticPull(uri, version)),
          Effect.forkIn(scope),
        )
        debounceFiberByUri.set(uri, fiber)
      })

    const scheduleCrossFileDiagnosticPull = (
      excludeUri?: string,
    ): Effect.Effect<void> =>
      Effect.gen(function* () {
        yield* cancelCrossFileDebounce
        if (
          openDocuments.size === 0 ||
          (excludeUri !== undefined &&
            openDocuments.size === 1 &&
            openDocuments.has(excludeUri))
        ) {
          return
        }
        const fiber = yield* Effect.sleep(
          `${CROSS_FILE_DIAGNOSTIC_DEBOUNCE_MS} millis`,
        ).pipe(
          Effect.andThen(
            Effect.gen(function* () {
              crossFileDebounceFiber = undefined
              for (const [docUri, docVersion] of openDocuments.entries()) {
                if (docUri === excludeUri) continue
                if (debounceFiberByUri.has(docUri)) continue
                yield* cancelPendingForUri(docUri)
                yield* triggerDiagnosticPull(docUri, docVersion)
              }
            }),
          ),
          Effect.forkIn(scope),
        )
        crossFileDebounceFiber = fiber
      })

    // Drain stderr to structured server logs so pipe buffers never stall
    const stderrFiber = yield* proc.stderr.pipe(
      Stream.decodeText(),
      Stream.splitLines,
      Stream.runForEach((line) =>
        line.trim().length === 0
          ? Effect.void
          : Effect.logWarning(line).pipe(
              Effect.annotateLogs({
                component: "lsp-bridge",
                stream: "stderr",
              }),
            ),
      ),
      Effect.ignore,
      Effect.forkScoped,
    )

    // Pump framed messages into child stdin
    yield* Stream.fromQueue(stdinQueue).pipe(
      Stream.run(proc.stdin),
      Effect.catch((error) => failSession(error)),
      Effect.forkScoped,
    )

    // Pump child stdout -> decode frames -> absorb quirks & pull-to-push -> clientOutQueue
    const stdoutFiber = yield* decodeLspFrames(proc.stdout).pipe(
      Stream.runForEach((raw) =>
        Effect.gen(function* () {
          const outcome = transformServerToClient(raw)
          if (outcome._tag === "InterceptAndReply") {
            yield* writeToServer(outcome.replyPayload)
            return
          }

          let parsed:
            | {
                readonly id?: unknown
                readonly method?: unknown
                readonly params?: {
                  readonly diagnostics?: unknown
                }
                readonly result?: {
                  readonly kind?: unknown
                  readonly items?: unknown
                }
                readonly error?: unknown
              }
            | undefined

          try {
            const value: unknown = JSON.parse(outcome.payload)
            if (typeof value === "object" && value !== null) {
              parsed = value as typeof parsed
            }
          } catch {
            // Non-JSON payload forwarded as-is
          }

          if (parsed !== undefined) {
            // Never leak bridge-namespaced responses to the client
            if (isBridgeRequestId(parsed.id)) {
              const pending = pendingPulls.get(parsed.id)
              pendingPulls.delete(parsed.id)
              if (
                pending !== undefined &&
                activePullIdByUri.get(pending.uri) === parsed.id
              ) {
                activePullIdByUri.delete(pending.uri)
              }
              if (pending !== undefined && parsed.error === undefined) {
                const items = Array.isArray(parsed.result?.items)
                  ? parsed.result.items
                  : []
                const pushNotification = JSON.stringify({
                  jsonrpc: "2.0",
                  method: "textDocument/publishDiagnostics",
                  params: {
                    uri: pending.uri,
                    ...(pending.version !== undefined
                      ? { version: pending.version }
                      : {}),
                    diagnostics: items,
                  },
                })
                yield* Queue.offer(clientOutQueue, pushNotification).pipe(
                  Effect.asVoid,
                )
              }
              return
            }

            // Drop empty server publishDiagnostics notifications to avoid flicker
            if (
              parsed.method === "textDocument/publishDiagnostics" &&
              Array.isArray(parsed.params?.diagnostics) &&
              parsed.params.diagnostics.length === 0
            ) {
              return
            }
          }

          yield* Queue.offer(clientOutQueue, outcome.payload).pipe(
            Effect.asVoid,
          )
        }),
      ),
      Effect.catch((error) => failSession(error)),
      Effect.forkScoped,
    )

    // Watch child process exit and fail the session cleanly after draining stderr/stdout
    yield* proc.exitCode.pipe(
      Effect.flatMap((exitCode) =>
        Effect.gen(function* () {
          yield* Fiber.await(stderrFiber)
          yield* Fiber.await(stdoutFiber)
          yield* failSession(new LspProcessExitedError({ exitCode }))
        }),
      ),
      Effect.catch((error) => failSession(error)),
      Effect.forkScoped,
    )

    yield* Effect.addFinalizer(() =>
      Effect.all([
        Queue.end(stdinQueue),
        Queue.end(clientOutQueue),
        Deferred.succeed(exitDeferred, undefined),
      ]).pipe(Effect.asVoid),
    )

    const send = (message: string): Effect.Effect<void, LspSessionError> =>
      Effect.gen(function* () {
        if (failure !== undefined) {
          return yield* Effect.fail(failure)
        }

        const transformed = transformClientToServer(message)
        yield* writeToServer(transformed.payload)

        let parsed:
          | {
              readonly method?: unknown
              readonly params?: {
                readonly textDocument?: {
                  readonly uri?: unknown
                  readonly version?: unknown
                }
              }
            }
          | undefined

        try {
          const value: unknown = JSON.parse(transformed.payload)
          if (typeof value === "object" && value !== null) {
            parsed = value as typeof parsed
          }
        } catch {
          // Non-JSON messages are ignored for pull synthesis
        }

        const uri = parsed?.params?.textDocument?.uri
        if (typeof uri !== "string") {
          return
        }

        const version =
          typeof parsed?.params?.textDocument?.version === "number"
            ? parsed.params.textDocument.version
            : undefined

        if (parsed?.method === "textDocument/didOpen") {
          openDocuments.set(uri, version)
          yield* cancelPendingForUri(uri)
          yield* triggerDiagnosticPull(uri, version)
          yield* scheduleCrossFileDiagnosticPull(uri)
        } else if (parsed?.method === "textDocument/didChange") {
          openDocuments.set(uri, version)
          yield* scheduleDebouncedDiagnosticPull(uri, version)
          yield* scheduleCrossFileDiagnosticPull(uri)
        } else if (parsed?.method === "textDocument/didClose") {
          openDocuments.delete(uri)
          yield* cancelPendingForUri(uri)
          yield* Queue.offer(
            clientOutQueue,
            JSON.stringify({
              jsonrpc: "2.0",
              method: "textDocument/publishDiagnostics",
              params: {
                uri,
                diagnostics: [],
              },
            }),
          ).pipe(Effect.asVoid)
          yield* scheduleCrossFileDiagnosticPull(uri)
        }
      })

    return {
      send,
      incoming: Stream.fromQueue(clientOutQueue),
      awaitExit: Deferred.await(exitDeferred),
    }
  })
