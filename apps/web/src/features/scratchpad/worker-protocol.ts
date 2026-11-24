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
  | {
      /**
       * Replaces everything below `/workspace/node_modules` with a TSPK types
       * pack (`@website/tsrs-lsp-wasm` `TypesPack.ts`, paths
       * `<name>/<path in package>`). Posted with `pack` in the transfer list.
       * The worker answers with `TypesMounted` or `TypesRejected` carrying
       * the same `id`.
       */
      readonly _tag: "ReplaceNodeModules"
      readonly id: number
      readonly pack: ArrayBuffer
    }

export interface WorkerAsset {
  readonly url: string
  /** Bytes on the wire when known (for progress), before any decompression. */
  readonly bytes?: number | undefined
}

/**
 * What the worker downloads. Types are not bundled: they come from the
 * Container's installed packages through `ReplaceNodeModules` (ADR 0004).
 */
export interface WorkerAssets {
  readonly wasm: WorkerAsset
}

export type PageToWorker =
  | { readonly _tag: "Start"; readonly assets: WorkerAssets }
  | { readonly _tag: "Fs"; readonly op: WorkspaceFsOp }
  | {
      /**
       * Reads a file from the worker's file system, for example a library
       * declaration below `node_modules` (the Container's types). `path` is
       * relative to the Workspace root. Answered by `FileRead` with the same
       * `id`.
       */
      readonly _tag: "ReadFile"
      readonly id: number
      readonly path: string
    }
  | { readonly _tag: "Dispose" }

export type LoadPhase = TransportLoadPhase

export type WorkerRecovery = TransportRecovery

export type WorkerToPage =
  | {
      readonly _tag: "Progress"
      readonly phase: LoadPhase
      readonly loadedBytes: number
      readonly totalBytes: number
    }
  | { readonly _tag: "Ready" }
  | { readonly _tag: "Recovered"; readonly recovery: WorkerRecovery }
  | { readonly _tag: "Fatal"; readonly message: string }
  | ({ readonly _tag: "TypesMounted" } & TypesMountedInfo)
  | {
      readonly _tag: "TypesRejected"
      readonly id: number
      readonly message: string
    }
  | {
      /** The answer to `ReadFile`: the file's text, or `null` when it is missing. */
      readonly _tag: "FileRead"
      readonly id: number
      readonly content: string | null
    }

/** What a `ReplaceNodeModules` op mounted. */
export interface TypesMountedInfo {
  readonly id: number
  readonly files: number
  readonly bytes: number
  readonly packages: ReadonlyArray<{
    readonly name: string
    readonly version: string
  }>
}

/** The worker's answer to a `ReplaceNodeModules` op. */
export type TypesMountResult = Extract<
  WorkerToPage,
  { readonly _tag: "TypesMounted" | "TypesRejected" }
>

const isTagged = (value: unknown): value is { readonly _tag: string } =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { _tag?: unknown })._tag === "string"

const WORKER_TO_PAGE_TAGS = new Set([
  "Progress",
  "Ready",
  "Recovered",
  "Fatal",
  "TypesMounted",
  "TypesRejected",
  "FileRead",
])
const PAGE_TO_WORKER_TAGS = new Set(["Start", "Fs", "ReadFile", "Dispose"])

export const isWorkerToPage = (value: unknown): value is WorkerToPage =>
  isTagged(value) && WORKER_TO_PAGE_TAGS.has(value._tag)

export const isPageToWorker = (value: unknown): value is PageToWorker =>
  isTagged(value) && PAGE_TO_WORKER_TAGS.has(value._tag)
