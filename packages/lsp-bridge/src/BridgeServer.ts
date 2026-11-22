import * as NodeSocketServer from "@effect/platform-node/NodeSocketServer"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Scope from "effect/Scope"
import * as Socket from "effect/socket/Socket"
import type * as SocketServer from "effect/socket/SocketServer"
import * as Stream from "effect/Stream"
import { openLspSession } from "./LspSession.ts"
import type { LspStdio } from "./LspStdio.ts"
import { createWorkspaceSandbox, MAX_MESSAGE_BYTES } from "./Sandbox.ts"

export const DEFAULT_MAX_SESSIONS = 8
export const DEFAULT_IDLE_TIMEOUT_MS = 60_000
export const CLOSE_CODE_POLICY_VIOLATION = 1008
export const CLOSE_CODE_MESSAGE_TOO_BIG = 1009
export const CLOSE_CODE_INTERNAL_ERROR = 1011
export const CLOSE_CODE_TRY_AGAIN_LATER = 1013
export const CLOSE_CODE_IDLE_EVICTION = 4000

export interface BridgeServerOptions {
  readonly port: number
  readonly host?: string | undefined
  readonly workspaceDir: string
  readonly maxMessageBytes?: number | undefined
  readonly idleTimeoutMs?: number | undefined
  readonly maxSessions?: number | undefined
}

export interface BridgeServerHandle {
  readonly server: SocketServer.SocketServer["Service"]
  readonly url: string
  readonly port: number
  readonly activeSessions: Effect.Effect<number>
}

const closeSocketWith = (
  writer: Socket.Writer,
  code: number,
  reason: string,
): Effect.Effect<void> =>
  writer.write(new Socket.CloseEvent(code, reason)).pipe(Effect.ignore)

export const startBridgeServer = (
  options: BridgeServerOptions,
): Effect.Effect<
  BridgeServerHandle,
  SocketServer.SocketServerError,
  Scope.Scope | LspStdio
> =>
  Effect.gen(function* () {
    const maxMessageBytes = options.maxMessageBytes ?? MAX_MESSAGE_BYTES
    const idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS
    const maxSessions = options.maxSessions ?? DEFAULT_MAX_SESSIONS
    let activeSessionCount = 0

    const sandbox = createWorkspaceSandbox(
      options.workspaceDir,
      maxMessageBytes,
    )
    const server = yield* NodeSocketServer.makeWebSocket({
      host: options.host ?? "127.0.0.1",
      port: options.port,
      maxPayload: maxMessageBytes,
    })

    const handleConnection = (
      socket: Socket.Socket,
    ): Effect.Effect<void, never, LspStdio> =>
      Effect.scoped(
        Effect.gen(function* () {
          const scope = yield* Scope.Scope
          const writer = yield* socket.writer
          const pullStrings = yield* Socket.readerString(socket)

          if (activeSessionCount >= maxSessions) {
            yield* closeSocketWith(
              writer,
              CLOSE_CODE_TRY_AGAIN_LATER,
              "Try Again Later",
            )
            return
          }

          activeSessionCount += 1
          yield* Effect.addFinalizer(() =>
            Effect.sync(() => {
              activeSessionCount = Math.max(0, activeSessionCount - 1)
            }),
          )

          const validator = sandbox.makeSessionValidator()
          const session = yield* openLspSession().pipe(
            Effect.tapError(() =>
              closeSocketWith(
                writer,
                CLOSE_CODE_INTERNAL_ERROR,
                "Internal Error",
              ),
            ),
          )

          const idleEvicted = yield* Deferred.make<void>()
          let idleFiber: Fiber.Fiber<void, never> | undefined

          const resetIdleTimer: Effect.Effect<void> = Effect.gen(function* () {
            if (idleFiber !== undefined) {
              const prev = idleFiber
              idleFiber = undefined
              yield* Fiber.interrupt(prev)
            }
            idleFiber = yield* Effect.sleep(`${idleTimeoutMs} millis`).pipe(
              Effect.andThen(
                closeSocketWith(
                  writer,
                  CLOSE_CODE_IDLE_EVICTION,
                  "Idle Timeout",
                ),
              ),
              Effect.andThen(
                Deferred.succeed(idleEvicted, undefined).pipe(Effect.asVoid),
              ),
              Effect.forkIn(scope),
            )
          })

          yield* resetIdleTimer

          const closeInternalError = () =>
            closeSocketWith(writer, CLOSE_CODE_INTERNAL_ERROR, "Internal Error")

          const stdoutPump = session.incoming.pipe(
            Stream.runForEach((raw) =>
              writer.write(sandbox.rewriteServerMessage(raw)),
            ),
            Effect.catchTags({
              InvalidLspFrameError: closeInternalError,
              LspProcessError: closeInternalError,
              LspProcessExitedError: closeInternalError,
            }),
            Effect.catch(() => Effect.void),
          )

          const exitWatcher = session.awaitExit.pipe(
            Effect.catch(() =>
              closeSocketWith(
                writer,
                CLOSE_CODE_INTERNAL_ERROR,
                "Internal Error",
              ),
            ),
          )

          const readLoop = Effect.forever(
            Effect.gen(function* () {
              const frames = yield* pullStrings
              for (const frame of frames) {
                const rewritten = yield* validator
                  .validateAndRewriteClientMessage(frame)
                  .pipe(
                    Effect.catchTag("PolicyViolationError", (err) =>
                      closeSocketWith(
                        writer,
                        CLOSE_CODE_POLICY_VIOLATION,
                        "Policy Violation",
                      ).pipe(Effect.andThen(Effect.fail(err))),
                    ),
                    Effect.catchTag("MessageTooBigError", (err) =>
                      closeSocketWith(
                        writer,
                        CLOSE_CODE_MESSAGE_TOO_BIG,
                        "Message Too Big",
                      ).pipe(Effect.andThen(Effect.fail(err))),
                    ),
                  )
                yield* resetIdleTimer
                yield* session
                  .send(rewritten)
                  .pipe(
                    Effect.tapError(() =>
                      closeSocketWith(
                        writer,
                        CLOSE_CODE_INTERNAL_ERROR,
                        "Internal Error",
                      ),
                    ),
                  )
              }
            }),
          ).pipe(Effect.catch(() => Effect.void))

          yield* Effect.raceAll([
            readLoop,
            stdoutPump,
            exitWatcher,
            Deferred.await(idleEvicted),
          ])
        }).pipe(Effect.catch(() => Effect.void)),
      )

    yield* server.run(handleConnection).pipe(Effect.ignore, Effect.forkScoped)

    const addr = server.address
    const port =
      addr._tag === "InetAddressV4" || addr._tag === "InetAddressV6"
        ? addr.port
        : options.port
    const url =
      addr._tag === "InetAddressV4"
        ? `ws://${addr.address.toString()}:${addr.port}`
        : addr._tag === "InetAddressV6"
          ? `ws://[${addr.address.toString()}]:${addr.port}`
          : `ws://${options.host ?? "127.0.0.1"}:${port}`

    return {
      server,
      url,
      port,
      activeSessions: Effect.sync(() => activeSessionCount),
    }
  })
