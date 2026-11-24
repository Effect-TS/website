import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import * as SubscriptionRef from "effect/SubscriptionRef"
import { TestClock } from "effect/testing"
import { assert, describe, test } from "vite-plus/test"
import {
  ContainerBootFailed,
  makeContainer,
} from "../../../src/features/scratchpad/container.ts"
import {
  emptyInstallLog,
  type InstallLog,
} from "../../../src/features/scratchpad/dependencies.ts"
import {
  makeShellOutputParser,
  makeTerminal,
  RUN_MARKER_PREFIX,
} from "../../../src/features/scratchpad/terminal.ts"
import { makeFakeContainerBackend } from "./fake-container.ts"

const settle = Effect.promise(
  () =>
    new Promise<void>((resolve) => {
      let n = 0
      const tick = () => (++n >= 8 ? resolve() : setTimeout(tick, 0))
      tick()
    }),
)

const plain = (text: string) =>
  // oxlint-disable-next-line no-control-regex
  text.replace(/\u001b\[[0-9;]*m/g, "")

const marker = (payload: string) => `${RUN_MARKER_PREFIX}${payload}\u0007`

const run = <A>(effect: Effect.Effect<A, unknown, Scope.Scope>) =>
  Effect.runPromise(
    Effect.scoped(effect).pipe(Effect.provide(TestClock.layer())),
  )

describe("makeShellOutputParser", () => {
  test("takes the runner's markers out of the text, even split across chunks", () => {
    const parse = makeShellOutputParser()
    const exit = marker("exit;3")
    assert.deepEqual(
      parse(`${marker("watch;start")}a${marker("start")}b${exit.slice(0, 5)}`),
      [
        { _tag: "WatchStarted" },
        { _tag: "Text", text: "a" },
        { _tag: "RunStarted" },
        { _tag: "Text", text: "b" },
      ],
    )
    assert.deepEqual(parse(`${exit.slice(5, 20)}`), [])
    assert.deepEqual(
      parse(`${exit.slice(20)}c\u001b[0m${marker("watch;exit")}`),
      [
        { _tag: "RunExited", exitCode: 3 },
        { _tag: "Text", text: "c\u001b[0m" },
        { _tag: "WatchExited" },
      ],
    )
  })

  test("lets other escape sequences through", () => {
    const parse = makeShellOutputParser()
    assert.deepEqual(parse("\u001b]0;title\u0007x"), [
      { _tag: "Text", text: "\u001b]0;title\u0007x" },
    ])
  })
})

describe("Terminal", () => {
  test("starts the shell at the panel's size once the Container is ready, after a retried boot", () =>
    run(
      Effect.gen(function* () {
        const backend = makeFakeContainerBackend()
        let attempts = 0
        const container = yield* makeContainer(
          Effect.suspend(() =>
            ++attempts === 1
              ? Effect.fail(new ContainerBootFailed({ message: "offline" }))
              : Effect.succeed(backend),
          ),
        )
        const terminal = yield* makeTerminal({ container })
        yield* terminal.open({ cols: 120, rows: 20 })
        yield* settle
        assert.lengthOf(backend.shells, 0)
        assert.equal((yield* terminal.state).shell, "closed")

        yield* container.retry
        yield* settle
        assert.lengthOf(backend.shells, 1)
        assert.deepEqual(backend.shells[0]!.sizes, [{ cols: 120, rows: 20 }])
        assert.equal((yield* terminal.state).shell, "open")
        assert.include(plain((yield* terminal.output).text), "~/workspace ❯ ")

        yield* terminal.resize({ cols: 90, rows: 10 })
        assert.deepEqual(backend.shells[0]!.sizes.at(-1), {
          cols: 90,
          rows: 10,
        })
      }),
    ))

  test("types the command once the Container can run code, after writing the runner and its preload", () =>
    run(
      Effect.gen(function* () {
        const backend = makeFakeContainerBackend()
        const container = yield* makeContainer(Effect.succeed(backend))
        const runnable = yield* Deferred.make<void>()
        const terminal = yield* makeTerminal({
          container,
          command: "../run src/main.ts",
          awaitRunnable: Deferred.await(runnable),
        })
        yield* terminal.open({ cols: 80, rows: 24 })
        yield* settle
        const shell = backend.shells[0]!
        // Still installing: nothing typed, nothing written.
        assert.deepEqual(shell.lines, [])
        assert.isFalse(backend.executables.has("run"))

        yield* Deferred.succeed(runnable, undefined)
        yield* settle
        assert.deepEqual(shell.lines, ["../run src/main.ts"])
        assert.include(backend.executables.get("run")!, "#!/usr/bin/env node")
        assert.include(
          String(backend.hostFiles.get("run-preload.mjs")),
          "registerHooks",
        )

        // A shell started after the visitor exits this one gets no command.
        shell.exit(0)
        yield* settle
        yield* TestClock.adjust("1 second")
        yield* settle
        assert.lengthOf(backend.shells, 2)
        assert.deepEqual(backend.shells[1]!.lines, [])
      }),
    ))

  test("after a retried boot, the new boot's shell gets the command", () =>
    run(
      Effect.gen(function* () {
        const backend = makeFakeContainerBackend()
        let attempts = 0
        const container = yield* makeContainer(
          Effect.suspend(() =>
            ++attempts === 1
              ? Effect.fail(new ContainerBootFailed({ message: "offline" }))
              : Effect.succeed(backend),
          ),
        )
        const terminal = yield* makeTerminal({
          container,
          command: "../run src/main.ts",
        })
        yield* terminal.open({ cols: 80, rows: 24 })
        yield* settle
        assert.lengthOf(backend.shells, 0)
        yield* container.retry
        yield* settle
        assert.deepEqual(backend.shells[0]!.lines, ["../run src/main.ts"])
      }),
    ))

  test("follows the runner and its Runs from the markers, and the shell going away stops them", () =>
    run(
      Effect.gen(function* () {
        const backend = makeFakeContainerBackend({
          command: () => ({ hang: true }),
        })
        const container = yield* makeContainer(Effect.succeed(backend))
        const terminal = yield* makeTerminal({ container })
        yield* terminal.open({ cols: 80, rows: 24 })
        yield* settle
        const shell = backend.shells[0]!
        yield* terminal.input("../run src/main.ts\r")
        yield* settle
        assert.deepEqual(shell.lines, ["../run src/main.ts"])

        shell.print(
          `${marker("watch;start")}\u001b[2J${marker("start")}hello\r\n`,
        )
        yield* settle
        let state = yield* terminal.state
        assert.isTrue(state.runner)
        assert.equal(state.run?.id, 1)
        assert.equal(state.run?.status._tag, "running")
        // The markers never reach the terminal's text.
        assert.notInclude((yield* terminal.output).text, "scratchpad-run")
        assert.include((yield* terminal.output).text, "hello")

        shell.print(`${marker("exit;0")}[12:00:00] Exited with code 0.\r\n`)
        yield* settle
        state = yield* terminal.state
        assert.deepEqual(state.run?.status, { _tag: "exited", exitCode: 0 })
        assert.isTrue(state.runner)

        shell.print(`${marker("start")}`)
        yield* settle
        state = yield* terminal.state
        assert.equal(state.run?.id, 2)
        assert.equal(state.run?.status._tag, "running")

        // Ctrl+C: the runner kills the program and exits.
        shell.print(`${marker("exit;130")}${marker("watch;exit")}`)
        yield* settle
        state = yield* terminal.state
        assert.isFalse(state.runner)
        assert.deepEqual(state.run?.status, { _tag: "exited", exitCode: 130 })

        shell.print(`${marker("watch;start")}${marker("start")}`)
        yield* settle
        assert.isTrue((yield* terminal.state).runner)
        shell.exit(0)
        yield* settle
        state = yield* terminal.state
        assert.equal(state.shell, "closed")
        assert.isFalse(state.runner)
        assert.equal(state.run?.status._tag, "stopped")
        assert.include(
          plain((yield* terminal.output).text),
          "The shell exited. Starting a new one…",
        )
      }),
    ))

  test("Restart touches the runner's restart file, only while the runner is in the foreground", () =>
    run(
      Effect.gen(function* () {
        const backend = makeFakeContainerBackend()
        const container = yield* makeContainer(Effect.succeed(backend))
        const terminal = yield* makeTerminal({ container })
        yield* terminal.open({ cols: 80, rows: 24 })
        yield* settle
        yield* terminal.restart
        assert.isFalse(backend.hostFiles.has("restart"))

        const shell = backend.shells[0]!
        shell.print(marker("watch;start"))
        yield* settle
        yield* terminal.restart
        const first = backend.hostFiles.get("restart")
        assert.isDefined(first)
        yield* TestClock.adjust("1 second")
        yield* terminal.restart
        assert.notEqual(backend.hostFiles.get("restart"), first)
      }),
    ))

  test("prints each install, and a failed one's exit code", () =>
    run(
      Effect.gen(function* () {
        const backend = makeFakeContainerBackend()
        const container = yield* makeContainer(Effect.succeed(backend))
        const logs = yield* SubscriptionRef.make<InstallLog>(emptyInstallLog)
        const terminal = yield* makeTerminal({
          container,
          installLogs: SubscriptionRef.changes(logs),
        })
        yield* settle
        yield* SubscriptionRef.set(logs, {
          run: 1,
          running: true,
          output: "Progress: resolved 1\n",
          exitCode: undefined,
        })
        yield* settle
        yield* SubscriptionRef.set(logs, {
          run: 1,
          running: false,
          output: "Progress: resolved 1\nERR_PNPM_FETCH_404\n",
          exitCode: 1,
        })
        yield* settle
        assert.equal(
          plain((yield* terminal.output).text),
          "$ pnpm install\r\nProgress: resolved 1\r\nERR_PNPM_FETCH_404\r\npnpm install exited with code 1\r\n",
        )
      }),
    ))

  test("Clear keeps only the current line, the prompt", () =>
    run(
      Effect.gen(function* () {
        const backend = makeFakeContainerBackend({
          command: () => ({ output: ["one\r\ntwo\r\n"] }),
        })
        const container = yield* makeContainer(Effect.succeed(backend))
        const terminal = yield* makeTerminal({ container })
        yield* terminal.open({ cols: 80, rows: 24 })
        yield* settle
        yield* terminal.input("ls\r")
        yield* settle
        const before = yield* terminal.output
        assert.include(before.text, "two")
        yield* terminal.clear
        const after = yield* terminal.output
        assert.equal(after.generation, before.generation + 1)
        assert.equal(plain(after.text), "~/workspace ❯ ")
      }),
    ))
})
