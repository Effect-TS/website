/**
 * The Scratchpad's Container: the in-browser Node.js runtime (a WebContainer)
 * that mirrors the Workspace one way and runs commands. See ADR 0004.
 *
 * `makeContainer` holds everything that does not depend on WebContainer (the
 * phase, waiting for boot, typed errors, scoped processes). It runs on a
 * `ContainerBackend`: the real one is in `container-webcontainer.ts`, and
 * `makeFakeContainerBackend` below is an in-memory one for tests.
 */
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import type * as Scope from "effect/Scope"
import * as Semaphore from "effect/Semaphore"
import * as Stream from "effect/Stream"
import * as SubscriptionRef from "effect/SubscriptionRef"
import type { WorkspaceEvent, WorkspaceService } from "./workspace.ts"

// ---------------------------------------------------------------------------
// Errors and phases
// ---------------------------------------------------------------------------

/** The browser cannot run a Container (no cross-origin isolation, no SharedArrayBuffer, …). */
export class ContainerUnsupported extends Data.TaggedError(
  "ContainerUnsupported",
)<{
  readonly message: string
  readonly cause?: unknown
}> {}

/** The browser supports Containers, but booting this one failed. */
export class ContainerBootFailed extends Data.TaggedError(
  "ContainerBootFailed",
)<{
  readonly message: string
  readonly cause?: unknown
}> {}

/** A file system operation or spawn failed in a booted Container. */
export class ContainerOperationFailed extends Data.TaggedError(
  "ContainerOperationFailed",
)<{
  readonly operation: string
  readonly path?: string | undefined
  readonly message: string
  readonly cause?: unknown
}> {}

export type ContainerBootError = ContainerUnsupported | ContainerBootFailed

export type ContainerError = ContainerBootError | ContainerOperationFailed

/** Where the Container itself is: booting, booted, or failed to boot. */
export type ContainerBootPhase =
  | { readonly _tag: "booting" }
  | { readonly _tag: "ready" }
  | { readonly _tag: "failed"; readonly error: ContainerBootError }

/** `pnpm install` exited with a non-zero code. */
export class InstallFailed extends Data.TaggedError("InstallFailed")<{
  readonly exitCode: number
  /** The end of the install's terminal output. */
  readonly outputTail: string
  readonly message: string
}> {}

/**
 * What the status badge shows for the Container: its boot, then the
 * dependency install and the types copy (`dependencies.ts`).
 *
 * - `booting` → `installing` → `loading-types` → `ready`
 * - `failed`: boot failed (`ContainerUnsupported` or `ContainerBootFailed`)
 * - `install-failed`: `pnpm install` failed
 * - `dependencies-unavailable`: installed, but types never reached the
 *   editor (diagnostics are shown without them)
 */
export type ContainerPhase =
  | { readonly _tag: "booting" }
  | { readonly _tag: "installing" }
  | { readonly _tag: "loading-types" }
  | { readonly _tag: "ready" }
  | { readonly _tag: "failed"; readonly error: ContainerBootError }
  | { readonly _tag: "install-failed"; readonly error: InstallFailed }
  | { readonly _tag: "dependencies-unavailable"; readonly reason: string }

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * The host scripts directory, relative to the Workspace root. Every backend
 * keeps it next to the Workspace directory.
 */
export const CONTAINER_HOST_DIR_FROM_WORKSPACE = "../.scratchpad"

/** Directories on the Container's `PATH`, relative ones first. */
export const CONTAINER_BIN_PATH =
  "node_modules/.bin:/usr/local/bin:/usr/bin:/bin"

export interface ContainerSpawnOptions {
  readonly command: string
  readonly args?: ReadonlyArray<string> | undefined
  /** Working directory relative to the Workspace root. Defaults to the root. */
  readonly cwd?: string | undefined
  /** Extra environment variables. `PATH` defaults to `CONTAINER_BIN_PATH`. */
  readonly env?: Readonly<Record<string, string>> | undefined
}

/** Spawn options that run `script` through WebContainer's `jsh -c`. */
export const jsh = (
  script: string,
  options?: Omit<ContainerSpawnOptions, "command" | "args">,
): ContainerSpawnOptions => ({
  ...options,
  command: "jsh",
  args: ["-c", script],
})

export interface ContainerProcess {
  /** Terminal output (stdout and stderr). Read it at most once. */
  readonly output: Stream.Stream<string, ContainerOperationFailed>
  /** Waits for the process to exit and returns its exit code. */
  readonly exitCode: Effect.Effect<number>
  readonly kill: Effect.Effect<void>
}

export interface ContainerService {
  /** The current phase. Operations wait for `ready` and fail if boot failed. */
  readonly phase: Effect.Effect<ContainerBootPhase>
  /** The current phase, then every change. */
  readonly phaseChanges: Stream.Stream<ContainerBootPhase>
  /** Waits for boot to finish. */
  readonly awaitReady: Effect.Effect<void, ContainerBootError>
  /** Writes a flat map of Workspace-relative paths to contents, replacing nothing else. */
  readonly mount: (
    files: Readonly<Record<string, string>>,
  ) => Effect.Effect<void, ContainerError>
  /** Writes a file, creating parent directories. */
  readonly writeFile: (
    path: string,
    content: string,
  ) => Effect.Effect<void, ContainerError>
  /** Removes a file or directory tree. Missing paths are not an error. */
  readonly remove: (path: string) => Effect.Effect<void, ContainerError>
  readonly rename: (
    from: string,
    to: string,
  ) => Effect.Effect<void, ContainerError>
  readonly readFile: (path: string) => Effect.Effect<Uint8Array, ContainerError>
  readonly readTextFile: (path: string) => Effect.Effect<string, ContainerError>
  /**
   * The host scripts directory sits next to the Workspace, outside it, for
   * files the Workspace must not see (the types collector and its pack).
   * `name` is a plain file name.
   */
  readonly writeHostDirFile: (
    name: string,
    content: string,
  ) => Effect.Effect<void, ContainerError>
  readonly readHostDirFile: (
    name: string,
  ) => Effect.Effect<Uint8Array, ContainerError>
  /** Missing files are not an error. */
  readonly removeHostDirFile: (
    name: string,
  ) => Effect.Effect<void, ContainerError>
  /** `name` in the host scripts directory, as a path relative to the Workspace root (for spawn arguments). */
  readonly hostDirPath: (name: string) => string
  /**
   * Starts a process. Closing the scope (or interrupting the fiber that owns
   * it) kills the process.
   */
  readonly spawn: (
    options: ContainerSpawnOptions,
  ) => Effect.Effect<ContainerProcess, ContainerError, Scope.Scope>
}

export class Container extends Context.Service<Container, ContainerService>()(
  "@website/scratchpad/Container",
) {}

// ---------------------------------------------------------------------------
// Backend
// ---------------------------------------------------------------------------

export interface ContainerBackendProcess {
  readonly exit: Promise<number>
  readonly output: ReadableStream<string>
  readonly kill: () => void
}

/**
 * The low-level operations a Container runs on. Paths are relative to the
 * Workspace root; `spawn` gets the final `PATH`.
 */
export interface ContainerBackend {
  readonly writeFile: (path: string, content: string) => Promise<void>
  readonly remove: (path: string) => Promise<void>
  readonly rename: (from: string, to: string) => Promise<void>
  readonly readFile: (path: string) => Promise<Uint8Array>
  readonly writeHostDirFile: (name: string, content: string) => Promise<void>
  readonly readHostDirFile: (name: string) => Promise<Uint8Array>
  readonly removeHostDirFile: (name: string) => Promise<void>
  readonly spawn: (
    command: string,
    args: ReadonlyArray<string>,
    options: {
      readonly cwd?: string | undefined
      readonly env: Readonly<Record<string, string>>
    },
  ) => Promise<ContainerBackendProcess>
}

const textDecoder = new TextDecoder()

const operationFailed =
  (operation: string, path?: string) =>
  (cause: unknown): ContainerOperationFailed =>
    new ContainerOperationFailed({
      operation,
      path,
      message: `Container ${operation}${path === undefined ? "" : ` "${path}"`} failed: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
      cause,
    })

/**
 * Builds a Container service from a `boot` effect. Boot runs in the
 * background in the caller's scope, so constructing the service never waits
 * on it: operations wait instead.
 */
export const makeContainer = <R>(
  boot: Effect.Effect<ContainerBackend, ContainerBootError, Scope.Scope | R>,
): Effect.Effect<ContainerService, never, Scope.Scope | R> =>
  Effect.gen(function* () {
    const phaseRef = yield* SubscriptionRef.make<ContainerBootPhase>({
      _tag: "booting",
    })
    const booted = yield* Deferred.make<ContainerBackend, ContainerBootError>()
    // Serializes file system mutations so they land in call order.
    const fsLock = yield* Semaphore.make(1)

    yield* boot.pipe(
      Effect.matchEffect({
        onSuccess: (backend) =>
          SubscriptionRef.set(phaseRef, { _tag: "ready" }).pipe(
            Effect.andThen(Deferred.succeed(booted, backend)),
          ),
        onFailure: (error) =>
          SubscriptionRef.set(phaseRef, { _tag: "failed", error }).pipe(
            Effect.andThen(Deferred.fail(booted, error)),
          ),
      }),
      Effect.forkScoped,
    )

    const use = <A>(
      operation: string,
      path: string | undefined,
      f: (backend: ContainerBackend) => Promise<A>,
    ): Effect.Effect<A, ContainerError> =>
      Deferred.await(booted).pipe(
        Effect.flatMap((backend) =>
          Effect.tryPromise({
            try: () => f(backend),
            catch: operationFailed(operation, path),
          }),
        ),
      )

    const mutate = <A>(
      operation: string,
      path: string | undefined,
      f: (backend: ContainerBackend) => Promise<A>,
    ) => fsLock.withPermits(1)(use(operation, path, f))

    const readFile = (path: string) =>
      use("read", path, (backend) => backend.readFile(path))

    const spawn = (
      options: ContainerSpawnOptions,
    ): Effect.Effect<ContainerProcess, ContainerError, Scope.Scope> =>
      Effect.acquireRelease(
        use("spawn", options.command, (backend) =>
          backend.spawn(options.command, options.args ?? [], {
            cwd: options.cwd,
            env: { PATH: CONTAINER_BIN_PATH, ...options.env },
          }),
        ),
        (process) => Effect.sync(() => process.kill()),
      ).pipe(
        Effect.map((process): ContainerProcess => ({
          output: Stream.fromReadableStream({
            evaluate: () => process.output,
            onError: operationFailed("output", options.command),
            releaseLockOnEnd: true,
          }),
          exitCode: Effect.promise(() => process.exit),
          kill: Effect.sync(() => process.kill()),
        })),
      )

    return {
      phase: SubscriptionRef.get(phaseRef),
      phaseChanges: SubscriptionRef.changes(phaseRef),
      awaitReady: Deferred.await(booted).pipe(Effect.asVoid),
      mount: (files) =>
        mutate("mount", undefined, async (backend) => {
          for (const [path, content] of Object.entries(files)) {
            await backend.writeFile(path, content)
          }
        }),
      writeFile: (path, content) =>
        mutate("write", path, (backend) => backend.writeFile(path, content)),
      remove: (path) =>
        mutate("remove", path, (backend) => backend.remove(path)),
      rename: (from, to) =>
        mutate("rename", from, (backend) => backend.rename(from, to)),
      readFile,
      readTextFile: (path) =>
        readFile(path).pipe(Effect.map((bytes) => textDecoder.decode(bytes))),
      writeHostDirFile: (name, content) =>
        use("write", name, (backend) =>
          backend.writeHostDirFile(name, content),
        ),
      readHostDirFile: (name) =>
        use("read", name, (backend) => backend.readHostDirFile(name)),
      removeHostDirFile: (name) =>
        use("remove", name, (backend) => backend.removeHostDirFile(name)),
      hostDirPath: (name) => `${CONTAINER_HOST_DIR_FROM_WORKSPACE}/${name}`,
      spawn,
    }
  })

// ---------------------------------------------------------------------------
// One-way Workspace mirror
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

/**
 * Mirrors the Workspace into the Container until the scope closes: mounts
 * every Workspace file once the Container is ready, then applies Workspace
 * events one at a time, in order. Events that happen while the Container
 * boots are buffered and applied after the mount.
 *
 * Returns once the mirror is subscribed. A Container that fails to boot ends
 * the mirror and drops the buffer; the Workspace is untouched. A failed
 * operation is logged and the mirror moves on.
 */
export type MirrorChange =
  | {
      readonly _tag: "Mounted"
      readonly files: Readonly<Record<string, string>>
    }
  | { readonly _tag: "Applied"; readonly event: WorkspaceEvent }

export interface MirrorWorkspaceOptions {
  /**
   * Runs after the mount and after each event lands in the Container, in
   * order, on the mirror's fiber (the next event waits for it).
   */
  readonly onChange?:
    | ((change: MirrorChange) => Effect.Effect<void>)
    | undefined
}

export const mirrorWorkspace = (
  workspace: WorkspaceService,
  container: ContainerService,
  options: MirrorWorkspaceOptions = {},
): Effect.Effect<void, never, Scope.Scope> =>
  Effect.gen(function* () {
    const pending = yield* Queue.unbounded<WorkspaceEvent>()
    // Subscribe before listing so no change falls in between. A change that
    // lands in both the listing and the buffer is applied twice, which every
    // mapping above tolerates.
    yield* workspace.events.pipe(
      Stream.runForEach((event) => Queue.offer(pending, event)),
      Effect.forkScoped,
    )
    yield* Effect.yieldNow
    const files = yield* workspace.listFiles.pipe(
      Effect.orElseSucceed(() => []),
    )

    const onChange = options.onChange ?? (() => Effect.void)
    yield* Effect.gen(function* () {
      const mounted = Object.fromEntries(
        files.map((file) => [file.path, file.content]),
      )
      yield* container.mount(mounted)
      yield* onChange({ _tag: "Mounted", files: mounted })
      while (true) {
        const event = yield* Queue.take(pending)
        yield* applyWorkspaceEvent(container, event).pipe(
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
          : Effect.void,
      ),
      Effect.ensuring(Queue.shutdown(pending)),
      Effect.forkScoped,
    )
  })

// ---------------------------------------------------------------------------
// Fake backend
// ---------------------------------------------------------------------------

export interface FakeSpawnResult {
  readonly exitCode?: number | undefined
  readonly output?: ReadonlyArray<string> | undefined
  /** When true the process runs until killed (exit code 143). */
  readonly hang?: boolean | undefined
  /** The process exits with this code when it resolves (or 143 when killed first). */
  readonly exit?: Promise<number> | undefined
}

export interface FakeSpawnCall {
  readonly command: string
  readonly args: ReadonlyArray<string>
  readonly cwd?: string | undefined
  readonly env: Readonly<Record<string, string>>
}

export interface FakeContainerBackend extends ContainerBackend {
  /** The Container's files, by Workspace-relative path. */
  readonly files: Map<string, string>
  /** The host scripts directory's files, by name. */
  readonly hostFiles: Map<string, string | Uint8Array>
  /** Every file system call, in order (`write a`, `remove b`, …). */
  readonly log: Array<string>
  readonly spawned: Array<FakeSpawnCall>
  /** Number of processes killed before they exited. */
  readonly killed: () => number
}

export const makeFakeContainerBackend = (
  options: {
    readonly files?: Readonly<Record<string, string>> | undefined
    readonly spawn?: ((call: FakeSpawnCall) => FakeSpawnResult) | undefined
    /** Paths whose writes fail, to test error handling. */
    readonly failWrites?: ReadonlySet<string> | undefined
  } = {},
): FakeContainerBackend => {
  const files = new Map(Object.entries(options.files ?? {}))
  const hostFiles = new Map<string, string | Uint8Array>()
  const log: Array<string> = []
  const spawned: Array<FakeSpawnCall> = []
  const encoder = new TextEncoder()
  let killed = 0
  const under = (path: string, root: string) =>
    path === root || path.startsWith(`${root}/`)
  return {
    files,
    hostFiles,
    log,
    spawned,
    killed: () => killed,
    writeFile: async (path, content) => {
      log.push(`write ${path}`)
      if (options.failWrites?.has(path)) throw new Error(`EIO: ${path}`)
      files.set(path, content)
    },
    remove: async (path) => {
      log.push(`remove ${path}`)
      for (const key of [...files.keys()]) {
        if (under(key, path)) files.delete(key)
      }
    },
    rename: async (from, to) => {
      log.push(`rename ${from} ${to}`)
      for (const [key, content] of [...files]) {
        if (under(key, from)) {
          files.delete(key)
          files.set(`${to}${key.slice(from.length)}`, content)
        }
      }
    },
    readFile: async (path) => {
      const content = files.get(path)
      if (content === undefined) throw new Error(`ENOENT: ${path}`)
      return encoder.encode(content)
    },
    writeHostDirFile: async (name, content) => {
      hostFiles.set(name, content)
    },
    readHostDirFile: async (name) => {
      const content = hostFiles.get(name)
      if (content === undefined) throw new Error(`ENOENT: ${name}`)
      return typeof content === "string" ? encoder.encode(content) : content
    },
    removeHostDirFile: async (name) => {
      hostFiles.delete(name)
    },
    spawn: async (command, args, spawnOptions) => {
      const call = { command, args, ...spawnOptions }
      spawned.push(call)
      const result = options.spawn?.(call) ?? {}
      let resolveExit!: (code: number) => void
      const exit = new Promise<number>((resolve) => {
        resolveExit = resolve
      })
      let exited = false
      const finish = (code: number) => {
        if (exited) return
        exited = true
        resolveExit(code)
      }
      const runs = result.hang === true || result.exit !== undefined
      const output = new ReadableStream<string>({
        start(controller) {
          for (const chunk of result.output ?? []) controller.enqueue(chunk)
          if (!runs) controller.close()
          void exit.then(() => {
            try {
              controller.close()
            } catch {
              // Already closed.
            }
          })
        },
      })
      if (!runs) finish(result.exitCode ?? 0)
      void result.exit?.then(finish)
      return {
        exit,
        output,
        kill: () => {
          if (exited) return
          killed += 1
          finish(143)
        },
      }
    },
  }
}

/**
 * A Container on a fake backend. `boot` decides when (and whether) it
 * becomes ready; by default it is ready at once.
 */
export const layerFakeContainer = (
  backend: FakeContainerBackend,
  boot: Effect.Effect<void, ContainerBootError> = Effect.void,
): Layer.Layer<Container> =>
  Layer.effect(Container, makeContainer(boot.pipe(Effect.as(backend))))
