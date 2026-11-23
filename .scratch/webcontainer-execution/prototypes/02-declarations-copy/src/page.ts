// Spike page: boot a real WebContainer, install the Playground v4 template's
// dependencies with pnpm, then measure three ways of copying package.json +
// *.d.ts out of node_modules, and load the result into the real tsrs worker.
import { WebContainer, type FileSystemTree } from "@webcontainer/api"

const results: Record<string, any> = { log: [] as Array<string> }
;(window as any).__results = results
const t00 = performance.now()
const log = (line: string) => {
  const s = `[${((performance.now() - t00) / 1000).toFixed(1)}s] ${line}`
  results.log.push(s)
  console.log(s)
  document.getElementById("log")!.textContent += s + "\n"
}
const now = () => performance.now()
const round = (n: number) => Math.round(n)

const DECL = /\.d\.(ts|mts|cts)$/
const isTypesFile = (name: string) => name === "package.json" || DECL.test(name)
const enc = new TextEncoder()
const dec = new TextDecoder()

// ---------------------------------------------------------------- template
const mainTs = `import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as Effect from "effect/Effect"
import { DevToolsLayer } from "./DevTools.js"

const program = Effect.gen(function*() {
  yield* Effect.log("Welcome to the Effect v4 Playground!")
}).pipe(Effect.withSpan("program", {
  attributes: { source: "Playground" }
}))

NodeRuntime.runMain(program.pipe(
  Effect.provide(DevToolsLayer)
))
`
const devToolsTs = `import { NodeSocket } from "@effect/platform-node"
import * as DevTools from "effect/devtools/DevTools"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"

export const DevToolsLayer = DevTools.layerSocket.pipe(
  Layer.provide(NodeSocket.layerNet({ port: 34437 })),
  Layer.provideMerge(Logger.layer([Logger.consolePretty(), Logger.tracerLogger]))
)
`
const packageJson = JSON.stringify(
  {
    type: "module",
    dependencies: {
      "@effect/platform-node": "latest",
      effect: "latest",
      "@types/node": "latest",
      typescript: "6.0.2",
      // ?heavy: a stress case with many more declaration files (as after `pnpm add`)
      ...(location.search.includes("heavy")
        ? {
            "date-fns": "latest",
            rxjs: "latest",
            zod: "latest",
            "@aws-sdk/client-s3": "latest",
          }
        : {}),
    },
  },
  null,
  2,
)
const tsconfigJson = JSON.stringify(
  {
    compilerOptions: {
      allowSyntheticDefaultImports: true,
      exactOptionalPropertyTypes: true,
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      target: "esnext",
      plugins: [{ name: "@effect/language-service" }],
    },
    include: ["src"],
  },
  null,
  2,
)
const workspaceFiles = {
  "package.json": packageJson,
  "tsconfig.json": tsconfigJson,
  "src/main.ts": mainTs,
  "src/DevTools.ts": devToolsTs,
}

const PROBE = `import * as fs from "node:fs"
import { Buffer } from "node:buffer"
import * as Schema from "effect/Schema"
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
export const a: string = fs.readFileSync("x", "utf8")
export const b = Buffer.from("x")
export const S = Schema.String
export const c = NodeHttpServer.layer
export const negativeControl: number = "not a number"
`

// ---------------------------------------------------------------- worker
const worker = new Worker("/worker.js", { type: "module" })
const waiters = new Map<string, (data: any) => void>()
worker.onmessage = (e) => {
  if (e.data.type === "error") {
    log(`WORKER ERROR ${e.data.message}`)
    results.workerError = e.data.message
  }
  const w = waiters.get(e.data.type)
  if (w) {
    waiters.delete(e.data.type)
    w(e.data)
  }
}
const ask = (msg: any, reply: string, transfer: Array<Transferable> = []) =>
  new Promise<any>((resolve, reject) => {
    waiters.set(reply, resolve)
    waiters.set("error", (d) => reject(new Error(d.message)))
    worker.postMessage(msg, transfer)
  })

// ---------------------------------------------------------------- helpers
type FlatFiles = Map<string, Uint8Array | string> // key: path under node_modules
const sizeOf = (c: Uint8Array | string) =>
  typeof c === "string" ? enc.encode(c).length : c.length
const summarize = (files: FlatFiles) => {
  let bytes = 0
  for (const c of files.values()) bytes += sizeOf(c)
  return { files: files.size, bytes }
}

// (A) Playground-style walk: readdir/readFile per file over .pnpm/*/node_modules/**
async function methodA(wc: WebContainer) {
  const files: FlatFiles = new Map()
  let readdirs = 0
  let reads = 0
  let symlinkDirsSeen = 0
  const store = "node_modules/.pnpm"
  const entries = await wc.fs.readdir(store, { withFileTypes: true })
  readdirs++
  const storePaths = entries
    .filter((e) => e.isDirectory() && e.name !== "node_modules")
    .map((e) => `${store}/${e.name}`)
  const at = async (storePath: string, dir: string): Promise<void> => {
    let list
    try {
      list = await wc.fs.readdir(dir, { withFileTypes: true })
      readdirs++
    } catch {
      return
    }
    const dirs = list.filter((e) => e.isDirectory()).map((e) => e.name)
    symlinkDirsSeen += list.filter(
      (e) => !e.isDirectory() && !e.isFile(),
    ).length
    await Promise.all(
      list
        .filter((e) => !e.isDirectory() && isTypesFile(e.name))
        .map(async (e) => {
          const full = `${dir}/${e.name}`
          try {
            const content = await wc.fs.readFile(full, "utf-8")
            reads++
            // Playground key: full path minus store path -> node_modules/<pkg>/...
            files.set(
              full.slice(storePath.length + "/node_modules/".length),
              content,
            )
          } catch {}
        }),
    )
    await Promise.all(
      dirs
        .filter((d) => d !== "node_modules")
        .map((d) => at(storePath, `${dir}/${d}`)),
    )
  }
  await Promise.all(storePaths.map((sp) => at(sp, `${sp}/node_modules`)))
  return {
    files,
    readdirs,
    reads,
    storePackages: storePaths.length,
    symlinkDirsSeen,
  }
}

// (B) in-container script -> one TSPK pack -> one readFile
async function methodB(
  wc: WebContainer,
  collectSource: string,
  skipTsLibs: boolean,
) {
  const t0 = now()
  await wc.fs.writeFile("collect.cjs", collectSource)
  const args = ["collect.cjs", "node_modules", ".types.pack"]
  if (skipTsLibs) args.push("--skip-ts-libs")
  const proc = await wc.spawn("node", args)
  let out = ""
  proc.output.pipeTo(new WritableStream({ write: (c) => void (out += c) }))
  const code = await proc.exit
  const tScript = now()
  const pack = await wc.fs.readFile(".types.pack")
  const tRead = now()
  const stats = JSON.parse(await wc.fs.readFile(".types.pack.json", "utf-8"))
  return {
    pack,
    stats,
    exitCode: code,
    output: out.trim(),
    scriptMs: round(tScript - t0),
    readMs: round(tRead - tScript),
    totalMs: round(now() - t0),
  }
}

function decodePack(pack: Uint8Array): FlatFiles {
  const view = new DataView(pack.buffer, pack.byteOffset, pack.byteLength)
  const h = view.getUint32(8, true)
  const header = JSON.parse(dec.decode(pack.subarray(12, 12 + h)))
  const files: FlatFiles = new Map()
  for (const [p, off, len] of header.files)
    files.set(p, pack.subarray(12 + h + off, 12 + h + off + len))
  return files
}

// (C) export(): walk the returned tree, resolve symlinks inside it, flatten with the same rule as collect.cjs
function flattenExport(
  tree: FileSystemTree,
  workdir: string,
  preferVersions: Map<string, string>,
) {
  type Node = FileSystemTree[string]
  let symlinks = 0
  let rawFiles = 0
  let rawBytes = 0
  const rawPaths = new Map<string, number>()
  const countAll = (t: FileSystemTree, rel: string) => {
    for (const [name, n] of Object.entries(t)) {
      if ("directory" in n) countAll(n.directory, `${rel}/${name}`)
      else if ("symlink" in (n as any).file) symlinks++
      else {
        rawFiles++
        rawBytes += sizeOf((n as any).file.contents)
        rawPaths.set(`${rel}/${name}`, sizeOf((n as any).file.contents))
      }
    }
  }
  countAll(tree, "node_modules")
  const norm = (segs: Array<string>) => {
    const out: Array<string> = []
    for (const s of segs) {
      if (s === "" || s === ".") continue
      if (s === "..") out.pop()
      else out.push(s)
    }
    return out
  }
  const nmAbs = `${workdir}/node_modules/`
  const lookup = (
    segs: Array<string>,
    depth = 0,
  ): { node: Node; segs: Array<string> } | undefined => {
    let cur: FileSystemTree = tree
    for (let i = 0; i < segs.length; i++) {
      const n = cur[segs[i]!]
      if (!n) return undefined
      if ("file" in n && "symlink" in (n.file as any)) {
        if (depth > 40) return undefined
        const target: string = (n.file as any).symlink
        const base = target.startsWith("/")
          ? target.startsWith(nmAbs)
            ? target.slice(nmAbs.length).split("/")
            : undefined
          : [...segs.slice(0, i), ...target.split("/")]
        if (!base) return undefined
        return lookup(norm([...base, ...segs.slice(i + 1)]), depth + 1)
      }
      if (i === segs.length - 1) return { node: n, segs: segs.slice(0, i + 1) }
      if (!("directory" in n)) return undefined
      cur = n.directory
    }
    return undefined
  }
  const chosen = new Map<string, FileSystemTree>()
  const addFrom = (prefix: Array<string>) => {
    const dir =
      prefix.length === 0
        ? { node: { directory: tree } as Node }
        : lookup(prefix)
    if (!dir || !("directory" in dir.node)) return
    for (const [name, _] of Object.entries(dir.node.directory)) {
      if (name.startsWith(".")) continue
      const names = name.startsWith("@")
        ? Object.keys(
            (lookup([...prefix, name])?.node as any)?.directory ?? {},
          ).map((s) => `${name}/${s}`)
        : [name]
      for (const full of names) {
        if (chosen.has(full)) continue
        const r = lookup([...prefix, ...full.split("/")])
        if (r && "directory" in r.node) chosen.set(full, r.node.directory)
      }
    }
  }
  addFrom([])
  addFrom([".pnpm", "node_modules"])
  // export() drops symlinks, so the two link directories above come back empty. Fall back to the store:
  // .pnpm/<id>/node_modules/<name> real directories, picking the version collect.cjs picked.
  const storeVersions = new Map<string, Set<string>>()
  const store = (tree[".pnpm"] as any)?.directory ?? {}
  for (const [id, entry] of Object.entries<any>(store)) {
    if (id === "node_modules" || !entry.directory?.node_modules) continue
    const nm = entry.directory.node_modules.directory
    for (const [n, e] of Object.entries<any>(nm)) {
      const pairs: Array<[string, any]> = n.startsWith("@")
        ? Object.entries<any>(e.directory ?? {}).map(([s2, e2]) => [
            `${n}/${s2}`,
            e2,
          ])
        : [[n, e]]
      for (const [name, dirEntry] of pairs) {
        const pj = dirEntry.directory?.["package.json"]?.file?.contents
        if (pj === undefined) continue
        const version = JSON.parse(
          typeof pj === "string" ? pj : dec.decode(pj),
        ).version
        if (!storeVersions.has(name)) storeVersions.set(name, new Set())
        storeVersions.get(name)!.add(version)
        if (
          !chosen.has(name) &&
          (preferVersions.get(name) ?? version) === version
        )
          chosen.set(name, dirEntry.directory)
      }
    }
  }
  const files: FlatFiles = new Map()
  const walk = (t: FileSystemTree, rel: string) => {
    for (const [name, n] of Object.entries(t)) {
      if (name === "node_modules") continue
      const r = rel ? `${rel}/${name}` : name
      if ("directory" in n) walk(n.directory, r)
      else if (!("symlink" in (n.file as any)) && isTypesFile(name))
        files.set(r, (n.file as any).contents)
    }
  }
  for (const [name, t] of chosen) walk(t, name)
  const multiVersion = [...storeVersions]
    .filter(([, v]) => v.size > 1)
    .map(([n, v]) => `${n}: ${[...v].join(", ")}`)
  return {
    files,
    symlinks,
    rawFiles,
    rawBytes,
    rawPaths,
    packages: chosen.size,
    multiVersion,
  }
}

async function methodC(wc: WebContainer, label: string, options: any) {
  const t0 = now()
  let tree: FileSystemTree
  try {
    tree = (await wc.export("node_modules", {
      format: "json",
      ...options,
    })) as FileSystemTree
  } catch (error) {
    return { label, error: String(error), ms: round(now() - t0) }
  }
  const exportMs = round(now() - t0)
  return { label, exportMs, tree }
}

function compare(reference: FlatFiles, other: FlatFiles) {
  const missing: Array<string> = []
  const differing: Array<string> = []
  for (const [p, c] of reference) {
    const o = other.get(p)
    if (o === undefined) missing.push(`${p} (${sizeOf(c)} B)`)
    else if (sizeOf(o) !== sizeOf(c))
      differing.push(`${p} ref ${sizeOf(c)} B, got ${sizeOf(o)} B`)
  }
  const extra = [...other.keys()].filter((p) => !reference.has(p))
  return {
    missing: missing.length,
    missingSample: missing.slice(0, 15),
    differing: differing.length,
    differingSample: differing.slice(0, 15),
    extra: extra.length,
    extraSample: extra.slice(0, 10),
  }
}

const toRecord = (files: FlatFiles) => {
  const out: Record<string, string> = {}
  for (const [p, c] of files) out[p] = typeof c === "string" ? c : dec.decode(c)
  return out
}

// ---------------------------------------------------------------- main
async function main() {
  results.userAgent = navigator.userAgent
  results.crossOriginIsolated = crossOriginIsolated
  log(`crossOriginIsolated=${crossOriginIsolated}`)

  const workerStarted = ask(
    { type: "start", wasmUrl: "/tsrs-effect-lsp.wasm", files: workspaceFiles },
    "started",
  )
  const collectSource = await (await fetch("/collect.cjs")).text()

  let t = now()
  const wc = await WebContainer.boot({
    coep: "require-corp",
    workdirName: "playground-v4",
  })
  results.bootMs = round(now() - t)
  log(`booted in ${results.bootMs} ms, workdir ${wc.workdir}`)
  await wc.mount({
    "package.json": { file: { contents: packageJson } },
    "tsconfig.json": { file: { contents: tsconfigJson } },
    src: {
      directory: {
        "main.ts": { file: { contents: mainTs } },
        "DevTools.ts": { file: { contents: devToolsTs } },
      },
    },
  })

  // pnpm 8.15.6 in the Container rejects `install -E` ("Unknown option: 'save-exact'"); record that, then install plainly.
  {
    const p = await wc.spawn("pnpm", ["install", "-E"])
    let o = ""
    p.output.pipeTo(new WritableStream({ write: (c) => void (o += c) }))
    results.installDashE = { exitCode: await p.exit, output: o.slice(-300) }
  }
  t = now()
  const install = await wc.spawn("pnpm", ["install"])
  let installOut = ""
  install.output.pipeTo(
    new WritableStream({ write: (c) => void (installOut += c) }),
  )
  const installCode = await install.exit
  results.install = {
    ms: round(now() - t),
    exitCode: installCode,
    tail: installOut.slice(-1500),
  }
  log(`pnpm install exit ${installCode} in ${results.install.ms} ms`)
  if (installCode !== 0)
    throw new Error(`install failed: ${installOut.slice(-2000)}`)
  results.lockedPackageJson = await wc.fs.readFile("package.json", "utf-8")
  results.pnpmVersion = await (async () => {
    const p = await wc.spawn("pnpm", ["--version"])
    let o = ""
    p.output.pipeTo(new WritableStream({ write: (c) => void (o += c) }))
    await p.exit
    return o.trim()
  })()

  const started = await workerStarted
  results.workerStart = started
  log(
    `tsrs started in ${round(started.startMs)} ms; diagnostics before types: ${JSON.stringify(started.diagnostics).slice(0, 300)}`,
  )

  // C first, before anything else reads node_modules (webcontainer-core#2180: unread large files)
  const includes = ["**/package.json", "**/*.d.ts", "**/*.d.mts", "**/*.d.cts"]
  const cFresh = await methodC(wc, "C1 includes only (fresh)", { includes })
  log(`C1 export ${(cFresh as any).exportMs} ms`)
  const cExcl = await methodC(wc, "C2 excludes ** + includes (fresh)", {
    excludes: ["**"],
    includes,
  })
  log(`C2 export ${(cExcl as any).exportMs} ms`)

  // B
  const bFull = await methodB(wc, collectSource, false)
  log(
    `B full: script ${bFull.scriptMs} ms, readFile ${bFull.readMs} ms, total ${bFull.totalMs} ms, ${bFull.stats.files} files ${bFull.stats.bytes} B`,
  )
  const bSkip = await methodB(wc, collectSource, true)
  log(
    `B skip-ts-libs: total ${bSkip.totalMs} ms, ${bSkip.stats.files} files ${bSkip.stats.bytes} B, pack ${bSkip.pack.length} B`,
  )
  const bFullFiles = decodePack(bFull.pack)

  // A
  t = now()
  const a = await methodA(wc)
  const aMs = round(now() - t)
  log(
    `A: ${aMs} ms, ${a.files.size} files, ${a.readdirs} readdirs, ${a.reads} reads`,
  )

  // C again after A and B read every file
  const cAfter = await methodC(wc, "C1 includes only (after reads)", {
    includes,
  })
  log(`C1-after export ${(cAfter as any).exportMs} ms`)
  const preferVersions = new Map<string, string>(
    Object.entries(bFull.stats.perPackage).map(([n, v]: [string, any]) => [
      n,
      v.version,
    ]),
  )
  const flatten = (c: any) => {
    if (c.error) return c
    const t1 = now()
    const flat = flattenExport(c.tree, wc.workdir, preferVersions)
    return {
      label: c.label,
      exportMs: c.exportMs,
      flattenMs: round(now() - t1),
      ...flat,
    }
  }
  const cF = flatten(cFresh)
  const cE = flatten(cExcl)
  const cA = flatten(cAfter)
  const rawDropped = cF.rawPaths
    ? [...cA.rawPaths]
        .filter(([p]) => !cF.rawPaths.has(p))
        .map(([p, n]) => `${p} ${n} B`)
    : []
  results.exportDroppedWhenFresh = rawDropped
  log(`export() fresh vs after-reads, dropped: ${JSON.stringify(rawDropped)}`)

  const largeFiles = [...bFullFiles]
    .filter(([, c]) => sizeOf(c) >= 1_000_000)
    .map(([p, c]) => `${p} ${sizeOf(c)} B`)

  const cSummary = (c: any) =>
    c.error
      ? c
      : {
          label: c.label,
          exportMs: c.exportMs,
          flattenMs: c.flattenMs,
          rawFiles: c.rawFiles,
          rawBytes: c.rawBytes,
          symlinks: c.symlinks,
          packages: c.packages,
          multiVersion: c.multiVersion,
          flattened: summarize(c.files),
          vsB: compare(bFullFiles, c.files),
        }
  results.methods = {
    A: {
      ms: aMs,
      ...summarize(a.files),
      readdirs: a.readdirs,
      reads: a.reads,
      storePackages: a.storePackages,
      symlinkEntriesSeen: a.symlinkDirsSeen,
      vsB: compare(bFullFiles, a.files),
    },
    Bfull: {
      ...bFull,
      pack: undefined,
      packBytes: bFull.pack.length,
      stats: { ...bFull.stats },
    },
    BskipTsLibs: {
      ...bSkip,
      pack: undefined,
      packBytes: bSkip.pack.length,
      stats: { ...bSkip.stats, perPackage: undefined },
    },
    C1fresh: cSummary(cF),
    C2fresh: cSummary(cE),
    C1after: cSummary(cA),
  }
  results.largeFiles = largeFiles

  // ---------------------------------------------------------------- tsrs
  const transferCopy = bSkip.pack.slice().buffer
  t = now()
  const mountedB = await ask(
    { type: "mount", label: "B skip-ts-libs pack", pack: transferCopy },
    "mounted",
    [transferCopy],
  )
  mountedB.roundTripMs = round(now() - t)
  log(
    `tsrs B: mount ${round(mountedB.mountMs)} ms, pull ${round(mountedB.pullMs)} ms, ${JSON.stringify(mountedB.diagnostics)}`,
  )
  results.tsrsB = mountedB
  results.probeB = await ask({ type: "probe", text: PROBE }, "probed")
  log(`probe B: ${JSON.stringify(results.probeB.diagnostics)}`)

  // Second copy (a reinstall): same pack again
  const again = bSkip.pack.slice().buffer
  t = now()
  const remount = await ask(
    { type: "mount", label: "B remount", pack: again },
    "mounted",
    [again],
  )
  remount.roundTripMs = round(now() - t)
  results.tsrsBRemount = {
    mountMs: remount.mountMs,
    pullMs: remount.pullMs,
    roundTripMs: remount.roundTripMs,
    diagnostics: remount.diagnostics,
  }

  // A's Playground-keyed files (all versions, last write wins)
  t = now()
  const mountedA = await ask(
    { type: "mount", label: "A files", files: toRecord(a.files) },
    "mounted",
  )
  results.tsrsA = { ...mountedA, roundTripMs: round(now() - t) }
  log(`tsrs A: ${JSON.stringify(mountedA.diagnostics)}`)

  if (cF.files) {
    const mountedC = await ask(
      { type: "mount", label: "C1 fresh", files: toRecord(cF.files) },
      "mounted",
    )
    results.tsrsC = mountedC
    log(`tsrs C1: ${JSON.stringify(mountedC.diagnostics)}`)
  }

  await wc.teardown()
  results.done = true
  log("done")
}

main().catch((error) => {
  results.error = String(error?.stack ?? error)
  log(`FAILED ${results.error}`)
  results.done = true
})
