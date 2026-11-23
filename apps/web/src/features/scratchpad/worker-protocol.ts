/**
 * The `postMessage` protocol between the Scratchpad page and the language
 * server Web Worker (`lsp.worker.ts`).
 *
 * JSON-RPC travels as bare strings in both directions. Everything else is a
 * plain object with a `_tag`: the page drives the worker's lifecycle and
 * mirrors the Scratchpad Workspace into the worker's file system, and the
 * worker reports loading progress, readiness, crash recoveries and fatal
 * errors.
 */

import type { TransportLoadPhase, TransportRecovery } from "./transport.ts"

/** Relative Workspace paths, e.g. `src/main.ts`. */
export type WorkspaceFsOp =
  | {
      readonly _tag: "Reset"
      readonly files: Readonly<Record<string, string>>
    }
  | {
      readonly _tag: "WriteFile"
      readonly path: string
      readonly content: string
    }
  | { readonly _tag: "Remove"; readonly path: string }
  | {
      readonly _tag: "Rename"
      readonly from: string
      readonly to: string
    }

export interface WorkerAsset {
  readonly url: string
  /** Bytes on the wire when known (for progress), before any decompression. */
  readonly bytes?: number | undefined
}

export interface WorkerAssets {
  readonly wasm: WorkerAsset
  /** Types packs; a gzip-compressed pack is inflated in the worker. */
  readonly typesPacks: ReadonlyArray<WorkerAsset>
}

export type PageToWorker =
  | { readonly _tag: "Start"; readonly assets: WorkerAssets }
  | { readonly _tag: "Fs"; readonly op: WorkspaceFsOp }
  | { readonly _tag: "Dispose" }

export type LoadPhase = TransportLoadPhase

export type WorkerRecovery = TransportRecovery

export interface WorkerReadyTimings {
  /** From `Start` until the module was compiled and the packs were mounted. */
  readonly loadMs: number
  /** From `Start` until the host accepted messages. */
  readonly startMs: number
}

export type WorkerToPage =
  | {
      readonly _tag: "Progress"
      readonly phase: LoadPhase
      readonly loadedBytes: number
      readonly totalBytes: number
    }
  | {
      readonly _tag: "Ready"
      readonly timings: WorkerReadyTimings
      readonly memoryBytes: number
    }
  | { readonly _tag: "Recovered"; readonly recovery: WorkerRecovery }
  | { readonly _tag: "Fatal"; readonly message: string }

const isTagged = (value: unknown): value is { readonly _tag: string } =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { _tag?: unknown })._tag === "string"

const WORKER_TO_PAGE_TAGS = new Set(["Progress", "Ready", "Recovered", "Fatal"])
const PAGE_TO_WORKER_TAGS = new Set(["Start", "Fs", "Dispose"])

export const isWorkerToPage = (value: unknown): value is WorkerToPage =>
  isTagged(value) && WORKER_TO_PAGE_TAGS.has(value._tag)

export const isPageToWorker = (value: unknown): value is PageToWorker =>
  isTagged(value) && PAGE_TO_WORKER_TAGS.has(value._tag)
