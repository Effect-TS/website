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

describe("Terminal", () => {
  test("after a retried boot, the shell starts at the panel's size and gets the command", () =>
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
        yield* terminal.open({ cols: 120, rows: 20 })
        yield* settle
        yield* container.retry
        yield* settle
        const shell = backend.shells[0]!
        assert.deepEqual(
          { sizes: shell.sizes, lines: shell.lines },
          { sizes: [{ cols: 120, rows: 20 }], lines: ["../run src/main.ts"] },
        )
      }),
    ))

  test("installs the runner and types the command only once the Container can run code", () =>
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
        const typedWhileInstalling = [...shell.lines]
        yield* Deferred.succeed(runnable, undefined)
        yield* settle
        assert.deepEqual(
          {
            typedWhileInstalling,
            typed: shell.lines,
            runnerInstalled:
              backend.executables.has("run") &&
              backend.hostFiles.has("run-preload.mjs"),
          },
          {
            typedWhileInstalling: [],
            typed: ["../run src/main.ts"],
            runnerInstalled: true,
          },
        )
      }),
    ))

  test("a shell restarted after the visitor exits the first one gets no command", () =>
    run(
      Effect.gen(function* () {
        const backend = makeFakeContainerBackend()
        const container = yield* makeContainer(Effect.succeed(backend))
        const terminal = yield* makeTerminal({
          container,
          command: "../run src/main.ts",
        })
        yield* terminal.open({ cols: 80, rows: 24 })
        yield* settle
        backend.shells[0]!.exit(0)
        yield* settle
        yield* TestClock.adjust("1 second")
        yield* settle
        assert.deepEqual(backend.shells[1]?.lines, [])
      }),
    ))

  test("follows the runner and its Runs from the markers, which never reach the text", () =>
    run(
      Effect.gen(function* () {
        const backend = makeFakeContainerBackend()
        const container = yield* makeContainer(Effect.succeed(backend))
        const terminal = yield* makeTerminal({ container })
        yield* terminal.open({ cols: 80, rows: 24 })
        yield* settle
        const shell = backend.shells[0]!
        const exit = marker("exit;3")
        shell.print(`${marker("watch;start")}${marker("start")}hello\r\n`)
        // A marker split across chunks.
        shell.print(exit.slice(0, 10))
        shell.print(exit.slice(10))
        yield* settle
        const state = yield* terminal.state
        assert.deepEqual(
          {
            runner: state.runner,
            run: state.run?.status,
            text: plain((yield* terminal.output).text).slice(-7),
          },
          {
            runner: true,
            run: { _tag: "exited", exitCode: 3 },
            text: "hello\r\n",
          },
        )
      }),
    ))

  test("the shell going away stops the Run and starts a new shell", () =>
    run(
      Effect.gen(function* () {
        const backend = makeFakeContainerBackend()
        const container = yield* makeContainer(Effect.succeed(backend))
        const terminal = yield* makeTerminal({ container })
        yield* terminal.open({ cols: 80, rows: 24 })
        yield* settle
        const shell = backend.shells[0]!
        shell.print(`${marker("watch;start")}${marker("start")}`)
        yield* settle
        shell.exit(0)
        yield* settle
        const state = yield* terminal.state
        assert.deepEqual(
          {
            runner: state.runner,
            run: state.run?.status,
            notice: plain((yield* terminal.output).text).includes(
              "The shell exited. Starting a new one…",
            ),
          },
          { runner: false, run: { _tag: "stopped" }, notice: true },
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
        const beforeRunner = backend.hostFiles.get("restart")

        backend.shells[0]!.print(marker("watch;start"))
        yield* settle
        yield* terminal.restart
        const first = backend.hostFiles.get("restart")
        yield* TestClock.adjust("1 second")
        yield* terminal.restart
        const second = backend.hostFiles.get("restart")
        assert.deepEqual(
          { beforeRunner, touched: first !== undefined && second !== first },
          { beforeRunner: undefined, touched: true },
        )
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
})
