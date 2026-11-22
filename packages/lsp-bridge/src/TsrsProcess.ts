import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ChildProcess from "effect/process/ChildProcess"
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import { LspProcessError, LspStdio } from "./LspStdio.ts"

export interface TsrsProcessOptions {
  readonly binaryPath: string
  readonly workspaceDir: string
  readonly extraEnv?: Readonly<Record<string, string>> | undefined
  readonly onSpawn?: ((pid: number) => void) | undefined
  readonly onExit?: ((pid: number) => void) | undefined
}

const mapProcessError = (error: unknown): LspProcessError =>
  error instanceof LspProcessError
    ? error
    : new LspProcessError({
        message:
          error instanceof Error
            ? error.message
            : `LSP process error: ${String(error)}`,
        cause: error,
      })

/**
 * Production `LspStdio` layer that spawns `tsrs --lsp --stdio` directly with
 * `RAYON_NUM_THREADS=1` (and `GOMAXPROCS=1` fallback) so Effect scope teardown
 * terminates the child process cleanly with zero leaked PIDs.
 */
export const makeTsrsLspStdioLayer = (
  options: TsrsProcessOptions,
): Layer.Layer<LspStdio, never, ChildProcessSpawner.ChildProcessSpawner> =>
  Layer.effect(
    LspStdio,
    Effect.gen(function* () {
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner

      return LspStdio.of({
        spawn: Effect.gen(function* () {
          const command = ChildProcess.make(
            options.binaryPath,
            ["--lsp", "--stdio"],
            {
              cwd: options.workspaceDir,
              env: {
                ...process.env,
                RAYON_NUM_THREADS: "1",
                GOMAXPROCS: "1",
                ...options.extraEnv,
              },
              forceKillAfter: "2 seconds",
            },
          )

          const proc = yield* spawner
            .spawn(command)
            .pipe(Effect.mapError(mapProcessError))

          const pid = Number(proc.pid)
          options.onSpawn?.(pid)

          yield* Effect.addFinalizer(() =>
            Effect.sync(() => {
              options.onExit?.(pid)
            }),
          )

          return {
            stdin: Sink.mapError(proc.stdin, mapProcessError),
            stdout: Stream.mapError(proc.stdout, mapProcessError),
            stderr: Stream.mapError(proc.stderr, mapProcessError),
            exitCode: proc.exitCode.pipe(
              Effect.map((code) => Number(code)),
              Effect.mapError(mapProcessError),
            ),
          }
        }),
      })
    }),
  )
