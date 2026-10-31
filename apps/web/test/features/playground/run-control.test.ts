import { assert, test } from "vite-plus/test"
import { Effect, Exit, Fiber } from "effect"

// The page side of the runner protocol (see `run-lifecycle.test.ts`): before
// replacing the workspace, ask every registered `run` to pause, wait for it,
// and always release the pause. It lives in `run-control.ts` so it can run
// here against an in-memory file system; `webcontainer.ts` passes it
// `container.fs`. The module is loaded at run time until it exists.

interface RunControlFileSystem {
  readonly mkdir: (
    path: string,
    options: { recursive: true },
  ) => Promise<unknown>
  readonly writeFile: (path: string, data: string) => Promise<void>
  readonly readFile: (path: string, encoding: "utf-8") => Promise<string>
  readonly readdir: (path: string) => Promise<Array<string>>
  readonly rm: (path: string, options: { force?: boolean }) => Promise<void>
}

interface RunControlOptions {
  readonly directory: string
  // How long a registration's heartbeat may stand still before it is taken
  // for a runner that no longer exists.
  readonly staleAfterMillis: number
  // How long to wait for live runners to pause before giving up the swap.
  readonly pauseTimeoutMillis: number
}

interface RunControl {
  readonly withRunnersPaused: (
    fs: RunControlFileSystem,
    options: RunControlOptions,
  ) => <A, E, R>(swap: Effect.Effect<A, E, R>) => Effect.Effect<A, unknown, R>
}

const load = (): Promise<RunControl> =>
  import(
    /* @vite-ignore */ new URL(
      "../../../src/features/playground/services/run-control.ts",
      import.meta.url,
    ).href
  )

const options: RunControlOptions = {
  directory: ".run-control",
  staleAfterMillis: 1_000,
  pauseTimeoutMillis: 2_000,
}
const pause = ".run-control/pause"
const registration = ".run-control/123"

const memoryFileSystem = (
  files: Map<string, string>,
  overrides: Partial<RunControlFileSystem> = {},
): RunControlFileSystem => ({
  mkdir: async () => undefined,
  writeFile: async (path, data) => void files.set(path, data),
  readFile: async (path) => {
    const content = files.get(path)
    if (content === undefined) throw new Error(`ENOENT ${path}`)
    return content
  },
  readdir: async (directory) =>
    [...files.keys()]
      .filter((path) => path.startsWith(`${directory}/`))
      .map((path) => path.slice(directory.length + 1)),
  rm: async (path) => void files.delete(path),
  ...overrides,
})

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

test("a live runner that never pauses fails the swap without running it", async () => {
  const { withRunnersPaused } = await load()
  const files = new Map([[registration, "watching"]])
  let beat = 0
  const fs = memoryFileSystem(files, {
    readFile: async (path) => {
      if (path === `${registration}.beat`) return String(beat++)
      const content = files.get(path)
      if (content === undefined) throw new Error(`ENOENT ${path}`)
      return content
    },
  })
  let swapped = false

  const exit = await Effect.runPromiseExit(
    withRunnersPaused(fs, options)(Effect.sync(() => (swapped = true))),
  )

  assert.isTrue(Exit.isFailure(exit))
  assert.isFalse(swapped)
  assert.isFalse(files.has(pause), "the pause is released")
})

test("an interrupted swap keeps the pause until its file changes settle", async () => {
  const { withRunnersPaused } = await load()
  const files = new Map<string, string>()
  const events: Array<string> = []
  let finishMount!: () => void
  let mountStarted!: () => void
  const started = new Promise<void>((resolve) => (mountStarted = resolve))
  const fs = memoryFileSystem(files, {
    rm: async (path) => {
      events.push(`release ${path}`)
      files.delete(path)
    },
  })

  const fiber = Effect.runFork(
    withRunnersPaused(
      fs,
      options,
    )(
      Effect.promise(async () => {
        events.push("mount started")
        mountStarted()
        await new Promise<void>((resolve) => (finishMount = resolve))
        events.push("mount finished")
      }),
    ),
  )
  await started
  const interrupted = Effect.runPromise(Fiber.interrupt(fiber))
  await sleep(100)

  assert.isTrue(files.has(pause), "runners stay paused while files change")

  finishMount()
  await interrupted
  assert.deepEqual(events, [
    "mount started",
    "mount finished",
    `release ${pause}`,
  ])
})

test("a pause that cannot be released is reported, not swallowed", async () => {
  const { withRunnersPaused } = await load()
  const files = new Map<string, string>()
  const fs = memoryFileSystem(files, {
    rm: async (path) => {
      if (path === pause) throw new Error("injected release failure")
      files.delete(path)
    },
  })

  const exit = await Effect.runPromiseExit(
    withRunnersPaused(fs, options)(Effect.succeed("swapped")),
  )

  assert.isTrue(Exit.isFailure(exit))
})
