/**
 * The browser side of the in-browser language server: the worker script and
 * its assets as Vite URLs. The wasm module and the types pack stay separate
 * hashed files (never inlined into JavaScript); the worker fetches them.
 * They come from `packages/tsrs-lsp-wasm/dist/` through
 * `virtual:tsrs-lsp-assets` (see `tsrs-lsp-assets-plugin.ts`).
 */
import type * as Layer from "effect/Layer"
import {
  typesPackBytes,
  typesPackUrl,
  wasmBytes,
  wasmUrl,
} from "virtual:tsrs-lsp-assets"
import type { LspTransport } from "./transport.ts"
import type { WorkerAssets } from "./worker-protocol.ts"
import {
  layerWorker,
  type LayerWorkerOptions,
  type LspWorkspaceMirror,
} from "./worker-transport.ts"

export const LSP_WORKER_ASSETS: WorkerAssets = {
  wasm: { url: wasmUrl, bytes: wasmBytes ?? undefined },
  typesPacks: [{ url: typesPackUrl, bytes: typesPackBytes ?? undefined }],
}

export const makeLspWorker = (): Worker =>
  new Worker(new URL("./lsp.worker.ts", import.meta.url), {
    type: "module",
    name: "scratchpad-lsp",
  })

export const layerBrowserWorker = (
  options?: Pick<LayerWorkerOptions, "onReady">,
): Layer.Layer<LspTransport | LspWorkspaceMirror> =>
  layerWorker({
    makeWorker: makeLspWorker,
    assets: LSP_WORKER_ASSETS,
    ...options,
  })
