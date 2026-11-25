import type { Transport } from "@codemirror/lsp-client"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as PubSub from "effect/PubSub"
import * as Queue from "effect/Queue"
import * as Semaphore from "effect/Semaphore"
import * as Stream from "effect/Stream"
import {
  LspTransport,
  type TransportEvent,
  TransportFatalError,
} from "../../../src/features/scratchpad/transport.ts"

/**
 * An in-memory LSP transport and a controller for driving it, for
 * deterministic tests of the session and editor.
 */

interface JsonRpcMessage {
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

interface JsonRpcRequest extends JsonRpcMessage {
  readonly id: number | string
  readonly method: string
}

export interface FakeLspTransportOptions {
  /**
   * When true, incoming `initialize` requests are automatically answered with
   * default server capabilities unless `"initialize"` is stalled.
   */
  readonly autoHandshake?: boolean
}

interface FakeLspController {
  readonly isConnected: Effect.Effect<boolean>
  readonly openCount: Effect.Effect<number>
  readonly sentMessages: Effect.Effect<ReadonlyArray<JsonRpcMessage>>
  readonly takeSentMessage: Effect.Effect<JsonRpcMessage>
  readonly waitForRequest: (method: string) => Effect.Effect<JsonRpcRequest>
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
  readonly stallRequest: (method: string) => Effect.Effect<void>
  readonly unstallRequest: (method: string) => Effect.Effect<void>
  readonly setAutoHandshake: (enabled: boolean) => Effect.Effect<void>
  /** Fails the server for good, as the worker does when it cannot recover. */
  readonly crash: (message?: string) => Effect.Effect<void>
}

interface FakeLspTransportHandle {
  readonly layer: Layer.Layer<LspTransport>
  readonly controller: FakeLspController
}

const FAKE_CAPABILITIES: Record<string, unknown> = {
  textDocumentSync: 1,
  hoverProvider: true,
}

export const makeFakeLspTransport = (
  options?: FakeLspTransportOptions,
): FakeLspTransportHandle => {
  let autoHandshake = options?.autoHandshake ?? false
  let connected = false
  let totalOpens = 0
  let connectionId = 0

  const stalledMethods = new Set<string>()
  const allSent: Array<JsonRpcMessage> = []
  const subscribers = new Set<(value: string) => void>()

  let activeDrainFiber: Fiber.Fiber<void, never> | undefined
  let activeEventsPubSub: PubSub.PubSub<TransportEvent> | undefined

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
          result: { capabilities: FAKE_CAPABILITIES },
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
    openCount: Effect.sync(() => totalOpens),
    sentMessages: Effect.sync(() => [...allSent]),
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
    replyToInitialize: (id, capabilities) =>
      Effect.sync(() => {
        deliverToClient(
          JSON.stringify({
            jsonrpc: "2.0",
            id,
            result: { capabilities: capabilities ?? FAKE_CAPABILITIES },
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
    crash: (message = "Simulated crash") =>
      Effect.gen(function* () {
        if (!connected) return
        connected = false
        yield* stopActiveDrain
        if (activeEventsPubSub !== undefined) {
          yield* PubSub.publish(activeEventsPubSub, {
            _tag: "Disconnected",
            error: new TransportFatalError({ message }),
          })
        }
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
        }),
      )

      const disconnect = lifecycle.withPermits(1)(closeActive)

      const reconnect = lifecycle.withPermits(1)(
        Effect.gen(function* () {
          yield* closeActive
          totalOpens += 1
          const id = ++connectionId
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
