// Runtime-agnostic host for tsrs-lsp-single.wasm (crates/tsrs_wasm_lsp in the patched tsrs): a small WASI preview1
// shim (clocks, random, stderr, proc_exit; no file system), the `tsrs_host.fs` bridge over an in-memory file system
// (same protocol as @tsrs/wasm's core.js), and a message pump. Works in Node and in a Web Worker. No dependencies.
//
//   const server = await startLspServer(module, { files, cwd })
//   const outgoing = server.send(jsonText)   // runs the message to completion; returns the server's messages
//   server.tick()                            // fires due timers (idle cache clean), returns messages
//   server.nextTimerMs()                     // -1 when no timer is pending
//   server.memoryBytes()

const OP_READ = 0,
  OP_STAT = 1,
  OP_READ_DIR = 2,
  OP_REALPATH = 3,
  OP_WRITE = 4,
  OP_APPEND = 5,
  OP_REMOVE = 6,
  OP_CHTIMES = 7
const ESUCCESS = 0,
  EBADF = 8,
  ENOSYS = 52

export class NotFoundError extends Error {}
export class WasiExit extends Error {
  constructor(code) {
    super(`exit ${code}`)
    this.code = code
  }
}

const encoder = new TextEncoder()
const decoder = new TextDecoder("utf-8", { ignoreBOM: true })

function normalize(path) {
  const parts = []
  for (const part of path.replace(/\\/g, "/").split("/")) {
    if (part === "" || part === ".") continue
    if (part === "..") parts.pop()
    else parts.push(part)
  }
  return "/" + parts.join("/")
}

/** In-memory file system: absolute path -> string | Uint8Array. Directories are implied by the paths below them. */
export function memoryFileSystem(files = {}) {
  const map = new Map()
  const dirs = new Set(["/"])
  const addDirs = (p) => {
    for (let i = p.lastIndexOf("/"); i > 0; i = p.lastIndexOf("/", i - 1))
      dirs.add(p.slice(0, i))
  }
  const put = (p, data) => {
    map.set(p, typeof data === "string" ? encoder.encode(data) : data)
    addDirs(p)
  }
  for (const [path, data] of Object.entries(files)) put(normalize(path), data)
  return {
    map,
    set: (path, data) => put(normalize(path), data),
    readFile(path) {
      const d = map.get(normalize(path))
      if (d === undefined) throw new NotFoundError(path)
      return d
    },
    stat(path) {
      const p = normalize(path)
      const d = map.get(p)
      if (d !== undefined) return { kind: "f", size: d.length, mtimeNs: 0n }
      if (dirs.has(p)) return { kind: "d", size: 0, mtimeNs: 0n }
      throw new NotFoundError(path)
    },
    readDir(path) {
      const p = normalize(path)
      if (!dirs.has(p)) throw new NotFoundError(path)
      const prefix = p === "/" ? "/" : p + "/"
      const out = new Map()
      for (const key of map.keys())
        if (key.startsWith(prefix)) {
          const r = key.slice(prefix.length)
          const s = r.indexOf("/")
          out.set(s < 0 ? r : r.slice(0, s), s < 0 ? "f" : "d")
        }
      for (const key of dirs)
        if (key.startsWith(prefix) && key !== p) {
          const r = key.slice(prefix.length)
          if (!r.includes("/")) out.set(r, "d")
        }
      return [...out].map(([name, kind]) => [kind, name])
    },
    realpath: (path) => normalize(path),
    writeFile(path, data, append) {
      const p = normalize(path)
      const prev = append
        ? (map.get(p) ?? new Uint8Array(0))
        : new Uint8Array(0)
      const next = new Uint8Array(prev.length + data.length)
      next.set(prev)
      next.set(data, prev.length)
      put(p, next)
    },
    remove(path) {
      const p = normalize(path)
      for (const key of [...map.keys()])
        if (key === p || key.startsWith(p + "/")) map.delete(key)
    },
    chtimes() {},
  }
}

function isTrap(e) {
  return (
    e instanceof WebAssembly.RuntimeError ||
    (e instanceof RangeError && /call stack/i.test(e.message)) ||
    e?.name === "InternalError" ||
    /too much recursion/i.test(String(e?.message))
  )
}

/**
 * Instantiates the module once and returns the pump. options: { files | fs, cwd, stderr(text), env }.
 * A trap (panic = abort, stack overflow, OOM) marks the server dead: every later call throws.
 */
export async function startLspServer(module, options = {}) {
  const fs = options.fs ?? memoryFileSystem(options.files ?? {})
  const stderr = options.stderr ?? (() => {})
  const env = Object.entries(options.env ?? {}).map(([k, v]) =>
    encoder.encode(`${k}=${v}\0`),
  )
  let memory
  let staged = new Uint8Array(0)
  const view = () => new DataView(memory.buffer)
  const bytes = (ptr, len) => new Uint8Array(memory.buffer, ptr >>> 0, len)
  const u32 = (ptr, v) => view().setUint32(ptr >>> 0, v, true)
  const text = (ptr, len) => decoder.decode(bytes(ptr, len))
  const splitNul = (ptr, len) => {
    const b = bytes(ptr, len)
    const i = b.indexOf(0)
    return [
      decoder.decode(bytes(ptr, i < 0 ? len : i)),
      b.slice(i < 0 ? len : i + 1),
    ]
  }
  const stage = (data) => {
    staged = typeof data === "string" ? encoder.encode(data) : data
    return staged.length
  }
  let fsCalls = 0
  const fsCall = (op, ptr, len) => {
    fsCalls++
    try {
      switch (op) {
        case OP_READ:
          return stage(fs.readFile(text(ptr, len)))
        case OP_STAT: {
          const s = fs.stat(text(ptr, len))
          return stage(`${s.kind} ${s.size} ${s.mtimeNs}`)
        }
        case OP_READ_DIR:
          return stage(
            fs
              .readDir(text(ptr, len))
              .map(([k, n]) => `${k}${n}\0`)
              .join(""),
          )
        case OP_REALPATH:
          return stage(fs.realpath(text(ptr, len)))
        case OP_WRITE:
        case OP_APPEND: {
          const [p, d] = splitNul(ptr, len)
          fs.writeFile(p, d, op === OP_APPEND)
          return stage("")
        }
        case OP_REMOVE:
          fs.remove(text(ptr, len))
          return stage("")
        case OP_CHTIMES:
          return stage("")
        default:
          return -2 - stage(`unknown op ${op}`)
      }
    } catch (e) {
      if (e instanceof NotFoundError) return -1
      return -2 - stage(String(e?.message ?? e))
    }
  }
  let stderrBuf = ""
  const wasi = {
    environ_sizes_get(count, size) {
      u32(count, env.length)
      u32(
        size,
        env.reduce((n, e) => n + e.length, 0),
      )
      return ESUCCESS
    },
    environ_get(ptrs, buf) {
      let p = buf >>> 0
      env.forEach((e, i) => {
        u32(ptrs + i * 4, p)
        bytes(p, e.length).set(e)
        p += e.length
      })
      return ESUCCESS
    },
    clock_time_get(id, _precision, out) {
      const ms =
        id === 0
          ? performance.timeOrigin + performance.now()
          : performance.now()
      view().setBigUint64(out >>> 0, BigInt(Math.round(ms * 1e6)), true)
      return ESUCCESS
    },
    random_get(ptr, len) {
      for (let o = 0; o < len; o += 65536)
        crypto.getRandomValues(bytes(ptr + o, Math.min(65536, len - o)))
      return ESUCCESS
    },
    fd_write(fd, iovs, count, written) {
      if (fd !== 1 && fd !== 2) return EBADF
      let total = 0
      for (let i = 0; i < count; i++) {
        const ptr = view().getUint32(iovs + i * 8, true),
          len = view().getUint32(iovs + i * 8 + 4, true)
        stderrBuf += decoder.decode(bytes(ptr, len))
        total += len
      }
      let nl
      while ((nl = stderrBuf.indexOf("\n")) >= 0) {
        stderr(stderrBuf.slice(0, nl))
        stderrBuf = stderrBuf.slice(nl + 1)
      }
      u32(written, total)
      return ESUCCESS
    },
    fd_fdstat_get(fd, out) {
      if (fd > 2) return EBADF
      bytes(out, 24).fill(0)
      return ESUCCESS
    },
    fd_prestat_get: () => EBADF,
    fd_prestat_dir_name: () => EBADF,
    fd_close: () => EBADF,
    proc_exit(code) {
      throw new WasiExit(code)
    },
    sched_yield: () => ESUCCESS,
    poll_oneoff: () => ESUCCESS,
  }
  const imports = {
    tsrs_host: {
      fs: fsCall,
      fs_take: (ptr) => bytes(ptr, staged.length).set(staged),
    },
    wasi_snapshot_preview1: {},
  }
  for (const imp of WebAssembly.Module.imports(module)) {
    if (imp.module === "wasi_snapshot_preview1")
      imports.wasi_snapshot_preview1[imp.name] =
        wasi[imp.name] ?? (() => ENOSYS)
  }
  const instance = await WebAssembly.instantiate(module, imports)
  memory = instance.exports.memory
  const ex = instance.exports
  let dead = null

  const guard = (f) => {
    if (dead) throw dead
    try {
      return f()
    } catch (e) {
      if (e instanceof WasiExit || isTrap(e)) {
        dead = new Error(
          `tsrs-lsp: the instance is gone (${e.name}: ${e.message}); start a new one`,
        )
        dead.cause = e
        throw dead
      }
      throw e
    }
  }
  const input = (data) => {
    const b = typeof data === "string" ? encoder.encode(data) : data
    const ptr = ex.lsp_input(b.length)
    bytes(ptr, b.length).set(b)
  }
  const drain = () => {
    const ptr = ex.lsp_output()
    const len = ex.lsp_output_len()
    if (len === 0) return []
    return decoder
      .decode(bytes(ptr, len))
      .split("\n")
      .filter((s) => s.length > 0)
  }
  guard(() => {
    ex._initialize?.()
    input(options.cwd ?? "/")
    const status = ex.lsp_init(0)
    if (status !== 0) throw new Error(`lsp_init failed: ${status}`)
  })
  let status = 0
  return {
    fs,
    get status() {
      return status
    },
    get fsCalls() {
      return fsCalls
    },
    send(json) {
      return guard(() => {
        input(json)
        status = ex.lsp_message()
        return drain()
      })
    },
    tick() {
      return guard(() => {
        status = ex.lsp_tick()
        return drain()
      })
    },
    nextTimerMs: () => guard(() => Number(ex.lsp_next_timer_ms())),
    memoryBytes: () => memory.buffer.byteLength,
    get dead() {
      return dead
    },
  }
}
