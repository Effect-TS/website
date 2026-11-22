// The page side: a Worker transport that exchanges JSON-RPC strings, wrapped in the adapter session.js drives.
import { runSession, summarize } from "../session.js"

function workerServer(worker) {
  let status = 0
  let mem = 0
  let dead = null
  let pending = null
  worker.onmessage = ({ data }) => {
    if (data.type === "out") {
      status = data.status
      mem = data.memoryBytes
      pending?.resolve(data)
    } else if (data.type === "error") {
      dead = new Error(`worker: ${data.message} ${data.cause}`)
      pending?.reject(dead)
    }
    pending = null
  }
  const call = (msg) =>
    new Promise((resolve, reject) => {
      if (dead) return reject(dead)
      pending = { resolve, reject }
      worker.postMessage(msg)
    })
  return {
    get status() {
      return status
    },
    get dead() {
      return dead
    },
    memoryBytes: () => mem,
    workerMs: [],
    async send(text) {
      const r = await call({ type: "lsp", text })
      this.workerMs.push(r.ms)
      return r.msgs
    },
    async tick() {
      return (await call({ type: "tick" })).msgs
    },
  }
}

window.runLsp = async ({ edits = 50, deep } = {}) => {
  const navStart = performance.now()
  const worker = new Worker(new URL("./worker.js", import.meta.url), {
    type: "module",
  })
  const ready = await new Promise((resolve, reject) => {
    worker.onmessage = ({ data }) =>
      data.type === "ready" ? resolve(data) : reject(new Error(data.message))
    worker.onerror = (e) => reject(new Error(`worker error: ${e.message}`))
    worker.postMessage({
      type: "init",
      wasmUrl: new URL(
        "../../../artifacts/tsrs-lsp-single.wasm",
        import.meta.url,
      ).href,
      filesUrl: new URL(
        "../../../artifacts/03-effect-files.json",
        import.meta.url,
      ).href,
      cwd: "/p",
    })
  })
  const readyMs = performance.now() - navStart
  const server = workerServer(worker)
  const results = await runSession(server, { edits, ...(deep ? { deep } : {}) })
  worker.terminate()
  return {
    ready,
    readyMs,
    crossOriginIsolated: window.crossOriginIsolated,
    summary: summarize(results),
    results,
  }
}
