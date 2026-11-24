/**
 * The diagnostics file: tsrs in the web worker is the only type
 * checker, and the watch runner in the Container (`run-watch.cjs`) waits for
 * its verdict on the files it is about to run.
 *
 * Whenever the worker's diagnostics are current for the Workspace's
 * documents (the page decides, see `current` in `editor.ts`), the page writes
 * `.scratchpad/diagnostics.json`:
 *
 * ```json
 * { "files": { "src/main.ts": "<sha256 of its text>" },
 *   "errors": [{ "path": "src/main.ts", "line": 4, "column": 7, "text": "…" }] }
 * ```
 *
 * `files` lists every document checked (and `package.json`), hashed from the
 * same text the Container has, so the runner can tell the check is about the
 * files on its disk. `text` is the error printed like `tsc`'s, code frame
 * included, ready for the terminal.
 */
import * as Clock from "effect/Clock"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import type { ContainerService } from "./container.ts"
import {
  containerPhaseOf,
  type DependenciesService,
  type DependencyState,
} from "./dependencies.ts"
// `?raw` is the file's text; the linter resolves the module itself.
// oxlint-disable-next-line import/default
import RUN_PRELOAD_SCRIPT from "./run-preload.mjs?raw"
// oxlint-disable-next-line import/default
import RUN_WATCH_SCRIPT from "./run-watch.cjs?raw"
import { workspaceUriToPath } from "./workspace.ts"

/** In the host scripts directory, where the runner reads it. */
export const DIAGNOSTICS_FILE_NAME = "diagnostics.json"
/** Touched (in the host scripts directory) by the Restart button. */
export const RESTART_FILE_NAME = "restart"
/** The runner, `../run` from the Workspace dir. */
export const RUNNER_NAME = "run"
export const RUN_PRELOAD_NAME = "run-preload.mjs"

/** Writes the runner and its preload into the Container. */
export const installRunner = (
  container: ContainerService,
): Effect.Effect<void, unknown> =>
  container
    .writeHostDirFile(RUN_PRELOAD_NAME, RUN_PRELOAD_SCRIPT)
    .pipe(
      Effect.andThen(container.writeExecutable(RUNNER_NAME, RUN_WATCH_SCRIPT)),
    )

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** A tsrs error. `line` and `column` are 1-based. */
export interface DiagnosticError {
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
 * sorted by path and position. Warnings, infos and hints never stop a Run.
 */
export const diagnosticErrorsOf = (
  diagnosticsByUri: ReadonlyMap<string, ReadonlyArray<unknown>>,
  rootUri: string,
  /** The text of a 1-based line of a Workspace file, for code frames. */
  sourceLine?: (path: string, line: number) => string | undefined,
): ReadonlyArray<DiagnosticError> => {
  const errors: Array<DiagnosticError> = []
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
// tsc-style formatting
// ---------------------------------------------------------------------------

const ESC = "\u001b["
const reset = `${ESC}0m`
const cyan = (text: string) => `${ESC}96m${text}${reset}`
const yellow = (text: string) => `${ESC}93m${text}${reset}`
const red = (text: string) => `${ESC}91m${text}${reset}`
const grey = (text: string) => `${ESC}90m${text}${reset}`
const inverse = (text: string) => `${ESC}7m${text}${reset}`

/**
 * An error as `tsc --pretty` prints it, with `\r\n` line ends:
 *
 * ```text
 * src/main.ts:4:7 - error TS2322: Type 'string' is not assignable to type 'number'.
 *
 * 4 const n: number = "nope"
 *         ~
 * ```
 *
 * The underline covers the error's range on its first line.
 */
export const formatTscError = (error: DiagnosticError): string => {
  const code = error.code === undefined ? "" : ` ${error.code}`
  const message = error.message.replace(/\r?\n/g, "\r\n  ")
  const header = `${cyan(error.path)}:${yellow(String(error.line))}:${yellow(String(error.column))} - ${red("error")}${grey(`${code}: `)}${message}\r\n`
  if (error.source === undefined) return header
  const gutter = String(error.line)
  const start = Math.min(error.column - 1, error.source.length)
  const end =
    error.endLine === error.line
      ? Math.min(error.endColumn - 1, error.source.length)
      : error.source.length
  const prefix = error.source.slice(0, start).replace(/[^\t]/g, " ")
  const underline = `${prefix}${"~".repeat(Math.max(1, end - start))}`
  return `${header}\r\n${inverse(gutter)} ${error.source}\r\n${inverse(" ".repeat(gutter.length))} ${red(underline)}\r\n`
}

// ---------------------------------------------------------------------------
// The file
// ---------------------------------------------------------------------------

/** What the page knows once the diagnostics are current. */
export interface DiagnosticsCheck {
  /** Every checked document's text, and `package.json`'s. */
  readonly files: ReadonlyArray<{
    readonly path: string
    readonly text: string
  }>
  readonly errors: ReadonlyArray<DiagnosticError>
}

const textEncoder = new TextEncoder()

/** The SHA-256 of `text`'s UTF-8 bytes, in hex (Node's `digest("hex")`). */
export const sha256Hex = (text: string): Effect.Effect<string> =>
  Effect.promise(async () => {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      textEncoder.encode(text),
    )
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("")
  })

/** The diagnostics file's JSON for a check. */
export const encodeDiagnosticsFile = (
  check: DiagnosticsCheck,
): Effect.Effect<string> =>
  Effect.gen(function* () {
    const files: Record<string, string> = {}
    for (const file of [...check.files].sort((a, b) =>
      a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
    )) {
      files[file.path] = yield* sha256Hex(file.text)
    }
    return JSON.stringify({
      files,
      errors: check.errors.map((error) => ({
        path: error.path,
        line: error.line,
        column: error.column,
        text: formatTscError(error),
      })),
    })
  })

// ---------------------------------------------------------------------------
// The writer
// ---------------------------------------------------------------------------

/** What the file says while the page installs: the runner waits. */
export const INSTALLING_FILE = JSON.stringify({
  installing: true,
  files: {},
  errors: [],
})

/** How often the writer looks again while the diagnostics aren't current. */
export const DIAGNOSTICS_POLL: Duration.Input = "50 millis"
/** How long it keeps looking after a wake-up before giving up until the next. */
export const DIAGNOSTICS_GIVE_UP: Duration.Input = "15 seconds"

/** Whether the Container can run code in this dependency state. */
export const canRun = (state: DependencyState): boolean => {
  const phase = containerPhaseOf(state)._tag
  return phase === "ready" || phase === "dependencies-unavailable"
}

export interface DiagnosticsWriterOptions {
  readonly container: ContainerService
  readonly dependencies: DependenciesService
  /**
   * The check, when the worker's diagnostics are current for every document
   * (and quiet); `None` while they aren't.
   */
  readonly current: Effect.Effect<Option.Option<DiagnosticsCheck>>
  /** Anything that can change the check: a diagnostics push, an edit. */
  readonly wakeups: Stream.Stream<unknown>
}

/**
 * Writes the diagnostics file whenever the check is current and differs
 * from the last one written, while the Container can run code (installed,
 * types loaded), and `INSTALLING_FILE` while it can't. Runs until its scope
 * closes.
 */
export const runDiagnosticsWriter = (
  options: DiagnosticsWriterOptions,
): Effect.Effect<void, never, Scope.Scope> =>
  Effect.gen(function* () {
    const { container, dependencies } = options
    const wakeups = yield* Queue.unbounded<void>()
    const wake = Queue.offer(wakeups, undefined).pipe(Effect.asVoid)
    yield* Stream.merge(options.wakeups, dependencies.stateChanges).pipe(
      Stream.runForEach(() => wake),
      Effect.forkScoped,
    )
    const giveUp = Duration.toMillis(
      Duration.fromInputUnsafe(DIAGNOSTICS_GIVE_UP),
    )
    let written: string | undefined

    const write = (json: string) =>
      json === written
        ? Effect.void
        : Effect.result(
            container.writeHostDirFile(DIAGNOSTICS_FILE_NAME, json),
          ).pipe(
            Effect.map((result) => {
              if (result._tag === "Success") written = json
            }),
          )

    /**
     * While installing, tells the runner to wait; otherwise looks until the
     * check is current, then writes it if it changed. A state change wakes
     * it again.
     */
    const settle = Effect.gen(function* () {
      const started = yield* Clock.currentTimeMillis
      while ((yield* Clock.currentTimeMillis) - started < giveUp) {
        if (!canRun(yield* dependencies.state)) {
          return yield* write(INSTALLING_FILE)
        }
        const check = yield* options.current
        if (Option.isSome(check)) {
          return yield* write(yield* encodeDiagnosticsFile(check.value))
        }
        yield* Effect.sleep(DIAGNOSTICS_POLL)
      }
    })

    while (true) {
      yield* Queue.take(wakeups)
      yield* Queue.clear(wakeups)
      yield* settle
    }
  })
