// Node 24 host for a wasm32-wasip1-threads command module: `node node-host.mjs [options] <module.wasm> [args...]`
//   --mount <hostDir>:<guestDir>   copy a host directory into the read-only in-memory file system (repeatable)
//   --pool <n>                     wasm threads available to thread-spawn (default 64)
//   --stack-mb <n>                 V8 stack of each worker thread, which holds the wasm call frames (default Node's 4)
//   --env K=V                      guest environment variable (repeatable)
// stdin and stdout are the process's own; the guest's stderr goes to stderr.
import { Worker } from "node:worker_threads"
import { readFileSync, readdirSync, statSync, writeSync } from "node:fs"
import { join } from "node:path"
import {
  makeShared,
  stdinPush,
  stdinClose,
  memoryImportLimits,
} from "./wasi-threads.js"

const argv = process.argv.slice(2)
const mounts = [],
  env = {}
let poolSize = 64
let stackMb // the JS engine stack of each worker (holds the wasm frames); Node default 4 MB
while (argv[0]?.startsWith("--")) {
  const k = argv.shift()
  if (k === "--mount") mounts.push(argv.shift().split(":"))
  else if (k === "--pool") poolSize = Number(argv.shift())
  else if (k === "--stack-mb") stackMb = Number(argv.shift())
  else if (k === "--env") {
    const [a, ...b] = argv.shift().split("=")
    env[a] = b.join("=")
  } else throw new Error(`unknown option ${k}`)
}
const [wasmPath, ...guestArgs] = argv
const t0 = performance.now()
const bytes = readFileSync(wasmPath)
const limits = memoryImportLimits(bytes)
// Keep the event loop alive: with eager compilation (--no-wasm-lazy-compilation) nothing else would.
const keepAlive = setInterval(() => {}, 1 << 30)
const module = await WebAssembly.compile(bytes)
clearInterval(keepAlive)
const tCompile = performance.now()
const files = []
const walk = (host, guest) => {
  for (const e of readdirSync(host)) {
    const p = join(host, e),
      g = guest + "/" + e
    if (statSync(p).isDirectory()) walk(p, g)
    else files.push([g, readFileSync(p)])
  }
}
for (const [h, g] of mounts) walk(h, g)
const shared = makeShared({ files, poolSize })
const memory = new WebAssembly.Memory({
  initial: limits.min,
  maximum: limits.max,
  shared: true,
})
const debug = !!process.env.HOST_DEBUG
if (debug)
  console.error(
    `[host] compile ${(tCompile - t0).toFixed(0)}ms, memory ${limits.min}..${limits.max} pages, ${files.length} files, pool ${poolSize}`,
  )

const workers = []
let ready = 0
const onMessage = (m) => {
  if (m.type === "ready") {
    if (++ready === poolSize) startMain()
  } else if (m.type === "write") writeSync(m.fd, m.bytes)
  else if (m.type === "exit") finish(m.code)
  else if (m.type === "log") console.error("[host]", m.message)
  else if (m.type === "trap") {
    console.error(
      `[host] wasm trap in ${m.main ? "main thread" : "thread " + m.tid}: ${m.message}\n${m.stack ?? ""}`,
    )
    finish(134)
  }
}
for (let slot = 1; slot <= poolSize; slot++) {
  const w = new Worker(new URL("./thread-worker.js", import.meta.url), {
    stdout: false,
    stderr: false,
    ...(stackMb ? { resourceLimits: { stackSizeMb: stackMb } } : {}),
  })
  w.on("message", onMessage)
  w.on("error", (e) => {
    console.error("[host] worker error", e)
    finish(70)
  })
  w.postMessage({
    module,
    memory,
    shared,
    slot,
    args: ["tsrs", ...guestArgs],
    env,
    directStdout: true,
  })
  workers.push(w)
}
function startMain() {
  if (debug)
    console.error(
      `[host] pool ready at ${(performance.now() - t0).toFixed(0)}ms`,
    )
  const pool = new Int32Array(shared.pool)
  pool[4 + 1] = 0
  Atomics.store(pool, 4, 3 /* SLOT_MAIN */)
  Atomics.notify(pool, 4)
  process.stdin.on("data", (d) => stdinPush(shared.stdin, d))
  process.stdin.on("end", () => stdinClose(shared.stdin))
}
function finish(code) {
  if (debug) {
    const pool = new Int32Array(shared.pool)
    console.error(
      `[host] exit ${code}; threads spawned ${pool[0] - 1}, peak running ${pool[3]}, memory ${(memory.buffer.byteLength / 2 ** 20).toFixed(0)} MiB`,
    )
  }
  process.exit(code)
}
// Report the wasm memory size and thread stats on SIGUSR2 (used by the measurement driver).
// With HOST_STACKS=1 it also pauses every running wasm thread through the inspector and prints its wasm stack.
process.on("SIGUSR2", () => {
  const pool = new Int32Array(shared.pool)
  console.error(
    `[host] stats memory=${(memory.buffer.byteLength / 2 ** 20).toFixed(0)}MiB spawned=${pool[0] - 1} running=${pool[2]} peak=${pool[3]}`,
  )
  if (process.env.HOST_STACKS) dumpStacks()
})
async function dumpStacks() {
  const inspector = await import("node:inspector")
  const session = new inspector.Session()
  session.connect()
  const post = (m, p) =>
    new Promise((res, rej) =>
      session.post(m, p, (e, r) => (e ? rej(e) : res(r))),
    )
  const targets = []
  session.on("NodeWorker.attachedToWorker", ({ params }) =>
    targets.push(params.sessionId),
  )
  const replies = new Map()
  session.on("NodeWorker.receivedMessageFromWorker", ({ params }) => {
    const msg = JSON.parse(params.message)
    if (msg.method === "Debugger.paused") {
      const frames = msg.params.callFrames
        .map((f) => f.functionName || "?")
        .filter((n) => n !== "?")
      const short = frames
        .map((n) =>
          n.replace(/\[[0-9a-f]+\]/g, "").replace(/^.*::(\w+::\w+)$/, "$1"),
        )
        .slice(0, 40)
      replies.set(params.sessionId, short)
      const send = (method, p = {}) =>
        session.post("NodeWorker.sendMessageToWorker", {
          sessionId: params.sessionId,
          message: JSON.stringify({ id: 9e6, method, params: p }),
        })
      send("Debugger.resume")
    }
  })
  await post("NodeWorker.enable", { waitForDebuggerOnStart: false })
  await new Promise((r) => setTimeout(r, 300))
  let id = 1
  for (const sid of targets) {
    const send = (method, p = {}) =>
      post("NodeWorker.sendMessageToWorker", {
        sessionId: sid,
        message: JSON.stringify({ id: id++, method, params: p }),
      })
    await send("Debugger.enable")
    await send("Debugger.pause")
  }
  await new Promise((r) => setTimeout(r, 3000))
  const idle = []
  for (const sid of targets) {
    const st = replies.get(sid)
    if (!st) {
      idle.push(sid)
      continue
    }
    console.error(`[host] stack ${sid}:\n    ` + st.join("\n    "))
  }
  console.error(
    `[host] ${targets.length} workers, ${idle.length} did not pause`,
  )
}
