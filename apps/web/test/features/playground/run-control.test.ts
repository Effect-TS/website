import { assert, test } from "vite-plus/test"
import { Effect, Exit, Fiber } from "effect"

// File system errors as WebContainer's `fs` reports them: only ENOENT says a
// path is gone; anything else says nothing about it.
const fsError = (code: string, path: string) =>
  Object.assign(new Error(`${code}: ${path}`), { code })

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
  // Whether a process exists; only `false` lets a registration be dropped.
  readonly isAlive?: (pid: number) => Effect.Effect<boolean>
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
    if (content === undefined) throw fsError("ENOENT", path)
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
      if (content === undefined) throw fsError("ENOENT", path)
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

// A registration whose heartbeat stands still, as a blocked compile or an
// exited runner leaves it.
const frozenRegistration = () =>
  new Map([
    [registration, "watching"],
    [`${registration}.beat`, "7"],
  ])

test("a still heartbeat drops the registration only when its process is gone", async () => {
  const { withRunnersPaused } = await load()
  const files = frozenRegistration()
  const asked: Array<number> = []
  let swapped = false

  const exit = await Effect.runPromiseExit(
    withRunnersPaused(memoryFileSystem(files), {
      ...options,
      staleAfterMillis: 200,
      isAlive: (pid) => Effect.sync(() => (asked.push(pid), false)),
    })(Effect.sync(() => (swapped = true))),
  )

  assert.isTrue(Exit.isSuccess(exit))
  assert.isTrue(swapped)
  assert.include(asked, 123)
  assert.isFalse(files.has(registration), "the exited runner is forgotten")
  assert.isFalse(files.has(pause))
})

test("a still heartbeat on a live process fails the swap closed", async () => {
  const { withRunnersPaused } = await load()
  const files = frozenRegistration()
  let swapped = false

  const exit = await Effect.runPromiseExit(
    withRunnersPaused(memoryFileSystem(files), {
      ...options,
      staleAfterMillis: 200,
      pauseTimeoutMillis: 800,
      isAlive: () => Effect.succeed(true),
    })(Effect.sync(() => (swapped = true))),
  )

  assert.isTrue(Exit.isFailure(exit))
  assert.isFalse(swapped)
  assert.isTrue(files.has(registration), "a live runner keeps its registration")
  assert.isFalse(files.has(pause), "the pause is released")
})

test("liveness checks that never answer share one pause timeout", async () => {
  const { withRunnersPaused } = await load()
  // Three stalled runners: their checks together get one budget, not one each.
  const files = new Map(
    ["123", "124", "125"].flatMap((pid) => [
      [`.run-control/${pid}`, "watching"],
      [`.run-control/${pid}.beat`, "7"],
    ]) as Array<[string, string]>,
  )
  let swapped = false
  const started = Date.now()

  const exit = await Effect.runPromiseExit(
    withRunnersPaused(memoryFileSystem(files), {
      ...options,
      staleAfterMillis: 100,
      pauseTimeoutMillis: 500,
      isAlive: () => Effect.never,
    })(Effect.sync(() => (swapped = true))),
  ).then(
    (exit) => exit,
    () => undefined,
  )

  // 500 ms of budget, plus room for polling.
  assert.isAtMost(Date.now() - started, 1_000, "the swap gave up in time")
  assert.isTrue(exit !== undefined && Exit.isFailure(exit))
  assert.isFalse(swapped)
  assert.isFalse(files.has(pause), "the pause is released")
}, 5_000)

test("an unreadable control directory fails the swap closed", async () => {
  const { withRunnersPaused } = await load()
  const files = new Map([[registration, "watching"]])
  let swapped = false

  const exit = await Effect.runPromiseExit(
    withRunnersPaused(
      memoryFileSystem(files, {
        readdir: async (path) => {
          throw fsError("EIO", path)
        },
      }),
      { ...options, pauseTimeoutMillis: 500 },
    )(Effect.sync(() => (swapped = true))),
  )

  assert.isTrue(Exit.isFailure(exit))
  assert.isFalse(swapped)
  assert.isFalse(files.has(pause), "the pause is released")
})

test("an unreadable registration fails the swap closed", async () => {
  const { withRunnersPaused } = await load()
  const files = new Map([[registration, "watching"]])
  let swapped = false

  const exit = await Effect.runPromiseExit(
    withRunnersPaused(
      memoryFileSystem(files, {
        readFile: async (path) => {
          if (path === registration) throw fsError("EIO", path)
          const content = files.get(path)
          if (content === undefined) throw fsError("ENOENT", path)
          return content
        },
      }),
      { ...options, pauseTimeoutMillis: 500 },
    )(Effect.sync(() => (swapped = true))),
  )

  assert.isTrue(Exit.isFailure(exit))
  assert.isFalse(swapped)
  assert.isFalse(files.has(pause), "the pause is released")
})

// Every workspace handle swaps through the same pause file, so swaps over one
// file system must not overlap, and the pause must stay up while one runs.
test("swaps sharing a pause never drop it while another is still changing files", async () => {
  const { withRunnersPaused } = await load()
  const files = new Map<string, string>()
  // Two workspace handles: separate callers over the one container file system.
  const fs = memoryFileSystem(files)
  const events: Array<string> = []
  const finish: Array<() => void> = []
  const swap = (name: string) =>
    Effect.promise(async () => {
      events.push(`${name} started`)
      await new Promise<void>((resolve) => finish.push(resolve))
      events.push(
        `${name} finished, pause ${files.has(pause) ? "held" : "dropped"}`,
      )
    })

  const first = Effect.runPromise(withRunnersPaused(fs, options)(swap("first")))
  const second = Effect.runPromise(
    withRunnersPaused(fs, options)(swap("second")),
  )
  while (finish.length === 0) await sleep(10)
  finish.shift()!()
  await first
  while (finish.length === 0) await sleep(10)
  assert.isTrue(files.has(pause), "the pause is held for the second swap")
  finish.shift()!()
  await second

  assert.deepEqual(events, [
    "first started",
    "first finished, pause held",
    "second started",
    "second finished, pause held",
  ])
  assert.isFalse(files.has(pause), "released once both settled")
})
