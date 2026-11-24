import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { TestClock } from "effect/testing"
import { assert, describe, test } from "vite-plus/test"
import {
  makeContainer,
  mirrorWorkspace,
} from "../../../src/features/scratchpad/container.ts"
import {
  type FakeContainerBackend,
  type FakeJshCommand,
  type FakeShell,
  makeFakeContainerBackend,
} from "./fake-container.ts"
import { makeDependencies } from "../../../src/features/scratchpad/dependencies.ts"
import {
  makeRuns,
  runBlockingErrorsOf,
  type RunBlockingError,
  type RunsService,
} from "../../../src/features/scratchpad/runs.ts"
import {
  makeTerminal,
  type TerminalService,
} from "../../../src/features/scratchpad/terminal.ts"
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

/** The line a Run types into the terminal. */
const RUN_LINE = "node ../.scratchpad/run.cjs src/main.ts"

const TYPE_ERROR: RunBlockingError = {
  path: "src/main.ts",
  line: 1,
  column: 13,
  endLine: 1,
  endColumn: 20,
  message:
    "Argument of type 'string' is not assignable to parameter of type 'number'.",
  code: "TS2345",
  source: 'console.log("hello")',
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
  readonly terminal: TerminalService
  /** What the gate (tsrs) reports next. */
  readonly setErrors: (errors: ReadonlyArray<RunBlockingError>) => void
  /** The terminal's shell. */
  readonly shell: () => FakeShell
  /** The Run lines typed into the shell so far. */
  readonly runLines: () => ReadonlyArray<string>
  /** The terminal's text, without colors. */
  readonly output: () => Effect.Effect<string>
  /** The visitor types into the terminal. */
  readonly type: (data: string) => Effect.Effect<void>
}

interface Scenario {
  /** Answers each Run; by default it prints "hello" and exits 0. */
  readonly run?: (index: number) => FakeJshCommand
  /** Answers each visitor command; by default it exits 0. */
  readonly command?: (line: string) => FakeJshCommand
  /** Answers each `pnpm install` after the first; by default it succeeds. */
  readonly reinstall?: (index: number) => {
    readonly exit?: Promise<number>
    readonly exitCode?: number
  }
}

/** Terminal text without colors. */
const plain = (text: string) =>
  // oxlint-disable-next-line no-control-regex
  text.replace(/\u001b\[[0-9;]*m/g, "")

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
              // The types collector writes its pack where it is told.
              const out = call.args[2]!.split("/").at(-1)!
              backend.hostFiles.set(out, new Uint8Array([1]))
              return { exitCode: 0 }
            }
            return { exitCode: 0 }
          },
          command: (line) => {
            if (line === RUN_LINE) {
              runCount += 1
              return (
                scenario.run?.(runCount) ?? {
                  exitCode: 0,
                  output: ["hello\r\n"],
                }
              )
            }
            return scenario.command?.(line) ?? {}
          },
        })
        const container = yield* makeContainer(Effect.succeed(backend))
        const deps = yield* makeDependencies({
          workspace: ws,
          container,
          mirror: Option.some(mirror),
        })
        const terminal = yield* makeTerminal({
          container,
          installLogs: deps.installLogChanges,
        })
        let errors: ReadonlyArray<RunBlockingError> = []
        const runs = yield* makeRuns({
          container,
          dependencies: deps,
          terminal,
          blockingErrors: Effect.sync(() => errors),
        })
        yield* mirrorWorkspace(ws, container, {
          onChange: (change) =>
            deps
              .onMirrorChange(change)
              .pipe(Effect.andThen(runs.onMirrorChange(change))),
        })
        yield* terminal.open({ cols: 100, rows: 30 })
        yield* settle
        return yield* body({
          ws,
          backend,
          runs,
          terminal,
          setErrors: (next) => {
            errors = next
          },
          shell: () => backend.shells.at(-1)!,
          runLines: () =>
            (backend.shells.at(-1)?.lines ?? []).filter(
              (line) => line === RUN_LINE,
            ),
          output: () =>
            terminal.output.pipe(Effect.map((output) => plain(output.text))),
          type: (data) => terminal.input(data).pipe(Effect.andThen(settle)),
        })
      }),
    ).pipe(Effect.provide(TestClock.layer())),
  )

const edit = (ctx: Ctx, content: string) =>
  ctx.ws.writeFile("src/main.ts", content).pipe(Effect.andThen(settle))

describe("Runs", () => {
  test("the first Run is typed into the terminal once the installed types are ready, with its scripts in the host dir", async () => {
    await setup({}, (ctx) =>
      Effect.gen(function* () {
        assert.isTrue((yield* ctx.runs.state).available)
        assert.lengthOf(ctx.runLines(), 0, "the first Run waits ~500 ms")
        yield* advance(500)

        assert.deepEqual(ctx.runLines(), [RUN_LINE])
        assert.isTrue(ctx.backend.hostFiles.has("run-preload.mjs"))
        assert.isTrue(ctx.backend.hostFiles.has("run.cjs"))
        assert.isFalse(ctx.backend.files.has("run.cjs"))
        const state = yield* ctx.runs.state
        assert.equal(state.run?.trigger, "initial")
        assert.equal(state.run?.entry, "src/main.ts")
        assert.deepEqual(state.run?.status, { _tag: "exited", exitCode: 0 })
        assert.equal(state.run?.endedAt, 500)
        const text = yield* ctx.output()
        assert.include(text, `❯ ${RUN_LINE}`)
        assert.include(text, "hello\r\nexited with code 0 · ")
        assert.notInclude(text, "scratchpad-run", "markers are not shown")
      }),
    )
  })

  test("debounces edits: one Run about 500 ms after the last edit", async () => {
    await setup({}, (ctx) =>
      Effect.gen(function* () {
        yield* advance(500)
        assert.lengthOf(ctx.runLines(), 1)

        yield* edit(ctx, 'console.log("a")')
        yield* advance(300)
        yield* edit(ctx, 'console.log("ab")')
        yield* advance(300)
        assert.lengthOf(ctx.runLines(), 1, "still typing")
        yield* advance(200)
        assert.lengthOf(ctx.runLines(), 2)
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

  test("a new Run sends Ctrl+C to the running one before typing its command, and keeps the terminal's history", async () => {
    await setup(
      { run: (index) => ({ hang: true, output: [`run ${index}\r\n`] }) },
      (ctx) =>
        Effect.gen(function* () {
          yield* advance(500)
          assert.include(yield* ctx.output(), "run 1")
          assert.deepEqual((yield* ctx.runs.state).run?.status, {
            _tag: "running",
          })

          yield* edit(ctx, "edited")
          yield* advance(500)
          const input = ctx.shell().input.join("")
          assert.include(input, `\u0003${RUN_LINE}\r`)
          assert.lengthOf(ctx.runLines(), 2)
          const state = yield* ctx.runs.state
          assert.equal(state.run?.id, 2)
          assert.deepEqual(state.run?.status, { _tag: "running" })
          const text = yield* ctx.output()
          assert.include(text, "run 1")
          assert.include(text, "run 2")
        }),
    )
  })

  test("there is no time limit", async () => {
    await setup({ run: () => ({ hang: true }) }, (ctx) =>
      Effect.gen(function* () {
        yield* advance(500)
        yield* advance(60 * 60 * 1000)
        assert.notInclude(ctx.shell().input.join(""), "\u0003")
        assert.deepEqual((yield* ctx.runs.state).run?.status, {
          _tag: "running",
        })
      }),
    )
  })

  test("a type error skips the Run and stops the running one; the next Run clears the skip", async () => {
    await setup(
      { run: (index) => ({ hang: true, output: [`run ${index}\r\n`] }) },
      (ctx) =>
        Effect.gen(function* () {
          yield* advance(500)

          ctx.setErrors([TYPE_ERROR])
          yield* edit(ctx, "broken")
          yield* advance(500)

          assert.lengthOf(ctx.runLines(), 1, "skipped: nothing typed")
          assert.include(ctx.shell().input.join(""), "\u0003")
          const state = yield* ctx.runs.state
          assert.deepEqual(state.skipped, {
            trigger: "src/main.ts changed",
            at: 1000,
            errors: [TYPE_ERROR],
          })
          assert.equal(state.run?.id, 1)
          assert.deepEqual(state.run?.status, { _tag: "stopped" })
          assert.notInclude(
            yield* ctx.output(),
            "TS2345",
            "the report is a banner, not terminal text",
          )

          ctx.setErrors([])
          yield* edit(ctx, "fixed")
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
        assert.lengthOf(ctx.runLines(), 0)
        const state = yield* ctx.runs.state
        assert.isUndefined(state.run)
        assert.equal(state.skipped?.trigger, "initial")
      }),
    )
  })

  test("waits for an install to finish before running edits made during it, and prints the install into the terminal", async () => {
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
          assert.lengthOf(ctx.runLines(), 1)

          // As `pnpm add` will: the host writes it, the mirror installs.
          yield* ctx.ws.writeHostFile(
            "package.json",
            '{ "dependencies": { "effect": "latest", "ms": "2" } }',
          )
          yield* settle
          yield* advance(500)
          yield* advance(5000)
          assert.isFalse((yield* ctx.runs.state).available)
          assert.lengthOf(ctx.runLines(), 1, "no Run while installing")

          finishInstall(0)
          yield* settle
          yield* advance(500)
          assert.isTrue((yield* ctx.runs.state).available)
          assert.lengthOf(ctx.runLines(), 2)
          const text = yield* ctx.output()
          assert.equal(text.split("$ pnpm install").length - 1, 2)
        }),
    )
  })

  test("Stop sends Ctrl+C to the Run; Restart runs again without edits and is still gated", async () => {
    await setup({ run: () => ({ hang: true }) }, (ctx) =>
      Effect.gen(function* () {
        yield* advance(500)
        yield* ctx.runs.stop
        yield* settle
        assert.equal(ctx.shell().input.at(-1), "\u0003")
        assert.deepEqual((yield* ctx.runs.state).run?.status, {
          _tag: "stopped",
        })

        yield* ctx.runs.restart
        yield* settle
        assert.lengthOf(ctx.runLines(), 2, "Restart does not wait 500 ms")
        assert.equal((yield* ctx.runs.state).run?.trigger, "restart")

        ctx.setErrors([TYPE_ERROR])
        yield* ctx.runs.restart
        yield* settle
        assert.lengthOf(ctx.runLines(), 2)
        assert.equal((yield* ctx.runs.state).skipped?.trigger, "restart")
        assert.deepEqual((yield* ctx.runs.state).run?.status, {
          _tag: "stopped",
        })
      }),
    )
  })

  test("reports a non-zero exit code", async () => {
    await setup(
      { run: () => ({ exitCode: 1, output: ["Error: boom\r\n"] }) },
      (ctx) =>
        Effect.gen(function* () {
          yield* advance(500)
          assert.deepEqual((yield* ctx.runs.state).run?.status, {
            _tag: "exited",
            exitCode: 1,
          })
          assert.match(yield* ctx.output(), /exited with code 1 · /)
        }),
    )
  })

  test("Ctrl+C typed by the visitor stops the Run", async () => {
    await setup({ run: () => ({ hang: true }) }, (ctx) =>
      Effect.gen(function* () {
        yield* advance(500)
        yield* ctx.type("\u0003")
        assert.deepEqual((yield* ctx.runs.state).run?.status, {
          _tag: "stopped",
        })
      }),
    )
  })
})

describe("the typing guard", () => {
  test("a Run waits while the visitor has typed at the prompt; Enter runs their command, then the Run goes once it finishes", async () => {
    let finishCommand!: () => void
    await setup(
      {
        command: () => ({ hang: true, output: ["Packages: +1\r\n"] }),
      },
      (ctx) =>
        Effect.gen(function* () {
          yield* advance(500)
          assert.lengthOf(ctx.runLines(), 1)

          yield* ctx.type("pnpm add zo")
          yield* edit(ctx, "edited")
          yield* advance(500)
          assert.lengthOf(ctx.runLines(), 1, "the Run waits")
          assert.equal((yield* ctx.runs.state).waiting, "typing")
          assert.notInclude(ctx.shell().input.join(""), "\u0003")

          yield* ctx.type("d\r")
          assert.deepEqual(ctx.shell().lines.at(-1), "pnpm add zod")
          assert.equal(
            (yield* ctx.runs.state).waiting,
            "command",
            "the Run waits for the command too",
          )
          yield* advance(5000)
          assert.lengthOf(ctx.runLines(), 1)

          finishCommand = () => ctx.shell().finish(0)
          finishCommand()
          yield* settle
          assert.isUndefined((yield* ctx.runs.state).waiting)
          assert.lengthOf(ctx.runLines(), 2)
          assert.notInclude(
            ctx.shell().input.join(""),
            "\u0003",
            "the finished command was not interrupted",
          )
          assert.equal(
            (yield* ctx.runs.state).run?.trigger,
            "src/main.ts changed",
          )
        }),
    )
  })

  test("Esc discards the typed line with Ctrl+U, then the Run goes", async () => {
    await setup({}, (ctx) =>
      Effect.gen(function* () {
        yield* advance(500)
        yield* ctx.type("ls -l")
        yield* ctx.runs.restart
        yield* settle
        assert.equal((yield* ctx.runs.state).waiting, "typing")

        yield* ctx.terminal.discardInput
        yield* settle
        assert.include(ctx.shell().input.join(""), `\u0015`)
        assert.lengthOf(ctx.runLines(), 2)
        assert.notInclude(ctx.shell().lines, "ls -l")
        assert.isUndefined((yield* ctx.runs.state).waiting)
      }),
    )
  })

  test("Esc stops the visitor's running command with Ctrl+C, then the Run goes", async () => {
    await setup({ command: () => ({ hang: true }) }, (ctx) =>
      Effect.gen(function* () {
        yield* advance(500)
        yield* ctx.type("npx serve\r")
        yield* ctx.runs.restart
        yield* settle
        assert.equal((yield* ctx.runs.state).waiting, "command")

        yield* ctx.terminal.discardInput
        yield* settle
        assert.include(ctx.shell().input.join(""), "\u0003")
        assert.lengthOf(ctx.runLines(), 2)
      }),
    )
  })

  test("Ctrl+U and Ctrl+C clear the typed line, and an empty Enter is not a command", async () => {
    await setup({}, (ctx) =>
      Effect.gen(function* () {
        yield* advance(500)
        yield* ctx.type("abc")
        assert.isTrue((yield* ctx.terminal.state).typing)
        yield* ctx.type("\u0015")
        assert.isFalse((yield* ctx.terminal.state).typing)
        yield* ctx.type("abc")
        yield* ctx.type("\u0003")
        assert.isFalse((yield* ctx.terminal.state).typing)
        yield* ctx.type("\r")
        assert.equal((yield* ctx.terminal.state).foreground, "idle")
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
              {
                severity: 1,
                message: "second",
                code: 2769,
                range: range(6, 34),
              },
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
        (path, line) => (path === "src/main.ts" ? `line ${line}` : undefined),
      ),
      [
        {
          path: "src/a.ts",
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 2,
          message: "in a",
          code: undefined,
          source: undefined,
        },
        {
          path: "src/main.ts",
          line: 6,
          column: 3,
          endLine: 6,
          endColumn: 4,
          message: "first",
          code: undefined,
          source: "line 6",
        },
        {
          path: "src/main.ts",
          line: 7,
          column: 35,
          endLine: 7,
          endColumn: 36,
          message: "second",
          code: "TS2769",
          source: "line 7",
        },
      ],
    )
  })
})
