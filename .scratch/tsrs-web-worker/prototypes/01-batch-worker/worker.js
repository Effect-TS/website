// Diagnostics-only LSP shim over the stock @tsrs/wasm batch `tsc`, running in a dedicated module Web Worker.
// Wire format: every message in either direction is a bare JSON-RPC string (what @codemirror/lsp-client's
// Transport sends and receives), carried by postMessage.
//
// Options come in `initialize` params.initializationOptions (see DEFAULTS). Extra non-standard traffic:
//   notification $/tsrs/timing   worker -> page, one per check (published or discarded as stale)
//   request      $/tsrs/checkFiles {files, args?}  one-off check over the Effect pack plus `files` (stress tests)
import {
  makeRequest,
  NotFoundError,
  parseReply,
  runTscAsync,
} from "/artifacts/tsrs/core.js"
import { tsc as stockTsc } from "/artifacts/tsrs/browser.js"

const WASM_URL = "/artifacts/tsrs/tsrs.wasm"
const DEFAULTS = {
  compile: "streaming", // "streaming" | "arraybuffer": how the worker compiles the module at startup
  module: "precompiled", // "precompiled" (pass `module`) | "stock" (let browser.js fetch+cache it) | "compileEachCall"
  fs: "custom", // "strings" | "bytes" (stock tsc over a files record) | "custom" (runTscAsync + indexed HostFileSystem)
  pack: "bin", // "bin" | "json"
  fast: false, // TSRS_FAST=1
  incremental: false, // --incremental with .tsbuildinfo fed back
  mtimes: true, // custom fs only: bump a file's mtime when it changes (stock memoryFileSystem reports 0 for all)
  lib: null, // e.g. ["ES2022"] to drop lib.dom (not what the website's tsconfig does)
  debounceMs: 150,
}
const TSCONFIG_PATH = "/p/tsconfig.json"
const encoder = new TextEncoder()
const decoder = new TextDecoder()
const now = () => performance.now()

let opts = { ...DEFAULTS }
let module // WebAssembly.Module
let pack // { bytes: Map<path, Uint8Array>, strings: Record<path, string> | null }
let ready
const startup = {}
const docs = new Map() // path -> { uri, text, version, lineStarts }
const published = new Set() // paths that currently have non-empty diagnostics on the client
let written = new Map() // incremental outputs fed back next call: path -> Uint8Array
let mtimeCounter = 1n
const mtimes = new Map()
let checkSeq = 0

const send = (msg) => postMessage(JSON.stringify({ jsonrpc: "2.0", ...msg }))
const notify = (method, params) => send({ method, params })

// ---------- loading ----------

async function load() {
  const t0 = now()
  if (opts.compile === "streaming") {
    module = await WebAssembly.compileStreaming(fetch(WASM_URL))
    startup.wasmFetchCompileMs = now() - t0
  } else {
    const buf = await (await fetch(WASM_URL)).arrayBuffer()
    startup.wasmFetchMs = now() - t0
    const t1 = now()
    module = await WebAssembly.compile(buf)
    startup.wasmCompileMs = now() - t1
    startup.wasmFetchCompileMs = now() - t0
  }
  const t2 = now()
  const bytes = new Map()
  let strings = null
  if (opts.pack === "json") {
    strings = await (await fetch("/artifacts/effect-pack.json")).json()
    if (opts.fs !== "strings")
      for (const [p, t] of Object.entries(strings))
        bytes.set(p, encoder.encode(t))
  } else {
    const buf = new Uint8Array(
      await (await fetch("/artifacts/effect-pack.bin")).arrayBuffer(),
    )
    const hlen = new DataView(buf.buffer).getUint32(0, true)
    const header = JSON.parse(decoder.decode(buf.subarray(4, 4 + hlen)))
    const base = 4 + hlen
    for (const [p, [off, len]] of Object.entries(header))
      bytes.set(p, buf.subarray(base + off, base + off + len))
    if (opts.fs === "strings") {
      strings = {}
      for (const [p, b] of bytes) strings[p] = decoder.decode(b)
    }
  }
  pack = { bytes, strings }
  startup.packFetchDecodeMs = now() - t2
  startup.packFiles = bytes.size
  startup.loadTotalMs = now() - t0
}

// ---------- file systems ----------

const normalize = (path) => {
  if (
    !path.includes("//") &&
    !path.includes("/.") &&
    !path.includes("\\") &&
    (path.length === 1 || !path.endsWith("/"))
  )
    return path
  const parts = []
  for (const part of path.replace(/\\/g, "/").split("/")) {
    if (part === "" || part === ".") continue
    if (part === "..") parts.pop()
    else parts.push(part)
  }
  return "/" + parts.join("/")
}

// Directory index over the Effect pack, built once; per-call overlay holds user files, tsconfig and incremental output.
let baseDirs
function dirsOf(paths, dirs = new Map()) {
  for (const p of paths) {
    let child = p,
      kind = "f"
    while (child !== "/") {
      const slash = child.lastIndexOf("/")
      const dir = slash === 0 ? "/" : child.slice(0, slash)
      let entries = dirs.get(dir)
      if (!entries) dirs.set(dir, (entries = new Map()))
      const name = child.slice(slash + 1)
      if (entries.has(name)) break
      entries.set(name, kind)
      child = dir
      kind = "d"
    }
  }
  return dirs
}

function indexedFs(overlay, counts) {
  baseDirs ??= dirsOf(pack.bytes.keys())
  // Overlay dirs: copy only the touched chain (overlay is a handful of files).
  const dirs = new Map(baseDirs)
  for (const p of overlay.keys()) {
    let child = p,
      kind = "f"
    while (child !== "/") {
      const slash = child.lastIndexOf("/")
      const dir = slash === 0 ? "/" : child.slice(0, slash)
      const entries = new Map(dirs.get(dir) ?? [])
      dirs.set(dir, entries)
      const name = child.slice(slash + 1)
      const had = entries.has(name)
      entries.set(name, kind)
      if (had) break
      child = dir
      kind = "d"
    }
  }
  const get = (p) => overlay.get(p) ?? pack.bytes.get(p)
  return {
    written: new Map(),
    readFile(path) {
      counts.read++
      const d = get(normalize(path))
      if (d === undefined) throw new NotFoundError(path)
      return d
    },
    stat(path) {
      counts.stat++
      const p = normalize(path)
      const d = get(p)
      if (d !== undefined)
        return {
          kind: "f",
          size: d.length,
          mtimeNs: opts.mtimes ? (mtimes.get(p) ?? 1n) : 0n,
        }
      if (dirs.has(p)) return { kind: "d", size: 0, mtimeNs: 0n }
      throw new NotFoundError(path)
    },
    readDir(path) {
      counts.readDir++
      const entries = dirs.get(normalize(path))
      if (!entries) throw new NotFoundError(path)
      return [...entries].map(([name, kind]) => [kind, name])
    },
    realpath: normalize,
    writeFile(path, data, append) {
      const p = normalize(path)
      const prev = append ? (get(p) ?? new Uint8Array(0)) : new Uint8Array(0)
      const next = new Uint8Array(prev.length + data.length)
      next.set(prev)
      next.set(data, prev.length)
      overlay.set(p, next)
      this.written.set(p, next)
    },
    remove(path) {
      overlay.delete(normalize(path))
    },
    chtimes() {},
  }
}

function tsconfigText() {
  const compilerOptions = {
    strict: true,
    exactOptionalPropertyTypes: true,
    noEmit: true,
    target: "ES2022",
    module: "ESNext",
    moduleResolution: "bundler",
    allowImportingTsExtensions: true,
    types: [],
    skipLibCheck: true,
    plugins: [{ name: "@effect/language-service" }],
  }
  if (opts.lib) compilerOptions.lib = opts.lib
  return JSON.stringify({
    compilerOptions,
    include: ["**/*.ts", "**/*.tsx"],
    exclude: ["node_modules"],
  })
}

// ---------- one tsc run ----------

let compileEachCallN = 0
async function runTsc(
  userFiles,
  { incremental = opts.incremental, extraArgs = [] } = {},
) {
  const timing = {}
  const t0 = now()
  const args = ["-p", TSCONFIG_PATH, "--pretty", "false", ...extraArgs]
  if (incremental)
    args.push("--incremental", "--tsBuildInfoFile", "/p/.tsbuildinfo")
  const env = opts.fast ? { TSRS_FAST: "1" } : {}
  let mod = module
  if (opts.module === "compileEachCall") {
    const tc = now()
    mod = await WebAssembly.compileStreaming(
      fetch(`${WASM_URL}?n=${++compileEachCallN}`),
    )
    timing.compileMs = now() - tc
  }
  let result
  if (opts.fs === "custom") {
    const overlay = new Map()
    overlay.set(TSCONFIG_PATH, encoder.encode(tsconfigText()))
    for (const [p, t] of Object.entries(userFiles))
      overlay.set(p, encoder.encode(t))
    if (incremental) for (const [p, b] of written) overlay.set(p, b)
    const counts = { read: 0, stat: 0, readDir: 0 }
    const host = indexedFs(overlay, counts)
    const out = [],
      err = []
    let tRun
    timing.prepMs = now() - t0
    const r = await runTscAsync(
      mod,
      makeRequest(args, { cwd: "/p", json: true }),
      host,
      {
        env,
        stdout: (c) => out.push(c),
        stderr: (c) => err.push(c),
        beforeRun: () => {
          tRun = now()
        },
      },
    )
    const tEnd = now()
    timing.instantiateMs =
      (tRun ?? tEnd) - t0 - timing.prepMs - (timing.compileMs ?? 0)
    timing.runMs = tEnd - (tRun ?? tEnd)
    timing.fsCounts = counts
    if (incremental) for (const [p, b] of host.written) written.set(p, b)
    const text = (cs) => cs.map((c) => decoder.decode(c)).join("")
    result = {
      exitCode: r.exitCode,
      stdout: text(out),
      stderr: text(err),
      diagnostics: r.exitCode === 5 ? [] : parseReply(r.reply),
      memoryBytes: r.memoryBytes,
      wrote: [...host.written.keys()],
    }
  } else {
    const files = {}
    if (opts.fs === "strings") Object.assign(files, pack.strings)
    else for (const [p, b] of pack.bytes) files[p] = b
    files[TSCONFIG_PATH] = tsconfigText()
    Object.assign(files, userFiles)
    if (incremental) for (const [p, b] of written) files[p] = b
    timing.prepMs = now() - t0
    const r = await stockTsc(args, {
      cwd: "/p",
      files,
      diagnostics: "json",
      env,
      ...(opts.module === "stock" ? { url: WASM_URL } : { module: mod }),
    })
    if (incremental)
      for (const [p, t] of Object.entries(r.files ?? {}))
        written.set(p, encoder.encode(t))
    result = { ...r, wrote: Object.keys(r.files ?? {}) }
    delete result.files
  }
  timing.totalMs = now() - t0
  return { result, timing }
}

// ---------- LSP ----------

const uriToPath = (uri) => {
  const u = new URL(uri)
  if (u.protocol !== "file:") throw new Error(`unsupported URI ${uri}`)
  const p = normalize(decodeURIComponent(u.pathname))
  if (!p.startsWith("/p/") || p.startsWith("/p/node_modules/"))
    throw new Error(`URI outside workspace: ${uri}`)
  return p
}

const lineStartsOf = (text) => {
  const starts = [0]
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    if (c === 10) starts.push(i + 1)
    else if (c === 13) {
      if (text.charCodeAt(i + 1) === 10) i++
      starts.push(i + 1)
    }
  }
  return starts
}
// UTF-16 offset -> LSP Position (LSP's default position encoding is UTF-16, same unit as tsrs JSON diagnostics).
const position = (starts, offset) => {
  let lo = 0,
    hi = starts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (starts[mid] <= offset) lo = mid
    else hi = mid - 1
  }
  return { line: lo, character: offset - starts[lo] }
}
const flatten = (d, depth = 0) => [
  "  ".repeat(depth) + d.text,
  ...(d.messageChain ?? []).flatMap((c) => flatten(c, depth + 1)),
]
const severity = { 0: 2, 1: 1, 2: 4, 3: 3 }

function toLsp(d, doc) {
  const start = Math.max(0, d.pos ?? 0),
    end = Math.max(start, d.end ?? start)
  const out = {
    range: {
      start: position(doc.lineStarts, start),
      end: position(doc.lineStarts, end),
    },
    severity: severity[d.category] ?? 1,
    code: d.code,
    source: "tsrs",
    message: d.messageChain?.length ? flatten(d).join("\n") : d.text,
  }
  const tags = []
  if (d.reportsUnnecessary) tags.push(1)
  if (d.reportsDeprecated) tags.push(2)
  if (tags.length) out.tags = tags
  if (d.relatedInformation?.length) {
    out.relatedInformation = d.relatedInformation
      .filter((r) => r.fileName && docs.has(r.fileName))
      .map((r) => {
        const rd = docs.get(r.fileName)
        return {
          location: {
            uri: rd.uri,
            range: {
              start: position(rd.lineStarts, r.pos),
              end: position(rd.lineStarts, r.end),
            },
          },
          message: r.text,
        }
      })
  }
  return out
}

let timer
let running = false
let rerun = false

function schedule(delay = opts.debounceMs) {
  clearTimeout(timer)
  timer = setTimeout(() => {
    void runCheck()
  }, delay)
}

const yieldToEventLoop = () => new Promise((r) => setTimeout(r, 0))

// The check itself is synchronous inside the worker, so edits that arrive during it queue behind it. After every run
// we yield one macrotask so queued didChange/didClose messages land, then publish only if no open document changed
// while we were checking. A stale result is dropped (the edit that made it stale has already scheduled a new check),
// so the client only ever sees diagnostics for the latest text, tagged with that text's `version`.
async function runCheck() {
  await ready
  if (running) {
    rerun = true
    return
  }
  running = true
  try {
    do {
      rerun = false
      if (docs.size === 0) break
      const seq = ++checkSeq
      const snapshot = new Map([...docs].map(([p, d]) => [p, d.version]))
      const userFiles = Object.fromEntries(
        [...docs].map(([p, d]) => [p, d.text]),
      )
      const queuedAt = now()
      let res, error
      try {
        res = await runTsc(userFiles)
      } catch (e) {
        error = String(e?.stack ?? e)
      }
      await yieldToEventLoop()
      const stale =
        [...snapshot].some(([p, v]) => docs.get(p)?.version !== v) ||
        [...docs.keys()].some((p) => !snapshot.has(p))
      const timing = {
        seq,
        versions: Object.fromEntries(snapshot),
        stale,
        ...res?.timing,
        wallMs: now() - queuedAt,
        exitCode: res?.result.exitCode,
        memoryBytes: res?.result.memoryBytes,
        stderr: res?.result.stderr?.slice(0, 500),
        wrote: res?.result.wrote,
        error,
      }
      if (!stale && res) {
        const byFile = new Map()
        for (const d of res.result.diagnostics ?? []) {
          const key = d.fileName && docs.has(d.fileName) ? d.fileName : null
          if (!byFile.has(key)) byFile.set(key, [])
          byFile.get(key).push(d)
        }
        // Diagnostics with no open file (options, global) go on the first open document at 0:0.
        const orphan = byFile.get(null) ?? []
        if (res.result.exitCode === 5)
          orphan.push({
            pos: 0,
            end: 0,
            code: 0,
            category: 1,
            text: `tsrs crashed: ${res.result.stderr}`,
          })
        let first = true
        for (const [p, doc] of docs) {
          const list = (byFile.get(p) ?? []).map((d) => toLsp(d, doc))
          if (first)
            list.push(
              ...orphan.map((d) => ({
                ...toLsp({ ...d, pos: 0, end: 0 }, doc),
                message: d.text,
              })),
            )
          first = false
          if (list.length) published.add(p)
          else published.delete(p)
          notify("textDocument/publishDiagnostics", {
            uri: doc.uri,
            version: doc.version,
            diagnostics: list,
          })
        }
        timing.diagnosticCount = res.result.diagnostics?.length ?? 0
      }
      notify("$/tsrs/timing", timing)
    } while (rerun)
  } finally {
    running = false
  }
}

async function handle(msg) {
  const { id, method, params } = msg
  const reply = (result) => send({ id, result })
  const fail = (code, message) => send({ id, error: { code, message } })
  try {
    switch (method) {
      case "initialize": {
        opts = { ...DEFAULTS, ...params?.initializationOptions }
        ready = load()
        await ready
        reply({
          capabilities: {
            textDocumentSync: { openClose: true, change: 1 },
            positionEncoding: "utf-16",
          },
          serverInfo: { name: "tsrs-batch-worker", version: "0" },
          startup,
          options: opts,
          crossOriginIsolated: self.crossOriginIsolated,
        })
        return
      }
      case "initialized":
        return
      case "workspace/didChangeConfiguration":
        Object.assign(opts, params?.settings ?? {})
        return
      case "textDocument/didOpen": {
        const { uri, text, version } = params.textDocument
        docs.set(uriToPath(uri), {
          uri,
          text,
          version,
          lineStarts: lineStartsOf(text),
        })
        schedule()
        return
      }
      case "textDocument/didChange": {
        const path = uriToPath(params.textDocument.uri)
        const doc = docs.get(path)
        if (!doc) return
        const change = params.contentChanges.at(-1)
        if (change.range)
          throw new Error(
            "incremental sync not supported; server advertises full sync",
          )
        doc.text = change.text
        doc.version = params.textDocument.version
        doc.lineStarts = lineStartsOf(change.text)
        mtimes.set(path, ++mtimeCounter)
        schedule()
        return
      }
      case "textDocument/didClose": {
        const path = uriToPath(params.textDocument.uri)
        docs.delete(path)
        mtimes.delete(path)
        if (published.delete(path))
          notify("textDocument/publishDiagnostics", {
            uri: params.textDocument.uri,
            diagnostics: [],
          })
        schedule()
        return
      }
      case "shutdown":
        clearTimeout(timer)
        reply(null)
        return
      case "exit":
        close()
        return
      case "$/tsrs/checkFiles": {
        await ready
        const t0 = now()
        const { result, timing } = await runTsc(params.files, {
          incremental: false,
          extraArgs: params.args ?? [],
        })
        reply({
          ms: now() - t0,
          timing,
          exitCode: result.exitCode,
          memoryBytes: result.memoryBytes,
          stderr: result.stderr?.slice(0, 2000),
          stdout: result.stdout?.slice(0, 4000),
          diagnostics: (result.diagnostics ?? [])
            .slice(0, 5)
            .map((d) => ({
              code: d.code,
              fileName: d.fileName,
              pos: d.pos,
              end: d.end,
              text: d.text.slice(0, 300),
            })),
          diagnosticCount: result.diagnostics?.length ?? 0,
        })
        return
      }
      default:
        // Hover, completion, etc.: not served by a batch checker.
        if (id !== undefined) fail(-32601, `Method not found: ${method}`)
    }
  } catch (e) {
    if (id !== undefined) fail(-32603, String(e?.message ?? e))
    else
      notify("window/logMessage", { type: 1, message: String(e?.stack ?? e) })
  }
}

self.onmessage = (e) => {
  let msg
  try {
    msg = JSON.parse(e.data)
  } catch {
    send({ id: null, error: { code: -32700, message: "Parse error" } })
    return
  }
  void handle(msg)
}
