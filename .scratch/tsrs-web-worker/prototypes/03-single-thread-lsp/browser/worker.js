// The language server in one Web Worker: JSON-RPC strings in, JSON-RPC strings out (postMessage), over an
// in-memory file system. No SharedArrayBuffer, no Atomics, no cross-origin isolation.
// Messages from the page:
//   { type: "init", wasmUrl, filesUrl, cwd, autoTick }  -> { type: "ready", compileMs, instantiateMs, filesMs, memoryBytes }
//   { type: "lsp", text }                               -> { type: "out", msgs: [text...], status, ms, memoryBytes }
//   { type: "tick" }                                    -> { type: "out", msgs, status, ms, memoryBytes }
// With autoTick, queued background work runs on a 0 ms timer after each message (what an integration would do);
// the measuring harness drives ticks itself.
import { startLspServer } from "../lsp-host.js"

let server
let autoTick = false
const stderr = []

const reply = (msgs, ms) =>
  postMessage({
    type: "out",
    msgs,
    status: server.status,
    ms,
    memoryBytes: server.memoryBytes(),
  })

const scheduleTick = () => {
  if (!autoTick || server.status !== 3) return
  setTimeout(() => {
    const t = performance.now()
    const msgs = server.tick()
    if (msgs.length) reply(msgs, performance.now() - t)
    scheduleTick()
  }, 0)
}

onmessage = async ({ data }) => {
  try {
    if (data.type === "init") {
      autoTick = !!data.autoTick
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
      server = await startLspServer(module, {
        files,
        cwd: data.cwd ?? "/p",
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
      const msgs = server.send(data.text)
      reply(msgs, performance.now() - t)
      scheduleTick()
    } else if (data.type === "tick") {
      const t = performance.now()
      const msgs = server.tick()
      reply(msgs, performance.now() - t)
    }
  } catch (e) {
    postMessage({
      type: "error",
      message: String(e?.message ?? e),
      cause: String(e?.cause?.message ?? ""),
      stderr: stderr.slice(-10),
    })
  }
}
