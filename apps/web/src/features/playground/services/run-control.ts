import * as Clock from "effect/Clock"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"

/**
 * The page's side of the protocol `run` follows (see `runExe` in
 * `webcontainer.ts`). Every `run` registers in a control directory:
 * `<pid>` holds `watching` or `paused` and `<pid>.beat` counts up while the
 * process lives. While `pause` exists, each runner closes its compiler watch,
 * waits for its program to exit and only then writes `paused`. Before it
 * compiles again it writes `watching`, so a `paused` the page reads is always
 * a runner that is fully stopped.
 */
export interface RunControlFileSystem {
  readonly mkdir: (
    path: string,
    options: { recursive: true },
  ) => Promise<unknown>
  readonly writeFile: (path: string, data: string) => Promise<void>
  readonly readFile: (path: string, encoding: "utf-8") => Promise<string>
  readonly readdir: (path: string) => Promise<Array<string>>
  readonly rm: (path: string, options: { force?: boolean }) => Promise<void>
}

export interface RunControlOptions {
  readonly directory: string
  /**
   * How long a registration's heartbeat may stand still before the page asks
   * whether its process still exists. A compile blocks the runner's event
   * loop, so a still heartbeat alone proves nothing.
   */
  readonly staleAfterMillis: number
  /**
   * How long to wait for every live runner to pause. Past it the swap fails
   * and the files are left as they were.
   */
  readonly pauseTimeoutMillis: number
  /**
   * Whether the process `pid` still exists. Only `false` lets the page drop a
   * registration; without this check, or when it is unsure, the page keeps
   * waiting for that runner.
   */
  readonly isAlive?: ((pid: number) => Effect.Effect<boolean>) | undefined
}

export class RunnersDidNotPause extends Data.TaggedError("RunnersDidNotPause")<{
  readonly pids: ReadonlyArray<string>
}> {
  override get message(): string {
    return `Runner ${this.pids.join(", ")} did not pause; the workspace was left unchanged`
  }
}

/**
 * Runs `swap` while every registered runner is paused. The pause is always
 * released afterwards, and only once `swap` has settled: the swap itself is
 * not interruptible, because interrupting it would not stop the file system
 * operations it started. A pause that cannot be released fails the effect.
 */
export const withRunnersPaused =
  (fs: RunControlFileSystem, options: RunControlOptions) =>
  <A, E, R>(
    swap: Effect.Effect<A, E, R>,
  ): Effect.Effect<A, E | RunnersDidNotPause, R> => {
    const { directory } = options
    const pause = `${directory}/pause`

    const read = (name: string) =>
      Effect.promise(() =>
        fs.readFile(`${directory}/${name}`, "utf-8").catch(() => undefined),
      )

    const forget = (pid: string) =>
      Effect.promise(() =>
        Promise.all([
          fs.rm(`${directory}/${pid}`, { force: true }),
          fs.rm(`${directory}/${pid}.beat`, { force: true }),
        ]),
      )

    const awaitPaused = Effect.gen(function* () {
      const heartbeats = new Map<string, { beat: string; since: number }>()
      const deadline =
        (yield* Clock.currentTimeMillis) + options.pauseTimeoutMillis
      while (true) {
        const now = yield* Clock.currentTimeMillis
        const entries = yield* Effect.promise(() =>
          fs.readdir(directory).catch((): Array<string> => []),
        )
        const pending: Array<string> = []
        for (const pid of entries.filter((entry) => /^\d+$/.test(entry))) {
          const state = yield* read(pid)
          if (state === undefined || state.trim() === "paused") continue
          const beat = (yield* read(`${pid}.beat`)) ?? ""
          const last = heartbeats.get(pid)
          if (last === undefined || last.beat !== beat) {
            heartbeats.set(pid, { beat, since: now })
          } else if (
            now - last.since >= options.staleAfterMillis &&
            options.isAlive !== undefined &&
            !(yield* options.isAlive(Number(pid)))
          ) {
            yield* Effect.logWarning(
              `Removing the registration of runner ${pid}, which has exited`,
            )
            yield* forget(pid)
            continue
          }
          pending.push(pid)
        }
        if (pending.length === 0) return
        if (now >= deadline) {
          const error = new RunnersDidNotPause({ pids: pending })
          yield* Effect.logWarning(error.message)
          return yield* error
        }
        yield* Effect.sleep("100 millis")
      }
    })

    return Effect.acquireUseRelease(
      Effect.promise(async () => {
        await fs.mkdir(directory, { recursive: true })
        await fs.writeFile(pause, "")
      }),
      () => Effect.andThen(awaitPaused, Effect.uninterruptible(swap)),
      () =>
        Effect.tryPromise(() => fs.rm(pause, { force: true })).pipe(
          Effect.retry({ times: 2 }),
          Effect.orDie,
        ),
    ).pipe(
      Effect.annotateLogs({
        service: "WebContainer",
        method: "withRunnersPaused",
      }),
    )
  }
