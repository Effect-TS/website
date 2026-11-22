// Browser host: the page creates one module Worker per wasm thread (thread-worker.js), all on one shared memory.
// The page itself never blocks: it feeds stdin through the SharedArrayBuffer ring and reads stdout from messages.
// Query: ?pool=24&parallelism=4&stackMB=16&edits=20&gap=<ms before each edit>&deep=<terms>&enc=br|gzip
import { makeShared, stdinPush, memoryImportLimits } from "/wasi-threads.js"
import { makeClient, session, deepSession } from "/lsp-session.js"

const q = new URLSearchParams(location.search)
const poolSize = Number(q.get("pool") ?? 24)
const parallelism =
  q.get("parallelism") ??
  String(Math.min(navigator.hardwareConcurrency || 4, 8))
const stackMB = q.get("stackMB") ?? "16"
const edits = Number(q.get("edits") ?? 20)
const deep = q.get("deep")
const enc = q.get("enc")
const gapMs = Number(q.get("gap") ?? 0)
const logEl = document.getElementById("log")
const lines = []
const report = (label, ms, detail) => {
  const line = `${label.padEnd(44)} ${ms.toFixed(1).padStart(9)} ms  ${detail}`
  lines.push(line)
  logEl.textContent = lines.join("\n")
}
let stderr = ""
const done = (extra) => {
  window.__result = { lines, stderr: stderr.slice(-4000), ...extra }
}

try {
  if (!crossOriginIsolated) throw new Error("page is not cross-origin isolated")
  const t0 = performance.now()
  const wasmUrl = "/tsrs.wasm" + (enc ? `?enc=${enc}` : "")
  const resp = await fetch(wasmUrl)
  const bytes = new Uint8Array(await resp.arrayBuffer())
  const tFetch = performance.now()
  const module = await WebAssembly.compile(bytes)
  const tCompile = performance.now()
  report(
    "fetch tsrs.wasm",
    tFetch - t0,
    `${bytes.length} bytes${enc ? " (served " + enc + ")" : ""}`,
  )
  report("WebAssembly.compile", tCompile - tFetch, "")
  const limits = memoryImportLimits(bytes)
  const [index, fsBin] = await Promise.all([
    fetch("/fs.json").then((r) => r.json()),
    fetch("/fs.bin").then((r) => r.arrayBuffer()),
  ])
  const bin = new Uint8Array(fsBin)
  const files = index.map(([p, o, l]) => [p, bin.subarray(o, o + l)])
  const shared = makeShared({ files, poolSize })
  const memory = new WebAssembly.Memory({
    initial: limits.min,
    maximum: limits.max,
    shared: true,
  })
  const mainText = await fetch("/main.ts").then((r) => r.text())
  report(
    "workspace image",
    performance.now() - tCompile,
    `${files.length} files, ${bin.length} bytes`,
  )

  let client
  let ready = 0
  let resolveReady
  const allReady = new Promise((r) => (resolveReady = r))
  let failed
  const onMessage = (e) => {
    const m = e.data
    if (m.type === "ready") {
      if (++ready === poolSize) resolveReady()
    } else if (m.type === "write") {
      if (m.fd === 1) client.onData(m.bytes)
      else stderr += new TextDecoder().decode(m.bytes)
    } else if (m.type === "log") stderr += "[host] " + m.message + "\n"
    else if (m.type === "exit") stderr += `[host] exit ${m.code}\n`
    else if (m.type === "trap") {
      failed = `wasm trap in ${m.main ? "main thread" : "thread " + m.tid}: ${m.message}`
      stderr += "[host] " + failed + "\n" + (m.stack ?? "")
    }
  }
  const workers = []
  for (let slot = 1; slot <= poolSize; slot++) {
    const w = new Worker("/thread-worker.js", { type: "module" })
    w.onmessage = onMessage
    w.onerror = (e) => {
      failed = "worker error " + e.message
      stderr += failed + "\n"
    }
    w.postMessage({
      module,
      memory,
      shared,
      slot,
      args: ["tsrs", "--lsp", "--stdio"],
      env: {
        TSRS_WASM_PARALLELISM: parallelism,
        TSRS_WASM_THREAD_STACK_MB: stackMB,
        RAYON_NUM_THREADS: parallelism,
      },
    })
    workers.push(w)
  }
  await allReady
  report(
    "thread pool ready (instantiate x" + poolSize + ")",
    performance.now() - tCompile,
    "",
  )
  client = makeClient((b) => stdinPush(shared.stdin, b), { timeoutMs: 120000 })
  const pool = new Int32Array(shared.pool)
  pool[4 + 1] = 0
  Atomics.store(pool, 4, 3)
  Atomics.notify(pool, 4)
  const sample = async () => ({
    wasmMemoryMiB: Math.round(memory.buffer.byteLength / 2 ** 20),
    threadsSpawned: pool[0] - 1,
    running: pool[2],
    peakRunning: pool[3],
    jsHeapMiB: performance.memory
      ? Math.round(performance.memory.usedJSHeapSize / 2 ** 20)
      : undefined,
  })
  const tStart = performance.now()
  const race = (p) =>
    Promise.race([
      p,
      new Promise((_, rej) => {
        const i = setInterval(() => {
          if (failed) {
            clearInterval(i)
            rej(new Error(failed))
          }
        }, 50)
      }),
    ])
  if (deep)
    await race(
      deepSession(client, { root: "/ws", terms: Number(deep), report }),
    )
  else
    await race(
      session(client, {
        root: "/ws",
        mainText,
        edits,
        report,
        quiet: true,
        gapMs,
        sample,
      }),
    )
  report("page load to end of session", performance.now() - t0, "")
  let uaMemory
  if (performance.measureUserAgentSpecificMemory) {
    try {
      uaMemory = await Promise.race([
        performance
          .measureUserAgentSpecificMemory()
          .then((m) => Math.round(m.bytes / 2 ** 20)),
        new Promise((r) => setTimeout(() => r("timeout"), 30000)),
      ])
    } catch (e) {
      uaMemory = String(e)
    }
  }
  done({
    ok: true,
    sample: await sample(),
    uaMemoryMiB: uaMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
    sessionMs: performance.now() - tStart,
  })
} catch (e) {
  report("FAILED", 0, String(e?.stack ?? e))
  done({ ok: false, error: String(e) })
}
