/**
 * The terminal: one interactive `jsh` in the Container. After the first
 * install the page types the Workspace shell's command into it once
 * (`../run src/main.ts`), and the watch runner (`run-watch.cjs`) owns it
 * until Ctrl+C, as on `/play`.
 *
 * - The shell starts on the first `open` (the panel mounting), once the
 *   Container is ready. It starts again after the Container retries a failed
 *   boot, and after the visitor exits it. The command is typed into the first
 *   shell of each boot, once the Container can run code.
 * - Output is kept here (the last `TERMINAL_OUTPUT_LIMIT` characters), so the
 *   xterm can be recreated and replay it. Install output is printed into it.
 * - The runner prints OSC markers: `watch;start` and `watch;exit` around
 *   itself, `start` and `exit;<code>` around each program it runs. They are
 *   parsed out of the output here into `TerminalState` (whether the runner is
 *   in the foreground, the latest Run).
 * - Restart touches `.scratchpad/restart`, which the runner watches.
 */
import * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as SubscriptionRef from "effect/SubscriptionRef"
import {
  Container,
  type ContainerService,
  type ContainerShell,
  type TerminalSize,
} from "./container.ts"
import { Dependencies, type InstallLog } from "./dependencies.ts"
import { canRun, installRunner, RESTART_FILE_NAME } from "./diagnostics-file.ts"

/** The terminal text kept for the panel (the end of it). */
export const TERMINAL_OUTPUT_LIMIT = 256 * 1024

/** Until the panel measures the terminal. */
export const DEFAULT_TERMINAL_SIZE: TerminalSize = { cols: 80, rows: 24 }

/** The OSC sequence the runner prints: `ESC ] 7777 ; scratchpad-run ; <payload> BEL`. */
export const RUN_MARKER_PREFIX = "\u001b]7777;scratchpad-run;"
const RUN_MARKER_END = "\u0007"

/** The command typed into the shell when a Workspace names none. */
export const DEFAULT_SHELL_COMMAND = "../run src/main.ts"

const ESC = "\u001b["
const reset = `${ESC}0m`

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Markers
// ---------------------------------------------------------------------------

export type ShellOutputPart =
  | { readonly _tag: "Text"; readonly text: string }
  /** The runner started (`watch;start`). */
  | { readonly _tag: "WatchStarted" }
  /** The runner exited (`watch;exit`), after Ctrl+C. */
  | { readonly _tag: "WatchExited" }
  /** The runner started the program (`start`). */
  | { readonly _tag: "RunStarted" }
  /** The program exited, or the runner killed it (`exit;<code>`). */
  | { readonly _tag: "RunExited"; readonly exitCode: number }

const markerPart = (payload: string): ShellOutputPart | undefined => {
  switch (payload) {
    case "start":
      return { _tag: "RunStarted" }
    case "watch;start":
      return { _tag: "WatchStarted" }
    case "watch;exit":
      return { _tag: "WatchExited" }
  }
  if (payload.startsWith("exit;")) {
    const exitCode = Number.parseInt(payload.slice(5), 10)
    return {
      _tag: "RunExited",
      exitCode: Number.isNaN(exitCode) ? 1 : exitCode,
    }
  }
  return undefined
}

/**
 * Splits shell output into text and the runner's markers. A marker split
 * across chunks is held back until it is complete; unknown payloads are
 * dropped.
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
      const part = markerPart(text.slice(start + RUN_MARKER_PREFIX.length, end))
      if (part !== undefined) parts.push(part)
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

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export type RunStatus =
  | { readonly _tag: "running" }
  | { readonly _tag: "exited"; readonly exitCode: number }
  /** The runner exited (Ctrl+C) or the shell went away while it ran. */
  | { readonly _tag: "stopped" }

/** A program the runner started. */
export interface RunInfo {
  /** Increments with each Run; identifies it internally, never shown. */
  readonly id: number
  /** Epoch milliseconds. */
  readonly startedAt: number
  /** When it stopped running, once it has. */
  readonly endedAt: number | undefined
  readonly status: RunStatus
}

export interface TerminalState {
  /** `closed` until the Container is ready and the shell started. */
  readonly shell: "closed" | "open"
  /** Whether the watch runner is in the foreground (Restart works). */
  readonly runner: boolean
  /** The latest Run. */
  readonly run: RunInfo | undefined
}

export const initialTerminalState: TerminalState = {
  shell: "closed",
  runner: false,
  run: undefined,
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

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export interface TerminalService {
  readonly state: Effect.Effect<TerminalState>
  readonly stateChanges: Stream.Stream<TerminalState>
  readonly output: Effect.Effect<TerminalOutput>
  readonly outputChanges: Stream.Stream<TerminalOutput>
  /** Starts the shell at this size, if it has not started; resizes it otherwise. */
  readonly open: (size: TerminalSize) => Effect.Effect<void>
  readonly resize: (size: TerminalSize) => Effect.Effect<void>
  /** The visitor's keystrokes (xterm's `onData`). */
  readonly input: (data: string) => Effect.Effect<void>
  /** Tells the runner to run again, if it is in the foreground. */
  readonly restart: Effect.Effect<void>
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
  /**
   * The command typed into each boot's first shell, once `awaitRunnable`
   * succeeds, after the runner is written. Without one, nothing is typed.
   */
  readonly command?: string | undefined
  /** Waits until the Container can run code (installed, types loaded). */
  readonly awaitRunnable?: Effect.Effect<void> | undefined
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

    let shell: ContainerShell | undefined
    let started = false
    let size = DEFAULT_TERMINAL_SIZE
    let nextRunId = 1

    const setState = (f: (state: TerminalState) => TerminalState) =>
      SubscriptionRef.update(stateRef, f)

    /** Ends the latest Run, if it is running. */
    const endRun = (status: RunStatus) =>
      Effect.gen(function* () {
        const at = yield* Clock.currentTimeMillis
        yield* setState((state) =>
          state.run?.status._tag !== "running"
            ? state
            : { ...state, run: { ...state.run, status, endedAt: at } },
        )
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

    const onPart = (part: ShellOutputPart) =>
      Effect.gen(function* () {
        switch (part._tag) {
          case "Text":
            return yield* append(part.text)
          case "WatchStarted":
            return yield* setState((state) => ({ ...state, runner: true }))
          case "WatchExited":
            yield* endRun({ _tag: "stopped" })
            return yield* setState((state) => ({ ...state, runner: false }))
          case "RunStarted": {
            yield* endRun({ _tag: "stopped" })
            const at = yield* Clock.currentTimeMillis
            const run: RunInfo = {
              id: nextRunId++,
              startedAt: at,
              endedAt: undefined,
              status: { _tag: "running" },
            }
            return yield* setState((state) => ({ ...state, run }))
          }
          case "RunExited":
            return yield* endRun({ _tag: "exited", exitCode: part.exitCode })
        }
      })

    const parse = makeShellOutputParser()
    const onShellOutput = (chunk: string) =>
      Effect.forEach(parse(chunk), onPart, { discard: true })

    // The command is typed into the first shell of each boot.
    let commandTyped = false

    /** Writes the runner, then types the command once the Container can run code. */
    const typeCommand = (command: string) =>
      Effect.gen(function* () {
        yield* options.awaitRunnable ?? Effect.void
        const installed = yield* Effect.result(installRunner(container))
        if (installed._tag === "Failure") {
          const cause = installed.failure
          yield* appendLine(
            `${ESC}31mCould not write the runner: ${cause instanceof Error ? cause.message : String(cause)}${reset}\r\n`,
          )
          return
        }
        yield* send(`${command}\r`)
      })

    /** One shell's lifetime: start it, read it until it exits. */
    const runShell = Effect.scoped(
      Effect.gen(function* () {
        const opened = yield* container.shell(size)
        shell = opened
        yield* setState((state) => ({ ...state, shell: "open" }))
        if (options.command !== undefined && !commandTyped) {
          commandTyped = true
          yield* Effect.forkScoped(typeCommand(options.command))
        }
        yield* opened.output.pipe(Stream.runForEach(onShellOutput))
        yield* opened.exitCode
      }),
    )

    const lifecycle = Effect.gen(function* () {
      while (true) {
        const ready = yield* Effect.result(container.awaitReady)
        if (ready._tag === "Failure") {
          // Wait for the Container to retry its boot; that boot's first
          // shell gets the command again.
          commandTyped = false
          yield* container.phaseChanges.pipe(
            Stream.filter((phase) => phase._tag === "booting"),
            Stream.take(1),
            Stream.runDrain,
          )
          continue
        }
        const result = yield* Effect.result(runShell)
        shell = undefined
        yield* endRun({ _tag: "stopped" })
        yield* setState((state) => ({
          ...state,
          shell: "closed",
          runner: false,
        }))
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

    const restart = Effect.gen(function* () {
      const state = yield* SubscriptionRef.get(stateRef)
      if (!state.runner) return
      const at = yield* Clock.currentTimeMillis
      yield* container
        .writeHostDirFile(RESTART_FILE_NAME, String(at))
        .pipe(Effect.ignore)
    })

    if (options.installLogs !== undefined) {
      yield* printInstallLogs(options.installLogs, {
        print: appendLine,
        append,
      }).pipe(Effect.forkIn(scope))
    }

    return {
      state: SubscriptionRef.get(stateRef),
      stateChanges: SubscriptionRef.changes(stateRef),
      output: SubscriptionRef.get(outputRef),
      outputChanges: SubscriptionRef.changes(outputRef),
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
      input: send,
      restart,
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
        }
      }),
    ),
  )
}

export interface TerminalLayerOptions {
  /** The command typed into the shell. Defaults to `DEFAULT_SHELL_COMMAND`. */
  readonly command?: string | undefined
}

/**
 * The page's terminal, on its Container, printing its installs and typing
 * the Workspace shell's command once the Container can run code.
 */
export const layerTerminal = (
  options: TerminalLayerOptions = {},
): Layer.Layer<Terminal, never, Container | Dependencies> =>
  Layer.effect(
    Terminal,
    Effect.gen(function* () {
      const dependencies = yield* Dependencies
      return yield* makeTerminal({
        container: yield* Container,
        installLogs: dependencies.installLogChanges,
        command: options.command ?? DEFAULT_SHELL_COMMAND,
        awaitRunnable: dependencies.stateChanges.pipe(
          Stream.filter(canRun),
          Stream.take(1),
          Stream.runDrain,
        ),
      })
    }),
  )
