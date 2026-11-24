/**
 * The terminal: one interactive `jsh` in the Container, shared by Runs and
 * the visitor (ADR 0005, "One terminal").
 *
 * - The shell starts on the first `open` (the panel mounting) or the first
 *   Run, once the Container is ready. It starts again after the Container
 *   retries a failed boot, and after the visitor exits it.
 * - Output is kept here (the last `TERMINAL_OUTPUT_LIMIT` characters), so the
 *   xterm can be recreated and replay it. Install output is printed into it.
 * - Runs are typed into the shell as `node ../.scratchpad/run.cjs <entry>`.
 *   The wrapper (`run-wrapper.cjs`) prints OSC markers for its start and its
 *   exit code. They are parsed out of the output here, and the exit marker
 *   becomes an `exited with code N · HH:MM:SS` line.
 * - What is in the foreground is tracked from the visitor's keystrokes, the
 *   markers and the prompt: `idle` at the prompt, `run` while a Run is,
 *   `command` after the visitor entered a command, `stopping` between a
 *   Ctrl+C and the prompt coming back. `typing` says the visitor has typed at
 *   the prompt since the last Enter, Ctrl+C or Ctrl+U. Runs wait on both
 *   (the typing guard).
 */
import * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as PubSub from "effect/PubSub"
import type * as Scope from "effect/Scope"
import * as Semaphore from "effect/Semaphore"
import * as Stream from "effect/Stream"
import * as SubscriptionRef from "effect/SubscriptionRef"
import {
  Container,
  type ContainerService,
  type ContainerShell,
  type TerminalSize,
} from "./container.ts"
import { Dependencies, type InstallLog } from "./dependencies.ts"

/** The terminal text kept for the panel (the end of it). */
export const TERMINAL_OUTPUT_LIMIT = 256 * 1024

/** Until the panel measures the terminal. */
export const DEFAULT_TERMINAL_SIZE: TerminalSize = { cols: 80, rows: 24 }

/** The OSC sequence the Run wrapper prints: `ESC ] 7777 ; scratchpad-run ; <payload> BEL`. */
export const RUN_MARKER_PREFIX = "\u001b]7777;scratchpad-run;"
const RUN_MARKER_END = "\u0007"

/**
 * jsh's prompt, `~/workspace ❯ ` (ANSI stripped). Seeing it after a command
 * means the command finished.
 */
export const SHELL_PROMPT_PATTERN = /❯ $/

/** How long a Run waits for the foreground to stop after Ctrl+C. */
export const INTERRUPT_GRACE_MILLIS = 1500

const CTRL_C = "\u0003"
const CTRL_U = "\u0015"

const ESC = "\u001b["
const reset = `${ESC}0m`

// ---------------------------------------------------------------------------
// Markers
// ---------------------------------------------------------------------------

export type ShellOutputPart =
  | { readonly _tag: "Text"; readonly text: string }
  | { readonly _tag: "RunStarted" }
  | { readonly _tag: "RunExited"; readonly exitCode: number }

/**
 * Splits shell output into text and Run markers. A marker split across
 * chunks is held back until it is complete; unknown payloads are dropped.
 */
export const makeShellOutputParser = () => {
  let pending = ""
  return (chunk: string): ReadonlyArray<ShellOutputPart> => {
    const parts: Array<ShellOutputPart> = []
    let text = pending + chunk
    pending = ""
    const pushText = (value: string) => {
      if (value !== "") parts.push({ _tag: "Text", text: value })
    }
    while (true) {
      const start = text.indexOf(RUN_MARKER_PREFIX)
      if (start === -1) break
      pushText(text.slice(0, start))
      const end = text.indexOf(RUN_MARKER_END, start + RUN_MARKER_PREFIX.length)
      if (end === -1) {
        pending = text.slice(start)
        return parts
      }
      const payload = text.slice(start + RUN_MARKER_PREFIX.length, end)
      if (payload === "start") parts.push({ _tag: "RunStarted" })
      else if (payload.startsWith("exit;")) {
        const exitCode = Number.parseInt(payload.slice(5), 10)
        parts.push({
          _tag: "RunExited",
          exitCode: Number.isNaN(exitCode) ? 1 : exitCode,
        })
      }
      text = text.slice(end + RUN_MARKER_END.length)
    }
    // Hold back a tail that could be the start of a marker.
    for (
      let length = Math.min(RUN_MARKER_PREFIX.length - 1, text.length);
      length > 0;
      length--
    ) {
      if (RUN_MARKER_PREFIX.startsWith(text.slice(text.length - length))) {
        pending = text.slice(text.length - length)
        text = text.slice(0, text.length - length)
        break
      }
    }
    pushText(text)
    return parts
  }
}

// CSI sequences (colors, cursor moves) and OSC sequences (titles, links).
const ANSI_PATTERN =
  // oxlint-disable-next-line no-control-regex
  /\u001b\[[0-?]*[ -/]*[@-~]|\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/g

/** Removes ANSI escape sequences. */
export const stripAnsi = (text: string): string =>
  text.replace(ANSI_PATTERN, "")

const pad = (n: number) => String(n).padStart(2, "0")

/** `HH:MM:SS` in local time. */
export const formatClockTime = (millis: number): string => {
  const date = new Date(millis)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** The line the terminal prints when a Run's program exits. */
export const exitLine = (exitCode: number, at: number): string =>
  exitCode === 0
    ? `${ESC}2mexited with code 0 · ${formatClockTime(at)}${reset}\r\n`
    : `${ESC}31mexited with code ${exitCode}${reset}${ESC}2m · ${formatClockTime(at)}${reset}\r\n`

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** What has the shell's foreground. */
export type ShellForeground = "idle" | "run" | "command" | "stopping"

export interface TerminalState {
  /** `closed` until the Container is ready and the shell started. */
  readonly shell: "closed" | "open"
  readonly foreground: ShellForeground
  /** The visitor has typed at the prompt since the last Enter, Ctrl+C or Ctrl+U. */
  readonly typing: boolean
}

export const initialTerminalState: TerminalState = {
  shell: "closed",
  foreground: "idle",
  typing: false,
}

/**
 * The terminal's text, ANSI included. `generation` changes when the text is
 * replaced rather than appended to (Clear), and `total` counts every
 * character appended in this generation, so a reader writes only what is new
 * even after `text` was trimmed.
 */
export interface TerminalOutput {
  readonly generation: number
  readonly text: string
  readonly total: number
}

export const emptyTerminalOutput: TerminalOutput = {
  generation: 0,
  text: "",
  total: 0,
}

/** What happened to a Run typed with `run`, by the id it was typed with. */
export type TerminalRunEvent =
  | {
      readonly _tag: "RunExited"
      readonly id: number
      readonly exitCode: number
    }
  /** Ctrl+C (Stop, a new Run, or the visitor), or the shell went away. */
  | { readonly _tag: "RunInterrupted"; readonly id: number }

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export interface TerminalService {
  readonly state: Effect.Effect<TerminalState>
  readonly stateChanges: Stream.Stream<TerminalState>
  readonly output: Effect.Effect<TerminalOutput>
  readonly outputChanges: Stream.Stream<TerminalOutput>
  /** How Runs typed with `run` end. */
  readonly runEvents: Stream.Stream<TerminalRunEvent>
  /** Starts the shell at this size, if it has not started; resizes it otherwise. */
  readonly open: (size: TerminalSize) => Effect.Effect<void>
  readonly resize: (size: TerminalSize) => Effect.Effect<void>
  /** The visitor's keystrokes (xterm's `onData`). */
  readonly input: (data: string) => Effect.Effect<void>
  /**
   * Drops what the visitor typed (Ctrl+U), or stops the command they ran
   * (Ctrl+C). The typing guard's Esc.
   */
  readonly discardInput: Effect.Effect<void>
  /**
   * Types a Run's command line: Ctrl+C first if something is in the
   * foreground (waiting up to `INTERRUPT_GRACE_MILLIS` for it to stop), then
   * the line. Its end comes as a `runEvents` event.
   */
  readonly run: (commandLine: string, id: number) => Effect.Effect<void>
  /** Ctrl+C, if a Run is in the foreground (Stop). */
  readonly interrupt: Effect.Effect<void>
  /** Prints host text (install output) on a line of its own. */
  readonly print: (text: string) => Effect.Effect<void>
  /** Clears the terminal, keeping the current line (the prompt). */
  readonly clear: Effect.Effect<void>
}

export class Terminal extends Context.Service<Terminal, TerminalService>()(
  "@website/scratchpad/Terminal",
) {}

export interface MakeTerminalOptions {
  readonly container: ContainerService
  /** Install logs to print into the terminal (`Dependencies.installLogChanges`). */
  readonly installLogs?: Stream.Stream<InstallLog> | undefined
}

const tail = (text: string, limit: number) =>
  text.length <= limit ? text : text.slice(text.length - limit)

export const makeTerminal = (
  options: MakeTerminalOptions,
): Effect.Effect<TerminalService, never, Scope.Scope> =>
  Effect.gen(function* () {
    const { container } = options
    const scope = yield* Effect.scope
    const stateRef = yield* SubscriptionRef.make(initialTerminalState)
    const outputRef = yield* SubscriptionRef.make(emptyTerminalOutput)
    const events = yield* PubSub.unbounded<TerminalRunEvent>()
    // Run typing happens one at a time.
    const runLock = yield* Semaphore.make(1)

    let shell: ContainerShell | undefined
    let started = false
    let size = DEFAULT_TERMINAL_SIZE
    // Whether the Run in the foreground printed its start marker: an exit
    // marker before it belongs to an earlier Run.
    let runStarted = false
    // The id of the Run typed last.
    let runId = 0
    // Output since the last command was entered, ANSI stripped, for the
    // prompt.
    let sinceCommand = ""

    const setState = (f: (state: TerminalState) => TerminalState) =>
      SubscriptionRef.update(stateRef, (state) => {
        const next = f(state)
        return next.shell === state.shell &&
          next.foreground === state.foreground &&
          next.typing === state.typing
          ? state
          : next
      })

    const setForeground = (foreground: ShellForeground) =>
      Effect.suspend(() => {
        if (foreground === "command" || foreground === "stopping") {
          sinceCommand = ""
        }
        if (foreground === "run") runStarted = false
        return setState((state) => ({ ...state, foreground }))
      })

    const append = (text: string) =>
      text === ""
        ? Effect.void
        : SubscriptionRef.update(outputRef, (output) => ({
            generation: output.generation,
            text: tail(output.text + text, TERMINAL_OUTPUT_LIMIT),
            total: output.total + text.length,
          }))

    /** `text` on a line of its own. */
    const appendLine = (text: string) =>
      SubscriptionRef.get(outputRef).pipe(
        Effect.flatMap((output) =>
          append(
            output.text === "" || output.text.endsWith("\n")
              ? text
              : `\r\n${text}`,
          ),
        ),
      )

    const send = (data: string) =>
      Effect.suspend(() =>
        shell === undefined ? Effect.void : shell.write(data),
      )

    const onShellText = (text: string) =>
      Effect.gen(function* () {
        yield* append(text)
        const state = yield* SubscriptionRef.get(stateRef)
        if (state.foreground === "command" || state.foreground === "stopping") {
          sinceCommand = tail(sinceCommand + stripAnsi(text), 256)
          if (SHELL_PROMPT_PATTERN.test(sinceCommand)) {
            yield* setForeground("idle")
          }
        }
      })

    const onRunExited = (exitCode: number) =>
      Effect.gen(function* () {
        const state = yield* SubscriptionRef.get(stateRef)
        if (state.foreground === "stopping") {
          // The Run that was interrupted has ended.
          yield* setForeground("idle")
          return
        }
        if (state.foreground !== "run" || !runStarted) return
        yield* appendLine(exitLine(exitCode, yield* Clock.currentTimeMillis))
        yield* setForeground("idle")
        yield* PubSub.publish(events, {
          _tag: "RunExited",
          id: runId,
          exitCode,
        })
      })

    const parse = makeShellOutputParser()
    const onShellOutput = (chunk: string) =>
      Effect.forEach(
        parse(chunk),
        (part) => {
          switch (part._tag) {
            case "Text":
              return onShellText(part.text)
            case "RunStarted":
              return Effect.sync(() => {
                runStarted = true
              })
            case "RunExited":
              return onRunExited(part.exitCode)
          }
        },
        { discard: true },
      )

    /** Ctrl+C. A Run in the foreground counts as interrupted at once. */
    const sendInterrupt = Effect.gen(function* () {
      const state = yield* SubscriptionRef.get(stateRef)
      // The state changes before the keystroke goes out, so the output it
      // causes (an exit marker, the prompt) is read against it.
      if (state.foreground !== "idle") yield* setForeground("stopping")
      yield* setState((s) => ({ ...s, typing: false }))
      if (state.foreground === "run") {
        yield* PubSub.publish(events, { _tag: "RunInterrupted", id: runId })
      }
      yield* send(CTRL_C)
    })

    /** One shell's lifetime: start it, read it until it exits. */
    const runShell = Effect.scoped(
      Effect.gen(function* () {
        const opened = yield* container.shell(size)
        shell = opened
        yield* setState(() => ({
          shell: "open",
          foreground: "idle",
          typing: false,
        }))
        yield* opened.output.pipe(Stream.runForEach(onShellOutput))
        yield* opened.exitCode
      }),
    )

    const lifecycle = Effect.gen(function* () {
      while (true) {
        const ready = yield* Effect.result(container.awaitReady)
        if (ready._tag === "Failure") {
          // Wait for the Container to retry its boot.
          yield* container.phaseChanges.pipe(
            Stream.filter((phase) => phase._tag === "booting"),
            Stream.take(1),
            Stream.runDrain,
          )
          continue
        }
        const result = yield* Effect.result(runShell)
        shell = undefined
        const state = yield* SubscriptionRef.get(stateRef)
        if (state.foreground === "run") {
          yield* PubSub.publish(events, { _tag: "RunInterrupted", id: runId })
        }
        yield* setState(() => initialTerminalState)
        yield* appendLine(
          result._tag === "Failure"
            ? `${ESC}31m${result.failure.message}${reset}\r\n`
            : `${ESC}2mThe shell exited. Starting a new one…${reset}\r\n`,
        )
        yield* Effect.sleep("1 second")
      }
    })

    const ensureStarted = Effect.suspend(() => {
      if (started) return Effect.void
      started = true
      return Effect.asVoid(Effect.forkIn(lifecycle, scope))
    })

    const awaitShell = ensureStarted.pipe(
      Effect.andThen(
        stateRef.pipe(
          SubscriptionRef.changes,
          Stream.filter((state) => state.shell === "open"),
          Stream.take(1),
          Stream.runDrain,
        ),
      ),
    )

    const awaitForeground = (done: (state: TerminalState) => boolean) =>
      stateRef.pipe(
        SubscriptionRef.changes,
        Stream.filter(done),
        Stream.take(1),
        Stream.runDrain,
      )

    const input = (data: string) =>
      Effect.gen(function* () {
        const state = yield* SubscriptionRef.get(stateRef)
        if (data.includes(CTRL_C)) {
          yield* sendInterrupt
          return
        }
        if (state.foreground === "idle") {
          let typing = state.typing
          let entered = false
          for (let i = 0; i < data.length; i++) {
            const char = data[i]!
            if (char === "\r" || char === "\n") {
              if (typing) entered = true
              typing = false
            } else if (char === CTRL_U) {
              typing = false
            } else {
              // Printable text, Backspace, or an escape sequence (arrows
              // recall history): the line may hold a command now.
              typing = true
            }
          }
          if (entered) {
            yield* setForeground("command")
          }
          yield* setState((s) => ({ ...s, typing }))
        }
        yield* send(data)
      })

    const discardInput = Effect.gen(function* () {
      const state = yield* SubscriptionRef.get(stateRef)
      if (state.foreground === "command") {
        yield* sendInterrupt
      } else if (state.typing) {
        yield* send(CTRL_U)
        yield* setState((s) => ({ ...s, typing: false }))
      }
    })

    const run = (commandLine: string, id: number) =>
      runLock.withPermits(1)(
        Effect.gen(function* () {
          yield* awaitShell
          const state = yield* SubscriptionRef.get(stateRef)
          if (state.foreground === "run" || state.foreground === "command") {
            yield* sendInterrupt
          }
          yield* awaitForeground((s) => s.foreground === "idle").pipe(
            Effect.timeoutOption(`${INTERRUPT_GRACE_MILLIS} millis`),
          )
          if ((yield* SubscriptionRef.get(stateRef)).typing) yield* send(CTRL_U)
          yield* setState((s) => ({ ...s, typing: false }))
          runId = id
          yield* setForeground("run")
          yield* send(`${commandLine}\r`)
        }),
      )

    const interrupt = Effect.gen(function* () {
      const state = yield* SubscriptionRef.get(stateRef)
      if (state.foreground === "run") yield* sendInterrupt
    })

    if (options.installLogs !== undefined) {
      yield* printInstallLogs(options.installLogs, {
        print: appendLine,
        append,
        afterInstall: Effect.gen(function* () {
          // The install's output covered the prompt: ask for a fresh one.
          const state = yield* SubscriptionRef.get(stateRef)
          if (
            state.shell === "open" &&
            state.foreground === "idle" &&
            !state.typing
          ) {
            yield* send("\r")
          }
        }),
      }).pipe(Effect.forkIn(scope))
    }

    return {
      state: SubscriptionRef.get(stateRef),
      stateChanges: SubscriptionRef.changes(stateRef),
      output: SubscriptionRef.get(outputRef),
      outputChanges: SubscriptionRef.changes(outputRef),
      runEvents: Stream.fromPubSub(events),
      open: (next) =>
        Effect.suspend(() => {
          size = next
          return started
            ? Effect.suspend(() =>
                shell === undefined ? Effect.void : shell.resize(next),
              )
            : ensureStarted
        }),
      resize: (next) =>
        Effect.suspend(() => {
          size = next
          return shell === undefined ? Effect.void : shell.resize(next)
        }),
      input,
      discardInput,
      run,
      interrupt,
      print: appendLine,
      clear: SubscriptionRef.update(outputRef, (output) => {
        const line = output.text.slice(output.text.lastIndexOf("\n") + 1)
        return {
          generation: output.generation + 1,
          text: line,
          total: line.length,
        }
      }),
    }
  })

/**
 * Prints each install into the terminal as it runs: a `pnpm install` line,
 * pnpm's output, and a line if it failed.
 */
const printInstallLogs = (
  logs: Stream.Stream<InstallLog>,
  sink: {
    readonly print: (text: string) => Effect.Effect<void>
    readonly append: (text: string) => Effect.Effect<void>
    readonly afterInstall: Effect.Effect<void>
  },
) => {
  let run = 0
  let printed = ""
  let finished = true
  return logs.pipe(
    Stream.runForEach((log) =>
      Effect.gen(function* () {
        if (log.run === 0) return
        if (log.run !== run) {
          run = log.run
          printed = ""
          finished = false
          yield* sink.print(`${ESC}2m$ pnpm install${reset}\r\n`)
        }
        if (finished) return
        const delta = log.output.startsWith(printed)
          ? log.output.slice(printed.length)
          : log.output
        printed = log.output
        // pnpm writes bare `\n`s.
        yield* sink.append(delta.replace(/\r?\n/g, "\r\n"))
        if (!log.running) {
          finished = true
          if (log.exitCode !== undefined && log.exitCode !== 0) {
            yield* sink.print(
              `${ESC}31mpnpm install exited with code ${log.exitCode}${reset}\r\n`,
            )
          }
          yield* sink.afterInstall
        }
      }),
    ),
  )
}

/** The page's terminal, on its Container, printing its installs. */
export const layerTerminal: Layer.Layer<
  Terminal,
  never,
  Container | Dependencies
> = Layer.effect(
  Terminal,
  Effect.gen(function* () {
    const dependencies = yield* Dependencies
    return yield* makeTerminal({
      container: yield* Container,
      installLogs: dependencies.installLogChanges,
    })
  }),
)
