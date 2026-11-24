/**
 * The Scratchpad's language server Web Worker: the Effect-patched tsrs
 * language server compiled to wasm (`@website/tsrs-lsp-wasm`), behind the
 * page protocol in `worker-protocol.ts`. The pull-to-push and file system
 * logic lives in `lsp-worker-bridge.ts`; this file only wires it up.
 *
 * Types are not downloaded: the page sends the Container's installed
 * declarations with `ReplaceNodeModules`, and `tsconfig.json` arrives as a
 * Workspace file (ADR 0004).
 */
import {
  MemoryFileSystem,
  startLspHost,
  WORKSPACE_ROOT_PATH,
  type LspHost,
} from "@website/tsrs-lsp-wasm"
import { makeLspWorkerBridge } from "./lsp-worker-bridge.ts"
import { fetchCounted } from "./worker-assets.ts"
import {
  isPageToWorker,
  type LoadPhase,
  type WorkerAssets,
  type WorkerToPage,
} from "./worker-protocol.ts"

declare const self: {
  postMessage: (message: unknown) => void
  close: () => void
  onmessage: ((event: { readonly data: unknown }) => void) | null
}

const post = (message: WorkerToPage | string) => self.postMessage(message)

const fs = new MemoryFileSystem()
const bridge = makeLspWorkerBridge({
  fs,
  rootPath: WORKSPACE_ROOT_PATH,
  postToPage: (message) => post(message),
  onTypes: (result) => post(result),
})

let host: LspHost | undefined
let started = false
let stopped = false

const describe = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

const fatal = (error: unknown) => {
  if (stopped) return
  stopped = true
  bridge.dispose()
  host?.dispose()
  post({ _tag: "Fatal", message: describe(error) })
}

const PROGRESS_INTERVAL_MS = 100

const start = async (assets: WorkerAssets) => {
  const totalBytes = assets.wasm.bytes ?? 0
  let loadedBytes = 0
  let phase: LoadPhase = "downloading"
  let lastProgress = 0
  const report = (force = false) => {
    const now = performance.now()
    if (!force && now - lastProgress < PROGRESS_INTERVAL_MS) return
    lastProgress = now
    post({ _tag: "Progress", phase, loadedBytes, totalBytes })
  }
  const onBytes = (bytes: number) => {
    loadedBytes += bytes
    report()
  }
  report(true)

  const wasmResponse = fetchCounted(fetch, assets.wasm.url, onBytes)
  // Compilation streams alongside the download; once every byte is in, what
  // is left is compiling.
  const module = wasmResponse.then((response) =>
    WebAssembly.compileStreaming === undefined ||
    !(response.headers.get("content-type") ?? "").includes("application/wasm")
      ? response.arrayBuffer().then((bytes) => WebAssembly.compile(bytes))
      : WebAssembly.compileStreaming(response),
  )
  void wasmResponse.then(() => {
    if (phase === "downloading") {
      phase = "compiling"
      report(true)
    }
  })
  const compiled = await module
  phase = "starting"
  report(true)

  host = await startLspHost({
    module: compiled,
    fs,
    rootPath: WORKSPACE_ROOT_PATH,
    // The Workspace's own tsconfig.json, mirrored like any file.
    tsconfig: null,
    onMessage: (message) => bridge.handleServerMessage(message),
    onRecovery: (event) =>
      post({
        _tag: "Recovered",
        recovery: {
          reason: event.reason,
          method: event.method,
          uri: event.uri,
          ms: event.ms,
          quarantined: event.quarantined,
        },
      }),
    onError: fatal,
  })
  if (stopped) {
    host.dispose()
    return
  }
  bridge.connect(host)
  post({ _tag: "Ready" })
}

self.onmessage = (event) => {
  const data = event.data
  if (typeof data === "string") {
    bridge.handleClientMessage(data)
    return
  }
  if (!isPageToWorker(data)) return
  switch (data._tag) {
    case "Start":
      if (started) return
      started = true
      start(data.assets).catch(fatal)
      break
    case "Fs":
      bridge.applyFsOp(data.op)
      break
    case "ReadFile":
      post({
        _tag: "FileRead",
        id: data.id,
        content: bridge.readFile(data.path) ?? null,
      })
      break
    case "Dispose":
      stopped = true
      bridge.dispose()
      host?.dispose()
      self.close()
      break
  }
}
