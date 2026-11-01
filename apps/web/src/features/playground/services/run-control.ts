import * as Clock from "effect/Clock"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"
import * as Semaphore from "effect/Semaphore"

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
    return `Runners did not pause (${this.pids.join(", ")}); the workspace was left unchanged`
  }
}

// What reading a control file found. Only ENOENT proves it is gone; any other
// failure says nothing about the runner, so it cannot authorize a swap.
type ControlRead = { readonly content: string } | "gone" | "unreadable"

const isNotFound = (error: unknown) =>
  Predicate.hasProperty(error, "code") && error.code === "ENOENT"

// Every caller on one file system shares its pause file, so their swaps take
// turns: a pause released by one swap must never cut short another.
const pauseLocks = new WeakMap<RunControlFileSystem, Semaphore.Semaphore>()

const pauseLock = (fs: RunControlFileSystem) => {
  let lock = pauseLocks.get(fs)
  if (lock === undefined) {
    lock = Semaphore.makeUnsafe(1)
    pauseLocks.set(fs, lock)
  }
  return lock
}

/**
 * Runs `swap` while every registered runner is paused. The pause is always
 * released afterwards, and only once `swap` has settled: the swap itself is
 * not interruptible, because interrupting it would not stop the file system
 * operations it started. A pause that cannot be released fails the effect.
 * A runner that cannot be shown to have paused or exited, because it is still
 * running, its files cannot be read or its liveness check does not answer,
 * fails the swap once `pauseTimeoutMillis` has passed.
 */
export const withRunnersPaused =
  (fs: RunControlFileSystem, options: RunControlOptions) =>
  <A, E, R>(
    swap: Effect.Effect<A, E, R>,
  ): Effect.Effect<A, E | RunnersDidNotPause, R> => {
    const { directory } = options
    const pause = `${directory}/pause`

    const read = (name: string) =>
      Effect.promise((): Promise<ControlRead> =>
        fs.readFile(`${directory}/${name}`, "utf-8").then(
          (content) => ({ content }),
          (error) => (isNotFound(error) ? "gone" : "unreadable"),
        ),
      )

    const list = Effect.promise(
      (): Promise<ReadonlyArray<string> | "unreadable"> =>
        fs.readdir(directory).then(
          (entries) => entries,
          (error) => (isNotFound(error) ? [] : "unreadable"),
        ),
    )

    // Whether `pid` still exists, given at most `remainingMillis` to answer.
    // No answer counts as alive.
    const stillAlive = (pid: string, remainingMillis: number) =>
      options.isAlive === undefined
        ? Effect.succeed(true)
        : options.isAlive(Number(pid)).pipe(
            Effect.timeoutOrElse({
              duration: Math.max(0, remainingMillis),
              orElse: () => Effect.succeed(true),
            }),
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
        const entries = yield* list
        const pending: Array<string> =
          entries === "unreadable" ? [`${directory} (unreadable)`] : []
        const pids =
          entries === "unreadable"
            ? []
            : entries.filter((entry) => /^\d+$/.test(entry))
        for (const pid of pids) {
          const state = yield* read(pid)
          if (state === "gone") continue
          if (state === "unreadable") {
            pending.push(pid)
            continue
          }
          if (state.content.trim() === "paused") continue
          const beatRead = yield* read(`${pid}.beat`)
          const beat =
            typeof beatRead === "string" ? beatRead : beatRead.content
          const last = heartbeats.get(pid)
          if (last === undefined || last.beat !== beat) {
            heartbeats.set(pid, { beat, since: now })
          } else if (
            now - last.since >= options.staleAfterMillis &&
            // Earlier checks in this poll may have used up the budget.
            !(yield* stillAlive(
              pid,
              deadline - (yield* Clock.currentTimeMillis),
            ))
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
        if ((yield* Clock.currentTimeMillis) >= deadline) {
          const error = new RunnersDidNotPause({ pids: pending })
          yield* Effect.logWarning(error.message)
          return yield* error
        }
        yield* Effect.sleep("100 millis")
      }
    })

    return pauseLock(fs)
      .withPermit(
        Effect.acquireUseRelease(
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
        ),
      )
      .pipe(
        Effect.annotateLogs({
          service: "WebContainer",
          method: "withRunnersPaused",
        }),
      )
  }
