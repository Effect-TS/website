// Drives worker.js as an LSP client would (bare JSON-RPC strings over postMessage) and records timings.
// run.mjs calls window.runBench(options) and window.runStress(options); both return plain JSON.

const URI = "file:///p/main.ts"
const now = () => performance.now()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const BAD = "const label: string = now"
const GOOD = "const label: string = String(now)"
const main = (
  extra,
  bad = true,
) => `import { Context, Effect, Layer, Schema, Stream } from "effect"
class Clock extends Context.Service<Clock, { readonly now: Effect.Effect<number> }>()("Clock") {}
const User = Schema.Struct({ id: Schema.Number, name: Schema.String })
const program = Effect.gen(function* () {
  const clock = yield* Clock
  const now = yield* clock.now
  ${bad ? BAD : GOOD}
  Effect.log("floating")
  const xs = yield* Stream.runCollect(Stream.make(1, 2, 3))
  return { label, xs, u: Schema.decodeUnknownSync(User)({}) }
})
export const run = program.pipe(Effect.provide(Layer.succeed(Clock, { now: Effect.succeed(1) })))
${extra}
`

function rangeOf(text, needle, len) {
  const off = text.indexOf(needle)
  const before = text.slice(0, off).split("\n")
  const line = before.length - 1,
    character = before.at(-1).length
  return {
    start: { line, character },
    end: { line, character: character + len },
  }
}
const sameRange = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// Expected TS2322 ranges in a given text: on `label` (if the bad line is present) and on `bad` (if planted).
function expected(text) {
  const out = []
  if (text.includes(BAD)) out.push(rangeOf(text, "label: string = now", 5))
  if (text.includes("export const bad: number"))
    out.push(rangeOf(text, "bad: number", 3))
  return out
}
function verify(text, diags) {
  const exp = expected(text)
  const got = diags.filter((d) => d.code === 2322).map((d) => d.range)
  const ok =
    diags.length === exp.length &&
    exp.every((r) => got.some((g) => sameRange(g, r)))
  return {
    ok,
    expected: exp,
    got: diags.map((d) => ({
      code: d.code,
      range: d.range,
      message: d.message.slice(0, 120),
    })),
  }
}

class Client {
  constructor(worker) {
    this.worker = worker
    this.nextId = 1
    this.pending = new Map()
    this.listeners = new Set()
    worker.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.id !== undefined && msg.method === undefined) {
        const p = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        p?.(msg)
      } else for (const l of this.listeners) l(msg, now())
    }
    worker.onerror = (e) => {
      for (const l of this.listeners)
        l({ method: "$/workerError", params: String(e.message ?? e) }, now())
    }
  }
  request(method, params) {
    const id = this.nextId++
    return new Promise((resolve) => {
      this.pending.set(id, resolve)
      this.worker.postMessage(
        JSON.stringify({ jsonrpc: "2.0", id, method, params }),
      )
    })
  }
  notify(method, params) {
    this.worker.postMessage(JSON.stringify({ jsonrpc: "2.0", method, params }))
  }
  waitFor(pred, timeoutMs = 120000) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        this.listeners.delete(l)
        reject(new Error("timeout waiting for message"))
      }, timeoutMs)
      const l = (msg, at) => {
        if (pred(msg)) {
          clearTimeout(t)
          this.listeners.delete(l)
          resolve({ msg, at })
        }
      }
      this.listeners.add(l)
    })
  }
}

async function measureMemory() {
  if (!self.crossOriginIsolated || !performance.measureUserAgentSpecificMemory)
    return { available: false, crossOriginIsolated: self.crossOriginIsolated }
  try {
    const m = await Promise.race([
      performance.measureUserAgentSpecificMemory(),
      sleep(60000).then(() => {
        throw new Error("timeout after 60s")
      }),
    ])
    const byType = {}
    for (const b of m.breakdown)
      for (const t of b.types) byType[t] = (byType[t] ?? 0) + b.bytes
    return {
      available: true,
      bytes: m.bytes,
      byType,
      breakdown: m.breakdown
        .filter((b) => b.bytes > 1e6)
        .map((b) => ({
          bytes: b.bytes,
          types: b.types,
          scope: b.attribution.map((a) => a.scope).join(","),
        })),
    }
  } catch (e) {
    return { available: true, error: String(e) }
  }
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length
    ? s.length % 2
      ? s[(s.length - 1) >> 1]
      : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
    : null
}

window.runBench = async (options = {}, { edits = 10 } = {}) => {
  const out = {
    options,
    userAgent: navigator.userAgent,
    crossOriginIsolated: self.crossOriginIsolated,
  }
  const log = []
  const t0 = now()
  const worker = new Worker("./worker.js", { type: "module" })
  const client = new Client(worker)
  client.listeners.add((msg, at) =>
    log.push({ at, method: msg.method, params: msg.params }),
  )
  const publish = (version) =>
    client.waitFor(
      (m) =>
        m.method === "textDocument/publishDiagnostics" &&
        m.params.uri === URI &&
        m.params.version === version,
    )
  const timingFor = (version) =>
    client.waitFor(
      (m) =>
        m.method === "$/tsrs/timing" &&
        m.params.versions["/p/main.ts"] === version &&
        !m.params.stale,
    )

  const init = await client.request("initialize", {
    processId: null,
    rootUri: "file:///p",
    capabilities: {},
    initializationOptions: { ...options, debounceMs: 0 },
  })
  if (init.error) throw new Error(JSON.stringify(init.error))
  out.startup = init.result.startup
  out.initializeMs = now() - t0
  client.notify("initialized", {})
  let text = main("")
  let version = 1
  const firstTiming = timingFor(1)
  client.notify("textDocument/didOpen", {
    textDocument: { uri: URI, languageId: "typescript", version, text },
  })
  const first = await publish(1)
  out.firstDiagnosticsSinceNavigationMs = first.at // performance.now() is relative to navigation start
  out.firstDiagnosticsSinceWorkerSpawnMs = first.at - t0
  out.firstCheck = (await firstTiming).msg.params
  out.firstCorrect = verify(text, first.msg.params.diagnostics)

  const hover = await client.request("textDocument/hover", {
    textDocument: { uri: URI },
    position: { line: 6, character: 10 },
  })
  out.hoverResponse = hover.error ?? hover.result

  // Per-edit latency: debounce 0, one edit at a time; odd edits fix the planted error, even edits restore it.
  const editResults = []
  for (let i = 0; i < edits; i++) {
    await sleep(50)
    version++
    text = main(`export const v${i} = ${i}`, i % 2 === 0 ? false : true)
    const tm = timingFor(version)
    const sent = now()
    client.notify("textDocument/didChange", {
      textDocument: { uri: URI, version },
      contentChanges: [{ text }],
    })
    const p = await publish(version)
    const timing = (await tm).msg.params
    editResults.push({
      version,
      latencyMs: p.at - sent,
      ...verify(text, p.msg.params.diagnostics),
      worker: timing,
    })
  }
  out.edits = editResults.map((e) => ({
    version: e.version,
    latencyMs: +e.latencyMs.toFixed(1),
    ok: e.ok,
    got: e.ok ? undefined : e.got,
    expected: e.ok ? undefined : e.expected,
    instantiateMs: e.worker.instantiateMs,
    runMs: e.worker.runMs,
    totalMs: e.worker.totalMs,
    prepMs: e.worker.prepMs,
    compileMs: e.worker.compileMs,
    exitCode: e.worker.exitCode,
    memoryBytes: e.worker.memoryBytes,
    wrote: e.worker.wrote,
    fsCounts: e.worker.fsCounts,
    stderr: e.worker.stderr || undefined,
  }))
  out.editMedianMs = median(editResults.map((e) => e.latencyMs))
  out.editAllCorrect = editResults.every((e) => e.ok)
  out.memoryBytes = editResults.at(-1)?.worker.memoryBytes
  out.memory = await measureMemory()
  out.rss = await window.__sampleRss?.()

  // Latest edit wins: A (error) is sent, B (fixed) arrives mid-check, C (two errors) right after B.
  {
    const publishes = [],
      timings = []
    const l = (m, at) => {
      if (
        m.method === "textDocument/publishDiagnostics" &&
        m.params.uri === URI
      )
        publishes.push({
          at,
          version: m.params.version,
          n: m.params.diagnostics.length,
        })
      if (m.method === "$/tsrs/timing")
        timings.push({ versions: m.params.versions, stale: m.params.stale })
    }
    client.listeners.add(l)
    const vA = ++version,
      vB = ++version,
      vC = ++version
    const textA = main("export const a = 1"),
      textB = main("export const b = 1", false),
      textC = main('export const bad: number = "x"')
    const doneC = publish(vC)
    client.notify("textDocument/didChange", {
      textDocument: { uri: URI, version: vA },
      contentChanges: [{ text: textA }],
    })
    await sleep(100)
    client.notify("textDocument/didChange", {
      textDocument: { uri: URI, version: vB },
      contentChanges: [{ text: textB }],
    })
    client.notify("textDocument/didChange", {
      textDocument: { uri: URI, version: vC },
      contentChanges: [{ text: textC }],
    })
    const c = await doneC
    await sleep(1000)
    client.listeners.delete(l)
    const after = publishes.filter((p) => p.at > c.at)
    out.latestEditWins = {
      versions: { A: vA, B: vB, C: vC },
      publishes: publishes.map((p) => ({ version: p.version, n: p.n })),
      timings,
      finalCorrect: verify(textC, c.msg.params.diagnostics),
      noLatePublish: after.length === 0,
      stalePublished: publishes.some(
        (p) => p.version === vA || p.version === vB,
      ),
    }
  }

  // Debounced burst: 5 edits 30 ms apart with a 150 ms debounce should cost one check.
  {
    client.notify("workspace/didChangeConfiguration", {
      settings: { debounceMs: 150 },
    })
    const timings = []
    const l = (m) => {
      if (m.method === "$/tsrs/timing")
        timings.push(m.params.versions["/p/main.ts"])
    }
    client.listeners.add(l)
    let last
    for (let i = 0; i < 5; i++) {
      version++
      text = main(`export const burst${i} = ${i}`)
      last = now()
      client.notify("textDocument/didChange", {
        textDocument: { uri: URI, version },
        contentChanges: [{ text }],
      })
      if (i < 4) await sleep(30)
    }
    const p = await publish(version)
    await sleep(300)
    client.listeners.delete(l)
    out.burst = {
      checks: timings.length,
      checkedVersions: timings,
      lastEditToDiagnosticsMs: p.at - last,
      correct: verify(text, p.msg.params.diagnostics).ok,
    }
  }

  const shut = await client.request("shutdown", null)
  out.shutdown = shut.result === null ? "ok" : shut
  client.notify("exit")
  out.workerLog = log
    .filter(
      (m) => m.method === "window/logMessage" || m.method === "$/workerError",
    )
    .map((m) => m.params)
  return out
}

// ---------- stress ----------

const plus = (n) => `export const x = ${Array(n).fill("1").join(" + ")}\n`
const pipeChain = (n) =>
  `import { Effect } from "effect"\nexport const p = Effect.succeed(0)${".pipe(Effect.map((n) => n + 1))".repeat(n)}\n`
const nestedSucceed = (n) =>
  `import { Effect } from "effect"\nexport const p = ${"Effect.succeed(".repeat(n)}1${")".repeat(n)}\nexport const bad: string = p\n`
const nestedGen = (n) => {
  let body = "return 1"
  for (let i = 0; i < n; i++)
    body = `return yield* Effect.gen(function* () { ${body} })`
  return `import { Effect } from "effect"\nexport const p = Effect.gen(function* () { ${body} })\n`
}
const nestedFlatMap = (n) =>
  `import { Effect } from "effect"\nexport const p = ${"Effect.flatMap(".repeat(n)}Effect.succeed(0)${", (n: number) => Effect.succeed(n + 1))".repeat(n)}\n`

const KINDS = { plus, pipeChain, nestedFlatMap, nestedSucceed, nestedGen }
// Names are `<kind>-<n>`; n may end in k (thousands).
const stressSource = (name) => {
  const [kind, n] = name.split("-")
  return KINDS[kind](
    n.endsWith("k") ? Number(n.slice(0, -1)) * 1000 : Number(n),
  )
}
const STRESS = [
  "plus-500",
  "plus-1k",
  "plus-2k",
  "plus-3k",
  "plus-5k",
  "plus-20k",
  "pipeChain-200",
  "pipeChain-500",
  "pipeChain-1000",
  "nestedFlatMap-100",
  "nestedFlatMap-250",
  "nestedFlatMap-500",
  "nestedSucceed-50",
  "nestedSucceed-200",
  "nestedGen-50",
  "nestedGen-100",
  "nestedGen-200",
]

// Phase breakdown (--extendedDiagnostics) of the benchmark program, normal and fast, plus the same program
// importing per-module subpaths (effect/Effect, ...) instead of the "effect" barrel.
window.runPhases = async (options = {}) => {
  const worker = new Worker("./worker.js", { type: "module" })
  const client = new Client(worker)
  const init = await client.request("initialize", {
    processId: null,
    capabilities: {},
    initializationOptions: options,
  })
  if (init.error) throw new Error(JSON.stringify(init.error))
  const barrel = main("")
  const subpath = barrel.replace(
    'import { Context, Effect, Layer, Schema, Stream } from "effect"',
    ["Context", "Effect", "Layer", "Schema", "Stream"]
      .map((m) => `import * as ${m} from "effect/${m}"`)
      .join("\n"),
  )
  const pick = (stdout) =>
    Object.fromEntries(
      stdout
        .split("\n")
        .map((l) =>
          l.match(
            /^(Files|Lines|Parse time|Bind time|Check time|Total time|Memory used):\s+(\S+)/,
          ),
        )
        .filter(Boolean)
        .map((m) => [m[1], m[2]]),
    )
  const out = {}
  for (const [name, src, args] of [
    ["barrel", barrel, []],
    ["barrel-fast", barrel, ["--fast"]],
    ["subpath-imports", subpath, []],
    ["barrel-lib-es2022", barrel, ["--lib", "ES2022"]],
  ]) {
    const runs = []
    for (let i = 0; i < 4; i++) {
      const r = await client.request("$/tsrs/checkFiles", {
        files: { "/p/main.ts": src },
        args: ["--extendedDiagnostics", ...args],
      })
      runs.push({
        ms: +r.result.ms.toFixed(0),
        codes: r.result.diagnostics.map((d) => d.code),
        ...pick(r.result.stdout),
      })
    }
    out[name] = runs
  }
  worker.terminate()
  return out
}

window.runStress = async (options = {}, names = STRESS) => {
  const worker = new Worker("./worker.js", { type: "module" })
  const client = new Client(worker)
  const errors = []
  client.listeners.add((m) => {
    if (m.method === "$/workerError" || m.method === "window/logMessage")
      errors.push(m.params)
  })
  const init = await client.request("initialize", {
    processId: null,
    capabilities: {},
    initializationOptions: options,
  })
  if (init.error) throw new Error(JSON.stringify(init.error))
  const results = {}
  for (const name of names) {
    const src = stressSource(name)
    const t = now()
    const r = await Promise.race([
      client.request("$/tsrs/checkFiles", { files: { "/p/stress.ts": src } }),
      sleep(180000).then(() => ({ error: { message: "timeout 180s" } })),
    ])
    results[name] = r.error
      ? { error: r.error.message, ms: now() - t, bytes: src.length }
      : {
          ms: +r.result.ms.toFixed(0),
          exitCode: r.result.exitCode,
          memoryMiB: +(r.result.memoryBytes / 2 ** 20).toFixed(0),
          diagnosticCount: r.result.diagnosticCount,
          codes: [...new Set(r.result.diagnostics.map((d) => d.code))],
          firstDiagnostic: r.result.diagnostics[0]?.text,
          stderr: r.result.stderr || undefined,
          bytes: src.length,
        }
  }
  worker.terminate()
  return { results, errors }
}

document.getElementById("status").textContent =
  "ready: call runBench() / runStress() from the console or run.mjs"
