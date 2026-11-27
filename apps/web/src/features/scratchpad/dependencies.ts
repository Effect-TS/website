/**
 * The Container's dependencies: install, sync-back and installed types.
 *
 * After the Workspace is mounted, and whenever the mirror writes a new
 * `package.json` into the Container, the Scratchpad runs one cycle:
 *
 * 1. `pnpm install` (plain: the Container's pnpm 8.15.6 rejects `-E`).
 * 2. Sync-back: the Container's `package.json` and `pnpm-lock.yaml` go back
 *    into the Workspace through `writeHostFile`, when they differ.
 * 3. Types: the collector script (`collect-types.cjs`) packs every installed
 *    `package.json` and declaration file into one TSPK file in the host
 *    scripts directory. The host reads it once and the language server
 *    worker swaps its `node_modules` for it (`LspWorkspaceMirror.mountTypes`).
 *
 * Cycles are serialized: a new trigger interrupts the running cycle (which
 * kills its process) before the next one starts.
 *
 * When `package.json` or `pnpm-lock.yaml` changes in the Container itself
 * (a terminal `pnpm add`, pulled back by the two-way sync), the install has
 * already run. Once the Container's dependency files have been quiet for
 * `containerInstallQuiet`, the Scratchpad does steps 2 and 3 only.
 *
 * Diagnostics stay hidden until the first types land, so the editor never
 * flashes "Cannot find module 'effect'". They are released for good when
 * types first mount, when the Container cannot boot or install, when types
 * cannot be loaded, or `typesTimeout` after the Container is ready.
 */
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type * as Scope from "effect/Scope"
import * as Semaphore from "effect/Semaphore"
import * as Stream from "effect/Stream"
import * as SubscriptionRef from "effect/SubscriptionRef"
import COLLECT_TYPES_SCRIPT from "./collect-types.cjs?raw"
import {
  Container,
  type ContainerBootPhase,
  type ContainerChanges,
  type ContainerPhase,
  type ContainerService,
  InstallFailed,
  type MirrorChange,
} from "./container.ts"
import type { TypesMountedInfo } from "./worker-protocol.ts"
import {
  LspWorkspaceMirror,
  type LspWorkspaceMirrorService,
} from "./worker-transport.ts"
import { Workspace, type WorkspaceService } from "./workspace.ts"

/** How long after the Container is ready diagnostics wait for types. */
export const DEFAULT_TYPES_TIMEOUT: Duration.Input = "60 seconds"
/**
 * How long `node_modules`, `package.json` and `pnpm-lock.yaml` must be quiet
 * after a Container-side change before the types reload.
 */
export const DEFAULT_CONTAINER_INSTALL_QUIET: Duration.Input = "1500 millis"
/** The install output kept for display (the end of it). */
export const INSTALL_OUTPUT_LIMIT = 64 * 1024
/** The install output carried by `InstallFailed`. */
export const INSTALL_OUTPUT_TAIL = 4 * 1024

export const COLLECTOR_SCRIPT_NAME = "collect-types.cjs"
const TYPES_PACK_NAME = "types.pack"
export const SYNCED_BACK_PATHS = ["package.json", "pnpm-lock.yaml"] as const

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export type InstallState =
  /** Waiting for the mount (or for the Container to boot). */
  | { readonly _tag: "pending" }
  | { readonly _tag: "running" }
  | { readonly _tag: "succeeded" }
  | { readonly _tag: "failed"; readonly error: InstallFailed }

export type TypesState =
  | { readonly _tag: "none" }
  | { readonly _tag: "loading" }
  | { readonly _tag: "mounted"; readonly info: TypesMountedInfo }
  | { readonly _tag: "unavailable"; readonly reason: string }

export interface DependencyState {
  readonly boot: ContainerBootPhase
  readonly install: InstallState
  readonly types: TypesState
  /** `typesTimeout` passed after boot with no types mounted. */
  readonly timedOut: boolean
  /** Sticky: once diagnostics are shown they are never hidden again. */
  readonly diagnosticsVisible: boolean
}

export const initialDependencyState: DependencyState = {
  boot: { _tag: "booting" },
  install: { _tag: "pending" },
  types: { _tag: "none" },
  timedOut: false,
  diagnosticsVisible: false,
}

const TIMEOUT_REASON =
  "Installed types did not reach the editor in time, so diagnostics are shown without them."

/** The status badge's phase for a state. */
export const containerPhaseOf = (state: DependencyState): ContainerPhase => {
  if (state.boot._tag === "booting") return { _tag: "booting" }
  if (state.boot._tag === "failed") {
    return { _tag: "failed", error: state.boot.error }
  }
  switch (state.install._tag) {
    case "pending":
    case "running":
      return { _tag: "installing" }
    case "failed":
      return { _tag: "install-failed", error: state.install.error }
    case "succeeded":
      break
  }
  switch (state.types._tag) {
    case "mounted":
      return { _tag: "ready" }
    case "unavailable":
      return { _tag: "dependencies-unavailable", reason: state.types.reason }
    case "none":
    case "loading":
      return state.timedOut
        ? { _tag: "dependencies-unavailable", reason: TIMEOUT_REASON }
        : { _tag: "loading-types" }
  }
}

/** Whether a state releases the diagnostics (once released they stay). */
export const releasesDiagnostics = (state: DependencyState): boolean =>
  state.diagnosticsVisible ||
  state.types._tag === "mounted" ||
  state.types._tag === "unavailable" ||
  state.boot._tag === "failed" ||
  state.install._tag === "failed" ||
  state.timedOut

export interface InstallLog {
  /** Increments with each install. */
  readonly run: number
  readonly running: boolean
  /** Terminal output, ANSI included, trimmed to its last `INSTALL_OUTPUT_LIMIT` characters. */
  readonly output: string
  readonly exitCode: number | undefined
}

export const emptyInstallLog: InstallLog = {
  run: 0,
  running: false,
  output: "",
  exitCode: undefined,
}

const tail = (text: string, limit: number) =>
  text.length <= limit ? text : text.slice(text.length - limit)

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export interface DependenciesService {
  readonly state: Effect.Effect<DependencyState>
  /** The current state, then every change. */
  readonly stateChanges: Stream.Stream<DependencyState>
  readonly installLog: Effect.Effect<InstallLog>
  /** The current install log, then every change. */
  readonly installLogChanges: Stream.Stream<InstallLog>
  /**
   * Waits until diagnostics are released: types mounted for the first time,
   * or the Scratchpad gave up waiting for them (see the module docs).
   */
  readonly awaitDiagnosticsVisible: Effect.Effect<void>
  /** Starts a cycle now, superseding a running one. */
  readonly install: Effect.Effect<void>
  /** Feed the Workspace mirror's changes here (`mirrorWorkspace`'s `onChange`). */
  readonly onMirrorChange: (change: MirrorChange) => Effect.Effect<void>
  /**
   * Feed the Container's changes here (`mirrorWorkspace`'s
   * `onContainerChange`). A Container-side `package.json` or lockfile change
   * reloads the types once the install settles, without reinstalling.
   */
  readonly onContainerChange: (changes: ContainerChanges) => Effect.Effect<void>
}

export class Dependencies extends Context.Service<
  Dependencies,
  DependenciesService
>()("@website/scratchpad/Dependencies") {}

export interface MakeDependenciesOptions {
  readonly workspace: WorkspaceService
  readonly container: ContainerService
  /** The language server's file system mirror; without it types are unavailable. */
  readonly mirror: Option.Option<LspWorkspaceMirrorService>
  readonly typesTimeout?: Duration.Input | undefined
  readonly containerInstallQuiet?: Duration.Input | undefined
}

class TypesUnavailable extends Data.TaggedError("TypesUnavailable")<{
  readonly reason: string
}> {}

export const makeDependencies = (
  options: MakeDependenciesOptions,
): Effect.Effect<DependenciesService, never, Scope.Scope> =>
  Effect.gen(function* () {
    const { workspace, container, mirror } = options
    const typesTimeout = Duration.fromInputUnsafe(
      options.typesTimeout ?? DEFAULT_TYPES_TIMEOUT,
    )
    const containerInstallQuiet = Duration.fromInputUnsafe(
      options.containerInstallQuiet ?? DEFAULT_CONTAINER_INSTALL_QUIET,
    )
    const scope = yield* Effect.scope
    const stateRef = yield* SubscriptionRef.make(initialDependencyState)
    const logRef = yield* SubscriptionRef.make(emptyInstallLog)
    const visible = yield* Deferred.make<void>()
    const triggerLock = yield* Semaphore.make(1)

    const update = (f: (state: DependencyState) => DependencyState) =>
      SubscriptionRef.updateAndGet(stateRef, (state) => {
        const next = f(state)
        return releasesDiagnostics(next) && !next.diagnosticsVisible
          ? { ...next, diagnosticsVisible: true }
          : next
      }).pipe(
        Effect.flatMap((state) =>
          state.diagnosticsVisible
            ? Deferred.succeed(visible, undefined)
            : Effect.void,
        ),
        Effect.asVoid,
      )

    // The `package.json` the last cycle installed (or is installing), so the
    // sync-back's own write does not start another install.
    let installedPackageJson: string | undefined
    let current: Fiber.Fiber<void> | undefined
    // A page-started install cycle is running (its sync-back and types copy
    // cover whatever pnpm changes in the Container meanwhile).
    let installing = false
    // A Container-side change to the dependency files is waiting to settle.
    let reloadPending = false
    let reloadTimer: Fiber.Fiber<void> | undefined
    // The types the worker has, kept when a later copy fails.
    let mountedTypes: TypesMountedInfo | undefined

    const appendOutput = (chunk: string) =>
      SubscriptionRef.update(logRef, (log) => ({
        ...log,
        output: tail(log.output + chunk, INSTALL_OUTPUT_LIMIT),
      }))

    const runInstall: Effect.Effect<boolean> = Effect.gen(function* () {
      yield* update((s) => ({ ...s, install: { _tag: "running" } }))
      yield* SubscriptionRef.update(logRef, (log) => ({
        run: log.run + 1,
        running: true,
        output: "",
        exitCode: undefined,
      }))
      const exitCode = yield* Effect.scoped(
        Effect.gen(function* () {
          const process = yield* container.spawn({
            command: "pnpm",
            args: ["install"],
          })
          yield* process.output.pipe(
            Stream.runForEach(appendOutput),
            Effect.catch((error) => appendOutput(`\n${error.message}\n`)),
          )
          return yield* process.exitCode
        }),
      ).pipe(
        Effect.catch((error) =>
          appendOutput(`${error.message}\n`).pipe(Effect.as(-1)),
        ),
      )
      const log = yield* SubscriptionRef.updateAndGet(logRef, (log) => ({
        ...log,
        running: false,
        exitCode,
      }))
      if (exitCode === 0) {
        // Types load next; going through "ready" in between would flicker.
        yield* update((s) => ({
          ...s,
          install: { _tag: "succeeded" },
          types: { _tag: "loading" },
        }))
        return true
      }
      const error = new InstallFailed({
        exitCode,
        outputTail: tail(log.output, INSTALL_OUTPUT_TAIL),
        message:
          exitCode === -1
            ? "pnpm install could not start in the Container."
            : `pnpm install exited with code ${exitCode}.`,
      })
      yield* update((s) => ({ ...s, install: { _tag: "failed", error } }))
      return false
    })

    const syncBack = Effect.gen(function* () {
      for (const path of SYNCED_BACK_PATHS) {
        const installed = yield* container
          .readTextFile(path)
          .pipe(Effect.option)
        if (Option.isNone(installed)) continue
        if (path === "package.json") installedPackageJson = installed.value
        const inWorkspace = yield* workspace.readFile(path).pipe(Effect.option)
        if (Option.isSome(inWorkspace) && inWorkspace.value === installed.value)
          continue
        yield* workspace
          .writeHostFile(path, installed.value)
          .pipe(
            Effect.catch((error) =>
              Effect.logWarning(`Sync-back of ${path}`, error.message),
            ),
          )
      }
    })

    const collectTypes = Effect.scoped(
      Effect.gen(function* () {
        if (Option.isNone(mirror)) {
          return yield* Effect.fail(
            new TypesUnavailable({
              reason: "The language server cannot receive types.",
            }),
          )
        }
        yield* container.writeHostDirFile(
          COLLECTOR_SCRIPT_NAME,
          COLLECT_TYPES_SCRIPT,
        )
        const process = yield* container.spawn({
          command: "node",
          args: [
            container.hostDirPath(COLLECTOR_SCRIPT_NAME),
            "node_modules",
            container.hostDirPath(TYPES_PACK_NAME),
            "--skip-ts-libs",
          ],
        })
        const output = yield* process.output.pipe(
          Stream.mkString,
          Effect.orElseSucceed(() => ""),
        )
        const exitCode = yield* process.exitCode
        if (exitCode !== 0) {
          return yield* Effect.fail(
            new TypesUnavailable({
              reason: `Collecting installed types failed (exit code ${exitCode}): ${tail(output.trim(), 500)}`,
            }),
          )
        }
        const pack = yield* container.readHostDirFile(TYPES_PACK_NAME)
        yield* container.removeHostDirFile(TYPES_PACK_NAME).pipe(Effect.ignore)
        const result = yield* mirror.value
          .mountTypes(pack)
          .pipe(Effect.timeoutOption(typesTimeout))
        if (Option.isNone(result)) {
          return yield* Effect.fail(
            new TypesUnavailable({
              reason:
                "The language server did not confirm the installed types.",
            }),
          )
        }
        if (result.value._tag === "TypesRejected") {
          return yield* Effect.fail(
            new TypesUnavailable({
              reason: `The language server rejected the installed types: ${result.value.message}`,
            }),
          )
        }
        const { _tag: _, ...info } = result.value
        return info
      }),
    ).pipe(
      Effect.mapError((error) =>
        error instanceof TypesUnavailable
          ? error
          : new TypesUnavailable({ reason: error.message }),
      ),
    )

    const loadTypes = Effect.gen(function* () {
      const outcome = yield* collectTypes.pipe(Effect.result)
      if (outcome._tag === "Success") {
        const info = outcome.success
        mountedTypes = info
        yield* update((s) => ({ ...s, types: { _tag: "mounted", info } }))
        return
      }
      const reason = outcome.failure.reason
      yield* Effect.logWarning("Installed types", reason)
      // Types from an earlier install stay mounted in the worker.
      const previous = mountedTypes
      yield* update((s) => ({
        ...s,
        types:
          previous !== undefined
            ? { _tag: "mounted", info: previous }
            : { _tag: "unavailable", reason },
      }))
    })

    const cycle = Effect.gen(function* () {
      const installed = yield* runInstall
      if (!installed) return
      yield* syncBack
      yield* loadTypes
    }).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          installing = false
        }),
      ),
    )

    const cancelReload = Effect.gen(function* () {
      reloadPending = false
      if (reloadTimer !== undefined) yield* Fiber.interrupt(reloadTimer)
      reloadTimer = undefined
    })

    const trigger = (packageJson: string | undefined) =>
      triggerLock.withPermits(1)(
        Effect.gen(function* () {
          yield* cancelReload
          if (current !== undefined) yield* Fiber.interrupt(current)
          installedPackageJson = packageJson
          installing = true
          current = yield* Effect.forkIn(cycle, scope)
        }),
      )

    // Something else installed: sync back and copy the types, no install.
    const reload = Effect.gen(function* () {
      yield* update((s) => ({
        ...s,
        install: { _tag: "succeeded" },
        types: { _tag: "loading" },
      }))
      yield* syncBack
      yield* loadTypes
    })

    const startReload = triggerLock.withPermits(1)(
      Effect.gen(function* () {
        reloadPending = false
        reloadTimer = undefined
        if (current !== undefined) yield* Fiber.interrupt(current)
        current = yield* Effect.forkIn(reload, scope)
      }),
    )

    // Restarts the quiet period.
    const scheduleReload = triggerLock.withPermits(1)(
      Effect.gen(function* () {
        if (reloadTimer !== undefined) yield* Fiber.interrupt(reloadTimer)
        reloadTimer = yield* Effect.forkIn(
          Effect.sleep(containerInstallQuiet).pipe(Effect.andThen(startReload)),
          scope,
        )
      }),
    )

    const isDependencyPath = (path: string) =>
      path === "node_modules" ||
      path.startsWith("node_modules/") ||
      (SYNCED_BACK_PATHS as ReadonlyArray<string>).includes(path)

    const onContainerChange = (
      changes: ContainerChanges,
    ): Effect.Effect<void> =>
      Effect.suspend(() => {
        if (installing) return Effect.void
        if (changes.applied.some((change) => isDependencyPath(change.path))) {
          reloadPending = true
        }
        return reloadPending && changes.paths.some(isDependencyPath)
          ? scheduleReload
          : Effect.void
      })

    const onMirrorChange = (change: MirrorChange): Effect.Effect<void> => {
      switch (change._tag) {
        case "Mounted":
          return trigger(change.files["package.json"])
        case "Applied": {
          const event = change.event
          if (
            (event._tag === "FileChanged" || event._tag === "FileCreated") &&
            event.path === "package.json" &&
            event.content !== installedPackageJson
          ) {
            return trigger(event.content)
          }
          return Effect.void
        }
      }
    }

    // Boot phase, and the types timeout from the moment the Container is ready.
    yield* container.phaseChanges.pipe(
      Stream.runForEach((boot) => update((s) => ({ ...s, boot }))),
      Effect.forkIn(scope),
    )
    // `phaseChanges` rather than `awaitReady`, so a boot that only succeeds
    // after a retry still starts the timeout.
    yield* container.phaseChanges.pipe(
      Stream.filter((boot) => boot._tag === "ready"),
      Stream.take(1),
      Stream.runDrain,
      Effect.andThen(Effect.sleep(typesTimeout)),
      Effect.andThen(update((s) => ({ ...s, timedOut: true }))),
      Effect.ignore,
      Effect.forkIn(scope),
    )

    return {
      state: SubscriptionRef.get(stateRef),
      stateChanges: SubscriptionRef.changes(stateRef),
      installLog: SubscriptionRef.get(logRef),
      installLogChanges: SubscriptionRef.changes(logRef),
      awaitDiagnosticsVisible: Deferred.await(visible),
      install: Effect.suspend(() => trigger(installedPackageJson)),
      onMirrorChange,
      onContainerChange,
    }
  })

/**
 * `Dependencies` for the page's Container, Workspace and (when the
 * transport has one) language server mirror.
 */
export const layerDependencies = (
  options: { readonly typesTimeout?: Duration.Input | undefined } = {},
): Layer.Layer<Dependencies, never, Container | Workspace> =>
  Layer.effect(
    Dependencies,
    Effect.gen(function* () {
      return yield* makeDependencies({
        workspace: yield* Workspace,
        container: yield* Container,
        mirror: yield* Effect.serviceOption(LspWorkspaceMirror),
        typesTimeout: options.typesTimeout,
      })
    }),
  )
