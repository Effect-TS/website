import type { Transport } from "@codemirror/lsp-client"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as PubSub from "effect/PubSub"
import * as Stream from "effect/Stream"
import {
  LspTransport,
  TransportFatalError,
  type TransportEvent,
} from "./transport.ts"
import type { WorkspaceEvent } from "./workspace.ts"
import {
  isWorkerToPage,
  type PageToWorker,
  type TypesMountResult,
  type WorkerAssets,
  type WorkerReadyTimings,
  type WorkspaceFsOp,
} from "./worker-protocol.ts"

/** The parts of a `Worker` the transport uses, so tests can pass a fake. */
export interface WorkerLike {
  // Method syntax: `Worker`'s overloads only match it bivariantly.
  postMessage(message: unknown, transfer?: Array<Transferable>): void
  readonly terminate: () => void
  readonly addEventListener: (
    type: "message" | "error" | "messageerror",
    listener: (event: { readonly data?: unknown }) => void,
  ) => void
}

export type WorkspaceFileOp = Exclude<
  WorkspaceFsOp,
  { readonly _tag: "ReplaceNodeModules" }
>

export interface LspWorkspaceMirrorService {
  /** Applies a Workspace change to the language server's file system. */
  readonly apply: (op: WorkspaceFileOp) => void
  /**
   * Replaces the language server's `node_modules` with a types pack and
   * waits for the worker's answer. The pack is kept and sent again to every
   * new worker (a restart replays it after the Workspace files). Waits until
   * a worker answers, so callers should add a timeout.
   */
  readonly mountTypes: (pack: Uint8Array) => Effect.Effect<TypesMountResult>
}

/**
 * Provided next to `LspTransport` by transports whose language server keeps
 * its own copy of the Workspace (`layerWorker`). The editor mirrors Workspace
 * changes into it when it is present.
 */
export class LspWorkspaceMirror extends Context.Service<
  LspWorkspaceMirror,
  LspWorkspaceMirrorService
>()("@web/scratchpad/LspWorkspaceMirror") {}

export interface LayerWorkerOptions {
  /** Creates the language server worker (`lsp.worker.ts`). */
  readonly makeWorker: () => WorkerLike
  readonly assets: WorkerAssets
  /** Called with the worker's load timings once it reports ready. */
  readonly onReady?:
    | ((timings: WorkerReadyTimings, memoryBytes: number) => void)
    | undefined
}

/**
 * Maps a Scratchpad Workspace event to the file system change the worker
 * needs. Directory-only events carry no file and need nothing.
 */
export const workspaceEventToFsOp = (
  event: WorkspaceEvent,
): WorkspaceFileOp | undefined => {
  switch (event._tag) {
    case "FileCreated":
    case "FileChanged":
      return { _tag: "WriteFile", path: event.path, content: event.content }
    case "FileDeleted":
      return { _tag: "Remove", path: event.path }
    case "FileRenamed":
      return { _tag: "Rename", from: event.oldPath, to: event.newPath }
    case "DirectoryChanged":
      return undefined
  }
}

/** Applies an op to the page-side copy of the Workspace files. */
export const applyFsOpToFiles = (
  files: Map<string, string>,
  op: WorkspaceFileOp,
): void => {
  switch (op._tag) {
    case "Reset":
      files.clear()
      for (const [path, content] of Object.entries(op.files)) {
        files.set(path, content)
      }
      return
    case "WriteFile":
      files.set(op.path, op.content)
      return
    case "Remove":
      for (const path of [...files.keys()]) {
        if (path === op.path || path.startsWith(`${op.path}/`)) {
          files.delete(path)
        }
      }
      return
    case "Rename":
      for (const [path, content] of [...files]) {
        if (path === op.from || path.startsWith(`${op.from}/`)) {
          files.delete(path)
          files.set(`${op.to}${path.slice(op.from.length)}`, content)
        }
      }
      return
  }
}

/**
 * `LspTransport` backed by the in-browser language server in a module Web
 * Worker (`lsp.worker.ts`), plus `LspWorkspaceMirror`.
 *
 * Each `reconnect` terminates any previous worker and starts a fresh one: it
 * sends the current Workspace files and the last types pack, then `Start`,
 * relays loading progress as
 * `Loading` events, and emits `Connected` once the server accepts messages.
 * Crash recoveries inside the worker are relayed as `Recovered` and do not
 * disconnect. A worker that fails for good emits `Disconnected` with a
 * `TransportFatalError` and is terminated. JSON-RPC sent while no worker is
 * ready is dropped, so `initialize` is always the first frame a new server
 * sees. Closing the layer's scope terminates the worker.
 */
export const layerWorker = (
  options: LayerWorkerOptions,
): Layer.Layer<LspTransport | LspWorkspaceMirror> =>
  Layer.effectContext(
    Effect.gen(function* () {
      const events = yield* PubSub.unbounded<TransportEvent>()
      const subscribers = new Set<(value: string) => void>()
      const files = new Map<string, string>()
      // The last types pack, replayed to every new worker.
      let types: { readonly id: number; readonly pack: Uint8Array } | undefined
      let nextTypesId = 0
      const typesWaiters = new Map<
        number,
        Deferred.Deferred<TypesMountResult>
      >()

      interface Active {
        readonly worker: WorkerLike
        readonly id: number
        ready: boolean
        closed: boolean
      }
      let active: Active | undefined
      let connectionId = 0

      const post = (target: Active, message: PageToWorker | string) => {
        if (!target.closed) target.worker.postMessage(message)
      }

      /** Posts the pack as a copy the worker owns; the page keeps its own. */
      const postTypes = (target: Active) => {
        if (types === undefined || target.closed) return
        const buffer = types.pack.slice().buffer
        target.worker.postMessage(
          {
            _tag: "Fs",
            op: { _tag: "ReplaceNodeModules", id: types.id, pack: buffer },
          } satisfies PageToWorker,
          [buffer],
        )
      }

      const close = (target: Active) => {
        if (target.closed) return
        target.closed = true
        try {
          target.worker.postMessage({ _tag: "Dispose" } satisfies PageToWorker)
        } catch {
          // The worker may already be gone.
        }
        target.worker.terminate()
        if (active === target) active = undefined
      }

      const fail = (target: Active, message: string) => {
        if (target.closed) return
        close(target)
        PubSub.publishUnsafe(events, {
          _tag: "Disconnected",
          error: new TransportFatalError({ message }),
        })
      }

      const spawn = () => {
        const worker = options.makeWorker()
        const target: Active = {
          worker,
          id: ++connectionId,
          ready: false,
          closed: false,
        }
        active = target

        worker.addEventListener("message", (event) => {
          if (target.closed) return
          const data = event.data
          if (typeof data === "string") {
            if (!target.ready) return
            for (const handler of subscribers) handler(data)
            return
          }
          if (!isWorkerToPage(data)) return
          switch (data._tag) {
            case "Progress":
              PubSub.publishUnsafe(events, {
                _tag: "Loading",
                phase: data.phase,
                loadedBytes: data.loadedBytes,
                totalBytes: data.totalBytes,
              })
              break
            case "Ready":
              target.ready = true
              options.onReady?.(data.timings, data.memoryBytes)
              PubSub.publishUnsafe(events, {
                _tag: "Connected",
                connectionId: target.id,
              })
              break
            case "Recovered":
              PubSub.publishUnsafe(events, {
                _tag: "Recovered",
                recovery: data.recovery,
              })
              break
            case "Fatal":
              fail(target, data.message)
              break
            case "TypesMounted":
            case "TypesRejected": {
              const waiter = typesWaiters.get(data.id)
              typesWaiters.delete(data.id)
              if (waiter !== undefined) {
                Deferred.doneUnsafe(waiter, Exit.succeed(data))
              }
              break
            }
          }
        })
        worker.addEventListener("error", (event) => {
          const message =
            typeof (event as { readonly message?: unknown }).message ===
            "string"
              ? (event as { readonly message: string }).message
              : "The language server worker failed to start."
          fail(target, message || "The language server worker failed.")
        })
        worker.addEventListener("messageerror", () => {
          fail(target, "The language server worker sent an unreadable message.")
        })

        post(target, {
          _tag: "Fs",
          op: { _tag: "Reset", files: Object.fromEntries(files) },
        })
        postTypes(target)
        post(target, { _tag: "Start", assets: options.assets })
      }

      const closeActive = Effect.sync(() => {
        if (active !== undefined) close(active)
      })

      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          if (active !== undefined) close(active)
          subscribers.clear()
        }),
      )

      const transport: Transport = {
        send(message: string) {
          if (active !== undefined && active.ready) post(active, message)
        },
        subscribe(handler: (value: string) => void) {
          subscribers.add(handler)
        },
        unsubscribe(handler: (value: string) => void) {
          subscribers.delete(handler)
        },
      }

      const mirror: LspWorkspaceMirrorService = {
        apply(op) {
          applyFsOpToFiles(files, op)
          if (active !== undefined) post(active, { _tag: "Fs", op })
        },
        mountTypes: (pack) =>
          Effect.suspend(() => {
            const id = ++nextTypesId
            types = { id, pack }
            const waiter = Deferred.makeUnsafe<TypesMountResult>()
            typesWaiters.set(id, waiter)
            if (active !== undefined) postTypes(active)
            return Deferred.await(waiter).pipe(
              Effect.ensuring(
                Effect.sync(() => {
                  typesWaiters.delete(id)
                }),
              ),
            )
          }),
      }

      return Context.make(LspTransport, {
        transport,
        events: Stream.fromPubSub(events),
        reconnect: Effect.sync(() => {
          if (active !== undefined) close(active)
          spawn()
        }),
        disconnect: closeActive,
      }).pipe(Context.add(LspWorkspaceMirror, mirror))
    }),
  )
