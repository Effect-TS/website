/**
 * The browser side of the in-browser language server: the worker script and
 * the wasm module as a Vite URL. The module stays a separate hashed file
 * (never inlined into JavaScript); the worker fetches it. It comes from
 * `packages/tsrs-lsp-wasm/dist/` through `virtual:tsrs-lsp-assets` (see
 * `tsrs-lsp-assets-plugin.ts`). Types come from the Container (ADR 0004).
 */
import type * as Layer from "effect/Layer"
import { wasmBytes, wasmUrl } from "virtual:tsrs-lsp-assets"
import type { LspTransport } from "./transport.ts"
import type { WorkerAssets } from "./worker-protocol.ts"
import { layerWorker, type LspWorkspaceMirror } from "./worker-transport.ts"

export const LSP_WORKER_ASSETS: WorkerAssets = {
  wasm: { url: wasmUrl, bytes: wasmBytes ?? undefined },
}

export const makeLspWorker = (): Worker =>
  new Worker(new URL("./lsp.worker.ts", import.meta.url), {
    type: "module",
    name: "scratchpad-lsp",
  })

export const layerBrowserWorker = (): Layer.Layer<
  LspTransport | LspWorkspaceMirror
> =>
  layerWorker({
    makeWorker: makeLspWorker,
    assets: LSP_WORKER_ASSETS,
  })
