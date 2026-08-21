import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"
import * as ChildProcess from "effect/unstable/process/ChildProcess"
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner"

export class ProcessError extends Data.TaggedError("ProcessError")<{
  readonly command: string
  readonly exitCode: number | undefined
  readonly stderr: string
  readonly cause?: unknown
}> {}

export interface ProcessResult {
  readonly stdout: string
  readonly stderr: string
  readonly exitCode: number
}

export interface ProcessOptions {
  readonly cwd?: string | undefined
  readonly input?: string | undefined
}

export class CommandRunner extends Context.Service<
  CommandRunner,
  {
    readonly execute: (
      command: string,
      arguments_: ReadonlyArray<string>,
      options?: ProcessOptions,
    ) => Effect.Effect<ProcessResult, ProcessError>
    readonly run: (
      command: string,
      arguments_: ReadonlyArray<string>,
      options?: ProcessOptions,
    ) => Effect.Effect<string, ProcessError>
    readonly inherit: (
      command: string,
      arguments_: ReadonlyArray<string>,
      options?: Omit<ProcessOptions, "input">,
    ) => Effect.Effect<void, ProcessError>
  }
>()("@website/api-reference/CommandRunner", {
  make: Effect.gen(function* () {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner

    const execute = Effect.fn("Process.execute")(function* (
      command: string,
      arguments_: ReadonlyArray<string>,
      options: ProcessOptions = {},
    ) {
      const child = ChildProcess.make(command, arguments_, {
        cwd: options.cwd,
        stdin:
          options.input === undefined
            ? "ignore"
            : Stream.make(new TextEncoder().encode(options.input)),
      })
      return yield* Effect.scoped(
        Effect.gen(function* () {
          const handle = yield* spawner.spawn(child)
          const [stdout, stderr, exitCode] = yield* Effect.all(
            [
              handle.stdout.pipe(Stream.decodeText(), Stream.mkString),
              handle.stderr.pipe(Stream.decodeText(), Stream.mkString),
              handle.exitCode,
            ],
            { concurrency: "unbounded" },
          )
          return { stdout, stderr, exitCode: Number(exitCode) }
        }),
      ).pipe(
        Effect.mapError(
          (cause) =>
            new ProcessError({
              command: [command, ...arguments_].join(" "),
              exitCode: undefined,
              stderr: "",
              cause,
            }),
        ),
      )
    })

    const run = Effect.fn("Process.run")(function* (
      command: string,
      arguments_: ReadonlyArray<string>,
      options: ProcessOptions = {},
    ) {
      const result = yield* execute(command, arguments_, options)
      if (result.exitCode !== 0) {
        return yield* new ProcessError({
          command: [command, ...arguments_].join(" "),
          exitCode: result.exitCode,
          stderr: result.stderr,
        })
      }
      return result.stdout
    })

    const inherit = Effect.fn("Process.inherit")(function* (
      command: string,
      arguments_: ReadonlyArray<string>,
      options: Omit<ProcessOptions, "input"> = {},
    ) {
      const child = ChildProcess.make(command, arguments_, {
        cwd: options.cwd,
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
      })
      const exitCode = yield* spawner.exitCode(child).pipe(
        Effect.mapError(
          (cause) =>
            new ProcessError({
              command: [command, ...arguments_].join(" "),
              exitCode: undefined,
              stderr: "",
              cause,
            }),
        ),
      )
      if (Number(exitCode) !== 0) {
        return yield* new ProcessError({
          command: [command, ...arguments_].join(" "),
          exitCode: Number(exitCode),
          stderr: "",
        })
      }
    })

    return { execute, inherit, run }
  }),
}) {
  static readonly layer = Layer.effect(this, this.make)
}
