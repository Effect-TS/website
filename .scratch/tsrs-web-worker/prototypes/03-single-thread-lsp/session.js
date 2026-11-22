// The measured LSP session, shared by the Node runner (run-node.mjs) and the browser worker (worker.js).
// `server` is what lsp-host.js's startLspServer returns: send(json) runs one message to completion and returns the
// server's messages.

export const TSCONFIG = {
  compilerOptions: {
    strict: true,
    exactOptionalPropertyTypes: true,
    noEmit: true,
    target: "ES2022",
    module: "ESNext",
    moduleResolution: "bundler",
    allowImportingTsExtensions: true,
    skipLibCheck: true,
    types: [],
    plugins: [{ name: "@effect/language-service" }],
  },
  include: ["**/*.ts", "**/*.tsx"],
  exclude: ["node_modules"],
}

export const MAIN = `import { Context, Effect, Layer, Schema, Stream } from "effect"
class Clock extends Context.Service<Clock, { readonly now: Effect.Effect<number> }>()("Clock") {}
const User = Schema.Struct({ id: Schema.Number, name: Schema.String })
const program = Effect.gen(function* () {
  const clock = yield* Clock
  const now = yield* clock.now
  const label: string = now
  const xs = yield* Stream.runCollect(Stream.make(1, 2, 3))
  return { label, xs, u: Schema.decodeUnknownSync(User)({}) }
})
export const run = program.pipe(Effect.provide(Layer.succeed(Clock, { now: Effect.succeed(1) })))
`

// CodeMirror's @codemirror/lsp-client 6.3.1 capabilities (dist/index.js `clientCapabilities`), optionally with
// workspace/configuration and pull diagnostics on top.
export function clientCapabilities({
  configuration = false,
  pull = false,
} = {}) {
  const caps = {
    general: { markdown: { parser: "marked" } },
    textDocument: {
      completion: {
        completionItem: {
          snippetSupport: true,
          documentationFormat: ["markdown", "plaintext"],
          insertReplaceSupport: false,
        },
        completionList: {
          itemDefaults: ["commitCharacters", "editRange", "insertTextFormat"],
        },
        completionItemKind: { valueSet: [] },
        contextSupport: true,
      },
      hover: { contentFormat: ["markdown", "plaintext"] },
      formatting: {},
      rename: {},
      signatureHelp: {
        contextSupport: true,
        signatureInformation: {
          documentationFormat: ["markdown", "plaintext"],
          parameterInformation: { labelOffsetSupport: true },
          activeParameterSupport: true,
        },
      },
      definition: {},
      declaration: {},
      implementation: {},
      typeDefinition: {},
      references: {},
    },
    window: { showMessage: {} },
  }
  if (configuration) caps.workspace = { configuration: true }
  if (pull) caps.textDocument.diagnostic = { dynamicRegistration: false }
  return caps
}

function pos(text, needle, delta = 0, from = 0) {
  const i = text.indexOf(needle, from)
  if (i < 0) throw new Error(`needle not found: ${needle}`)
  const off = i + delta
  const before = text.slice(0, off)
  const line = before.split("\n").length - 1
  return { line, character: off - (before.lastIndexOf("\n") + 1) }
}

const now = () => performance.now()

export async function runSession(
  server,
  {
    log = () => {},
    onLog = () => {},
    timerTest = false,
    edits = 50,
    configuration = false,
    pull = false,
    deep = [500, 1000, 1500, 2000, 2500, 3000, 5000, 10000],
  } = {},
) {
  const uri = "file:///p/main.ts"
  let nextId = 1
  const results = { requests: {}, edits: [], notes: [] }
  const serverRequests = []
  const logs = []
  let totalBgMs = 0

  // Sends a message; answers server->client requests the way the website bridge does (registerCapability -> null)
  // or as a client with configuration would; returns { ms, out } with every message produced.
  const pump = async (msg) => {
    const t = now()
    let out = await server.send(JSON.stringify({ jsonrpc: "2.0", ...msg }))
    const ms = now() - t
    // Status 3: background tasks are queued (snapshot adoption, auto-import warming). A host runs them when idle
    // (lsp_tick); here right away, timed separately.
    let bgMs = 0
    while (server.status === 3) {
      const t2 = now()
      out = out.concat(await server.tick())
      bgMs += now() - t2
    }
    totalBgMs += bgMs
    const all = []
    while (out.length) {
      const next = []
      for (const text of out) {
        const m = JSON.parse(text)
        all.push(m)
        if (m.method === "window/logMessage") {
          logs.push(m.params.message)
          onLog(m.params.message)
        }
        if (m.id !== undefined && m.method) {
          serverRequests.push(m.method)
          let result = null
          if (m.method === "workspace/configuration")
            result = m.params.items.map(() => ({}))
          next.push(
            ...(await server.send(
              JSON.stringify({ jsonrpc: "2.0", id: m.id, result }),
            )),
          )
        }
      }
      out = next
    }
    return { ms, bgMs, out: all }
  }
  const request = async (method, params) => {
    const id = nextId++
    const r = await pump({ id, method, params })
    const resp = r.out.find((m) => m.id === id && !m.method)
    if (!resp)
      throw new Error(
        `no response to ${method} (got ${r.out.map((m) => m.method ?? m.id).join(",")})`,
      )
    return { ms: r.ms, bgMs: r.bgMs, resp, out: r.out }
  }
  const diagsOf = (out, u = uri) =>
    out
      .filter(
        (m) =>
          m.method === "textDocument/publishDiagnostics" && m.params.uri === u,
      )
      .map((m) => m.params.diagnostics)
  const mem = () => server.memoryBytes()

  // initialize
  let r = await request("initialize", {
    processId: null,
    clientInfo: { name: "@codemirror/lsp-client" },
    rootUri: "file:///p",
    capabilities: clientCapabilities({ configuration, pull }),
  })
  results.requests.initialize = { ms: r.ms, ok: !!r.resp.result?.capabilities }
  results.serverCapabilities = Object.keys(r.resp.result?.capabilities ?? {})
  results.completionResolveProvider =
    !!r.resp.result?.capabilities?.completionProvider?.resolveProvider
  results.diagnosticProvider = !!r.resp.result?.capabilities?.diagnosticProvider
  log(`initialize ${r.ms.toFixed(1)} ms`)
  let p = await pump({ method: "initialized", params: {} })
  results.requests.initialized = { ms: p.ms }
  log(
    `initialized ${p.ms.toFixed(1)} ms, server requests so far: ${serverRequests.join(", ")}`,
  )
  results.memAfterInit = mem()

  // didOpen with the planted TS2322
  let text = MAIN
  let version = 1
  p = await pump({
    method: "textDocument/didOpen",
    params: { textDocument: { uri, languageId: "typescript", version, text } },
  })
  const firstDiags = diagsOf(p.out)
  results.didOpen = {
    ms: p.ms,
    bgMs: p.bgMs,
    published: firstDiags.length,
    diagnostics: (firstDiags.at(-1) ?? []).map((d) => [
      d.code,
      d.range.start.line,
      d.message.slice(0, 80),
    ]),
  }
  log(
    `didOpen ${p.ms.toFixed(1)} ms, publishDiagnostics x${firstDiags.length}: ${JSON.stringify(results.didOpen.diagnostics)}`,
  )
  results.memAfterOpen = mem()
  if (firstDiags.length === 0) {
    // Push may come on a later pump (a timer): tick once.
    const t = now()
    const out = (await server.tick()).map((s) => JSON.parse(s))
    results.notes.push(
      `no diagnostics in the didOpen pump; tick produced ${diagsOf(out).length} in ${(now() - t).toFixed(1)} ms`,
    )
  }

  {
    try {
      r = await request("textDocument/diagnostic", { textDocument: { uri } })
      results.requests.pullDiagnostic = {
        ms: r.ms,
        items: (r.resp.result?.items ?? []).map((d) => [
          d.code,
          d.range.start.line,
        ]),
        error: r.resp.error?.message,
      }
      log(
        `textDocument/diagnostic ${r.ms.toFixed(1)} ms ${JSON.stringify(results.requests.pullDiagnostic)}`,
      )
    } catch (e) {
      results.requests.pullDiagnostic = { error: String(e) }
    }
  }

  const timed = async (name, method, params, summarize) => {
    try {
      const first = await request(method, params)
      const second = await request(method, params)
      results.requests[name] = {
        ms: first.ms,
        msRepeat: second.ms,
        error: first.resp.error?.message,
        summary: first.resp.error ? null : summarize(first.resp.result),
      }
    } catch (e) {
      results.requests[name] = { error: String(e) }
    }
    log(`${name}: ${JSON.stringify(results.requests[name])}`)
  }

  await timed(
    "hover",
    "textDocument/hover",
    { textDocument: { uri }, position: pos(text, "now = yield*", 1) },
    (h) =>
      (typeof h?.contents === "string"
        ? h.contents
        : (h?.contents?.value ?? JSON.stringify(h))
      ).slice(0, 120),
  )
  await timed(
    "hoverEffectGen",
    "textDocument/hover",
    { textDocument: { uri }, position: pos(text, "Effect.gen", 8) },
    (h) => (h?.contents?.value ?? "").slice(0, 120),
  )
  // Completion after "Effect." on the gen line.
  let completionItems = []
  await timed(
    "completion",
    "textDocument/completion",
    {
      textDocument: { uri },
      position: pos(text, "Effect.gen", 7),
      context: { triggerKind: 2, triggerCharacter: "." },
    },
    (c) => {
      completionItems = Array.isArray(c) ? c : (c?.items ?? [])
      return {
        count: completionItems.length,
        first: completionItems.slice(0, 5).map((i) => i.label),
        hasGen: completionItems.some((i) => i.label === "gen"),
      }
    },
  )
  const genItem =
    completionItems.find((i) => i.label === "gen") ?? completionItems[0]
  if (genItem && results.completionResolveProvider) {
    await timed(
      "completionResolve",
      "completionItem/resolve",
      genItem,
      (i) => ({
        label: i?.label,
        detail: (i?.detail ?? "").slice(0, 80),
        doc: !!i?.documentation,
      }),
    )
  }
  await timed(
    "definition",
    "textDocument/definition",
    { textDocument: { uri }, position: pos(text, "Effect.gen", 8) },
    (d) =>
      (Array.isArray(d) ? d : [d]).map(
        (l) =>
          `${(l.uri ?? l.targetUri).split("/").slice(-2).join("/")}:${(l.range ?? l.targetRange).start.line}`,
      ),
  )
  await timed(
    "references",
    "textDocument/references",
    {
      textDocument: { uri },
      position: pos(text, "const program", 7),
      context: { includeDeclaration: true },
    },
    (refs) => (refs ?? []).map((l) => l.range.start.line),
  )
  await timed(
    "rename",
    "textDocument/rename",
    {
      textDocument: { uri },
      position: pos(text, "const program", 7),
      newName: "prog",
    },
    (e) =>
      Object.fromEntries(
        Object.entries(e?.changes ?? {}).map(([k, v]) => [
          k.split("/").pop(),
          v.length,
        ]),
      ),
  )
  await timed(
    "signatureHelp",
    "textDocument/signatureHelp",
    {
      textDocument: { uri },
      position: pos(text, "Stream.make(", 12),
      context: { triggerKind: 1, isRetrigger: false },
    },
    (s) => s?.signatures?.[0]?.label?.slice(0, 80),
  )
  results.memAfterRequests = mem()

  // Edits: alternate between appending a declaration (keeps the planted error) and fixing / re-breaking the error,
  // as incremental changes. Each didChange pump re-checks if the server pushes diagnostics for it.
  const edit = async (range, newText) => {
    version++
    const lines = text.split("\n")
    const offset = (p) =>
      lines.slice(0, p.line).reduce((n, l) => n + l.length + 1, 0) + p.character
    text =
      text.slice(0, offset(range.start)) +
      newText +
      text.slice(offset(range.end))
    const t = now()
    const out = await pump({
      method: "textDocument/didChange",
      params: {
        textDocument: { uri, version },
        contentChanges: [{ range, text: newText }],
      },
    })
    return { ms: out.ms, bgMs: out.bgMs, out: out.out }
  }
  const memStart = mem()
  for (let i = 0; i < edits; i++) {
    let e
    let kind
    if (i % 2 === 0) {
      kind = "append"
      const lines = text.split("\n")
      const end = { line: lines.length - 1, character: lines.at(-1).length }
      e = await edit({ start: end, end }, `export const v${i} = ${i}\n`)
    } else {
      // toggle `const label: string = now` <-> `const label: number = now`
      const broken = text.includes("label: string")
      kind = broken ? "fix" : "break"
      const at = pos(text, broken ? "label: string" : "label: number", 7)
      e = await edit(
        { start: at, end: { line: at.line, character: at.character + 6 } },
        broken ? "number" : "string",
      )
    }
    const d = diagsOf(e.out)
    // The website's bridge pulls diagnostics after each edit (LspSession.ts) and republishes them; so does this.
    const pr = await request("textDocument/diagnostic", {
      textDocument: { uri },
    })
    const pullMs = pr.ms
    const pullCount = (pr.resp.result?.items ?? []).length
    // A request after the edit (what an editor does next): hover on `now`.
    const h = await request("textDocument/hover", {
      textDocument: { uri },
      position: pos(text, "now = yield*", 1),
    })
    results.edits.push({
      i,
      kind,
      ms: e.ms,
      pushed: d.length,
      pullMs,
      pullCount,
      checkMs: e.ms + pullMs,
      hoverMs: h.ms,
      bgMs: e.bgMs + pr.bgMs + h.bgMs,
      mem: mem(),
    })
  }
  results.memEditsStart = memStart
  results.memEditsEnd = mem()
  log(
    `edits: ${results.edits
      .slice(0, 6)
      .map(
        (e) =>
          `${e.kind} ${e.ms.toFixed(1)}ms pull=${e.pullCount} (+${e.pullMs.toFixed(1)}ms)`,
      )
      .join("; ")} ...`,
  )

  // Timers (Node only): wait for the next pending timer (idle cache clean, checker idle disposal: 30 s), tick, and
  // pull again. Native fires these on its timer thread; here only when the host calls lsp_tick.
  if (timerTest && server.nextTimerMs) {
    results.timers = []
    for (let k = 0; k < 3; k++) {
      const wait = server.nextTimerMs()
      if (wait < 0) break
      await new Promise((r) => setTimeout(r, wait + 20))
      const t = now()
      const out = (await server.tick()).map((x) => JSON.parse(x))
      const tickMs = now() - t
      const pr = await request("textDocument/diagnostic", {
        textDocument: { uri },
      })
      results.timers.push({
        waitedMs: wait,
        tickMs,
        tickMessages: out.length,
        pullAfterMs: pr.ms,
        pullCount: (pr.resp.result?.items ?? []).length,
        nextTimerMs: server.nextTimerMs(),
        mem: mem(),
      })
    }
    log(`timers: ${JSON.stringify(results.timers)}`)
  }

  // Deep recursion: a new file with a deeply nested expression, opened in the same instance.
  results.deep = []
  for (const depth of deep) {
    const duri = `file:///p/deep${depth}.ts`
    const body = `export const deep = ${"[".repeat(depth)}1${"]".repeat(depth)}\nexport const deep2 = ${"(".repeat(depth)}1${")".repeat(depth)}\n`
    try {
      const t = now()
      const out = await pump({
        method: "textDocument/didOpen",
        params: {
          textDocument: {
            uri: duri,
            languageId: "typescript",
            version: 1,
            text: body,
          },
        },
      })
      const dr = await request("textDocument/diagnostic", {
        textDocument: { uri: duri },
      })
      const h = await request("textDocument/hover", {
        textDocument: { uri: duri },
        position: { line: 0, character: 14 },
      })
      results.deep.push({
        depth,
        ms: now() - t,
        ok: true,
        diags: (dr.resp.result?.items ?? []).map((d) => d.code),
        error: dr.resp.error?.message,
        hover: !!h.resp.result,
      })
      await pump({
        method: "textDocument/didClose",
        params: { textDocument: { uri: duri } },
      })
    } catch (e) {
      results.deep.push({
        depth,
        ok: false,
        error: String(e.message ?? e).slice(0, 300),
      })
      break
    }
  }
  log(`deep: ${JSON.stringify(results.deep)}`)

  if (!server.dead) {
    try {
      r = await request("shutdown", undefined)
      results.requests.shutdown = { ms: r.ms, ok: r.resp.result === null }
      await pump({ method: "exit" })
      results.exitStatus = server.status
    } catch (e) {
      results.requests.shutdown = { error: String(e) }
    }
  }
  results.serverRequests = serverRequests
  results.totalBackgroundMs = totalBgMs
  results.logSample = logs.slice(0, 12)
  results.memEnd = server.dead ? null : mem()
  return results
}

export function summarize(results) {
  const ms = results.edits.map((e) => e.checkMs).sort((a, b) => a - b)
  const q = (arr, f) =>
    arr[Math.min(arr.length - 1, Math.floor(f * arr.length))]
  const by = (kind) =>
    results.edits
      .filter((e) => e.kind === kind)
      .map((e) => e.checkMs)
      .sort((a, b) => a - b)
  const change = results.edits.map((e) => e.ms).sort((a, b) => a - b)
  const hov = results.edits.map((e) => e.hoverMs).sort((a, b) => a - b)
  return {
    didOpenMs: +results.didOpen.ms.toFixed(1),
    firstDiagnosticsMs: +(
      results.didOpen.ms + (results.requests.pullDiagnostic?.ms ?? NaN)
    ).toFixed(1),
    firstPull: results.requests.pullDiagnostic?.items,
    didChangeMedianMs: +q(change, 0.5).toFixed(2),
    firstEditCheckMs: +results.edits[0].checkMs.toFixed(1),
    editMedianMs: +q(ms, 0.5).toFixed(1),
    editP90Ms: +q(ms, 0.9).toFixed(1),
    editMaxMs: +ms.at(-1).toFixed(1),
    appendMedianMs: +q(by("append"), 0.5).toFixed(1),
    toggleMedianMs: +q(
      [...by("fix"), ...by("break")].sort((a, b) => a - b),
      0.5,
    ).toFixed(1),
    hoverAfterEditMedianMs: +q(hov, 0.5).toFixed(1),
    didOpenBackgroundMs: +(results.didOpen.bgMs ?? 0).toFixed(1),
    firstEditBackgroundMs: +(results.edits[0].bgMs ?? 0).toFixed(1),
    editBackgroundMedianMs: +q(
      results.edits.map((e) => e.bgMs ?? 0).sort((a, b) => a - b),
      0.5,
    ).toFixed(1),
    pushedOnEdit: results.edits.filter((e) => e.pushed > 0).length,
    pullCountsByKind: Object.fromEntries(
      ["append", "fix", "break"].map((k) => [
        k,
        [
          ...new Set(
            results.edits.filter((e) => e.kind === k).map((e) => e.pullCount),
          ),
        ],
      ]),
    ),
    deepMaxOk: Math.max(
      0,
      ...results.deep.filter((d) => d.ok).map((d) => d.depth),
    ),
    deepFirstFail: results.deep.find((d) => !d.ok) ?? null,
    memMiB: {
      afterInit: +(results.memAfterInit / 2 ** 20).toFixed(1),
      afterOpen: +(results.memAfterOpen / 2 ** 20).toFixed(1),
      afterRequests: +(results.memAfterRequests / 2 ** 20).toFixed(1),
      editsStart: +(results.memEditsStart / 2 ** 20).toFixed(1),
      editsEnd: +(results.memEditsEnd / 2 ** 20).toFixed(1),
      end:
        results.memEnd == null ? null : +(results.memEnd / 2 ** 20).toFixed(1),
    },
  }
}
