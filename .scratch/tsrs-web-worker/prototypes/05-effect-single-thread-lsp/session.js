// The timed session, shared by Node (run-node.mjs), native (run-node.mjs --native) and the browser worker.
// CodeMirror lsp-client 6.3.1 capabilities (what the Scratchpad sends), all workspace files opened, and then the
// bridge's pattern: after each didChange, pull textDocument/diagnostic for the edited file (LspSession.ts), then a
// hover, as an editor would. Edits go to src/app.ts, the Scratchpad-style program:
//   even i: append `export const v<i> = <i>` (keeps the diagnostics),
//   odd i:  toggle `label: string` <-> `label: number` (removes / restores the planted TS2322).
import { codemirrorCapabilities, makeClient, pos } from "./client.js"
import { ROOT_URI, SOURCES, uriOf } from "./workspace.js"

const now = () => performance.now()
const MEM_CHECKPOINTS = new Set([0, 1, 9, 49, 99, 149, 199, 249, 299, 499])

export async function runSession(
  server,
  { log = () => {}, edits = 50, timerTest = false } = {},
) {
  const c = makeClient(server)
  const results = {
    requests: {},
    open: [],
    firstPulls: {},
    edits: [],
    mem: {},
    notes: [],
  }
  const mem = () => server.memoryBytes()
  const app = uriOf("src/app.ts")
  const main = uriOf("src/main.ts")
  let text = SOURCES["src/app.ts"]
  let version = 1

  let r = await c.request("initialize", {
    processId: null,
    clientInfo: { name: "@codemirror/lsp-client" },
    rootUri: ROOT_URI,
    capabilities: codemirrorCapabilities(),
  })
  results.requests.initialize = { ms: r.ms }
  const p = await c.notify("initialized", {})
  results.requests.initialized = { ms: p.ms }
  results.mem.afterInit = mem()

  // Open every file (MultiFileLspWorkspace opens all of them), main.ts first as the Scratchpad's entry.
  const order = [
    "src/main.ts",
    "src/greeter.ts",
    "src/app.ts",
    "src/issues.ts",
    "src/refactors.ts",
  ]
  const tOpen = now()
  for (const rel of order) {
    const o = await c.notify("textDocument/didOpen", {
      textDocument: {
        uri: uriOf(rel),
        languageId: "typescript",
        version: 1,
        text: SOURCES[rel],
      },
    })
    results.open.push({ file: rel, ms: o.ms, bgMs: o.bgMs })
  }
  results.mem.afterOpen = mem()
  r = await c.request("textDocument/diagnostic", {
    textDocument: { uri: main },
  })
  results.firstDiagnosticsMs = now() - tOpen
  results.firstPulls["src/main.ts"] = {
    ms: r.ms,
    codes: (r.result?.items ?? []).map((d) => d.code),
  }
  for (const rel of order.slice(1)) {
    r = await c.request("textDocument/diagnostic", {
      textDocument: { uri: uriOf(rel) },
    })
    results.firstPulls[rel] = {
      ms: r.ms,
      codes: (r.result?.items ?? []).map((d) => d.code),
    }
  }
  results.mem.afterFirstPulls = mem()
  log(
    `open ${results.open.map((o) => `${o.file} ${o.ms.toFixed(0)}ms`).join(", ")}; first diagnostics ${results.firstDiagnosticsMs.toFixed(0)} ms; pulls ${JSON.stringify(results.firstPulls)}`,
  )

  const timed = async (name, method, params, summarize) => {
    const a = await c.request(method, params)
    const b = await c.request(method, params)
    results.requests[name] = {
      ms: a.ms,
      msRepeat: b.ms,
      bgMs: a.bgMs,
      error: a.error?.message,
      summary: a.error ? null : summarize(a.result),
    }
  }
  const hoverText = (h) =>
    (typeof h?.contents === "string"
      ? h.contents
      : (h?.contents?.value ?? "")
    ).slice(0, 160)
  await timed(
    "hoverProgram",
    "textDocument/hover",
    { textDocument: { uri: app }, position: pos(text, "const program", 8) },
    hoverText,
  )
  await timed(
    "hoverYieldStar",
    "textDocument/hover",
    { textDocument: { uri: app }, position: pos(text, "yield* clock.now", 2) },
    hoverText,
  )
  await timed(
    "completionEffectDot",
    "textDocument/completion",
    {
      textDocument: { uri: app },
      position: pos(text, "Effect.gen", 7),
      context: { triggerKind: 2, triggerCharacter: "." },
    },
    (res) => {
      const items = Array.isArray(res) ? res : (res?.items ?? [])
      return {
        count: items.length,
        genFunctionStar: items.some((i) => /function\*/.test(i.label)),
      }
    },
  )
  const mtext = SOURCES["src/main.ts"]
  // The floating Effect.succeed("unhandled") in main.ts (TS377001 with the Effect pass; nothing without it).
  const floatingRange = {
    start: pos(mtext, 'Effect.succeed("unhandled")'),
    end: pos(mtext, 'Effect.succeed("unhandled")', 27),
  }
  const floating = (
    await c.request("textDocument/diagnostic", { textDocument: { uri: main } })
  ).result.items.filter((d) => d.code === 377001)
  await timed(
    "codeActionFloating",
    "textDocument/codeAction",
    {
      textDocument: { uri: main },
      range: floatingRange,
      context: { diagnostics: floating },
    },
    (a) => (a ?? []).map((x) => x.title),
  )
  await timed(
    "definition",
    "textDocument/definition",
    { textDocument: { uri: main }, position: pos(mtext, "greet(", 2) },
    (d) =>
      (Array.isArray(d) ? d : [d]).map((l) =>
        (l.uri ?? l.targetUri).split("/").pop(),
      ),
  )
  await timed(
    "references",
    "textDocument/references",
    {
      textDocument: { uri: main },
      position: pos(mtext, "greet(", 2),
      context: { includeDeclaration: true },
    },
    (x) => x?.length,
  )
  await timed(
    "signatureHelp",
    "textDocument/signatureHelp",
    {
      textDocument: { uri: main },
      position: pos(mtext, 'greet("', 6),
      context: { triggerKind: 1, isRetrigger: false },
    },
    (s) => s?.signatures?.[0]?.label,
  )
  results.mem.afterRequests = mem()

  // Edits.
  const edit = async (range, newText) => {
    version++
    const lines = text.split("\n")
    const offset = (q) =>
      lines.slice(0, q.line).reduce((n, l) => n + l.length + 1, 0) + q.character
    text =
      text.slice(0, offset(range.start)) +
      newText +
      text.slice(offset(range.end))
    return c.notify("textDocument/didChange", {
      textDocument: { uri: app, version },
      contentChanges: [{ range, text: newText }],
    })
  }
  for (let i = 0; i < edits; i++) {
    let e, kind
    if (i % 2 === 0) {
      kind = "append"
      const lines = text.split("\n")
      const end = { line: lines.length - 1, character: lines.at(-1).length }
      e = await edit({ start: end, end }, `export const v${i} = ${i}\n`)
    } else {
      const broken = text.includes("label: string")
      kind = broken ? "fix" : "break"
      const at = pos(text, broken ? "label: string" : "label: number", 7)
      e = await edit(
        { start: at, end: { line: at.line, character: at.character + 6 } },
        broken ? "number" : "string",
      )
    }
    const pr = await c.request("textDocument/diagnostic", {
      textDocument: { uri: app },
    })
    const h = await c.request("textDocument/hover", {
      textDocument: { uri: app },
      position: pos(text, "now = yield*", 1),
    })
    const codes = (pr.result?.items ?? []).map((d) => d.code)
    results.edits.push({
      i,
      kind,
      ms: e.ms,
      pullMs: pr.ms,
      checkMs: e.ms + pr.ms,
      codes: codes.join(","),
      hoverMs: h.ms,
      bgMs: e.bgMs + pr.bgMs + h.bgMs,
    })
    if (MEM_CHECKPOINTS.has(i)) results.mem[`edit${i + 1}`] = mem()
  }
  results.mem.afterEdits = mem()
  log(
    `edits: ${results.edits
      .slice(0, 6)
      .map((e) => `${e.kind} ${e.checkMs.toFixed(1)}ms [${e.codes}]`)
      .join("; ")} ...`,
  )

  if (timerTest && server.nextTimerMs) {
    results.timers = []
    for (let k = 0; k < 3; k++) {
      const wait = server.nextTimerMs()
      if (wait < 0) break
      await new Promise((res) => setTimeout(res, wait + 20))
      const t = now()
      const out = await server.tick()
      const tickMs = now() - t
      const pr = await c.request("textDocument/diagnostic", {
        textDocument: { uri: app },
      })
      results.timers.push({
        waitedMs: wait,
        tickMs,
        tickMessages: out.length,
        pullAfterMs: pr.ms,
        nextTimerMs: server.nextTimerMs(),
        mem: mem(),
      })
    }
  }

  r = await c.request("shutdown", undefined)
  results.requests.shutdown = { ms: r.ms, ok: r.result === null }
  await c.notify("exit", undefined)
  results.serverRequests = c.serverRequests
  results.totalBackgroundMs = c.totalBgMs
  return results
}

export function summarize(results) {
  const q = (arr, f) =>
    arr[Math.min(arr.length - 1, Math.floor(f * arr.length))]
  const sorted = (xs) => [...xs].sort((a, b) => a - b)
  const ms = sorted(results.edits.map((e) => e.checkMs))
  const mib = (b) => (b == null ? null : +(b / 2 ** 20).toFixed(1))
  const byKind = Object.fromEntries(
    ["append", "fix", "break"].map((k) => [
      k,
      [
        ...new Set(
          results.edits.filter((e) => e.kind === k).map((e) => e.codes),
        ),
      ],
    ]),
  )
  const steady = results.edits.slice(1)
  return {
    openMs: results.open.map((o) => +o.ms.toFixed(1)),
    openBackgroundMs: results.open.map((o) => +o.bgMs.toFixed(1)),
    firstDiagnosticsMs: +results.firstDiagnosticsMs.toFixed(1),
    firstPulls: Object.fromEntries(
      Object.entries(results.firstPulls).map(([k, v]) => [
        k,
        `${v.ms.toFixed(1)}ms [${v.codes.join(",")}]`,
      ]),
    ),
    requests: Object.fromEntries(
      Object.entries(results.requests).map(([k, v]) => [
        k,
        v.msRepeat === undefined
          ? +v.ms.toFixed(1)
          : `${v.ms.toFixed(1)} / ${v.msRepeat.toFixed(1)}`,
      ]),
    ),
    requestSummaries: Object.fromEntries(
      Object.entries(results.requests)
        .filter(([, v]) => v.summary !== undefined)
        .map(([k, v]) => [k, v.summary ?? v.error]),
    ),
    firstEditCheckMs: +results.edits[0].checkMs.toFixed(1),
    firstEditBackgroundMs: +results.edits[0].bgMs.toFixed(1),
    editMedianMs: +q(ms, 0.5).toFixed(1),
    editP90Ms: +q(ms, 0.9).toFixed(1),
    editMaxMs: +ms.at(-1).toFixed(1),
    didChangeMedianMs: +q(sorted(results.edits.map((e) => e.ms)), 0.5).toFixed(
      2,
    ),
    pullMedianMs: +q(sorted(steady.map((e) => e.pullMs)), 0.5).toFixed(1),
    hoverAfterEditMedianMs: +q(
      sorted(results.edits.map((e) => e.hoverMs)),
      0.5,
    ).toFixed(1),
    editBackgroundMedianMs: +q(sorted(steady.map((e) => e.bgMs)), 0.5).toFixed(
      1,
    ),
    codesByKind: byKind,
    memMiB: Object.fromEntries(
      Object.entries(results.mem).map(([k, v]) => [k, mib(v)]),
    ),
    timers: results.timers,
    totalBackgroundMs: +results.totalBackgroundMs.toFixed(0),
  }
}
