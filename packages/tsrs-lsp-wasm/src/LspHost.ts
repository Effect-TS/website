/**
 * The host a Worker (or a Node process) wraps around the module: one recovering server over an in-memory
 * workspace, fed JSON-RPC strings, delivering outgoing JSON-RPC strings to a callback.
 *
 * It owns everything the single-threaded server cannot do by itself:
 *
 * - Ordering. Messages run one at a time, in arrival order, each to completion.
 * - Background work. When the server reports queued tasks it schedules `lsp_tick` (delay 0, so messages that are
 *   already waiting run first), and it schedules the next server timer (`lsp_next_timer_ms`, the 30 s idle cache
 *   clean). The scheduler is injectable.
 * - File watching. Changes made through `host.fs` after `initialized` become `workspace/didChangeWatchedFiles`
 *   notifications, sent before the next client message, so a pull that follows a change sees it. The server does
 *   not re-check open files by itself: pull diagnostics again after a change.
 * - Server-to-client requests the server never waits for (`client/registerCapability`,
 *   `client/unregisterCapability`, `window/workDoneProgress/create`) are answered with `null` here and not
 *   forwarded, unless `forwardServerRequests` is set.
 * - Crash recovery (RecoveringServer).
 *
 * Runtime-agnostic: no Node built-ins.
 */
import {
  MemoryFileSystem,
  type FileChange,
  type FileContents,
} from "./MemoryFileSystem.ts"
import { PumpStatus } from "./LspInstance.ts"
import {
  startRecoveringServer,
  type RecoveringServer,
  type RecoveryEvent,
} from "./RecoveringServer.ts"
import { timeoutScheduler, type Scheduler } from "./Scheduler.ts"
import { mountTypesPack, type TypesPack } from "./TypesPack.ts"
import {
  pathToFileUri,
  WORKSPACE_ROOT_PATH,
  WORKSPACE_TSCONFIG,
} from "./Workspace.ts"

/** A compiled module, its bytes, or a fetch Response (compiled with `WebAssembly.compileStreaming` when possible). */
export type LspModuleSource =
  | WebAssembly.Module
  | ArrayBuffer
  | Uint8Array
  | Response
  | PromiseLike<Response>

/** Compiles a module source. Pass the result to several hosts to compile once. */
export const compileLspModule = async (
  source: LspModuleSource,
): Promise<WebAssembly.Module> => {
  if (source instanceof WebAssembly.Module) return source
  if (source instanceof ArrayBuffer) return WebAssembly.compile(source)
  if (source instanceof Uint8Array) {
    const copy = new Uint8Array(source.length)
    copy.set(source)
    return WebAssembly.compile(copy.buffer)
  }
  const response = await source
  if (!response.ok)
    throw new Error(
      `tsrs-lsp: fetching the module failed: ${response.status} ${response.statusText}`,
    )
  const streaming =
    typeof WebAssembly.compileStreaming === "function" &&
    (response.headers.get("content-type") ?? "").split(";")[0]!.trim() ===
      "application/wasm"
  return streaming
    ? WebAssembly.compileStreaming(response)
    : WebAssembly.compile(await response.arrayBuffer())
}

export interface LspHostOptions {
  readonly module: LspModuleSource
  /** Receives every outgoing JSON-RPC message (responses, notifications, forwarded server requests). */
  readonly onMessage: (message: string) => void
  /** The file system to serve; a new one by default. */
  readonly fs?: MemoryFileSystem
  /** Initial files: paths relative to `rootPath`, or absolute. Written before the server starts. */
  readonly files?: Readonly<Record<string, FileContents>>
  /** Types packs (bytes or decoded) mounted under `<rootPath>/node_modules`. */
  readonly typesPacks?: ReadonlyArray<ArrayBuffer | Uint8Array | TypesPack>
  /** The workspace root and the server's cwd. Default /workspace. */
  readonly rootPath?: string
  /**
   * Written to `<rootPath>/tsconfig.json` unless that file exists. Default WORKSPACE_TSCONFIG; `null` writes none.
   */
  readonly tsconfig?: object | null
  readonly onRecovery?: (event: RecoveryEvent) => void
  /** The module's stdout/stderr lines. */
  readonly onStderr?: (line: string) => void
  /**
   * The host failed for good (the server could not be restarted, or a host bug). The host is disposed after this.
   */
  readonly onError?: (error: unknown) => void
  readonly scheduler?: Scheduler
  /** Rebuilds per trapping message (default 3). */
  readonly maxRestartAttempts?: number
  /** Forward the server requests the host would answer itself (default false). */
  readonly forwardServerRequests?: boolean
  /** Send `workspace/didChangeWatchedFiles` for changes made through `fs` (default true). */
  readonly watchFileSystem?: boolean
}

export interface LspHost {
  /** The workspace file system. Changes made through it reach the server as watched-file events. */
  readonly fs: MemoryFileSystem
  /**
   * Queues one JSON-RPC message. Resolves once it ran and its output went to `onMessage`; rejects if the host
   * failed or was disposed.
   */
  readonly send: (message: string) => Promise<void>
  /** Resolves when every queued message and file-system notification has been handled. */
  readonly idle: () => Promise<void>
  /** Runs queued background work now, until the server has none (timers are left alone). */
  readonly runBackgroundWork: () => Promise<void>
  readonly recoveries: ReadonlyArray<RecoveryEvent>
  readonly quarantined: ReadonlySet<string>
  readonly memoryBytes: () => number
  readonly disposed: boolean
  /** Cancels scheduled work and drops the instance. Pending sends reject. */
  readonly dispose: () => void
}

export class LspHostDisposedError extends Error {
  constructor() {
    super("tsrs-lsp: the host was disposed")
    this.name = "LspHostDisposedError"
  }
}

const HOST_ANSWERED_REQUESTS = new Set([
  "client/registerCapability",
  "client/unregisterCapability",
  "window/workDoneProgress/create",
])

const FILE_CHANGE_TYPE = { created: 1, changed: 2, deleted: 3 } as const

interface Outgoing {
  readonly id?: unknown
  readonly method?: string
}

export const startLspHost = async (
  options: LspHostOptions,
): Promise<LspHost> => {
  const rootPath = options.rootPath ?? WORKSPACE_ROOT_PATH
  const fs = options.fs ?? new MemoryFileSystem()
  const scheduler = options.scheduler ?? timeoutScheduler
  const resolvePath = (p: string) =>
    p.startsWith("/") ? p : `${rootPath}/${p}`
  for (const [path, data] of Object.entries(options.files ?? {}))
    fs.writeFile(resolvePath(path), data)
  for (const pack of options.typesPacks ?? [])
    mountTypesPack(fs, pack, `${rootPath}/node_modules`)
  const tsconfig =
    options.tsconfig === undefined ? WORKSPACE_TSCONFIG : options.tsconfig
  if (tsconfig !== null && !fs.exists(`${rootPath}/tsconfig.json`)) {
    fs.writeFile(
      `${rootPath}/tsconfig.json`,
      JSON.stringify(tsconfig, null, 2) + "\n",
    )
  }

  // Changes the server itself makes (OP_WRITE/OP_REMOVE) are not reported back to it.
  let inServer = 0
  const module = await compileLspModule(options.module)
  const server: RecoveringServer = await startRecoveringServer(module, {
    fs,
    cwd: rootPath,
    ...(options.onStderr === undefined ? {} : { onStderr: options.onStderr }),
    ...(options.onRecovery === undefined
      ? {}
      : { onRecovery: options.onRecovery }),
    ...(options.maxRestartAttempts === undefined
      ? {}
      : { maxAttempts: options.maxRestartAttempts }),
    onEnter: () => {
      inServer++
    },
    onLeave: () => {
      inServer--
    },
  })

  let disposed = false
  let failure: unknown
  let initialized = false
  let exited = false
  let queue: Promise<void> = Promise.resolve()
  let cancelTick: (() => void) | undefined
  let cancelTimer: (() => void) | undefined
  let pendingChanges: Array<FileChange> = []
  let flushQueued = false

  const fail = (error: unknown) => {
    if (failure !== undefined || disposed) return
    failure = error
    dispose()
    options.onError?.(error)
  }

  const deliver = async (out: ReadonlyArray<string>) => {
    for (const text of out) {
      if (!options.forwardServerRequests) {
        const msg = JSON.parse(text) as Outgoing
        if (
          msg.method !== undefined &&
          msg.id !== undefined &&
          HOST_ANSWERED_REQUESTS.has(msg.method)
        ) {
          await deliver(
            await server.send(
              JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: null }),
            ),
          )
          continue
        }
      }
      options.onMessage(text)
    }
  }

  // After every call: schedule a tick if the server queued work, otherwise its next timer.
  const reschedule = () => {
    if (disposed || exited) return
    if (server.status === PumpStatus.Exited) {
      exited = true
      cancelTick?.()
      cancelTimer?.()
      return
    }
    cancelTimer?.()
    cancelTimer = undefined
    if (server.status === PumpStatus.Pending) {
      if (cancelTick === undefined) {
        cancelTick = scheduler.schedule(() => {
          cancelTick = undefined
          void enqueue(tickOnce).catch(() => {})
        }, 0)
      }
      return
    }
    const ms = server.nextTimerMs()
    if (ms >= 0) {
      cancelTimer = scheduler.schedule(() => {
        cancelTimer = undefined
        void enqueue(tickOnce).catch(() => {})
      }, ms)
    }
  }

  const tickOnce = async () => {
    await deliver(await server.tick())
    reschedule()
  }

  const enqueue = (task: () => Promise<void>): Promise<void> => {
    if (disposed) return Promise.reject(failure ?? new LspHostDisposedError())
    const run = queue.then(async () => {
      if (disposed) throw failure ?? new LspHostDisposedError()
      try {
        await task()
      } catch (error) {
        fail(error)
        throw error
      }
    })
    queue = run.catch(() => {})
    return run
  }

  const flushChanges = async () => {
    flushQueued = false
    const changes = pendingChanges
    pendingChanges = []
    if (changes.length === 0 || exited) return
    // The last change per path wins; directories are reported too (the server watches with glob patterns).
    const latest = new Map<string, FileChange>()
    for (const change of changes) {
      const prev = latest.get(change.path)
      // created then deleted in one batch: nothing for the server to see.
      if (prev?.type === "created" && change.type === "deleted")
        latest.delete(change.path)
      else if (prev?.type === "created" && change.type === "changed") continue
      else if (prev?.type === "deleted" && change.type === "created")
        latest.set(change.path, { ...change, type: "changed" })
      else latest.set(change.path, change)
    }
    if (latest.size === 0) return
    const message = {
      jsonrpc: "2.0",
      method: "workspace/didChangeWatchedFiles",
      params: {
        changes: [...latest.values()].map((c) => ({
          uri: pathToFileUri(c.path),
          type: FILE_CHANGE_TYPE[c.type],
        })),
      },
    }
    await deliver(await server.send(JSON.stringify(message)))
    reschedule()
  }

  const unwatch =
    options.watchFileSystem === false
      ? () => {}
      : fs.watch((changes) => {
          if (inServer > 0 || !initialized || disposed) return
          pendingChanges.push(...changes)
          if (!flushQueued) {
            flushQueued = true
            void enqueue(flushChanges).catch(() => {})
          }
        })

  const send = (message: string) =>
    enqueue(async () => {
      if (exited) return
      const method = (JSON.parse(message) as Outgoing).method
      await deliver(await server.send(message))
      if (method === "initialized") initialized = true
      reschedule()
    })

  const dispose = () => {
    if (disposed) return
    disposed = true
    cancelTick?.()
    cancelTimer?.()
    unwatch()
  }

  return {
    fs,
    send,
    idle: () => queue,
    runBackgroundWork: () =>
      enqueue(async () => {
        while (!exited && server.status === PumpStatus.Pending) {
          cancelTick?.()
          cancelTick = undefined
          await tickOnce()
        }
      }),
    get recoveries() {
      return server.recoveries
    },
    get quarantined() {
      return server.quarantined
    },
    memoryBytes: () => server.memoryBytes(),
    get disposed() {
      return disposed
    },
    dispose,
  }
}
