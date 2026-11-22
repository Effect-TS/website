// Minimal WASI preview 1 + wasi-threads host shared by the Node and browser harnesses.
//
// Every wasm thread runs in its own JS worker. All state the threads must agree on lives in SharedArrayBuffers:
//   memory     the module's shared linear memory
//   fsBytes    a read-only file system image (all file contents back to back); `fsIndex` lists [path, offset, len]
//   fdTable    the process-wide fd table: per fd Int32 [kind, inode, position, spare]
//   stdin      a byte ring the embedder fills: Int32 [write, read, closed, spare] then STDIN_CAP bytes
//   pool       the thread pool's slots: per slot Int32 [state, tid, startArg, spare]; slot 0 header [nextTid, size]
//
// The file system is read-only: writes return EROFS. stdout and stderr go to `write(fd, bytes)`.

export const STDIN_CAP = 1 << 20
export const MAX_FD = 4096
const FD_FREE = 0,
  FD_FILE = 1,
  FD_DIR = 2,
  FD_STDIO = 3,
  FD_BUSY = -1
export const SLOT_IDLE = 0,
  SLOT_START = 1,
  SLOT_RUNNING = 2,
  SLOT_MAIN = 3

const E = {
  SUCCESS: 0,
  ACCES: 2,
  AGAIN: 6,
  BADF: 8,
  EXIST: 20,
  INVAL: 28,
  IO: 29,
  ISDIR: 31,
  MFILE: 33,
  NOENT: 44,
  NOSYS: 52,
  NOTDIR: 54,
  NOTEMPTY: 55,
  NOTSUP: 58,
  ROFS: 68,
  SPIPE: 69,
}
const FT = { UNKNOWN: 0, CHAR: 2, DIR: 3, REG: 4 }
const ALL_RIGHTS = 0xffffffffffffffffn

export function makeShared({ files, poolSize }) {
  // files: Array<[path, Uint8Array]>
  let total = 0
  for (const [, b] of files) total += b.length
  const fsBytes = new SharedArrayBuffer(total)
  const u8 = new Uint8Array(fsBytes)
  const fsIndex = []
  let off = 0
  for (const [p, b] of files) {
    u8.set(b, off)
    fsIndex.push([p, off, b.length])
    off += b.length
  }
  const fdTable = new SharedArrayBuffer(MAX_FD * 16)
  const fd = new Int32Array(fdTable)
  for (let i = 0; i < 3; i++) fd[i * 4] = FD_STDIO
  fd[3 * 4] = FD_DIR // preopen "/", inode filled in by every thread's index (root is always inode 0)
  fd[3 * 4 + 1] = 0
  const stdin = new SharedArrayBuffer(16 + STDIN_CAP)
  const pool = new SharedArrayBuffer((poolSize + 1) * 16)
  const p = new Int32Array(pool)
  p[0] = 1 // next tid
  p[1] = poolSize
  return { fsBytes, fsIndex, fdTable, stdin, pool }
}

// Embedder side: append bytes to the stdin ring (blocks the caller only if the ring is full, which it never is here).
export function stdinPush(stdinSab, bytes) {
  const h = new Int32Array(stdinSab, 0, 4)
  const data = new Uint8Array(stdinSab, 16)
  let w = Atomics.load(h, 0)
  for (let i = 0; i < bytes.length; i++) {
    data[w % STDIN_CAP] = bytes[i]
    w++
  }
  Atomics.store(h, 0, w)
  Atomics.notify(h, 0)
}
export function stdinClose(stdinSab) {
  const h = new Int32Array(stdinSab, 0, 4)
  Atomics.store(h, 2, 1)
  Atomics.add(h, 0, 0)
  Atomics.notify(h, 0)
}

function buildTree(fsIndex) {
  // inode 0 = "/"; directories and files get inodes in discovery order.
  const nodes = [{ path: "/", dir: true, children: new Map() }]
  const byPath = new Map([["/", 0]])
  const ensureDir = (path) => {
    if (byPath.has(path)) return byPath.get(path)
    const parent = path.slice(0, path.lastIndexOf("/")) || "/"
    const pi = ensureDir(parent)
    const ino = nodes.length
    nodes.push({ path, dir: true, children: new Map() })
    byPath.set(path, ino)
    nodes[pi].children.set(path.slice(path.lastIndexOf("/") + 1), ino)
    return ino
  }
  for (const [path, off, len] of fsIndex) {
    const parent = path.slice(0, path.lastIndexOf("/")) || "/"
    const pi = ensureDir(parent)
    const ino = nodes.length
    nodes.push({ path, dir: false, off, len })
    byPath.set(path, ino)
    nodes[pi].children.set(path.slice(path.lastIndexOf("/") + 1), ino)
  }
  for (const n of nodes) if (n.dir) n.list = [...n.children.entries()]
  return { nodes, byPath }
}

function normalize(base, rel) {
  const parts = (rel.startsWith("/") ? rel : base + "/" + rel).split("/")
  const out = []
  for (const p of parts) {
    if (p === "" || p === ".") continue
    if (p === "..") out.pop()
    else out.push(p)
  }
  return "/" + out.join("/")
}

// Returns { imports, setInstance, stats }.
// opts: { memory, shared, args, env, write(fd, Uint8Array), exit(code), threadSpawn(arg) -> tid|-errno, log }
export function createWasi(opts) {
  const { memory, shared, args, env } = opts
  const tree = buildTree(shared.fsIndex)
  const fsU8 = new Uint8Array(shared.fsBytes)
  const fd = new Int32Array(shared.fdTable)
  const stdinH = new Int32Array(shared.stdin, 0, 4)
  const stdinData = new Uint8Array(shared.stdin, 16)
  const sleeper = new Int32Array(new SharedArrayBuffer(4))
  const enc = new TextEncoder()
  const dec = new TextDecoder()
  const argBytes = args.map((a) => enc.encode(a + "\0"))
  const envBytes = Object.entries(env).map(([k, v]) =>
    enc.encode(`${k}=${v}\0`),
  )
  const stats = { calls: Object.create(null) }
  let dv, u8
  const view = () => {
    if (!dv || dv.buffer.byteLength !== memory.buffer.byteLength) {
      dv = new DataView(memory.buffer)
      u8 = new Uint8Array(memory.buffer)
    }
  }
  const str = (ptr, len) => {
    view()
    return dec.decode(u8.slice(ptr, ptr + len))
  }
  const fdKind = (n) =>
    n >= 0 && n < MAX_FD ? Atomics.load(fd, n * 4) : FD_FREE
  const allocFd = (kind, ino) => {
    for (let n = 4; n < MAX_FD; n++) {
      if (Atomics.compareExchange(fd, n * 4, FD_FREE, FD_BUSY) === FD_FREE) {
        fd[n * 4 + 1] = ino
        Atomics.store(fd, n * 4 + 2, 0)
        Atomics.store(fd, n * 4, kind)
        return n
      }
    }
    return -1
  }
  const resolve = (dirfd, ptr, len) => {
    const k = fdKind(dirfd)
    if (k !== FD_DIR) return { err: k === FD_FREE ? E.BADF : E.NOTDIR }
    const base = tree.nodes[fd[dirfd * 4 + 1]].path
    const path = normalize(base === "/" ? "" : base, str(ptr, len))
    return { path, ino: tree.byPath.get(path) }
  }
  const writeFilestat = (ptr, ino, ft) => {
    view()
    const n = ino === undefined ? null : tree.nodes[ino]
    dv.setBigUint64(ptr, 1n, true)
    dv.setBigUint64(ptr + 8, BigInt(ino ?? 0) + 1n, true)
    dv.setUint8(ptr + 16, ft ?? (n.dir ? FT.DIR : FT.REG))
    dv.setBigUint64(ptr + 24, 1n, true)
    dv.setBigUint64(ptr + 32, BigInt(n && !n.dir ? n.len : 0), true)
    const t = 1700000000000000000n
    dv.setBigUint64(ptr + 40, t, true)
    dv.setBigUint64(ptr + 48, t, true)
    dv.setBigUint64(ptr + 56, t, true)
  }
  const nowNs = (id) => {
    const ms = performance.timeOrigin + performance.now()
    return BigInt(Math.round(ms * 1e6))
  }
  const count = (name) => {
    stats.calls[name] = (stats.calls[name] ?? 0) + 1
  }

  const w = {
    args_sizes_get(argc, bufSize) {
      view()
      dv.setUint32(argc, argBytes.length, true)
      dv.setUint32(
        bufSize,
        argBytes.reduce((a, b) => a + b.length, 0),
        true,
      )
      return 0
    },
    args_get(argv, buf) {
      view()
      for (const b of argBytes) {
        dv.setUint32(argv, buf, true)
        u8.set(b, buf)
        argv += 4
        buf += b.length
      }
      return 0
    },
    environ_sizes_get(c, s) {
      view()
      dv.setUint32(c, envBytes.length, true)
      dv.setUint32(
        s,
        envBytes.reduce((a, b) => a + b.length, 0),
        true,
      )
      return 0
    },
    environ_get(envp, buf) {
      view()
      for (const b of envBytes) {
        dv.setUint32(envp, buf, true)
        u8.set(b, buf)
        envp += 4
        buf += b.length
      }
      return 0
    },
    clock_time_get(id, _precision, out) {
      view()
      dv.setBigUint64(out, nowNs(id), true)
      return 0
    },
    clock_res_get(_id, out) {
      view()
      dv.setBigUint64(out, 1000n, true)
      return 0
    },
    random_get(ptr, len) {
      view()
      const tmp = new Uint8Array(len)
      for (let i = 0; i < len; i += 65536)
        crypto.getRandomValues(tmp.subarray(i, Math.min(len, i + 65536)))
      u8.set(tmp, ptr)
      return 0
    },
    sched_yield() {
      return 0
    },
    proc_exit(code) {
      opts.exit(code)
      throw new WasiExit(code)
    },
    fd_close(n) {
      const k = fdKind(n)
      if (k === FD_FREE) return E.BADF
      if (k === FD_STDIO || n === 3) return 0
      Atomics.store(fd, n * 4, FD_FREE)
      return 0
    },
    fd_fdstat_get(n, ptr) {
      const k = fdKind(n)
      if (k === FD_FREE) return E.BADF
      view()
      dv.setUint8(
        ptr,
        k === FD_STDIO ? FT.CHAR : k === FD_DIR ? FT.DIR : FT.REG,
      )
      dv.setUint16(ptr + 2, 0, true)
      dv.setBigUint64(ptr + 8, ALL_RIGHTS, true)
      dv.setBigUint64(ptr + 16, ALL_RIGHTS, true)
      return 0
    },
    fd_fdstat_set_flags() {
      return 0
    },
    fd_filestat_get(n, ptr) {
      const k = fdKind(n)
      if (k === FD_FREE) return E.BADF
      if (k === FD_STDIO) {
        writeFilestat(ptr, undefined, FT.CHAR)
        return 0
      }
      writeFilestat(ptr, fd[n * 4 + 1])
      return 0
    },
    fd_filestat_set_times() {
      return E.ROFS
    },
    fd_prestat_get(n, ptr) {
      if (n !== 3) return E.BADF
      view()
      dv.setUint8(ptr, 0)
      dv.setUint32(ptr + 4, 1, true)
      return 0
    },
    fd_prestat_dir_name(n, ptr, len) {
      if (n !== 3) return E.BADF
      view()
      u8[ptr] = 47
      return 0
    },
    fd_read(n, iovs, iovsLen, nread) {
      const k = fdKind(n)
      view()
      if (n === 0) {
        // Block until at least one byte is available (or stdin is closed), then copy what fits.
        let r = Atomics.load(stdinH, 1),
          wr
        for (;;) {
          wr = Atomics.load(stdinH, 0)
          if (wr !== r) break
          if (Atomics.load(stdinH, 2)) {
            dv.setUint32(nread, 0, true)
            return 0
          }
          Atomics.wait(stdinH, 0, wr)
        }
        let total = 0
        for (let i = 0; i < iovsLen && r !== wr; i++) {
          const p = dv.getUint32(iovs + i * 8, true),
            l = dv.getUint32(iovs + i * 8 + 4, true)
          let j = 0
          for (; j < l && r !== wr; j++, r++)
            u8[p + j] = stdinData[r % STDIN_CAP]
          total += j
        }
        Atomics.store(stdinH, 1, r)
        dv.setUint32(nread, total, true)
        return 0
      }
      if (k === FD_DIR) return E.ISDIR
      if (k !== FD_FILE) return E.BADF
      const node = tree.nodes[fd[n * 4 + 1]]
      let pos = Atomics.load(fd, n * 4 + 2)
      let total = 0
      for (let i = 0; i < iovsLen; i++) {
        const p = dv.getUint32(iovs + i * 8, true),
          l = dv.getUint32(iovs + i * 8 + 4, true)
        const m = Math.min(l, node.len - pos)
        if (m <= 0) break
        u8.set(fsU8.subarray(node.off + pos, node.off + pos + m), p)
        pos += m
        total += m
      }
      Atomics.store(fd, n * 4 + 2, pos)
      dv.setUint32(nread, total, true)
      return 0
    },
    fd_pread(n, iovs, iovsLen, offset, nread) {
      if (fdKind(n) !== FD_FILE) return E.BADF
      view()
      const node = tree.nodes[fd[n * 4 + 1]]
      let pos = Number(offset),
        total = 0
      for (let i = 0; i < iovsLen; i++) {
        const p = dv.getUint32(iovs + i * 8, true),
          l = dv.getUint32(iovs + i * 8 + 4, true)
        const m = Math.min(l, node.len - pos)
        if (m <= 0) break
        u8.set(fsU8.subarray(node.off + pos, node.off + pos + m), p)
        pos += m
        total += m
      }
      dv.setUint32(nread, total, true)
      return 0
    },
    fd_seek(n, offset, whence, out) {
      if (fdKind(n) !== FD_FILE) return n < 3 ? E.SPIPE : E.BADF
      const node = tree.nodes[fd[n * 4 + 1]]
      const cur = Atomics.load(fd, n * 4 + 2)
      const pos =
        whence === 0
          ? Number(offset)
          : whence === 1
            ? cur + Number(offset)
            : node.len + Number(offset)
      Atomics.store(fd, n * 4 + 2, pos)
      view()
      dv.setBigUint64(out, BigInt(pos), true)
      return 0
    },
    fd_tell(n, out) {
      view()
      dv.setBigUint64(out, BigInt(Atomics.load(fd, n * 4 + 2)), true)
      return 0
    },
    fd_write(n, iovs, iovsLen, nwritten) {
      if (n !== 1 && n !== 2) return fdKind(n) === FD_FREE ? E.BADF : E.ROFS
      view()
      let total = 0
      const parts = []
      for (let i = 0; i < iovsLen; i++) {
        const p = dv.getUint32(iovs + i * 8, true),
          l = dv.getUint32(iovs + i * 8 + 4, true)
        parts.push(u8.slice(p, p + l))
        total += l
      }
      const out =
        parts.length === 1
          ? parts[0]
          : (() => {
              const b = new Uint8Array(total)
              let o = 0
              for (const x of parts) {
                b.set(x, o)
                o += x.length
              }
              return b
            })()
      opts.write(n, out)
      dv.setUint32(nwritten, total, true)
      return 0
    },
    fd_sync() {
      return 0
    },
    fd_datasync() {
      return 0
    },
    fd_readdir(n, buf, bufLen, cookie, usedPtr) {
      if (fdKind(n) !== FD_DIR) return E.NOTDIR
      view()
      const node = tree.nodes[fd[n * 4 + 1]]
      const list = [[".", fd[n * 4 + 1]], ["..", fd[n * 4 + 1]], ...node.list]
      let used = 0
      for (let i = Number(cookie); i < list.length; i++) {
        const [name, ino] = list[i]
        const nameB = enc.encode(name)
        const hdr = new DataView(new ArrayBuffer(24))
        hdr.setBigUint64(0, BigInt(i + 1), true)
        hdr.setBigUint64(8, BigInt(ino + 1), true)
        hdr.setUint32(16, nameB.length, true)
        hdr.setUint8(20, tree.nodes[ino].dir ? FT.DIR : FT.REG)
        const ent = new Uint8Array(24 + nameB.length)
        ent.set(new Uint8Array(hdr.buffer), 0)
        ent.set(nameB, 24)
        const m = Math.min(ent.length, bufLen - used)
        u8.set(ent.subarray(0, m), buf + used)
        used += m
        if (used >= bufLen) break
      }
      dv.setUint32(usedPtr, used, true)
      return 0
    },
    path_open(dirfd, _dirflags, ptr, len, oflags, _rb, _ri, _fdflags, out) {
      const r = resolve(dirfd, ptr, len)
      if (r.err) return r.err
      count("path_open")
      if (r.ino === undefined) return oflags & 1 ? E.ROFS : E.NOENT
      if (oflags & (1 | 8)) return E.ROFS
      const node = tree.nodes[r.ino]
      if (oflags & 2 && !node.dir) return E.NOTDIR
      const n = allocFd(node.dir ? FD_DIR : FD_FILE, r.ino)
      if (n < 0) return E.MFILE
      view()
      dv.setUint32(out, n, true)
      return 0
    },
    path_filestat_get(dirfd, _flags, ptr, len, out) {
      const r = resolve(dirfd, ptr, len)
      if (r.err) return r.err
      count("path_filestat_get")
      if (r.ino === undefined) return E.NOENT
      writeFilestat(out, r.ino)
      return 0
    },
    path_filestat_set_times() {
      return E.ROFS
    },
    path_readlink(dirfd, ptr, len) {
      const r = resolve(dirfd, ptr, len)
      if (r.err) return r.err
      return r.ino === undefined ? E.NOENT : E.INVAL
    },
    path_create_directory() {
      return E.ROFS
    },
    path_remove_directory() {
      return E.ROFS
    },
    path_unlink_file() {
      return E.ROFS
    },
    path_rename() {
      return E.ROFS
    },
    path_symlink() {
      return E.ROFS
    },
    path_link() {
      return E.ROFS
    },
    poll_oneoff(inPtr, outPtr, nsubs, neventsPtr) {
      view()
      // Only clock subscriptions block; fd subscriptions are reported ready at once.
      let minNs = null,
        minIdx = -1,
        ready = []
      for (let i = 0; i < nsubs; i++) {
        const s = inPtr + i * 48
        const tag = dv.getUint8(s + 8)
        if (tag === 0) {
          let t = dv.getBigUint64(s + 24, true)
          if (dv.getUint16(s + 40, true) & 1) t = t - nowNs(1)
          if (minNs === null || t < minNs) {
            minNs = t
            minIdx = i
          }
        } else ready.push(i)
      }
      if (ready.length === 0 && minIdx >= 0) {
        const ms = Number(minNs) / 1e6
        if (ms > 0) Atomics.wait(sleeper, 0, 0, ms)
        ready = [minIdx]
      }
      for (let k = 0; k < ready.length; k++) {
        const s = inPtr + ready[k] * 48,
          e = outPtr + k * 32
        dv.setBigUint64(e, dv.getBigUint64(s, true), true)
        dv.setUint16(e + 8, 0, true)
        dv.setUint8(e + 10, dv.getUint8(s + 8))
        dv.setBigUint64(e + 16, 0n, true)
        dv.setUint16(e + 24, 0, true)
      }
      dv.setUint32(neventsPtr, ready.length, true)
      return 0
    },
    sock_accept() {
      return E.NOSYS
    },
    sock_recv() {
      return E.NOSYS
    },
    sock_send() {
      return E.NOSYS
    },
    sock_shutdown() {
      return E.NOSYS
    },
    fd_advise() {
      return 0
    },
    fd_allocate() {
      return E.ROFS
    },
    fd_filestat_set_size() {
      return E.ROFS
    },
    fd_pwrite() {
      return E.ROFS
    },
    fd_renumber() {
      return E.NOSYS
    },
    proc_raise() {
      return E.NOSYS
    },
  }
  const imports = {
    env: { memory },
    wasi_snapshot_preview1: w,
    wasi: { "thread-spawn": (arg) => opts.threadSpawn(arg) },
  }
  return { imports, stats }
}

export class WasiExit extends Error {
  constructor(code) {
    super(`exit ${code}`)
    this.code = code
  }
}

// Reads the memory import's limits from the module bytes (the JS API does not expose them).
export function memoryImportLimits(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let i = 8
  const leb = () => {
    let r = 0,
      s = 0,
      x
    do {
      x = b[i++]
      r += (x & 127) * 2 ** s
      s += 7
    } while (x & 128)
    return r
  }
  while (i < b.length) {
    const id = b[i++],
      size = leb(),
      end = i + size
    if (id === 2) {
      const n = leb()
      for (let k = 0; k < n; k++) {
        const modLen = leb()
        i += modLen // module name
        const fieldLen = leb()
        i += fieldLen // field name
        const kind = b[i++]
        if (kind === 2) {
          const flags = b[i++]
          const min = leb()
          const max = flags & 1 ? leb() : undefined
          return { min, max, shared: !!(flags & 2) }
        }
        if (kind === 0) leb()
        else if (kind === 1) {
          i++
          const f = b[i++]
          leb()
          if (f & 1) leb()
        } else if (kind === 3) {
          i += 2
        } else if (kind === 4) {
          i++
          leb()
        }
      }
    }
    i = end
  }
  return null
}
