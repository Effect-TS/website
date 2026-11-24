/**
 * Two-way sync between the Workspace and the Container (ADR 0005).
 *
 * - Page → Container (the mirror): each Workspace change is written to the
 *   Container as it happens, in order.
 * - Container → page: the Container's Workspace directory is watched
 *   recursively. Once the watch has been quiet for `watchDebounce`, the
 *   directory is rescanned and compared with what the sync last knew the
 *   Container held. Created, changed and deleted files go into the Workspace
 *   with `origin: "container"`, which the mirror skips.
 *
 * Conflicts: a file is dirty from the page's last change to it until the
 * Container has written that exact content. A Container change to a dirty
 * file is dropped, so the editor wins.
 *
 * Paths the Container keeps to itself (`node_modules`, `dist`, `.git`,
 * `.tsc-run.json`), files over 1 MiB and files that aren't UTF-8 are never
 * pulled back. Protected Workspace files deleted in the Container are
 * written back into it.
 */
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import type * as Scope from "effect/Scope"
import * as Semaphore from "effect/Semaphore"
import * as Stream from "effect/Stream"
import type { ContainerError, ContainerService } from "./container.ts"
import {
  isFromContainer,
  WORKSPACE_PROTECTED_PATHS,
  type WorkspaceEvent,
  type WorkspaceService,
} from "./workspace.ts"

/** Container files larger than this stay in the Container. */
export const CONTAINER_SYNC_MAX_FILE_BYTES = 1024 * 1024

/** How long the Container's watch must be quiet before a rescan. */
export const DEFAULT_WATCH_DEBOUNCE: Duration.Input = "100 millis"

const CONTAINER_ONLY_ROOTS: ReadonlySet<string> = new Set([
  "node_modules",
  "dist",
  ".git",
  ".tsc-run.json",
])
const CONTAINER_ONLY_SEGMENTS: ReadonlySet<string> = new Set([
  "node_modules",
  ".git",
])

/** Whether a Workspace-relative path stays in the Container only. */
export const isContainerOnlyPath = (path: string): boolean => {
  const segments = path.split("/")
  return (
    CONTAINER_ONLY_ROOTS.has(segments[0]!) ||
    segments.some((segment) => CONTAINER_ONLY_SEGMENTS.has(segment))
  )
}

// ---------------------------------------------------------------------------
// Scanning and diffing the Container
// ---------------------------------------------------------------------------

export interface ContainerScan {
  readonly files: ReadonlyMap<string, string>
  readonly directories: ReadonlySet<string>
  /** Files left out for size or encoding: neither pulled back nor deleted. */
  readonly skipped: ReadonlySet<string>
}

const utf8 = new TextDecoder("utf-8", { fatal: true })

const decodeUtf8 = (bytes: Uint8Array): string | undefined => {
  try {
    return utf8.decode(bytes)
  } catch {
    return undefined
  }
}

/**
 * Reads the Container's Workspace directory, without the Container-only
 * paths. A file or folder that disappears mid-scan counts as deleted.
 */
export const scanContainer = (
  container: ContainerService,
): Effect.Effect<ContainerScan, ContainerError> =>
  Effect.gen(function* () {
    const files = new Map<string, string>()
    const directories = new Set<string>()
    const skipped = new Set<string>()
    const walk = (dir: string): Effect.Effect<void, ContainerError> =>
      Effect.gen(function* () {
        const entries = yield* container.readDirectory(dir)
        for (const entry of entries) {
          const path = dir === "" ? entry.name : `${dir}/${entry.name}`
          if (isContainerOnlyPath(path)) continue
          if (entry.kind === "directory") {
            directories.add(path)
            yield* walk(path).pipe(Effect.catch(() => Effect.void))
            continue
          }
          const bytes = yield* container.readFile(path).pipe(Effect.option)
          if (Option.isNone(bytes)) continue
          const text =
            bytes.value.byteLength > CONTAINER_SYNC_MAX_FILE_BYTES
              ? undefined
              : decodeUtf8(bytes.value)
          if (text === undefined) skipped.add(path)
          else files.set(path, text)
        }
      })
    yield* walk("")
    return { files, directories, skipped }
  })

/** A Container-side change to one file. */
export type ContainerFileChange =
  | {
      readonly _tag: "Write"
      readonly path: string
      readonly content: string
    }
  | { readonly _tag: "Remove"; readonly path: string }

/** What changed in the Container since `known`, in path order. */
export const diffContainerScan = (
  known: ReadonlyMap<string, string>,
  scan: ContainerScan,
): Array<ContainerFileChange> => {
  const changes: Array<ContainerFileChange> = []
  for (const [path, content] of scan.files) {
    if (known.get(path) !== content) {
      changes.push({ _tag: "Write", path, content })
    }
  }
  for (const path of known.keys()) {
    if (!scan.files.has(path) && !scan.skipped.has(path)) {
      changes.push({ _tag: "Remove", path })
    }
  }
  return changes.sort((a, b) => (a.path < b.path ? -1 : 1))
}

// ---------------------------------------------------------------------------
// Page → Container
// ---------------------------------------------------------------------------

/**
 * Applies one Workspace event to the Container. A rename writes the new path
 * (the event carries the content) and then removes the old one, so applying
 * an event twice is harmless.
 */
export const applyWorkspaceEvent = (
  container: ContainerService,
  event: WorkspaceEvent,
): Effect.Effect<void, ContainerError> => {
  switch (event._tag) {
    case "FileCreated":
    case "FileChanged":
      return container.writeFile(event.path, event.content)
    case "FileDeleted":
      return container.remove(event.path)
    case "FileRenamed":
      return container
        .writeFile(event.newPath, event.content)
        .pipe(Effect.andThen(container.remove(event.oldPath)))
    case "DirectoryChanged":
      return Effect.void
  }
}

/** A page change that landed in the Container. */
export type MirrorChange =
  | {
      readonly _tag: "Mounted"
      readonly files: Readonly<Record<string, string>>
    }
  | { readonly _tag: "Applied"; readonly event: WorkspaceEvent }

/** One rescan of the Container after its watch went quiet. */
export interface ContainerChanges {
  /** The changes that reached the Workspace (dropped and restored ones are left out). */
  readonly applied: ReadonlyArray<ContainerFileChange>
  /** Every path the watch reported since the last rescan, Container-only ones included. */
  readonly paths: ReadonlyArray<string>
}

export interface MirrorWorkspaceOptions {
  /**
   * Runs after the mount and after each page event lands in the Container,
   * in order, on the mirror's fiber (the next event waits for it).
   */
  readonly onChange?:
    | ((change: MirrorChange) => Effect.Effect<void>)
    | undefined
  /**
   * Runs after each rescan, on the watch fiber, including rescans skipped
   * because only Container-only paths changed (`applied` is then empty).
   */
  readonly onContainerChange?:
    | ((changes: ContainerChanges) => Effect.Effect<void>)
    | undefined
  readonly watchDebounce?: Duration.Input | undefined
}

const ancestorsOf = (path: string): Array<string> => {
  const out: Array<string> = []
  let idx = path.indexOf("/")
  while (idx !== -1) {
    out.push(path.slice(0, idx))
    idx = path.indexOf("/", idx + 1)
  }
  return out
}

/**
 * Syncs the Workspace and the Container both ways until the scope closes.
 * The mirror mounts every Workspace file once the Container is ready, then
 * applies Workspace events one at a time, in order. Events that happen
 * while the Container boots are buffered and applied after the mount. Once
 * mounted, the Container's Workspace directory is watched and its changes
 * pulled back (see the module docs).
 *
 * Returns once the mirror is subscribed. A Container that fails to boot
 * leaves the Workspace untouched: the mirror drops its buffer and waits for
 * `retry`, then mounts the Workspace as it is by then. A failed operation is
 * logged and the sync moves on.
 */
export const mirrorWorkspace = (
  workspace: WorkspaceService,
  container: ContainerService,
  options: MirrorWorkspaceOptions = {},
): Effect.Effect<void, never, Scope.Scope> =>
  Effect.gen(function* () {
    const scope = yield* Effect.scope
    const pending = yield* Queue.unbounded<WorkspaceEvent>()
    // Container writes and rescans take turns, so a rescan never reads the
    // Container halfway through a page change.
    const syncLock = yield* Semaphore.make(1)
    // What the sync last saw in, or wrote to, the Container.
    const known = new Map<string, string>()
    // Page changes the Container hasn't written yet: the content, or null
    // for a deletion.
    const dirty = new Map<string, string | null>()

    const markDirty = (event: WorkspaceEvent) => {
      switch (event._tag) {
        case "FileCreated":
        case "FileChanged":
          dirty.set(event.path, event.content)
          return
        case "FileDeleted":
          dirty.set(event.path, null)
          return
        case "FileRenamed":
          dirty.set(event.newPath, event.content)
          dirty.set(event.oldPath, null)
          return
        case "DirectoryChanged":
          return
      }
    }

    const settle = (path: string, content: string | null) => {
      if (content === null) known.delete(path)
      else known.set(path, content)
      if (dirty.has(path) && dirty.get(path) === content) dirty.delete(path)
    }

    const landed = (event: WorkspaceEvent) => {
      switch (event._tag) {
        case "FileCreated":
        case "FileChanged":
          return settle(event.path, event.content)
        case "FileDeleted":
          return settle(event.path, null)
        case "FileRenamed":
          settle(event.newPath, event.content)
          return settle(event.oldPath, null)
        case "DirectoryChanged":
          return
      }
    }

    // Subscribe before listing so no change falls in between. A change that
    // lands in both the listing and the buffer is applied twice, which every
    // mapping above tolerates. Changes pulled from the Container are not
    // written back.
    yield* workspace.events.pipe(
      Stream.runForEach((event) =>
        isFromContainer(event)
          ? Effect.void
          : Effect.sync(() => markDirty(event)).pipe(
              Effect.andThen(Queue.offer(pending, event)),
            ),
      ),
      Effect.forkScoped,
    )
    yield* Effect.yieldNow
    const listFiles = workspace.listFiles.pipe(Effect.orElseSucceed(() => []))
    const files = yield* listFiles

    // -----------------------------------------------------------------------
    // Container → page
    // -----------------------------------------------------------------------

    const workspaceContent = (path: string) =>
      workspace
        .readFile(path)
        .pipe(Effect.option, Effect.map(Option.getOrUndefined))

    const logged =
      (what: string) =>
      <E extends { readonly message: string }>(
        effect: Effect.Effect<void, E>,
      ): Effect.Effect<boolean> =>
        effect.pipe(
          Effect.as(true),
          Effect.catch((error) =>
            Effect.logWarning(what, error.message).pipe(Effect.as(false)),
          ),
        )

    const reconcile = syncLock.withPermits(1)(
      Effect.gen(function* () {
        const scan = yield* scanContainer(container)
        const applied: Array<ContainerFileChange> = []
        const emptiedDirectories = new Set<string>()
        for (const change of diffContainerScan(known, scan)) {
          const path = change.path
          const current = yield* workspaceContent(path)
          // Dirty: a page change is on its way to the Container, or the
          // Workspace has one the mirror hasn't seen yet.
          if (
            dirty.has(path) ||
            (current ?? null) !== (known.get(path) ?? null)
          ) {
            if (change._tag === "Write") known.set(path, change.content)
            else known.delete(path)
            continue
          }
          if (change._tag === "Write") {
            if (
              current === change.content ||
              (yield* logged(`Container sync of ${path}`)(
                workspace.writeContainerFile(path, change.content),
              ))
            ) {
              known.set(path, change.content)
              if (current !== change.content) applied.push(change)
            }
            continue
          }
          if (current === undefined) {
            known.delete(path)
          } else if (WORKSPACE_PROTECTED_PATHS.has(path)) {
            yield* logged(`Container restore of ${path}`)(
              container.writeFile(path, current),
            )
            known.set(path, current)
          } else if (
            yield* logged(`Container sync of ${path}`)(
              workspace.removeContainerPath(path),
            )
          ) {
            known.delete(path)
            applied.push(change)
            for (const dir of ancestorsOf(path)) emptiedDirectories.add(dir)
          }
        }
        // Folders removed in the Container go too, once nothing is left in
        // them. Folders the page made (never mirrored) are left alone.
        if (emptiedDirectories.size > 0) {
          const remaining = yield* listFiles
          const deepestFirst = [...emptiedDirectories].sort(
            (a, b) => b.length - a.length,
          )
          for (const dir of deepestFirst) {
            if (scan.directories.has(dir)) continue
            if (remaining.some((file) => file.path.startsWith(`${dir}/`))) {
              continue
            }
            yield* workspace.removeContainerPath(dir).pipe(Effect.ignore)
          }
        }
        return applied
      }),
    )

    const onContainerChange = options.onContainerChange ?? (() => Effect.void)
    const watchDebounce = Duration.fromInputUnsafe(
      options.watchDebounce ?? DEFAULT_WATCH_DEBOUNCE,
    )
    const batch = new Set<string>()
    const watch = container.watch.pipe(
      Stream.tap((path) => Effect.sync(() => batch.add(path))),
      Stream.debounce(watchDebounce),
      Stream.runForEach(() =>
        Effect.gen(function* () {
          const paths = [...batch]
          batch.clear()
          const applied = paths.some((path) => !isContainerOnlyPath(path))
            ? yield* reconcile.pipe(
                Effect.catch((error) =>
                  Effect.logWarning("Container rescan", error.message).pipe(
                    Effect.as([]),
                  ),
                ),
              )
            : []
          yield* onContainerChange({ applied, paths })
        }),
      ),
      Effect.catch((error) =>
        Effect.logWarning("Container watch", error.message),
      ),
    )
    let watching = false

    // -----------------------------------------------------------------------
    // Page → Container
    // -----------------------------------------------------------------------

    // After a failed boot, waits for `retry` to start the next attempt.
    const awaitRetry = container.phaseChanges.pipe(
      Stream.filter((phase) => phase._tag !== "failed"),
      Stream.take(1),
      Stream.runDrain,
    )

    const onChange = options.onChange ?? (() => Effect.void)
    const run = (
      files: ReadonlyArray<{ readonly path: string; readonly content: string }>,
    ): Effect.Effect<void> =>
      Effect.gen(function* () {
        const mounted = Object.fromEntries(
          files.map((file) => [file.path, file.content]),
        )
        yield* syncLock.withPermits(1)(
          container.mount(mounted).pipe(
            Effect.andThen(
              Effect.sync(() => {
                known.clear()
                for (const file of files) known.set(file.path, file.content)
              }),
            ),
          ),
        )
        if (!watching) {
          watching = true
          yield* Effect.forkIn(watch, scope)
        }
        yield* onChange({ _tag: "Mounted", files: mounted })
        while (true) {
          const event = yield* Queue.take(pending)
          yield* syncLock
            .withPermits(1)(
              applyWorkspaceEvent(container, event).pipe(
                Effect.andThen(Effect.sync(() => landed(event))),
              ),
            )
            .pipe(
              Effect.andThen(onChange({ _tag: "Applied", event })),
              Effect.catch((error) =>
                Effect.logWarning("Container mirror", error.message),
              ),
            )
        }
      }).pipe(
        Effect.catch((error) =>
          error._tag === "ContainerOperationFailed"
            ? Effect.logWarning("Container mount failed", error.message)
            : // Boot failed. The next mount lists the Workspace again, so
              // the events buffered until then are not needed.
              Effect.gen(function* () {
                yield* Queue.clear(pending)
                yield* awaitRetry
                yield* Queue.clear(pending)
                dirty.clear()
                return yield* run(yield* listFiles)
              }),
        ),
      )

    yield* run(files).pipe(
      Effect.ensuring(Queue.shutdown(pending)),
      Effect.forkScoped,
    )
  })
