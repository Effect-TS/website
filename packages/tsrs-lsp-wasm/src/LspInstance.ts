/**
 * One instance of the language server module: a small WASI preview1 shim (clocks, random, stdout/stderr, environ,
 * proc_exit; no WASI file system), the `tsrs_host.fs` bridge over a MemoryFileSystem (the protocol of tsrs's
 * crates/tsrs_wasm/src/host.rs), and the message pump (`lsp_message`, `lsp_tick`, `lsp_next_timer_ms`).
 *
 * A trap (panic = abort, `unreachable`, an engine stack overflow, out of memory, `proc_exit`) leaves the instance
 * unusable: every later call throws LspInstanceDiedError. RecoveringServer replaces dead instances.
 *
 * Runtime-agnostic: no Node built-ins.
 */
import { FileNotFoundError, type MemoryFileSystem } from "./MemoryFileSystem.ts"

/** `lsp_message` / `lsp_tick` results. */
export const PumpStatus = {
  /** Nothing queued. */
  Idle: 0,
  /** The server handled `exit`. */
  Exited: 1,
  /** A message could not be read (stderr has the reason). */
  ReadError: 2,
  /** Background tasks are queued: call `tick` when idle. */
  Pending: 3,
} as const
export type PumpStatus = (typeof PumpStatus)[keyof typeof PumpStatus]

const OP_READ = 0
const OP_STAT = 1
const OP_READ_DIR = 2
const OP_REALPATH = 3
const OP_WRITE = 4
const OP_APPEND = 5
const OP_REMOVE = 6
const OP_CHTIMES = 7

const ESUCCESS = 0
const EBADF = 8
const ENOSYS = 52

const encoder = new TextEncoder()
const decoder = new TextDecoder("utf-8", { ignoreBOM: true })

/** Thrown by `proc_exit`. */
export class WasiExit extends Error {
  readonly code: number
  constructor(code: number) {
    super(`proc_exit(${code})`)
    this.name = "WasiExit"
    this.code = code
  }
}

/** Every call on a dead instance throws this; `cause` is the original trap. */
export class LspInstanceDiedError extends Error {
  constructor(cause: unknown) {
    const c = cause as { name?: string; message?: string } | undefined
    super(
      `tsrs-lsp: the instance is gone (${c?.name ?? "Error"}: ${c?.message ?? String(cause)})`,
      { cause },
    )
    this.name = "LspInstanceDiedError"
  }
}

/**
 * Whether an exception thrown out of the module means the instance is dead: WebAssembly.RuntimeError (panic =
 * abort, unreachable, out-of-bounds), RangeError "Maximum call stack size exceeded" (V8, JavaScriptCore),
 * InternalError "too much recursion" (SpiderMonkey), and WASI proc_exit.
 */
export const isTrap = (error: unknown): boolean => {
  if (error instanceof WasiExit) return true
  if (error instanceof WebAssembly.RuntimeError) return true
  const e = error as { name?: unknown; message?: unknown } | undefined
  if (e === undefined || e === null) return false
  if (error instanceof RangeError && /call stack/i.test(String(e.message)))
    return true
  if (e.name === "InternalError") return true
  return /too much recursion/i.test(String(e.message))
}

export interface LspInstanceOptions {
  readonly fs: MemoryFileSystem
  /** The server's working directory (`lsp_init`'s argument). Default "/". */
  readonly cwd?: string
  /** Lines the module writes to stdout or stderr. */
  readonly onStderr?: (line: string) => void
  readonly env?: Readonly<Record<string, string>>
  /** Called around every call into the module (the host uses it to tell server writes from client writes). */
  readonly onEnter?: () => void
  readonly onLeave?: () => void
}

export interface LspInstance {
  /** Handles one JSON-RPC message (no Content-Length header) to completion and returns the outgoing messages. */
  readonly send: (message: string) => Array<string>
  /** Runs queued background tasks and due timers; returns the outgoing messages. */
  readonly tick: () => Array<string>
  /** The status of the last `send` or `tick`. */
  readonly status: PumpStatus
  /** Milliseconds until the next server timer, or -1 when none is pending. */
  readonly nextTimerMs: () => number
  readonly memoryBytes: () => number
  /** Set once the instance trapped. */
  readonly dead: LspInstanceDiedError | undefined
}

/** Instantiates the compiled module and runs `lsp_init`. */
export const instantiateLspInstance = async (
  module: WebAssembly.Module,
  options: LspInstanceOptions,
): Promise<LspInstance> => {
  const fs = options.fs
  const onStderr = options.onStderr ?? (() => {})
  const env = Object.entries(options.env ?? {}).map(([k, v]) =>
    encoder.encode(`${k}=${v}\0`),
  )
  const onEnter = options.onEnter ?? (() => {})
  const onLeave = options.onLeave ?? (() => {})

  let memory: WebAssembly.Memory | undefined
  let staged: Uint8Array = new Uint8Array(0)
  const mem = () => memory!.buffer
  const view = () => new DataView(mem())
  const bytes = (ptr: number, len: number) =>
    new Uint8Array(mem(), ptr >>> 0, len >>> 0)
  const setU32 = (ptr: number, v: number) =>
    view().setUint32(ptr >>> 0, v, true)
  const text = (ptr: number, len: number) => decoder.decode(bytes(ptr, len))
  const stage = (data: Uint8Array | string) => {
    staged = typeof data === "string" ? encoder.encode(data) : data
    return staged.length
  }
  const splitNul = (ptr: number, len: number): [string, Uint8Array] => {
    const b = bytes(ptr, len)
    const i = b.indexOf(0)
    const end = i < 0 ? len : i
    return [decoder.decode(b.subarray(0, end)), b.slice(i < 0 ? len : i + 1)]
  }

  // tsrs_host.fs(op, ptr, len) -> n >= 0: the reply has n bytes, fetched with fs_take; -1: not found;
  // -2 - n: an error whose n-byte message is staged.
  const fsCall = (op: number, ptr: number, len: number): number => {
    try {
      switch (op) {
        case OP_READ:
          return stage(fs.readFile(text(ptr, len)))
        case OP_STAT: {
          const s = fs.stat(text(ptr, len))
          return stage(
            `${s.kind === "file" ? "f" : "d"} ${s.size} ${s.mtimeNs}`,
          )
        }
        case OP_READ_DIR:
          return stage(
            fs
              .readDirectory(text(ptr, len))
              .map((e) => `${e.kind === "file" ? "f" : "d"}${e.name}\0`)
              .join(""),
          )
        case OP_REALPATH:
          return stage(fs.realpath(text(ptr, len)))
        case OP_WRITE:
        case OP_APPEND: {
          const [path, data] = splitNul(ptr, len)
          if (op === OP_APPEND) fs.appendFile(path, data)
          else fs.writeFile(path, data)
          return stage("")
        }
        case OP_REMOVE:
          fs.remove(text(ptr, len))
          return stage("")
        case OP_CHTIMES:
          return stage("")
        default:
          return -2 - stage(`unknown fs op ${op}`)
      }
    } catch (error) {
      if (error instanceof FileNotFoundError) return -1
      return -2 - stage(String((error as Error)?.message ?? error))
    }
  }

  let output = ""
  const wasi: Record<string, (...args: Array<number>) => number> = {
    environ_sizes_get(count, size) {
      setU32(count!, env.length)
      setU32(
        size!,
        env.reduce((n, e) => n + e.length, 0),
      )
      return ESUCCESS
    },
    environ_get(ptrs, buf) {
      let p = buf! >>> 0
      env.forEach((e, i) => {
        setU32(ptrs! + i * 4, p)
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
      view().setBigUint64(out! >>> 0, BigInt(Math.round(ms * 1e6)), true)
      return ESUCCESS
    },
    clock_res_get(_id, out) {
      view().setBigUint64(out! >>> 0, 1000n, true)
      return ESUCCESS
    },
    random_get(ptr, len) {
      for (let o = 0; o < len!; o += 65536) {
        crypto.getRandomValues(bytes(ptr! + o, Math.min(65536, len! - o)))
      }
      return ESUCCESS
    },
    fd_write(fd, iovs, count, written) {
      if (fd !== 1 && fd !== 2) return EBADF
      let total = 0
      for (let i = 0; i < count!; i++) {
        const ptr = view().getUint32(iovs! + i * 8, true)
        const len = view().getUint32(iovs! + i * 8 + 4, true)
        output += decoder.decode(bytes(ptr, len))
        total += len
      }
      let nl: number
      while ((nl = output.indexOf("\n")) >= 0) {
        onStderr(output.slice(0, nl))
        output = output.slice(nl + 1)
      }
      setU32(written!, total)
      return ESUCCESS
    },
    fd_fdstat_get(fd, out) {
      if (fd! > 2) return EBADF
      bytes(out!, 24).fill(0)
      return ESUCCESS
    },
    fd_prestat_get: () => EBADF,
    fd_prestat_dir_name: () => EBADF,
    fd_close: () => EBADF,
    proc_exit(code) {
      throw new WasiExit(code!)
    },
    sched_yield: () => ESUCCESS,
    poll_oneoff: () => ESUCCESS,
  }

  const wasiImports: Record<string, (...args: Array<number>) => number> = {}
  for (const imp of WebAssembly.Module.imports(module)) {
    if (imp.module === "wasi_snapshot_preview1")
      wasiImports[imp.name] = wasi[imp.name] ?? (() => ENOSYS)
  }
  const instance = await WebAssembly.instantiate(module, {
    tsrs_host: {
      fs: fsCall,
      fs_take: (ptr: number) => bytes(ptr, staged.length).set(staged),
    },
    wasi_snapshot_preview1: wasiImports,
  })
  const ex = instance.exports as unknown as {
    readonly memory: WebAssembly.Memory
    readonly _initialize?: () => void
    readonly lsp_input: (len: number) => number
    readonly lsp_init: (flags: number) => number
    readonly lsp_message: () => number
    readonly lsp_tick: () => number
    readonly lsp_next_timer_ms: () => bigint
    readonly lsp_output: () => number
    readonly lsp_output_len: () => number
  }
  memory = ex.memory

  let dead: LspInstanceDiedError | undefined
  let status: PumpStatus = PumpStatus.Idle

  const guard = <A>(f: () => A): A => {
    if (dead !== undefined) throw dead
    onEnter()
    try {
      return f()
    } catch (error) {
      if (isTrap(error)) {
        dead = new LspInstanceDiedError(error)
        throw dead
      }
      throw error
    } finally {
      onLeave()
    }
  }
  const input = (data: string) => {
    const b = encoder.encode(data)
    const ptr = ex.lsp_input(b.length)
    bytes(ptr, b.length).set(b)
  }
  const drain = (): Array<string> => {
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
    const result = ex.lsp_init(0)
    if (result !== 0)
      throw new Error(`tsrs-lsp: lsp_init failed with status ${result}`)
  })

  return {
    send: (message) =>
      guard(() => {
        input(message)
        status = ex.lsp_message() as PumpStatus
        return drain()
      }),
    tick: () =>
      guard(() => {
        status = ex.lsp_tick() as PumpStatus
        return drain()
      }),
    get status() {
      return status
    },
    nextTimerMs: () => guard(() => Number(ex.lsp_next_timer_ms())),
    memoryBytes: () => memory!.buffer.byteLength,
    get dead() {
      return dead
    },
  }
}
