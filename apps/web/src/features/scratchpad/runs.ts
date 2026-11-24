/**
 * Runs: the page decides when to run `src/main.ts` in the Container
 * (ADR 0004, ticket 09), and types each Run into the terminal's shell
 * (ADR 0005, `terminal.ts`).
 *
 * - The first Run starts once the Container can run code (dependencies
 *   installed, and the installed types in the editor or given up on), and
 *   later Runs start `debounce` (500 ms) after the last Workspace change
 *   landed in the Container. Changes come from the mirror's `onChange`, so a
 *   Run never starts before the Container has the files it runs.
 * - No Run starts while `pnpm install` or the types copy is in progress. A
 *   change made meanwhile runs once they finish.
 * - The typing guard: a Run waits while the visitor has typed at the prompt,
 *   or while a command they entered is in the foreground. `waiting` says
 *   which. Enter (and the command finishing) or Esc (`Terminal.discardInput`)
 *   lets it go.
 * - Before each Run the gate (`blockingErrors`, the tsrs errors anywhere in
 *   the Workspace) is checked. Any error skips the Run: a Run still in the
 *   foreground gets Ctrl+C, and `skipped` says why until the next Run starts.
 *   Warnings, infos and hints never block.
 * - A Run types Ctrl+C for whatever is in the foreground, then
 *   `node ../.scratchpad/run.cjs src/main.ts`. There is no time limit.
 *   `stop` sends Ctrl+C to the current Run; `restart` runs again now, with no
 *   debounce, still gated.
 *
 * The wrapper (`run-wrapper.cjs`) runs `node --experimental-transform-types
 * --import <preload> src/main.ts` (spike 01) and reports the exit code. It
 * and the preload (`run-preload.mjs`) are written to the host scripts
 * directory, outside the mirrored Workspace.
 */
import * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import type * as Scope from "effect/Scope"
import * as Semaphore from "effect/Semaphore"
import * as Stream from "effect/Stream"
import * as SubscriptionRef from "effect/SubscriptionRef"
import {
  Container,
  type ContainerService,
  type MirrorChange,
} from "./container.ts"
import {
  containerPhaseOf,
  Dependencies,
  type DependenciesService,
  type DependencyState,
} from "./dependencies.ts"
// `?raw` is the file's text; the linter resolves the module itself.
// oxlint-disable-next-line import/default
import RUN_PRELOAD_SCRIPT from "./run-preload.mjs?raw"
// oxlint-disable-next-line import/default
import RUN_WRAPPER_SCRIPT from "./run-wrapper.cjs?raw"
import { SCRATCHPAD_ENTRY_PATH } from "./config.ts"
import {
  formatClockTime,
  Terminal,
  type TerminalService,
  type TerminalState,
} from "./terminal.ts"
import { workspaceUriToPath } from "./workspace.ts"

const RUN_PRELOAD_NAME = "run-preload.mjs"
export const RUN_WRAPPER_NAME = "run.cjs"
export const DEFAULT_RUN_DEBOUNCE: Duration.Input = "500 millis"

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** A tsrs error that blocks Runs. `line` and `column` are 1-based. */
export interface RunBlockingError {
  readonly path: string
  /** 1-based start position. */
  readonly line: number
  readonly column: number
  /** 1-based end position. */
  readonly endLine: number
  readonly endColumn: number
  readonly message: string
  /** The diagnostic code, e.g. `TS2769`, when the server sends one. */
  readonly code: string | undefined
  /** The text of the error's first line, for a code frame. */
  readonly source: string | undefined
}

export type RunStatus =
  | { readonly _tag: "running" }
  | { readonly _tag: "exited"; readonly exitCode: number }
  /** Ctrl+C: Stop, the next Run, the visitor, or the shell went away. */
  | { readonly _tag: "stopped" }
  /** The Run could not start. */
  | { readonly _tag: "failed"; readonly message: string }

export interface RunInfo {
  /** Increments with each Run; identifies it internally, never shown. */
  readonly id: number
  /** Why it ran: `initial`, `restart`, `src/main.ts changed`, `2 files changed`. */
  readonly trigger: string
  /** The entry file it runs. */
  readonly entry: string
  /** Epoch milliseconds. */
  readonly startedAt: number
  /** When it stopped running, once it has. */
  readonly endedAt: number | undefined
  readonly status: RunStatus
}

/** A Run that the gate skipped. It is not a Run: it has no number. */
export interface RunSkip {
  readonly trigger: string
  readonly at: number
  readonly errors: ReadonlyArray<RunBlockingError>
}

/**
 * Why the next Run is waiting on the visitor: they have typed at the prompt
 * (`typing`), or a command they entered is still in the foreground
 * (`command`).
 */
export type RunWait = "typing" | "command"

export interface RunsState {
  /** Whether the Container can run code now (installed, not installing). */
  readonly available: boolean
  /** The latest Run. */
  readonly run: RunInfo | undefined
  /** Set when the latest attempt was skipped; cleared by the next Run. */
  readonly skipped: RunSkip | undefined
  /** Set while a Run is due but waits on the visitor (the typing guard). */
  readonly waiting: RunWait | undefined
}

export const initialRunsState: RunsState = {
  available: false,
  run: undefined,
  skipped: undefined,
  waiting: undefined,
}

/** Whether the Container can run code in this dependency state. */
export const canRun = (state: DependencyState): boolean => {
  const phase = containerPhaseOf(state)._tag
  return phase === "ready" || phase === "dependencies-unavailable"
}

/** What a Run waits for in this terminal state, if anything. */
export const runWaitOf = (state: TerminalState): RunWait | undefined =>
  state.typing
    ? "typing"
    : state.foreground === "command"
      ? "command"
      : undefined

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** `HH:MM:SS` in local time. */
export const formatRunTime = formatClockTime

/** `path:line:col` of a blocking error. */
export const errorLocation = (error: RunBlockingError): string =>
  `${error.path}:${error.line}:${error.column}`

/** The line typed into the terminal for a Run of `entry`. */
export const runCommandLine = (
  container: ContainerService,
  entry: string,
): string => `node ${container.hostDirPath(RUN_WRAPPER_NAME)} ${entry}`

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

interface LspPosition {
  readonly line?: number
  readonly character?: number
}

interface LspDiagnostic {
  readonly severity?: number | undefined
  readonly message?: string | undefined
  readonly code?: string | number | undefined
  readonly range?:
    | { readonly start?: LspPosition; readonly end?: LspPosition }
    | undefined
}

const formatCode = (code: string | number | undefined): string | undefined =>
  code === undefined || code === ""
    ? undefined
    : typeof code === "number"
      ? `TS${code}`
      : code

/**
 * The errors (severity 1) in a set of LSP diagnostics by document URI,
 * sorted by path and position. Warnings, infos and hints don't block Runs.
 */
export const runBlockingErrorsOf = (
  diagnosticsByUri: ReadonlyMap<string, ReadonlyArray<unknown>>,
  rootUri: string,
  /** The text of a 1-based line of a Workspace file, for code frames. */
  sourceLine?: (path: string, line: number) => string | undefined,
): ReadonlyArray<RunBlockingError> => {
  const errors: Array<RunBlockingError> = []
  for (const [uri, items] of diagnosticsByUri) {
    const path = workspaceUriToPath(uri, rootUri)
    if (path === undefined) continue
    for (const item of items as ReadonlyArray<LspDiagnostic>) {
      if (item?.severity !== 1) continue
      const line = (item.range?.start?.line ?? 0) + 1
      const column = (item.range?.start?.character ?? 0) + 1
      errors.push({
        path,
        line,
        column,
        endLine: (item.range?.end?.line ?? line - 1) + 1,
        endColumn: (item.range?.end?.character ?? column - 1) + 1,
        message: item.message ?? "",
        code: formatCode(item.code),
        source: sourceLine?.(path, line),
      })
    }
  }
  return errors.sort(
    (a, b) =>
      (a.path < b.path ? -1 : a.path > b.path ? 1 : 0) ||
      a.line - b.line ||
      a.column - b.column,
  )
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export interface RunsService {
  readonly state: Effect.Effect<RunsState>
  /** The current state, then every change. */
  readonly stateChanges: Stream.Stream<RunsState>
  /** Feed the Workspace mirror's changes here (after `Dependencies`). */
  readonly onMirrorChange: (change: MirrorChange) => Effect.Effect<void>
  /** Ctrl+C for the current Run, if it is running. */
  readonly stop: Effect.Effect<void>
  /** Runs again now, without edits and without the debounce. Still gated. */
  readonly restart: Effect.Effect<void>
}

export class Runs extends Context.Service<Runs, RunsService>()(
  "@website/scratchpad/Runs",
) {}

export interface MakeRunsOptions {
  readonly container: ContainerService
  readonly dependencies: DependenciesService
  readonly terminal: TerminalService
  /** The tsrs errors anywhere in the Workspace, as of now. */
  readonly blockingErrors: Effect.Effect<ReadonlyArray<RunBlockingError>>
  readonly debounce?: Duration.Input | undefined
  /** The entry file. Defaults to `src/main.ts`. */
  readonly entry?: string | undefined
}

type Signal =
  | { readonly _tag: "Changed"; readonly path: string }
  | { readonly _tag: "Restart" }

const changedPath = (change: MirrorChange): string | undefined => {
  if (change._tag === "Mounted") return undefined
  const event = change.event
  switch (event._tag) {
    case "FileCreated":
    case "FileChanged":
    case "FileDeleted":
      return event.path
    case "FileRenamed":
      return event.newPath
    case "DirectoryChanged":
      return undefined
  }
}

export const makeRuns = (
  options: MakeRunsOptions,
): Effect.Effect<RunsService, never, Scope.Scope> =>
  Effect.gen(function* () {
    const { container, dependencies, terminal } = options
    const entry = options.entry ?? SCRATCHPAD_ENTRY_PATH
    const debounce = Duration.fromInputUnsafe(
      options.debounce ?? DEFAULT_RUN_DEBOUNCE,
    )
    const scope = yield* Effect.scope
    const stateRef = yield* SubscriptionRef.make(initialRunsState)
    const signals = yield* Queue.unbounded<Signal>()
    // Starting, replacing and stopping Runs happen one at a time.
    const lock = yield* Semaphore.make(1)

    let nextId = 1
    let scriptsWritten = false
    // What the next Run will be for.
    let pendingInitial = true
    let pendingRestart = false
    const pendingPaths = new Set<string>()

    const hasPending = () =>
      pendingInitial || pendingRestart || pendingPaths.size > 0

    const apply = (signal: Signal) => {
      if (signal._tag === "Restart") pendingRestart = true
      else pendingPaths.add(signal.path)
    }

    const takeTrigger = (): string => {
      const trigger = pendingRestart
        ? "restart"
        : pendingInitial
          ? "initial"
          : pendingPaths.size === 1
            ? `${[...pendingPaths][0]} changed`
            : `${pendingPaths.size} files changed`
      pendingInitial = false
      pendingRestart = false
      pendingPaths.clear()
      return trigger
    }

    /** Records how Run `id` ended. */
    const finish = (id: number, status: RunStatus) =>
      Effect.gen(function* () {
        const endedAt = yield* Clock.currentTimeMillis
        yield* SubscriptionRef.update(stateRef, (state) =>
          state.run?.id !== id || state.run.status._tag !== "running"
            ? state
            : { ...state, run: { ...state.run, status, endedAt } },
        )
      })

    const ensureScripts = Effect.suspend(() =>
      scriptsWritten
        ? Effect.void
        : container.writeHostDirFile(RUN_PRELOAD_NAME, RUN_PRELOAD_SCRIPT).pipe(
            Effect.andThen(
              container.writeHostDirFile(RUN_WRAPPER_NAME, RUN_WRAPPER_SCRIPT),
            ),
            Effect.tap(() =>
              Effect.sync(() => {
                scriptsWritten = true
              }),
            ),
          ),
    )

    const start = (trigger: string) =>
      lock.withPermits(1)(
        Effect.gen(function* () {
          const errors = yield* options.blockingErrors
          const at = yield* Clock.currentTimeMillis
          if (errors.length > 0) {
            yield* terminal.interrupt
            yield* SubscriptionRef.update(stateRef, (state) => ({
              ...state,
              skipped: { trigger, at, errors },
            }))
            return
          }
          const run: RunInfo = {
            id: nextId++,
            trigger,
            entry,
            startedAt: at,
            endedAt: undefined,
            status: { _tag: "running" },
          }
          yield* SubscriptionRef.update(stateRef, (state) => ({
            ...state,
            run,
            skipped: undefined,
          }))
          const written = yield* Effect.result(ensureScripts)
          if (written._tag === "Failure") {
            yield* finish(run.id, {
              _tag: "failed",
              message: written.failure.message,
            })
            return
          }
          yield* terminal.run(runCommandLine(container, entry), run.id)
        }),
      )

    const awaitRunnable = dependencies.stateChanges.pipe(
      Stream.filter(canRun),
      Stream.take(1),
      Stream.runDrain,
    )

    const setWaiting = (waiting: RunWait | undefined) =>
      SubscriptionRef.update(stateRef, (state) =>
        state.waiting === waiting ? state : { ...state, waiting },
      )

    /** The typing guard: waits until the visitor isn't using the prompt. */
    const awaitPromptFree = Effect.gen(function* () {
      while (true) {
        const waiting = runWaitOf(yield* terminal.state)
        yield* setWaiting(waiting)
        if (waiting === undefined) return
        yield* terminal.stateChanges.pipe(
          Stream.filter((state) => runWaitOf(state) !== waiting),
          Stream.take(1),
          Stream.runDrain,
        )
      }
    })

    const scheduler = Effect.gen(function* () {
      while (true) {
        if (!hasPending()) apply(yield* Queue.take(signals))
        // Debounce: wait until no change came for `debounce`. Restart skips it.
        while (!pendingRestart) {
          const next = yield* Queue.take(signals).pipe(
            Effect.timeoutOption(debounce),
          )
          if (Option.isNone(next)) break
          apply(next.value)
        }
        yield* awaitRunnable
        // Changes that landed while waiting (an install's sync-back, more
        // edits) get their own debounce before the Run.
        if (!pendingRestart && (yield* Queue.size(signals)) > 0) continue
        yield* awaitPromptFree
        // Changes made while the visitor typed go in this Run.
        for (const signal of yield* Queue.clear(signals)) apply(signal)
        yield* start(takeTrigger())
      }
    })

    yield* terminal.runEvents.pipe(
      Stream.runForEach((event) =>
        finish(
          event.id,
          event._tag === "RunExited"
            ? { _tag: "exited", exitCode: event.exitCode }
            : { _tag: "stopped" },
        ),
      ),
      Effect.forkIn(scope),
    )
    yield* dependencies.stateChanges.pipe(
      Stream.runForEach((deps) =>
        SubscriptionRef.update(stateRef, (state) =>
          state.available === canRun(deps)
            ? state
            : { ...state, available: canRun(deps) },
        ),
      ),
      Effect.forkIn(scope),
    )
    yield* Effect.forkIn(scheduler, scope)

    return {
      state: SubscriptionRef.get(stateRef),
      stateChanges: SubscriptionRef.changes(stateRef),
      onMirrorChange: (change) => {
        const path = changedPath(change)
        return path === undefined
          ? Effect.void
          : Queue.offer(signals, { _tag: "Changed", path }).pipe(Effect.asVoid)
      },
      stop: terminal.interrupt,
      restart: Queue.offer(signals, { _tag: "Restart" }).pipe(Effect.asVoid),
    }
  })

/** `Runs` for the page's Container, Dependencies and Terminal, gated by `blockingErrors`. */
export const layerRuns = (
  options: Omit<MakeRunsOptions, "container" | "dependencies" | "terminal">,
): Layer.Layer<Runs, never, Container | Dependencies | Terminal> =>
  Layer.effect(
    Runs,
    Effect.gen(function* () {
      return yield* makeRuns({
        ...options,
        container: yield* Container,
        dependencies: yield* Dependencies,
        terminal: yield* Terminal,
      })
    }),
  )
