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
import { LspTransport, type TransportError } from "./transport.ts"

export const LSP_CLIENT_TIMEOUT_MS = 10_000
export const MAX_DOC_BYTES = 256 * 1024
export const RECONNECT_BASE_DELAY_MS = 500
export const RECONNECT_FACTOR = 2
export const RECONNECT_MAX_DELAY_MS = 10_000
export const RECONNECT_MAX_ATTEMPTS = 5

export type LspErrorCode =
  | "capacity"
  | "doc-too-large"
  | "policy"
  | "unreachable"

export type LspStatus =
  | { readonly _tag: "connecting" }
  | { readonly _tag: "ready" }
  | {
      readonly _tag: "reconnecting"
      readonly attempt: number
      readonly maxAttempts: number
    }
  | { readonly _tag: "idle" }
  | {
      readonly _tag: "error"
      readonly code: LspErrorCode
      readonly message: string
      readonly retryable: boolean
    }

export type ExplicitWakeTrigger = "docChanged" | "focus" | "indicatorClick"
export type PassiveEvent =
  | "mousemove"
  | "pointermove"
  | "scroll"
  | "visibilitychange"
  | "passive"
export type WakeTrigger = ExplicitWakeTrigger | PassiveEvent

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

const textEncoder = new TextEncoder()

export const CLOSE_CODE_POLICY_VIOLATION = 1008
const CLOSE_CODE_MESSAGE_TOO_BIG = 1009
const CLOSE_CODE_TRY_AGAIN_LATER = 1013
const CLOSE_CODE_IDLE_EVICTION = 4000

export const utf8ByteLength = (text: string): number =>
  textEncoder.encode(text).byteLength

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

const isExplicitWakeTrigger = (
  trigger: WakeTrigger,
): trigger is ExplicitWakeTrigger =>
  trigger === "docChanged" ||
  trigger === "focus" ||
  trigger === "indicatorClick"

type SessionCommand =
  | { readonly _tag: "TransportConnected"; readonly connectionId: number }
  | { readonly _tag: "TransportDisconnected"; readonly error: TransportError }
  | { readonly _tag: "InitSucceeded"; readonly connectionId: number }
  | {
      readonly _tag: "InitFailed"
      readonly connectionId: number
      readonly reason: string
    }
  | { readonly _tag: "BackoffElapsed"; readonly token: number }
  | { readonly _tag: "ManualReconnect" }
  | { readonly _tag: "Wake"; readonly trigger: WakeTrigger }
  | { readonly _tag: "Online" }
  | { readonly _tag: "DocumentChanged"; readonly byteLength: number }

export interface ScratchpadSessionConfig {
  readonly transportLayer: Layer.Layer<LspTransport>
  readonly rootUri?: string
  readonly clientTimeoutMs?: number
  readonly maxDocBytes?: number
  readonly initialDocBytes?: number
  readonly baseDelayMs?: number
  readonly factor?: number
  readonly maxDelayMs?: number
  readonly maxAttempts?: number
  readonly idleTTL?: Duration.Input
  readonly lspClientConfig?: Omit<LSPClientConfig, "timeout" | "rootUri">
}

export interface ScratchpadSession {
  readonly runtime: Atom.AtomRuntime<LspTransport>
  readonly statusAtom: Atom.Writable<LspStatus>
  readonly clientAtom: Atom.Atom<AsyncResult.AsyncResult<LSPClient>>
  readonly reconnectAtom: Atom.AtomResultFn<void, void>
  readonly wakeAtom: Atom.AtomResultFn<WakeTrigger, void>
  readonly onlineAtom: Atom.AtomResultFn<void, void>
  readonly documentChangedAtom: Atom.AtomResultFn<string | number, void>
  readonly replayIncoming: (raw: string) => void
}

export const makeScratchpadSession = (
  config: ScratchpadSessionConfig,
): ScratchpadSession => {
  const clientTimeoutMs = config.clientTimeoutMs ?? LSP_CLIENT_TIMEOUT_MS
  const maxDocBytes = config.maxDocBytes ?? MAX_DOC_BYTES
  const backoffPolicy: BackoffPolicy = {
    baseDelayMs: config.baseDelayMs ?? RECONNECT_BASE_DELAY_MS,
    factor: config.factor ?? RECONNECT_FACTOR,
    maxDelayMs: config.maxDelayMs ?? RECONNECT_MAX_DELAY_MS,
    maxAttempts: config.maxAttempts ?? RECONNECT_MAX_ATTEMPTS,
  }

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
      let docByteLength = config.initialDocBytes ?? 0
      let initFiber: Fiber.Fiber<void, never> | undefined
      let backoffFiber: Fiber.Fiber<void, never> | undefined

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
        Stream.runForEach((ev) =>
          ev._tag === "Connected"
            ? Queue.offer(commands, {
                _tag: "TransportConnected",
                connectionId: ev.connectionId,
              })
            : Queue.offer(commands, {
                _tag: "TransportDisconnected",
                error: ev.error,
              }),
        ),
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
              // Close any still-open socket before entering retry backoff.
              yield* lspTransport.disconnect
              yield* scheduleRetry("unreachable", cmd.reason)
              break
            }

            case "TransportDisconnected": {
              yield* cancelInit
              activeConnectionId = -1
              yield* disconnectClient

              const err = cmd.error
              if (err._tag === "TransportClosedError") {
                if (err.code === CLOSE_CODE_IDLE_EVICTION) {
                  yield* cancelBackoff
                  consecutiveAttempts = 0
                  setStatus({ _tag: "idle" })
                  break
                }
                if (err.code === CLOSE_CODE_POLICY_VIOLATION) {
                  yield* cancelBackoff
                  consecutiveAttempts = 0
                  setStatus({
                    _tag: "error",
                    code: "policy",
                    message:
                      err.reason || "Connection rejected by server policy.",
                    retryable: false,
                  })
                  break
                }
                if (err.code === CLOSE_CODE_MESSAGE_TOO_BIG) {
                  yield* cancelBackoff
                  consecutiveAttempts = 0
                  setStatus({
                    _tag: "error",
                    code: "doc-too-large",
                    message:
                      err.reason || "Document exceeds the 256 KiB limit.",
                    retryable: docByteLength <= maxDocBytes,
                  })
                  break
                }
                if (err.code === CLOSE_CODE_TRY_AGAIN_LATER) {
                  yield* scheduleRetry(
                    "capacity",
                    err.reason || "Language server is at capacity.",
                  )
                  break
                }
                yield* scheduleRetry(
                  "unreachable",
                  err.reason || `Connection closed (${err.code}).`,
                )
                break
              }

              yield* scheduleRetry(
                "unreachable",
                err.message || "Unable to connect to language server.",
              )
              break
            }

            case "BackoffElapsed": {
              if (cmd.token !== backoffToken) break
              backoffFiber = undefined
              yield* lspTransport.reconnect
              break
            }

            case "ManualReconnect": {
              if (
                currentStatus._tag === "idle" ||
                (currentStatus._tag === "error" && currentStatus.retryable)
              ) {
                yield* triggerReconnect
              }
              break
            }

            case "Wake": {
              if (!isExplicitWakeTrigger(cmd.trigger)) break
              if (currentStatus._tag === "idle") {
                yield* triggerReconnect
              } else if (
                cmd.trigger === "indicatorClick" &&
                currentStatus._tag === "error" &&
                currentStatus.retryable
              ) {
                yield* triggerReconnect
              }
              break
            }

            case "Online": {
              if (
                (currentStatus._tag === "error" && currentStatus.retryable) ||
                currentStatus._tag === "reconnecting"
              ) {
                yield* triggerReconnect
              }
              break
            }

            case "DocumentChanged": {
              docByteLength = cmd.byteLength
              if (
                currentStatus._tag === "error" &&
                currentStatus.code === "doc-too-large"
              ) {
                const retryable = docByteLength <= maxDocBytes
                if (retryable !== currentStatus.retryable) {
                  setStatus({
                    ...currentStatus,
                    retryable,
                  })
                }
              } else if (currentStatus._tag === "idle") {
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

  const wakeAtom = runtime.fn<WakeTrigger>()(
    Effect.fnUntraced(function* (trigger) {
      yield* sendCommand({ _tag: "Wake", trigger })
    }),
  )

  const onlineAtom = runtime.fn<void>()(
    Effect.fnUntraced(function* () {
      yield* sendCommand({ _tag: "Online" })
    }),
  )

  const documentChangedAtom = runtime.fn<string | number>()(
    Effect.fnUntraced(function* (docOrBytes) {
      const byteLength =
        typeof docOrBytes === "number" ? docOrBytes : utf8ByteLength(docOrBytes)
      yield* sendCommand({ _tag: "DocumentChanged", byteLength })
    }),
  )

  return {
    runtime,
    statusAtom,
    clientAtom,
    reconnectAtom,
    wakeAtom,
    onlineAtom,
    documentChangedAtom,
    replayIncoming: (raw: string) => {
      activeReplayIncoming?.(raw)
    },
  }
}
