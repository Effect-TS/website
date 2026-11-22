// The page side. "session" drives the server over postMessage (one JSON-RPC string per message, as a CodeMirror
// transport would); "features" and "deep" run inside the worker.
import { runSession, summarize } from "../session.js"

function workerServer(worker) {
  let status = 0,
    mem = 0,
    dead = null,
    pending = null
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
    async send(text) {
      return (await call({ type: "lsp", text })).msgs
    },
    async tick() {
      return (await call({ type: "tick" })).msgs
    },
  }
}

async function startWorker(wasm, files) {
  const t0 = performance.now()
  const worker = new Worker(new URL("./worker.js", import.meta.url), {
    type: "module",
  })
  const ready = await new Promise((resolve, reject) => {
    worker.onmessage = ({ data }) =>
      data.type === "ready" ? resolve(data) : reject(new Error(data.message))
    worker.onerror = (e) => reject(new Error(`worker error: ${e.message}`))
    worker.postMessage({
      type: "init",
      wasmUrl: new URL(`../../../artifacts/${wasm}`, import.meta.url).href,
      filesUrl: new URL(`../../../artifacts/${files}`, import.meta.url).href,
    })
  })
  return { worker, ready, readyMs: performance.now() - t0 }
}

window.runLsp = async ({
  mode = "session",
  wasm = "tsrs-effect-lsp-single.wasm",
  files = "05-files-full.json",
  edits = 50,
  options = {},
} = {}) => {
  const { worker, ready, readyMs } = await startWorker(wasm, files)
  try {
    if (mode === "session") {
      const results = await runSession(workerServer(worker), { edits })
      return {
        ready,
        readyMs,
        crossOriginIsolated: window.crossOriginIsolated,
        summary: summarize(results),
        results,
      }
    }
    const result = await new Promise((resolve, reject) => {
      worker.onmessage = ({ data }) =>
        data.type === "result"
          ? resolve(data.result)
          : data.type === "error"
            ? reject(new Error(`${data.message}\n${data.stack}`))
            : null
      worker.postMessage({ type: "run", mode, options })
    })
    return {
      ready,
      readyMs,
      crossOriginIsolated: window.crossOriginIsolated,
      result,
    }
  } finally {
    worker.terminate()
  }
}
