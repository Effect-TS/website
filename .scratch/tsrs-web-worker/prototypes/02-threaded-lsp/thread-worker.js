// One pooled wasm thread. Runs unchanged in a Node worker_threads Worker and in a browser module Worker.
// The worker instantiates the module on its shared memory once, then waits on its pool slot: SLOT_MAIN runs
// `_start` (the process's main thread), SLOT_START runs `wasi_thread_start(tid, arg)`; afterwards the slot is idle.
import {
  createWasi,
  WasiExit,
  SLOT_IDLE,
  SLOT_START,
  SLOT_RUNNING,
  SLOT_MAIN,
} from "./wasi-threads.js"

const isNode = typeof process !== "undefined" && process.versions?.node
let post, fsWrite
if (isNode) {
  const { parentPort } = await import("node:worker_threads")
  const fs = await import("node:fs")
  post = (m) => parentPort.postMessage(m)
  fsWrite = (fd, bytes) => {
    let o = 0
    while (o < bytes.length) o += fs.writeSync(fd, bytes, o)
  }
  parentPort.once("message", start)
} else {
  post = (m) => self.postMessage(m)
  self.onmessage = (e) => start(e.data)
}

function start(init) {
  const { module, memory, shared, slot, args, env } = init
  const pool = new Int32Array(shared.pool)
  const size = pool[1]
  const threadSpawn = (arg) => {
    for (let s = 2; s <= size; s++) {
      if (Atomics.compareExchange(pool, s * 4, SLOT_IDLE, -1) === SLOT_IDLE) {
        const tid = Atomics.add(pool, 0, 1)
        pool[s * 4 + 1] = tid
        pool[s * 4 + 2] = arg
        Atomics.store(pool, s * 4, SLOT_START)
        Atomics.notify(pool, s * 4)
        return tid
      }
    }
    post({
      type: "log",
      message: `thread-spawn: pool of ${size - 1} threads exhausted`,
    })
    return -6
  }
  const write =
    isNode && init.directStdout
      ? fsWrite
      : (fd, bytes) => post({ type: "write", fd, bytes }, [bytes.buffer])
  const wasi = createWasi({
    memory,
    shared,
    args,
    env,
    write,
    threadSpawn,
    exit: (code) => post({ type: "exit", code }),
  })
  const instance = new WebAssembly.Instance(module, wasi.imports)
  post({ type: "ready", slot })
  for (;;) {
    let st = Atomics.load(pool, slot * 4)
    while (st !== SLOT_START && st !== SLOT_MAIN) {
      Atomics.wait(pool, slot * 4, st)
      st = Atomics.load(pool, slot * 4)
    }
    const tid = pool[slot * 4 + 1],
      arg = pool[slot * 4 + 2]
    Atomics.store(pool, slot * 4, SLOT_RUNNING)
    const running = Atomics.add(pool, 2, 1) + 1
    for (
      let peak = Atomics.load(pool, 3);
      running > peak;
      peak = Atomics.load(pool, 3)
    )
      Atomics.compareExchange(pool, 3, peak, running)
    try {
      if (st === SLOT_MAIN) {
        instance.exports._start()
        post({ type: "exit", code: 0 })
      } else {
        instance.exports.wasi_thread_start(tid, arg)
      }
    } catch (e) {
      if (e instanceof WasiExit) return
      post({
        type: "trap",
        tid,
        main: st === SLOT_MAIN,
        message: String(e),
        stack: e?.stack,
      })
      return
    }
    Atomics.sub(pool, 2, 1)
    Atomics.store(pool, slot * 4, SLOT_IDLE)
  }
}
