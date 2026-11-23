/**
 * Runs: the page decides when to run `src/main.ts` in the Container
 * (ADR 0004, ticket 09).
 *
 * - The first Run starts once the Container can run code (dependencies
 *   installed, and the installed types in the editor or given up on), and
 *   later Runs start `debounce` (500 ms) after the last Workspace change
 *   landed in the Container. Changes come from the mirror's `onChange`, so a
 *   Run never starts before the Container has the files it runs.
 * - No Run starts while `pnpm install` or the types copy is in progress. A
 *   change made meanwhile runs once they finish.
 * - Before each Run the gate (`blockingErrors`, the tsrs errors anywhere in
 *   the Workspace) is checked. Any error skips the Run: the previous process
 *   stops, its output stays (the panel dims it), and `skipped` says why.
 *   Warnings, infos and hints never block.
 * - A new Run kills the previous process and clears the output. There is no
 *   time limit. `stop` kills the current Run; `restart` runs again now, with
 *   no debounce, still gated.
 *
 * The runner is `node --experimental-transform-types --import <preload>
 * src/main.ts` (spike 01). The preload (`run-preload.mjs`) is written to the
 * host scripts directory, outside the mirrored Workspace.
 */
import * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
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
import { SCRATCHPAD_ENTRY_PATH } from "./config.ts"
import { workspaceUriToPath } from "./workspace.ts"

export { RUN_PRELOAD_SCRIPT }

export const RUN_PRELOAD_NAME = "run-preload.mjs"
export const DEFAULT_RUN_DEBOUNCE: Duration.Input = "500 millis"
/** The Run output kept for the panel (the end of it). */
export const RUN_OUTPUT_LIMIT = 256 * 1024

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
  | { readonly _tag: "stopped" }
  /** The process could not start. */
  | { readonly _tag: "failed"; readonly message: string }

export interface RunInfo {
  /** Increments with each Run; identifies it internally, never shown. */
  readonly id: number
  /** Why it ran: `initial`, `restart`, `src/main.ts changed`, `2 files changed`. */
  readonly trigger: string
  /** Epoch milliseconds. */
  readonly startedAt: number
  readonly status: RunStatus
}

/** A Run that the gate skipped. It is not a Run: it has no number. */
export interface RunSkip {
  readonly trigger: string
  readonly at: number
  readonly errors: ReadonlyArray<RunBlockingError>
  /** The Run whose output stays below the notice, if there was one. */
  readonly previousRunId: number | undefined
  /** When that Run started. */
  readonly previousRunStartedAt: number | undefined
}

export interface RunsState {
  /** Whether the Container can run code now (installed, not installing). */
  readonly available: boolean
  /** The latest Run, which owns the output. */
  readonly run: RunInfo | undefined
  /** Set when the latest attempt was skipped; cleared by the next Run. */
  readonly skipped: RunSkip | undefined
}

export const initialRunsState: RunsState = {
  available: false,
  run: undefined,
  skipped: undefined,
}

/**
 * The output panel's terminal text for one Run, ANSI included: the header,
 * the program's output, and the exit line. `total` counts every character
 * ever appended, so a reader can write only what is new even after `text`
 * was trimmed to its last `RUN_OUTPUT_LIMIT` characters.
 */
export interface RunOutput {
  readonly runId: number
  readonly text: string
  readonly total: number
}

export const emptyRunOutput: RunOutput = { runId: 0, text: "", total: 0 }

/** Whether the Container can run code in this dependency state. */
export const canRun = (state: DependencyState): boolean => {
  const phase = containerPhaseOf(state)._tag
  return phase === "ready" || phase === "dependencies-unavailable"
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, "0")

/** `HH:MM:SS` in local time. */
export const formatRunTime = (millis: number): string => {
  const date = new Date(millis)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const ESC = "\u001b["
const reset = `${ESC}0m`

/** `▶ HH:MM:SS · trigger`. */
export const runHeader = (run: {
  readonly trigger: string
  readonly startedAt: number
}): string =>
  `${ESC}1;34m▶ ${formatRunTime(run.startedAt)}${reset}${ESC}2m · ${reset}${ESC}35m${run.trigger}${reset}\r\n`

const statusLine = (status: RunStatus): string => {
  switch (status._tag) {
    case "running":
      return ""
    case "exited":
      return status.exitCode === 0
        ? `${ESC}2mexited with code 0${reset}\r\n`
        : `${ESC}31mexited with code ${status.exitCode}${reset}\r\n`
    case "stopped":
      return `${ESC}2mstopped${reset}\r\n`
    case "failed":
      return `${ESC}31m${status.message}${reset}\r\n`
  }
}

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
  readonly output: Effect.Effect<RunOutput>
  /** The current output, then every change. */
  readonly outputChanges: Stream.Stream<RunOutput>
  /** Feed the Workspace mirror's changes here (after `Dependencies`). */
  readonly onMirrorChange: (change: MirrorChange) => Effect.Effect<void>
  /** Kills the current Run's process, if it is running. */
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
  /** The tsrs errors anywhere in the Workspace, as of now. */
  readonly blockingErrors: Effect.Effect<ReadonlyArray<RunBlockingError>>
  readonly debounce?: Duration.Input | undefined
}

type Signal =
  | { readonly _tag: "Changed"; readonly path: string }
  | { readonly _tag: "Restart" }

const tail = (text: string, limit: number) =>
  text.length <= limit ? text : text.slice(text.length - limit)

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
    const { container, dependencies } = options
    const debounce = Duration.fromInputUnsafe(
      options.debounce ?? DEFAULT_RUN_DEBOUNCE,
    )
    const scope = yield* Effect.scope
    const stateRef = yield* SubscriptionRef.make(initialRunsState)
    const outputRef = yield* SubscriptionRef.make(emptyRunOutput)
    const signals = yield* Queue.unbounded<Signal>()
    // Starting, replacing and stopping Runs happen one at a time.
    const lock = yield* Semaphore.make(1)

    let current: Fiber.Fiber<void> | undefined
    let nextId = 1
    let preloadWritten = false
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

    const append = (id: number, chunk: string) =>
      SubscriptionRef.update(outputRef, (output) =>
        output.runId === id
          ? {
              runId: id,
              text: tail(output.text + chunk, RUN_OUTPUT_LIMIT),
              total: output.total + chunk.length,
            }
          : output,
      )

    /** Records how Run `id` ended and writes the exit line. */
    const finish = (id: number, status: RunStatus) =>
      Effect.gen(function* () {
        const state = yield* SubscriptionRef.get(stateRef)
        if (state.run?.id !== id || state.run.status._tag !== "running") return
        yield* SubscriptionRef.set(stateRef, {
          ...state,
          run: { ...state.run, status },
        })
        const output = yield* SubscriptionRef.get(outputRef)
        const newline =
          output.runId === id && !output.text.endsWith("\n") ? "\r\n" : ""
        yield* append(id, `${newline}${statusLine(status)}`)
      })

    const ensurePreload = Effect.suspend(() =>
      preloadWritten
        ? Effect.void
        : container.writeHostDirFile(RUN_PRELOAD_NAME, RUN_PRELOAD_SCRIPT).pipe(
            Effect.tap(() =>
              Effect.sync(() => {
                preloadWritten = true
              }),
            ),
          ),
    )

    const runProcess = (id: number) =>
      Effect.scoped(
        Effect.gen(function* () {
          yield* ensurePreload
          const process = yield* container.spawn({
            command: "node",
            args: [
              "--experimental-transform-types",
              "--disable-warning=ExperimentalWarning",
              "--import",
              container.hostDirPath(RUN_PRELOAD_NAME),
              SCRATCHPAD_ENTRY_PATH,
            ],
          })
          yield* process.output.pipe(
            Stream.runForEach((chunk) => append(id, chunk)),
            Effect.catch((error) => append(id, `\r\n${error.message}\r\n`)),
          )
          const exitCode = yield* process.exitCode
          yield* finish(id, { _tag: "exited", exitCode })
        }),
      ).pipe(
        Effect.catch((error) =>
          finish(id, { _tag: "failed", message: error.message }),
        ),
        Effect.onInterrupt(() => finish(id, { _tag: "stopped" })),
      )

    const stopCurrent = Effect.suspend(() => {
      const fiber = current
      current = undefined
      return fiber === undefined ? Effect.void : Fiber.interrupt(fiber)
    })

    const start = (trigger: string) =>
      lock.withPermits(1)(
        Effect.gen(function* () {
          const errors = yield* options.blockingErrors
          const at = yield* Clock.currentTimeMillis
          yield* stopCurrent
          if (errors.length > 0) {
            yield* SubscriptionRef.update(stateRef, (state) => ({
              ...state,
              skipped: {
                trigger,
                at,
                errors,
                previousRunId: state.run?.id,
                previousRunStartedAt: state.run?.startedAt,
              },
            }))
            return
          }
          const run: RunInfo = {
            id: nextId++,
            trigger,
            startedAt: at,
            status: { _tag: "running" },
          }
          const header = runHeader(run)
          yield* SubscriptionRef.update(stateRef, (state) => ({
            ...state,
            run,
            skipped: undefined,
          }))
          yield* SubscriptionRef.set(outputRef, {
            runId: run.id,
            text: header,
            total: header.length,
          })
          current = yield* Effect.forkIn(runProcess(run.id), scope)
        }),
      )

    const awaitRunnable = dependencies.stateChanges.pipe(
      Stream.filter(canRun),
      Stream.take(1),
      Stream.runDrain,
    )

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
        yield* start(takeTrigger())
      }
    })

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
      output: SubscriptionRef.get(outputRef),
      outputChanges: SubscriptionRef.changes(outputRef),
      onMirrorChange: (change) => {
        const path = changedPath(change)
        return path === undefined
          ? Effect.void
          : Queue.offer(signals, { _tag: "Changed", path }).pipe(Effect.asVoid)
      },
      stop: lock.withPermits(1)(stopCurrent),
      restart: Queue.offer(signals, { _tag: "Restart" }).pipe(Effect.asVoid),
    }
  })

/** `Runs` for the page's Container and Dependencies, gated by `blockingErrors`. */
export const layerRuns = (
  options: Omit<MakeRunsOptions, "container" | "dependencies">,
): Layer.Layer<Runs, never, Container | Dependencies> =>
  Layer.effect(
    Runs,
    Effect.gen(function* () {
      return yield* makeRuns({
        ...options,
        container: yield* Container,
        dependencies: yield* Dependencies,
      })
    }),
  )
