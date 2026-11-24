import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
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
  type TerminalRunEvent,
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

const run = <A>(effect: Effect.Effect<A, unknown, Scope.Scope>) =>
  Effect.runPromise(
    Effect.scoped(effect).pipe(Effect.provide(TestClock.layer())),
  )

describe("makeShellOutputParser", () => {
  test("takes Run markers out of the text, even split across chunks", () => {
    const parse = makeShellOutputParser()
    const marker = `${RUN_MARKER_PREFIX}exit;3\u0007`
    assert.deepEqual(
      parse(`a${RUN_MARKER_PREFIX}start\u0007b${marker.slice(0, 5)}`),
      [
        { _tag: "Text", text: "a" },
        { _tag: "RunStarted" },
        { _tag: "Text", text: "b" },
      ],
    )
    assert.deepEqual(parse(`${marker.slice(5, 20)}`), [])
    assert.deepEqual(parse(`${marker.slice(20)}c\u001b[0m`), [
      { _tag: "RunExited", exitCode: 3 },
      { _tag: "Text", text: "c\u001b[0m" },
    ])
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

  test("starts a new shell when the visitor exits it, and a Run in it is interrupted", () =>
    run(
      Effect.gen(function* () {
        const backend = makeFakeContainerBackend({
          command: () => ({ hang: true }),
        })
        const container = yield* makeContainer(Effect.succeed(backend))
        const terminal = yield* makeTerminal({ container })
        const events: Array<TerminalRunEvent> = []
        yield* terminal.runEvents.pipe(
          Stream.runForEach((event) => Effect.sync(() => events.push(event))),
          Effect.forkScoped,
        )
        yield* terminal.open({ cols: 80, rows: 24 })
        yield* settle
        yield* terminal.run("node ../.scratchpad/run.cjs src/main.ts", 7)
        yield* settle
        backend.shells[0]!.exit(0)
        yield* settle
        assert.deepEqual(events, [{ _tag: "RunInterrupted", id: 7 }])
        assert.include(
          plain((yield* terminal.output).text),
          "The shell exited. Starting a new one…",
        )
        yield* TestClock.adjust("1 second")
        yield* settle
        assert.lengthOf(backend.shells, 2)
        assert.deepEqual(yield* terminal.state, {
          shell: "open",
          foreground: "idle",
          typing: false,
        })
      }),
    ))

  test("an exit marker from before the Run started is not the Run's", () =>
    run(
      Effect.gen(function* () {
        const backend = makeFakeContainerBackend({
          command: () => ({ hang: true }),
        })
        const container = yield* makeContainer(Effect.succeed(backend))
        const terminal = yield* makeTerminal({ container })
        const events: Array<TerminalRunEvent> = []
        yield* terminal.runEvents.pipe(
          Stream.runForEach((event) => Effect.sync(() => events.push(event))),
          Effect.forkScoped,
        )
        // A line the fake shell runs without markers: the test prints them.
        yield* terminal.run("wrapped", 1)
        yield* settle
        const shell = backend.shells[0]!
        // A late exit marker of an earlier wrapper, then this Run's own.
        shell.print(`${RUN_MARKER_PREFIX}exit;130\u0007`)
        yield* settle
        assert.deepEqual(events, [])
        shell.print(`${RUN_MARKER_PREFIX}start\u0007out\r\n`)
        shell.print(`${RUN_MARKER_PREFIX}exit;0\u0007`)
        yield* settle
        assert.deepEqual(events, [{ _tag: "RunExited", id: 1, exitCode: 0 }])
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

  test("a Run waits for a stopping command until the prompt comes back", () =>
    run(
      Effect.gen(function* () {
        const backend = makeFakeContainerBackend({
          command: () => ({ hang: true }),
        })
        const container = yield* makeContainer(Effect.succeed(backend))
        const terminal = yield* makeTerminal({ container })
        yield* terminal.open({ cols: 80, rows: 24 })
        yield* settle
        yield* terminal.input("npx serve\r")
        yield* settle
        assert.equal((yield* terminal.state).foreground, "command")
        const typed = yield* Deferred.make<void>()
        yield* terminal
          .run("node ../.scratchpad/run.cjs src/main.ts", 1)
          .pipe(
            Effect.andThen(Deferred.succeed(typed, undefined)),
            Effect.forkScoped,
          )
        yield* settle
        assert.isTrue(yield* Deferred.isDone(typed))
        assert.deepEqual(backend.shells[0]!.input.slice(-2), [
          "\u0003",
          "node ../.scratchpad/run.cjs src/main.ts\r",
        ])
        assert.equal((yield* terminal.state).foreground, "run")
      }),
    ))
})
