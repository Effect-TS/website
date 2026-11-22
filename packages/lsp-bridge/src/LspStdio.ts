import type * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import type * as Scope from "effect/Scope"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import { decodeLspFrames, encodeLspFrame } from "./Framing.ts"

export class LspProcessError extends Data.TaggedError("LspProcessError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

export class LspProcessExitedError extends Data.TaggedError(
  "LspProcessExitedError",
)<{
  readonly exitCode: number
}> {}

export interface LspStdioProcess {
  readonly stdin: Sink.Sink<void, Uint8Array, never, LspProcessError>
  readonly stdout: Stream.Stream<Uint8Array, LspProcessError>
  readonly stderr: Stream.Stream<Uint8Array, LspProcessError>
  readonly exitCode: Effect.Effect<number, LspProcessError>
}

export class LspStdio extends Context.Service<
  LspStdio,
  {
    readonly spawn: Effect.Effect<LspStdioProcess, LspProcessError, Scope.Scope>
  }
>()("@website/lsp-bridge/LspStdio") {}

export interface FakeLspStdioController {
  readonly layer: Layer.Layer<LspStdio>
  readonly pushStdout: (bytes: Uint8Array) => Effect.Effect<void>
  readonly pushStdoutMessage: (message: unknown) => Effect.Effect<void>
  readonly pushStderr: (text: string) => Effect.Effect<void>
  readonly exit: (code: number) => Effect.Effect<void>
  readonly takeStdinMessage: Effect.Effect<unknown>
  readonly takeStdinRaw: Effect.Effect<string>
  readonly pollStdinMessages: Effect.Effect<ReadonlyArray<unknown>>
}

/**
 * Create an in-memory controllable `LspStdio` service for deterministic tests.
 * Stdin writes are decoded through `decodeLspFrames`, verifying real `Content-Length` framing.
 */
export const makeFakeLspStdio = (): Effect.Effect<
  FakeLspStdioController,
  never,
  Scope.Scope
> =>
  Effect.gen(function* () {
    const stdinBytesQueue = yield* Queue.unbounded<Uint8Array, Cause.Done>()
    const stdinDecodedQueue = yield* Queue.unbounded<string, Cause.Done>()
    const stdoutQueue = yield* Queue.unbounded<Uint8Array, Cause.Done>()
    const stderrQueue = yield* Queue.unbounded<Uint8Array, Cause.Done>()
    const exitDeferred = yield* Deferred.make<number, LspProcessError>()

    // Decode framed bytes written to stdin into bare JSON-RPC strings
    yield* Stream.fromQueue(stdinBytesQueue).pipe(
      decodeLspFrames,
      Stream.runForEach((raw) =>
        Queue.offer(stdinDecodedQueue, raw).pipe(Effect.asVoid),
      ),
      Effect.ignore,
      Effect.forkScoped,
    )

    const process: LspStdioProcess = {
      stdin: Sink.forEach((chunk: Uint8Array) =>
        Queue.offer(stdinBytesQueue, chunk).pipe(Effect.asVoid),
      ),
      stdout: Stream.fromQueue(stdoutQueue),
      stderr: Stream.fromQueue(stderrQueue),
      exitCode: Deferred.await(exitDeferred),
    }

    const layer = Layer.succeed(LspStdio, {
      spawn: Effect.succeed(process),
    })

    const pushStdout = (bytes: Uint8Array) =>
      Queue.offer(stdoutQueue, bytes).pipe(Effect.asVoid)

    const pushStdoutMessage = (message: unknown) =>
      pushStdout(encodeLspFrame(JSON.stringify(message)))

    const pushStderr = (text: string) =>
      Queue.offer(stderrQueue, Buffer.from(text, "utf8")).pipe(Effect.asVoid)

    const exit = (code: number) =>
      Effect.gen(function* () {
        yield* Queue.end(stdoutQueue)
        yield* Queue.end(stderrQueue)
        yield* Deferred.succeed(exitDeferred, code)
      }).pipe(Effect.asVoid)

    const takeStdinRaw: Effect.Effect<string> = Queue.take(
      stdinDecodedQueue,
    ).pipe(Effect.orDie)

    const takeStdinMessage: Effect.Effect<unknown> = takeStdinRaw.pipe(
      Effect.map((raw) => JSON.parse(raw) as unknown),
    )

    const pollStdinMessages: Effect.Effect<ReadonlyArray<unknown>> =
      Queue.clear(stdinDecodedQueue).pipe(
        Effect.map((items) => items.map((raw) => JSON.parse(raw) as unknown)),
      )

    return {
      layer,
      pushStdout,
      pushStdoutMessage,
      pushStderr,
      exit,
      takeStdinMessage,
      takeStdinRaw,
      pollStdinMessages,
    }
  })
