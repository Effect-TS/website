// The Effect language server in one module Web Worker over an in-memory file system. No SharedArrayBuffer, no
// Atomics, no cross-origin isolation. The instance is wrapped in startRecoveringServer, so a trap (engine stack
// overflow) is recovered inside the worker.
// Messages from the page:
//   { type: "init", wasmUrl, filesUrl }   -> { type: "ready", compileMs, filesMs, instantiateMs, memoryBytes, crossOriginIsolated, sab }
//   { type: "lsp", text }                 -> { type: "out", msgs, status, ms, memoryBytes, recoveries }
//   { type: "tick" }                      -> same
//   { type: "run", mode: "features" | "deep", options } -> { type: "result", result }  (runs the probe in the worker)
import { runDeep } from "../deep.js"
import { runFeatures } from "../features.js"
import { startRecoveringServer } from "../lsp-host.js"
import { ROOT } from "../workspace.js"

let server
const stderr = []
const reply = (msgs, ms) =>
  postMessage({
    type: "out",
    msgs,
    status: server.status,
    ms,
    memoryBytes: server.memoryBytes(),
    recoveries: server.recoveries.length,
  })

onmessage = async ({ data }) => {
  try {
    if (data.type === "init") {
      const t0 = performance.now()
      const response = await fetch(data.wasmUrl)
      const module = (response.headers.get("content-type") ?? "").startsWith(
        "application/wasm",
      )
        ? await WebAssembly.compileStreaming(response)
        : await WebAssembly.compile(await response.arrayBuffer())
      const compileMs = performance.now() - t0
      const t1 = performance.now()
      const files = await (await fetch(data.filesUrl)).json()
      const filesMs = performance.now() - t1
      const t2 = performance.now()
      server = await startRecoveringServer(module, {
        files,
        cwd: ROOT,
        stderr: (l) => stderr.push(l),
      })
      const instantiateMs = performance.now() - t2
      postMessage({
        type: "ready",
        compileMs,
        filesMs,
        instantiateMs,
        memoryBytes: server.memoryBytes(),
        crossOriginIsolated: self.crossOriginIsolated,
        sab: typeof SharedArrayBuffer,
      })
    } else if (data.type === "lsp") {
      const t = performance.now()
      const msgs = await server.send(data.text)
      reply(msgs, performance.now() - t)
    } else if (data.type === "tick") {
      const t = performance.now()
      const msgs = await server.tick()
      reply(msgs, performance.now() - t)
    } else if (data.type === "run") {
      const run = data.mode === "features" ? runFeatures : runDeep
      const result = await run(server, data.options ?? {})
      postMessage({
        type: "result",
        result: JSON.parse(JSON.stringify(result)),
      })
    }
  } catch (e) {
    postMessage({
      type: "error",
      message: String(e?.message ?? e),
      cause: String(e?.cause?.message ?? ""),
      stack: String(e?.stack ?? ""),
      stderr: stderr.slice(-10),
    })
  }
}
