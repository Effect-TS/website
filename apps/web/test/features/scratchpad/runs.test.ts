import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { TestClock } from "effect/testing"
import { assert, describe, test } from "vite-plus/test"
import {
  type FakeContainerBackend,
  type FakeSpawnCall,
  type FakeSpawnResult,
  makeContainer,
  makeFakeContainerBackend,
  mirrorWorkspace,
} from "../../../src/features/scratchpad/container.ts"
import {
  makeDependencies,
  TYPES_PACK_NAME,
} from "../../../src/features/scratchpad/dependencies.ts"
import {
  makeRuns,
  RUN_PRELOAD_NAME,
  RUN_PRELOAD_SCRIPT,
  runBlockingErrorsOf,
  type RunBlockingError,
  type RunsService,
} from "../../../src/features/scratchpad/runs.ts"
import type { LspWorkspaceMirrorService } from "../../../src/features/scratchpad/worker-transport.ts"
import {
  makeMemoryWorkspace,
  type WorkspaceService,
} from "../../../src/features/scratchpad/workspace.ts"

const SEED = {
  "package.json": '{ "dependencies": { "effect": "latest" } }',
  "tsconfig.json": "{}",
  "src/main.ts": 'console.log("hello")',
}

const RUNNER =
  "node --experimental-transform-types --disable-warning=ExperimentalWarning --import ../.scratchpad/run-preload.mjs src/main.ts"

const TYPE_ERROR: RunBlockingError = {
  path: "src/main.ts",
  line: 1,
  column: 13,
  message:
    "Argument of type 'string' is not assignable to parameter of type 'number'.",
}

/** Lets promises and forked fibers run (real timers; the Effect clock is a TestClock). */
const settle = Effect.promise(
  () =>
    new Promise<void>((resolve) => {
      let n = 0
      const tick = () => (++n >= 8 ? resolve() : setTimeout(tick, 0))
      tick()
    }),
)

const advance = (millis: number) =>
  TestClock.adjust(`${millis} millis`).pipe(Effect.andThen(settle))

const mirror: LspWorkspaceMirrorService = {
  apply: () => {},
  mountTypes: (pack) =>
    Effect.succeed({
      _tag: "TypesMounted",
      id: 1,
      files: 1,
      bytes: pack.byteLength,
      packages: [],
    }),
}

interface Ctx {
  readonly ws: WorkspaceService
  readonly backend: FakeContainerBackend
  readonly runs: RunsService
  /** What the gate (tsrs) reports next. */
  readonly setErrors: (errors: ReadonlyArray<RunBlockingError>) => void
  /** The Runs' `node src/main.ts` spawns so far. */
  readonly runSpawns: () => ReadonlyArray<FakeSpawnCall>
  readonly output: () => Effect.Effect<string>
}

interface Scenario {
  /** Answers each Run's spawn; by default it prints "hello" and exits 0. */
  readonly run?: (index: number) => FakeSpawnResult
  /** Answers each `pnpm install` after the first; by default it succeeds. */
  readonly reinstall?: (index: number) => FakeSpawnResult
}

const setup = <A>(
  scenario: Scenario,
  body: (ctx: Ctx) => Effect.Effect<A, unknown>,
): Promise<A> =>
  Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const ws = yield* makeMemoryWorkspace({ initialFiles: SEED })
        let installs = 0
        let runCount = 0
        const backend: FakeContainerBackend = makeFakeContainerBackend({
          spawn: (call) => {
            if (call.command === "pnpm") {
              installs += 1
              return installs === 1
                ? { exitCode: 0 }
                : (scenario.reinstall?.(installs - 1) ?? { exitCode: 0 })
            }
            if (call.args[0]?.endsWith("collect-types.cjs")) {
              backend.hostFiles.set(TYPES_PACK_NAME, new Uint8Array([1]))
              return { exitCode: 0 }
            }
            runCount += 1
            return (
              scenario.run?.(runCount) ?? {
                exitCode: 0,
                output: ["hello\n"],
              }
            )
          },
        })
        const container = yield* makeContainer(Effect.succeed(backend))
        const deps = yield* makeDependencies({
          workspace: ws,
          container,
          mirror: Option.some(mirror),
        })
        let errors: ReadonlyArray<RunBlockingError> = []
        const runs = yield* makeRuns({
          container,
          dependencies: deps,
          blockingErrors: Effect.sync(() => errors),
        })
        yield* mirrorWorkspace(ws, container, {
          onChange: (change) =>
            deps
              .onMirrorChange(change)
              .pipe(Effect.andThen(runs.onMirrorChange(change))),
        })
        yield* settle
        return yield* body({
          ws,
          backend,
          runs,
          setErrors: (next) => {
            errors = next
          },
          runSpawns: () =>
            backend.spawned.filter((call) => call.args.includes("src/main.ts")),
          output: () => runs.output.pipe(Effect.map((output) => output.text)),
        })
      }),
    ).pipe(Effect.provide(TestClock.layer())),
  )

const command = (call: FakeSpawnCall) => [call.command, ...call.args].join(" ")

describe("Runs", () => {
  test("starts the first Run once the installed types are ready, with the preload in the host dir and a header", async () => {
    await setup({}, (ctx) =>
      Effect.gen(function* () {
        assert.isTrue((yield* ctx.runs.state).available)
        assert.lengthOf(ctx.runSpawns(), 0, "the first Run waits ~500 ms")
        yield* advance(500)

        assert.deepEqual(ctx.runSpawns().map(command), [RUNNER])
        assert.equal(
          ctx.backend.hostFiles.get(RUN_PRELOAD_NAME),
          RUN_PRELOAD_SCRIPT,
        )
        const state = yield* ctx.runs.state
        assert.equal(state.run?.id, 1)
        assert.equal(state.run?.trigger, "initial")
        assert.deepEqual(state.run?.status, { _tag: "exited", exitCode: 0 })
        const text = yield* ctx.output()
        assert.match(text, /^\S*▶ Run #1\S* · \d\d:\d\d:\d\d · \S*initial/)
        assert.include(text, "hello\n")
        assert.match(text, /exited with code 0\S*\r\n$/)
      }),
    )
  })

  test("debounces edits: one Run about 500 ms after the last edit", async () => {
    await setup({}, (ctx) =>
      Effect.gen(function* () {
        yield* advance(500)
        assert.lengthOf(ctx.runSpawns(), 1)

        yield* ctx.ws.writeFile("src/main.ts", 'console.log("a")')
        yield* settle
        yield* advance(300)
        yield* ctx.ws.writeFile("src/main.ts", 'console.log("ab")')
        yield* settle
        yield* advance(300)
        assert.lengthOf(ctx.runSpawns(), 1, "still typing")
        yield* advance(200)
        assert.lengthOf(ctx.runSpawns(), 2)
        assert.equal(ctx.backend.files.get("src/main.ts"), 'console.log("ab")')
        const state = yield* ctx.runs.state
        assert.equal(state.run?.trigger, "src/main.ts changed")
        assert.equal(state.run?.id, 2)
      }),
    )
  })

  test("names the trigger after every file that changed", async () => {
    await setup({}, (ctx) =>
      Effect.gen(function* () {
        yield* advance(500)
        yield* ctx.ws.writeFile("src/main.ts", "1")
        yield* ctx.ws.createFile("src/util.ts", "2")
        yield* settle
        yield* advance(500)
        assert.equal((yield* ctx.runs.state).run?.trigger, "2 files changed")
      }),
    )
  })

  test("a new Run kills the previous process and clears the output", async () => {
    await setup(
      {
        run: (index) => ({ hang: true, output: [`run ${index}\n`] }),
      },
      (ctx) =>
        Effect.gen(function* () {
          yield* advance(500)
          assert.include(yield* ctx.output(), "run 1")
          assert.deepEqual((yield* ctx.runs.state).run?.status, {
            _tag: "running",
          })

          yield* ctx.ws.writeFile("src/main.ts", "edited")
          yield* settle
          yield* advance(500)
          assert.equal(ctx.backend.killed(), 1)
          const text = yield* ctx.output()
          assert.match(text, /Run #2/)
          assert.include(text, "run 2")
          assert.notInclude(text, "run 1")
          assert.equal((yield* ctx.runs.output).runId, 2)
        }),
    )
  })

  test("there is no time limit", async () => {
    await setup({ run: () => ({ hang: true }) }, (ctx) =>
      Effect.gen(function* () {
        yield* advance(500)
        yield* advance(60 * 60 * 1000)
        assert.equal(ctx.backend.killed(), 0)
        assert.deepEqual((yield* ctx.runs.state).run?.status, {
          _tag: "running",
        })
      }),
    )
  })

  test("a type error skips the Run, stops the previous process and keeps its output; fixing it runs again", async () => {
    await setup(
      { run: (index) => ({ hang: true, output: [`run ${index}\n`] }) },
      (ctx) =>
        Effect.gen(function* () {
          yield* advance(500)

          ctx.setErrors([TYPE_ERROR])
          yield* ctx.ws.writeFile("src/main.ts", "broken")
          yield* settle
          yield* advance(500)

          assert.lengthOf(ctx.runSpawns(), 1, "skipped: nothing spawned")
          assert.equal(ctx.backend.killed(), 1, "the previous process stops")
          const state = yield* ctx.runs.state
          assert.deepEqual(state.skipped, {
            trigger: "src/main.ts changed",
            at: 1000,
            errors: [TYPE_ERROR],
            previousRunId: 1,
          })
          assert.equal(state.run?.id, 1)
          assert.deepEqual(state.run?.status, { _tag: "stopped" })
          const text = yield* ctx.output()
          assert.include(text, "run 1", "the previous output stays")
          assert.include(text, "stopped")

          ctx.setErrors([])
          yield* ctx.ws.writeFile("src/main.ts", "fixed")
          yield* settle
          yield* advance(500)
          const after = yield* ctx.runs.state
          assert.isUndefined(after.skipped)
          assert.equal(after.run?.id, 2)
          assert.include(yield* ctx.output(), "run 2")
        }),
    )
  })

  test("the first Run is gated too", async () => {
    await setup({}, (ctx) =>
      Effect.gen(function* () {
        ctx.setErrors([TYPE_ERROR])
        yield* advance(500)
        assert.lengthOf(ctx.runSpawns(), 0)
        const state = yield* ctx.runs.state
        assert.isUndefined(state.run)
        assert.equal(state.skipped?.trigger, "initial")
        assert.isUndefined(state.skipped?.previousRunId)
      }),
    )
  })

  test("waits for an install to finish before running edits made during it", async () => {
    let finishInstall!: (code: number) => void
    await setup(
      {
        reinstall: () => ({
          exit: new Promise<number>((resolve) => {
            finishInstall = resolve
          }),
        }),
      },
      (ctx) =>
        Effect.gen(function* () {
          yield* advance(500)
          assert.lengthOf(ctx.runSpawns(), 1)

          // As `pnpm add` will: the host writes it, the mirror installs.
          yield* ctx.ws.writeHostFile(
            "package.json",
            '{ "dependencies": { "effect": "latest", "ms": "2" } }',
          )
          yield* settle
          yield* advance(500)
          yield* advance(5000)
          assert.isFalse((yield* ctx.runs.state).available)
          assert.lengthOf(ctx.runSpawns(), 1, "no Run while installing")

          finishInstall(0)
          yield* settle
          yield* advance(500)
          assert.isTrue((yield* ctx.runs.state).available)
          assert.lengthOf(ctx.runSpawns(), 2)
        }),
    )
  })

  test("Stop kills the Run; Restart runs again without edits and is still gated", async () => {
    await setup({ run: () => ({ hang: true }) }, (ctx) =>
      Effect.gen(function* () {
        yield* advance(500)
        yield* ctx.runs.stop
        yield* settle
        assert.equal(ctx.backend.killed(), 1)
        assert.deepEqual((yield* ctx.runs.state).run?.status, {
          _tag: "stopped",
        })
        assert.match(yield* ctx.output(), /stopped\S*\r\n$/)

        yield* ctx.runs.restart
        yield* settle
        assert.lengthOf(ctx.runSpawns(), 2, "Restart does not wait 500 ms")
        assert.equal((yield* ctx.runs.state).run?.trigger, "restart")

        ctx.setErrors([TYPE_ERROR])
        yield* ctx.runs.restart
        yield* settle
        assert.lengthOf(ctx.runSpawns(), 2)
        assert.equal(ctx.backend.killed(), 2)
        assert.equal((yield* ctx.runs.state).skipped?.trigger, "restart")
      }),
    )
  })

  test("reports a non-zero exit code", async () => {
    await setup(
      { run: () => ({ exitCode: 1, output: ["Error: boom\n"] }) },
      (ctx) =>
        Effect.gen(function* () {
          yield* advance(500)
          assert.deepEqual((yield* ctx.runs.state).run?.status, {
            _tag: "exited",
            exitCode: 1,
          })
          assert.match(yield* ctx.output(), /exited with code 1/)
        }),
    )
  })
})

describe("runBlockingErrorsOf", () => {
  test("keeps errors only, 1-based, sorted by path and position", () => {
    const range = (line: number, character: number) => ({
      start: { line, character },
      end: { line, character: character + 1 },
    })
    assert.deepEqual(
      runBlockingErrorsOf(
        new Map([
          [
            "file:///workspace/src/main.ts",
            [
              { severity: 2, message: "warning", range: range(0, 0) },
              { severity: 1, message: "second", range: range(6, 34) },
              { severity: 1, message: "first", range: range(5, 2) },
              { severity: 3, message: "info", range: range(1, 0) },
              { severity: 4, message: "hint", range: range(1, 0) },
            ],
          ],
          [
            "file:///workspace/src/a.ts",
            [{ severity: 1, message: "in a", range: range(0, 0) }],
          ],
        ]),
        "file:///workspace",
      ),
      [
        { path: "src/a.ts", line: 1, column: 1, message: "in a" },
        { path: "src/main.ts", line: 6, column: 3, message: "first" },
        { path: "src/main.ts", line: 7, column: 35, message: "second" },
      ],
    )
  })
})
