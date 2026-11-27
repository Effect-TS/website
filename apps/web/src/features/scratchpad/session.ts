import { LSPClient, type LSPClientConfig } from "@codemirror/lsp-client"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import type * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Random from "effect/Random"
import type * as AsyncResult from "effect/reactivity/AsyncResult"
import * as Atom from "effect/reactivity/Atom"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import * as Stream from "effect/Stream"
import { createCachedLspTransport } from "./cache.ts"
import {
  LspTransport,
  type TransportFatalError,
  type TransportLoadPhase,
  type TransportRecovery,
} from "./transport.ts"

export const LSP_CLIENT_TIMEOUT_MS = 10_000
export const RECONNECT_BASE_DELAY_MS = 500
export const RECONNECT_FACTOR = 2
export const RECONNECT_MAX_DELAY_MS = 10_000
export const RECONNECT_MAX_ATTEMPTS = 5
/** How long the status shows a crash recovery before returning to `ready`. */
export const RECOVERED_NOTICE_MS = 8_000

/**
 * `unreachable`: the language server never finished `initialize` within the
 * retry budget. `crashed`: the in-browser server failed for good.
 */
export type LspErrorCode = "unreachable" | "crashed"

/**
 * `loading` while the worker's assets download, compile and start, and
 * `recovered` for a while after the server crashed and was restarted in place
 * (the session stays usable throughout).
 */
export type LspStatus =
  | { readonly _tag: "connecting" }
  | {
      readonly _tag: "loading"
      readonly phase: TransportLoadPhase
      readonly loadedBytes: number
      readonly totalBytes: number
    }
  | { readonly _tag: "ready" }
  | { readonly _tag: "recovered"; readonly recovery: TransportRecovery }
  | {
      readonly _tag: "reconnecting"
      readonly attempt: number
      readonly maxAttempts: number
    }
  | {
      readonly _tag: "error"
      readonly code: LspErrorCode
      readonly message: string
      readonly retryable: boolean
    }

export interface BackoffPolicy {
  readonly baseDelayMs: number
  readonly factor: number
  readonly maxDelayMs: number
  readonly maxAttempts: number
}

export const DEFAULT_BACKOFF_POLICY: BackoffPolicy = {
  baseDelayMs: RECONNECT_BASE_DELAY_MS,
  factor: RECONNECT_FACTOR,
  maxDelayMs: RECONNECT_MAX_DELAY_MS,
  maxAttempts: RECONNECT_MAX_ATTEMPTS,
}

/**
 * Computes jittered exponential backoff delay in milliseconds for a 1-based
 * retry attempt. Uses equal jitter in `[0.5 * raw, raw]` so delays are always
 * positive, jittered, and strictly bounded by `policy.maxDelayMs`.
 */
export const computeBackoffDelayMs = (
  attempt: number,
  randomUnit: number,
  policy: BackoffPolicy = DEFAULT_BACKOFF_POLICY,
): number => {
  const exponent = Math.max(0, attempt - 1)
  const raw = Math.min(
    policy.maxDelayMs,
    policy.baseDelayMs * Math.pow(policy.factor, exponent),
  )
  const clampedUnit = Math.min(1, Math.max(0, randomUnit))
  return Math.max(1, Math.round(raw * (0.5 + 0.5 * clampedUnit)))
}

type SessionCommand =
  | { readonly _tag: "TransportConnected"; readonly connectionId: number }
  | {
      readonly _tag: "TransportDisconnected"
      readonly error: TransportFatalError
    }
  | {
      readonly _tag: "TransportLoading"
      readonly phase: TransportLoadPhase
      readonly loadedBytes: number
      readonly totalBytes: number
    }
  | {
      readonly _tag: "TransportRecovered"
      readonly recovery: TransportRecovery
    }
  | { readonly _tag: "RecoveredNoticeElapsed"; readonly token: number }
  | { readonly _tag: "InitSucceeded"; readonly connectionId: number }
  | {
      readonly _tag: "InitFailed"
      readonly connectionId: number
      readonly reason: string
    }
  | { readonly _tag: "BackoffElapsed"; readonly token: number }
  | { readonly _tag: "ManualReconnect" }

export interface ScratchpadSessionConfig {
  readonly transportLayer: Layer.Layer<LspTransport>
  readonly rootUri?: string
  readonly clientTimeoutMs?: number
  readonly baseDelayMs?: number
  readonly factor?: number
  readonly maxDelayMs?: number
  readonly maxAttempts?: number
  readonly recoveredNoticeMs?: number
  readonly idleTTL?: Duration.Input
  readonly lspClientConfig?: Omit<LSPClientConfig, "timeout" | "rootUri">
}

export interface ScratchpadSession {
  readonly runtime: Atom.AtomRuntime<LspTransport>
  readonly statusAtom: Atom.Writable<LspStatus>
  readonly clientAtom: Atom.Atom<AsyncResult.AsyncResult<LSPClient>>
  readonly reconnectAtom: Atom.AtomResultFn<void, void>
  readonly replayIncoming: (raw: string) => void
}

export const makeScratchpadSession = (
  config: ScratchpadSessionConfig,
): ScratchpadSession => {
  const clientTimeoutMs = config.clientTimeoutMs ?? LSP_CLIENT_TIMEOUT_MS
  const backoffPolicy: BackoffPolicy = {
    baseDelayMs: config.baseDelayMs ?? RECONNECT_BASE_DELAY_MS,
    factor: config.factor ?? RECONNECT_FACTOR,
    maxDelayMs: config.maxDelayMs ?? RECONNECT_MAX_DELAY_MS,
    maxAttempts: config.maxAttempts ?? RECONNECT_MAX_ATTEMPTS,
  }
  const recoveredNoticeMs = config.recoveredNoticeMs ?? RECOVERED_NOTICE_MS

  const runtime = Atom.runtime(config.transportLayer).pipe(
    Atom.setIdleTTL(config.idleTTL ?? "2 seconds"),
  )

  const statusAtom = Atom.make<LspStatus>({ _tag: "connecting" }).pipe(
    Atom.keepAlive,
  )

  let activeCommands: Queue.Queue<SessionCommand> | undefined
  let activeReplayIncoming: ((raw: string) => void) | undefined

  const clientAtom = runtime.atom(
    Effect.fnUntraced(function* () {
      const registry = yield* AtomRegistry.AtomRegistry
      const lspTransport = yield* LspTransport
      const cachedTransport = createCachedLspTransport(lspTransport.transport)
      const commands = yield* Queue.unbounded<SessionCommand>()
      activeCommands = commands
      activeReplayIncoming = cachedTransport.replayIncoming

      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          if (activeCommands === commands) {
            activeCommands = undefined
            activeReplayIncoming = undefined
          }
        }),
      )

      const client = yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new LSPClient({
              ...config.lspClientConfig,
              ...(config.rootUri !== undefined
                ? { rootUri: config.rootUri }
                : {}),
              timeout: clientTimeoutMs,
            }),
        ),
        (c) =>
          Effect.sync(() => {
            c.initializing.catch(() => {})
            c.disconnect()
          }),
      )

      let currentStatus: LspStatus = { _tag: "connecting" }
      let consecutiveAttempts = 0
      let activeConnectionId = -1
      let backoffToken = 0
      let initFiber: Fiber.Fiber<void, never> | undefined
      let backoffFiber: Fiber.Fiber<void, never> | undefined
      let noticeToken = 0

      const setStatus = (next: LspStatus) => {
        currentStatus = next
        registry.set(statusAtom, next)
      }

      const cancelInit = Effect.gen(function* () {
        const fiber = initFiber
        initFiber = undefined
        if (fiber !== undefined) {
          yield* Fiber.interrupt(fiber)
        }
      })

      const cancelBackoff = Effect.gen(function* () {
        backoffToken += 1
        const fiber = backoffFiber
        backoffFiber = undefined
        if (fiber !== undefined) {
          yield* Fiber.interrupt(fiber)
        }
      })

      const disconnectClient = Effect.sync(() => {
        client.initializing.catch(() => {})
        client.disconnect()
      })

      const triggerReconnect = Effect.gen(function* () {
        yield* cancelInit
        yield* cancelBackoff
        consecutiveAttempts = 0
        setStatus({ _tag: "connecting" })
        yield* lspTransport.reconnect
      })

      const scheduleRetry = (errorCode: LspErrorCode, message: string) =>
        Effect.gen(function* () {
          yield* cancelBackoff
          consecutiveAttempts += 1
          if (consecutiveAttempts > backoffPolicy.maxAttempts) {
            setStatus({
              _tag: "error",
              code: errorCode,
              message,
              retryable: true,
            })
            return
          }

          setStatus({
            _tag: "reconnecting",
            attempt: consecutiveAttempts,
            maxAttempts: backoffPolicy.maxAttempts,
          })

          const randomUnit = yield* Random.next
          const delayMs = computeBackoffDelayMs(
            consecutiveAttempts,
            randomUnit,
            backoffPolicy,
          )
          const token = ++backoffToken

          backoffFiber = yield* Effect.sleep(Duration.millis(delayMs)).pipe(
            Effect.andThen(
              Queue.offer(commands, { _tag: "BackoffElapsed", token }),
            ),
            Effect.asVoid,
            Effect.forkScoped,
          )
        })

      // Forward transport events into the serialized command queue.
      yield* lspTransport.events.pipe(
        Stream.runForEach((ev) => {
          switch (ev._tag) {
            case "Connected":
              return Queue.offer(commands, {
                _tag: "TransportConnected",
                connectionId: ev.connectionId,
              })
            case "Disconnected":
              return Queue.offer(commands, {
                _tag: "TransportDisconnected",
                error: ev.error,
              })
            case "Loading":
              return Queue.offer(commands, {
                _tag: "TransportLoading",
                phase: ev.phase,
                loadedBytes: ev.loadedBytes,
                totalBytes: ev.totalBytes,
              })
            case "Recovered":
              return Queue.offer(commands, {
                _tag: "TransportRecovered",
                recovery: ev.recovery,
              })
          }
        }),
        Effect.forkScoped,
      )

      // Serialized session state machine loop.
      yield* Effect.forever(
        Effect.gen(function* () {
          const cmd = yield* Queue.take(commands)

          switch (cmd._tag) {
            case "TransportConnected": {
              activeConnectionId = cmd.connectionId
              yield* cancelInit
              yield* cancelBackoff

              // Attach fresh LSPClient handshake to the newly opened transport.
              // Transport has already cleared any pending outbound frames so
              // `initialize` is always the first frame sent.
              yield* disconnectClient
              cachedTransport.resetPending()
              client.connect(cachedTransport.transport)

              const connId = cmd.connectionId
              const initPromise = client.initializing
              initPromise.catch(() => {})

              initFiber = yield* Effect.tryPromise({
                try: () => initPromise,
                catch: (err) =>
                  err instanceof Error ? err.message : String(err),
              }).pipe(
                Effect.timeout(Duration.millis(clientTimeoutMs)),
                Effect.matchEffect({
                  onSuccess: () =>
                    Queue.offer(commands, {
                      _tag: "InitSucceeded",
                      connectionId: connId,
                    }),
                  onFailure: (err) =>
                    Queue.offer(commands, {
                      _tag: "InitFailed",
                      connectionId: connId,
                      reason:
                        typeof err === "string"
                          ? err
                          : err instanceof Error
                            ? err.message
                            : "LSP initialization timed out.",
                    }),
                }),
                Effect.asVoid,
                Effect.forkScoped,
              )
              break
            }

            case "InitSucceeded": {
              if (cmd.connectionId !== activeConnectionId) break
              initFiber = undefined
              consecutiveAttempts = 0
              setStatus({ _tag: "ready" })
              break
            }

            case "InitFailed": {
              if (cmd.connectionId !== activeConnectionId) break
              initFiber = undefined
              activeConnectionId = -1
              yield* disconnectClient
              // Stop the current server before entering retry backoff.
              yield* lspTransport.disconnect
              yield* scheduleRetry("unreachable", cmd.reason)
              break
            }

            case "TransportDisconnected": {
              yield* cancelInit
              activeConnectionId = -1
              yield* disconnectClient

              // The in-browser server is gone for good: no backoff, a retry
              // starts it over.
              yield* cancelBackoff
              consecutiveAttempts = 0
              noticeToken += 1
              setStatus({
                _tag: "error",
                code: "crashed",
                message: cmd.error.message,
                retryable: true,
              })
              break
            }

            case "TransportLoading": {
              if (
                currentStatus._tag === "connecting" ||
                currentStatus._tag === "loading"
              ) {
                setStatus({
                  _tag: "loading",
                  phase: cmd.phase,
                  loadedBytes: cmd.loadedBytes,
                  totalBytes: cmd.totalBytes,
                })
              }
              break
            }

            case "TransportRecovered": {
              if (
                currentStatus._tag !== "ready" &&
                currentStatus._tag !== "recovered"
              ) {
                break
              }
              setStatus({ _tag: "recovered", recovery: cmd.recovery })
              const token = ++noticeToken
              yield* Effect.sleep(Duration.millis(recoveredNoticeMs)).pipe(
                Effect.andThen(
                  Queue.offer(commands, {
                    _tag: "RecoveredNoticeElapsed",
                    token,
                  }),
                ),
                Effect.asVoid,
                Effect.forkScoped,
              )
              break
            }

            case "RecoveredNoticeElapsed": {
              if (
                cmd.token === noticeToken &&
                currentStatus._tag === "recovered"
              ) {
                setStatus({ _tag: "ready" })
              }
              break
            }

            case "BackoffElapsed": {
              if (cmd.token !== backoffToken) break
              backoffFiber = undefined
              yield* lspTransport.reconnect
              break
            }

            case "ManualReconnect": {
              if (currentStatus._tag === "error" && currentStatus.retryable) {
                yield* triggerReconnect
              }
              break
            }
          }
        }),
      ).pipe(Effect.forkScoped)

      // Allow the transport event subscriber fiber to attach before dialing.
      yield* Effect.yieldNow
      setStatus({ _tag: "connecting" })
      yield* lspTransport.reconnect

      return client
    }),
  )

  const sendCommand = (cmd: SessionCommand) =>
    Effect.suspend(() =>
      activeCommands !== undefined
        ? Queue.offer(activeCommands, cmd).pipe(Effect.asVoid)
        : Effect.void,
    )

  const reconnectAtom = runtime.fn<void>()(
    Effect.fnUntraced(function* () {
      yield* sendCommand({ _tag: "ManualReconnect" })
    }),
  )

  return {
    runtime,
    statusAtom,
    clientAtom,
    reconnectAtom,
    replayIncoming: (raw: string) => {
      activeReplayIncoming?.(raw)
    },
  }
}
