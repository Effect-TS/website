import type { Transport } from "@codemirror/lsp-client"
import * as BrowserSocket from "@effect/platform-browser/BrowserSocket"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as PubSub from "effect/PubSub"
import * as Queue from "effect/Queue"
import * as Semaphore from "effect/Semaphore"
import * as Socket from "effect/socket/Socket"
import * as Stream from "effect/Stream"

export class TransportConnectError extends Data.TaggedError(
  "TransportConnectError",
)<{
  readonly message: string
  readonly cause?: unknown
}> {}

export class TransportClosedError extends Data.TaggedError(
  "TransportClosedError",
)<{
  readonly code: number
  readonly reason: string
}> {}

export type TransportError = TransportConnectError | TransportClosedError

export type TransportEvent =
  | { readonly _tag: "Connected"; readonly connectionId: number }
  | { readonly _tag: "Disconnected"; readonly error: TransportError }

export interface LspTransportService {
  readonly transport: Transport
  readonly events: Stream.Stream<TransportEvent>
  readonly reconnect: Effect.Effect<void>
  readonly disconnect: Effect.Effect<void>
}

export class LspTransport extends Context.Service<
  LspTransport,
  LspTransportService
>()("@web/scratchpad/LspTransport") {}

const mapSocketError = (err: Socket.SocketError): TransportError => {
  switch (err.reason._tag) {
    case "SocketCloseError":
      return new TransportClosedError({
        code: err.reason.code,
        reason: err.reason.closeReason ?? "",
      })
    case "SocketOpenError":
    case "SocketReadError":
    case "SocketWriteError":
    case "SocketUpgradeError":
      return new TransportConnectError({
        message: err.reason.message,
        cause: err.reason.cause,
      })
  }
}

/**
 * Message-level `LspTransport` layer backed by any Effect `Socket.Socket`.
 *
 * Each `reconnect` interrupts any previous connection scope, clears the pending
 * outbound queue, and dials a fresh socket connection.
 */
export const layerSocket: Layer.Layer<LspTransport, never, Socket.Socket> =
  Layer.effect(
    LspTransport,
    Effect.gen(function* () {
      const scope = yield* Effect.scope
      const socket = yield* Socket.Socket
      const writer = yield* socket.writer
      const eventsPubSub = yield* PubSub.unbounded<TransportEvent>()
      const outbound = yield* Queue.unbounded<string>()
      const subscribers = new Set<(value: string) => void>()
      const lifecycle = yield* Semaphore.make(1)

      let activeFiber: Fiber.Fiber<void, never> | undefined
      let connectionId = 0

      const closeActive = Effect.gen(function* () {
        const fiber = activeFiber
        activeFiber = undefined
        if (fiber !== undefined) {
          yield* Fiber.interrupt(fiber)
        }
        yield* Queue.clear(outbound)
      })

      yield* Effect.addFinalizer(() =>
        Effect.gen(function* () {
          yield* closeActive
          subscribers.clear()
        }),
      )

      const disconnect = lifecycle.withPermits(1)(closeActive)

      const reconnect = lifecycle.withPermits(1)(
        Effect.gen(function* () {
          yield* closeActive
          const id = ++connectionId

          const fiber = yield* Effect.scoped(
            Effect.gen(function* () {
              const pull = yield* Socket.readerString(socket)

              // Drop any frames queued while disconnected or dialing before
              // emitting Connected and starting the writer drain.
              yield* Queue.clear(outbound)

              yield* Effect.forever(
                Effect.gen(function* () {
                  const msg = yield* Queue.take(outbound)
                  yield* writer.write(msg).pipe(Effect.ignore)
                }),
              ).pipe(Effect.forkScoped)

              yield* PubSub.publish(eventsPubSub, {
                _tag: "Connected",
                connectionId: id,
              })

              while (true) {
                const batch = yield* pull
                for (const msg of batch) {
                  for (const handler of subscribers) {
                    handler(msg)
                  }
                }
              }
            }),
          ).pipe(
            Effect.catch((err) =>
              PubSub.publish(eventsPubSub, {
                _tag: "Disconnected",
                error: mapSocketError(err),
              }).pipe(Effect.asVoid),
            ),
            Effect.forkIn(scope),
          )

          activeFiber = fiber
        }),
      )

      const transport: Transport = {
        send(message: string) {
          Queue.offerUnsafe(outbound, message)
        },
        subscribe(handler: (value: string) => void) {
          subscribers.add(handler)
        },
        unsubscribe(handler: (value: string) => void) {
          subscribers.delete(handler)
        },
      }

      return {
        transport,
        events: Stream.fromPubSub(eventsPubSub),
        reconnect,
        disconnect,
      }
    }),
  )

/**
 * Browser WebSocket `LspTransport` layer built on `effect/socket/Socket` and
 * `@effect/platform-browser/BrowserSocket`.
 */
export const layerWebSocket = (url: string): Layer.Layer<LspTransport> =>
  layerSocket.pipe(Layer.provide(BrowserSocket.layerWebSocket(url)))

// ---------------------------------------------------------------------------
// In-memory Fake Transport + Controller (for deterministic Node tests)
// ---------------------------------------------------------------------------

export interface JsonRpcMessage {
  readonly jsonrpc?: string
  readonly id?: number | string
  readonly method?: string
  readonly params?: unknown
  readonly result?: unknown
  readonly error?: {
    readonly code: number
    readonly message: string
    readonly data?: unknown
  }
}

export interface JsonRpcRequest extends JsonRpcMessage {
  readonly id: number | string
  readonly method: string
}

export interface FakeLspTransportOptions {
  /**
   * When true, incoming `initialize` requests are automatically answered with
   * default server capabilities unless `"initialize"` is stalled.
   */
  readonly autoHandshake?: boolean
  /**
   * Capabilities returned by auto-handshake or `replyToInitialize`.
   */
  readonly serverCapabilities?: Record<string, unknown>
}

export interface FakeLspController {
  readonly isConnected: Effect.Effect<boolean>
  readonly connectionCount: Effect.Effect<number>
  readonly openCount: Effect.Effect<number>
  readonly sentMessages: Effect.Effect<ReadonlyArray<JsonRpcMessage>>
  readonly currentConnectionMessages: Effect.Effect<
    ReadonlyArray<JsonRpcMessage>
  >
  readonly takeSentMessage: Effect.Effect<JsonRpcMessage>
  readonly waitForRequest: (method: string) => Effect.Effect<JsonRpcRequest>
  readonly reply: (id: number | string, result: unknown) => Effect.Effect<void>
  readonly replyToInitialize: (
    id: number | string,
    capabilities?: Record<string, unknown>,
  ) => Effect.Effect<void>
  readonly replyError: (
    id: number | string,
    error: {
      readonly code: number
      readonly message: string
      readonly data?: unknown
    },
  ) => Effect.Effect<void>
  readonly pushNotification: (
    method: string,
    params?: unknown,
  ) => Effect.Effect<void>
  readonly pushRaw: (raw: string) => Effect.Effect<void>
  readonly stallRequest: (method: string) => Effect.Effect<void>
  readonly unstallRequest: (method: string) => Effect.Effect<void>
  readonly setAutoHandshake: (enabled: boolean) => Effect.Effect<void>
  readonly close: (code: number, reason?: string) => Effect.Effect<void>
  readonly failNextConnect: (
    error?: TransportConnectError | string,
  ) => Effect.Effect<void>
  readonly failConnects: (
    count: number,
    error?: TransportConnectError | string,
  ) => Effect.Effect<void>
  readonly clearConnectFailures: Effect.Effect<void>
  readonly clearMessages: Effect.Effect<void>
}

export interface FakeLspTransportHandle {
  readonly layer: Layer.Layer<LspTransport>
  readonly controller: FakeLspController
}

const DEFAULT_CAPABILITIES: Record<string, unknown> = {
  textDocumentSync: 1,
  hoverProvider: true,
}

export const makeFakeLspTransport = (
  options?: FakeLspTransportOptions,
): FakeLspTransportHandle => {
  const defaultCapabilities =
    options?.serverCapabilities ?? DEFAULT_CAPABILITIES

  let autoHandshake = options?.autoHandshake ?? false
  let connected = false
  let totalConnectionAttempts = 0
  let totalOpens = 0
  let connectionId = 0

  const stalledMethods = new Set<string>()
  const connectFailures: Array<TransportConnectError> = []
  const allSent: Array<JsonRpcMessage> = []
  let currentSent: Array<JsonRpcMessage> = []
  const subscribers = new Set<(value: string) => void>()

  let activeDrainFiber: Fiber.Fiber<void, never> | undefined
  let activeEventsPubSub: PubSub.PubSub<TransportEvent> | undefined
  let activeOutbound: Queue.Queue<string> | undefined

  const sentWaiters: Array<(msg: JsonRpcMessage) => void> = []
  const unreadSent: Array<JsonRpcMessage> = []

  const deliverToClient = (raw: string) => {
    if (!connected) return
    for (const handler of subscribers) {
      handler(raw)
    }
  }

  const recordClientMessage = (raw: string) => {
    const parsed = JSON.parse(raw) as JsonRpcMessage
    allSent.push(parsed)
    currentSent.push(parsed)

    if (
      autoHandshake &&
      parsed.method === "initialize" &&
      parsed.id !== undefined &&
      !stalledMethods.has("initialize")
    ) {
      deliverToClient(
        JSON.stringify({
          jsonrpc: "2.0",
          id: parsed.id,
          result: { capabilities: defaultCapabilities },
        }),
      )
    }

    if (sentWaiters.length > 0) {
      const resolve = sentWaiters.shift()!
      resolve(parsed)
    } else {
      unreadSent.push(parsed)
    }
  }

  const stopActiveDrain = Effect.gen(function* () {
    const fiber = activeDrainFiber
    activeDrainFiber = undefined
    if (fiber !== undefined) {
      yield* Fiber.interrupt(fiber)
    }
  })

  const controller: FakeLspController = {
    isConnected: Effect.sync(() => connected),
    connectionCount: Effect.sync(() => totalConnectionAttempts),
    openCount: Effect.sync(() => totalOpens),
    sentMessages: Effect.sync(() => [...allSent]),
    currentConnectionMessages: Effect.sync(() => [...currentSent]),
    takeSentMessage: Effect.callback<JsonRpcMessage>((resume) => {
      if (unreadSent.length > 0) {
        resume(Effect.succeed(unreadSent.shift()!))
        return
      }
      const waiter = (msg: JsonRpcMessage) => {
        resume(Effect.succeed(msg))
      }
      sentWaiters.push(waiter)
      return Effect.sync(() => {
        const idx = sentWaiters.indexOf(waiter)
        if (idx !== -1) sentWaiters.splice(idx, 1)
      })
    }),
    waitForRequest: (method: string) =>
      Effect.gen(function* () {
        while (true) {
          const msg = yield* controller.takeSentMessage
          if (msg.method === method && msg.id !== undefined) {
            return msg as JsonRpcRequest
          }
        }
      }),
    reply: (id, result) =>
      Effect.sync(() => {
        deliverToClient(JSON.stringify({ jsonrpc: "2.0", id, result }))
      }),
    replyToInitialize: (id, capabilities) =>
      Effect.sync(() => {
        deliverToClient(
          JSON.stringify({
            jsonrpc: "2.0",
            id,
            result: { capabilities: capabilities ?? defaultCapabilities },
          }),
        )
      }),
    replyError: (id, error) =>
      Effect.sync(() => {
        deliverToClient(JSON.stringify({ jsonrpc: "2.0", id, error }))
      }),
    pushNotification: (method, params) =>
      Effect.sync(() => {
        deliverToClient(JSON.stringify({ jsonrpc: "2.0", method, params }))
      }),
    pushRaw: (raw) =>
      Effect.sync(() => {
        deliverToClient(raw)
      }),
    stallRequest: (method) =>
      Effect.sync(() => {
        stalledMethods.add(method)
      }),
    unstallRequest: (method) =>
      Effect.sync(() => {
        stalledMethods.delete(method)
      }),
    setAutoHandshake: (enabled) =>
      Effect.sync(() => {
        autoHandshake = enabled
      }),
    close: (code, reason = "") =>
      Effect.gen(function* () {
        if (!connected) return
        connected = false
        yield* stopActiveDrain
        if (activeEventsPubSub !== undefined) {
          yield* PubSub.publish(activeEventsPubSub, {
            _tag: "Disconnected",
            error: new TransportClosedError({ code, reason }),
          })
        }
      }),
    failNextConnect: (error) =>
      Effect.sync(() => {
        const err =
          error instanceof TransportConnectError
            ? error
            : new TransportConnectError({
                message: error ?? "Simulated connection failure",
              })
        connectFailures.push(err)
      }),
    failConnects: (count, error) =>
      Effect.sync(() => {
        for (let i = 0; i < count; i++) {
          const err =
            error instanceof TransportConnectError
              ? error
              : new TransportConnectError({
                  message: error ?? "Simulated connection failure",
                })
          connectFailures.push(err)
        }
      }),
    clearConnectFailures: Effect.sync(() => {
      connectFailures.length = 0
    }),
    clearMessages: Effect.sync(() => {
      allSent.length = 0
      currentSent = []
      unreadSent.length = 0
    }),
  }

  const layer: Layer.Layer<LspTransport> = Layer.effect(
    LspTransport,
    Effect.gen(function* () {
      const scope = yield* Effect.scope
      const eventsPubSub = yield* PubSub.unbounded<TransportEvent>()
      const outbound = yield* Queue.unbounded<string>()
      const lifecycle = yield* Semaphore.make(1)

      activeEventsPubSub = eventsPubSub
      activeOutbound = outbound

      const closeActive = Effect.gen(function* () {
        connected = false
        yield* stopActiveDrain
        yield* Queue.clear(outbound)
      })

      yield* Effect.addFinalizer(() =>
        Effect.gen(function* () {
          yield* closeActive
          subscribers.clear()
          if (activeEventsPubSub === eventsPubSub) {
            activeEventsPubSub = undefined
          }
          if (activeOutbound === outbound) {
            activeOutbound = undefined
          }
        }),
      )

      const disconnect = lifecycle.withPermits(1)(closeActive)

      const reconnect = lifecycle.withPermits(1)(
        Effect.gen(function* () {
          yield* closeActive
          totalConnectionAttempts += 1

          const failure = connectFailures.shift()
          if (failure !== undefined) {
            yield* PubSub.publish(eventsPubSub, {
              _tag: "Disconnected",
              error: failure,
            })
            return
          }

          totalOpens += 1
          const id = ++connectionId
          currentSent = []
          connected = true

          // Ensure outbound queue is empty before draining the new connection.
          yield* Queue.clear(outbound)

          activeDrainFiber = yield* Effect.forever(
            Effect.gen(function* () {
              const raw = yield* Queue.take(outbound)
              recordClientMessage(raw)
            }),
          ).pipe(Effect.forkIn(scope))

          yield* PubSub.publish(eventsPubSub, {
            _tag: "Connected",
            connectionId: id,
          })
        }),
      )

      const transport: Transport = {
        send(message: string) {
          Queue.offerUnsafe(outbound, message)
        },
        subscribe(handler: (value: string) => void) {
          subscribers.add(handler)
        },
        unsubscribe(handler: (value: string) => void) {
          subscribers.delete(handler)
        },
      }

      return {
        transport,
        events: Stream.fromPubSub(eventsPubSub),
        reconnect,
        disconnect,
      }
    }),
  )

  return { layer, controller }
}

export const layerInMemoryFake = (
  options?: FakeLspTransportOptions,
): FakeLspTransportHandle => makeFakeLspTransport(options)
