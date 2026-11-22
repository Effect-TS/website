// Feature probe: one session that exercises every Effect-touched LSP feature and every request type the Scratchpad
// client sends, and returns a normalized JSON dump (positions, texts, codes; no timings in the compared part) so
// that native and wasm dumps can be diffed (compare.mjs). Shared by Node and the browser worker.
import {
  applyTextEdits,
  editsFor,
  makeClient,
  pos,
  richCapabilities,
  USER_PREFERENCES,
} from "./client.js"
import { ROOT_URI, SOURCES, uriOf } from "./workspace.js"

// Paths of bundled lib files differ (native: next to the binary; wasm: the bundled fs); keep the basename.
const normUri = (u) => {
  if (typeof u !== "string") return u
  if (u.startsWith(ROOT_URI + "/")) return u.slice(ROOT_URI.length + 1)
  const m = /(lib\.[^/]*\.d\.ts)$/.exec(u)
  return m ? `<lib>/${m[1]}` : u
}
const r2s = (r) =>
  r
    ? `${r.start.line}:${r.start.character}-${r.end.line}:${r.end.character}`
    : null
const normDiag = (d) => ({
  code: d.code,
  severity: d.severity,
  range: r2s(d.range),
  source: d.source,
  message: d.message,
  tags: d.tags,
  related: d.relatedInformation?.map(
    (ri) =>
      `${normUri(ri.location.uri)}@${r2s(ri.location.range)}: ${ri.message}`,
  ),
  data: d.data === undefined ? undefined : "<data>",
  codeDescription: d.codeDescription?.href,
})
const hoverText = (h) => {
  if (!h) return null
  const c = h.contents
  if (typeof c === "string") return c
  if (Array.isArray(c))
    return c.map((x) => (typeof x === "string" ? x : x.value)).join("\n---\n")
  return c?.value ?? JSON.stringify(c)
}
const normLocations = (l) =>
  l == null
    ? null
    : (Array.isArray(l) ? l : [l]).map(
        (x) =>
          `${normUri(x.uri ?? x.targetUri)}@${r2s(x.range ?? x.targetSelectionRange)}`,
      )
const normSymbols = (syms) =>
  (syms ?? []).map((s) => ({
    name: s.name,
    kind: s.kind,
    detail: s.detail || undefined,
    range: r2s(s.range ?? s.location?.range),
    children: s.children?.length ? normSymbols(s.children) : undefined,
  }))
const normEdit = (we) => {
  if (!we) return null
  const out = {}
  for (const [u, edits] of Object.entries(we.changes ?? {}))
    out[normUri(u)] = edits.map(
      (e) => `${r2s(e.range)}:${JSON.stringify(e.newText)}`,
    )
  for (const dc of we.documentChanges ?? [])
    if (dc.textDocument)
      out[normUri(dc.textDocument.uri)] = dc.edits.map(
        (e) => `${r2s(e.range)}:${JSON.stringify(e.newText)}`,
      )
  return out
}
const normAction = (a) => ({
  title: a.title,
  kind: a.kind,
  isPreferred: a.isPreferred || undefined,
  disabled: a.disabled?.reason,
  hasEdit: !!a.edit,
  hasData: a.data !== undefined,
  command: a.command?.command,
  diagnostics: a.diagnostics?.map((d) => d.code),
})
const normCompletionItem = (i) => ({
  label: i.label,
  kind: i.kind,
  detail: i.detail,
  sortText: i.sortText,
  filterText: i.filterText,
  insertText: i.insertText,
  insertTextFormat: i.insertTextFormat,
  textEdit: i.textEdit
    ? `${r2s(i.textEdit.range ?? i.textEdit.insert)}:${i.textEdit.newText}`
    : undefined,
  labelDetails: i.labelDetails,
  source: i.data?.autoImport?.moduleSpecifier ?? i.labelDetails?.description,
  additionalTextEdits: i.additionalTextEdits?.map(
    (e) => `${r2s(e.range)}:${JSON.stringify(e.newText)}`,
  ),
  documentation:
    typeof i.documentation === "string"
      ? i.documentation
      : i.documentation?.value,
})

export async function runFeatures(server, { log = () => {} } = {}) {
  const c = makeClient(server)
  const out = { compared: {}, timings: {}, notes: [] }
  const K = out.compared
  const T = out.timings
  const docs = new Map(
    Object.entries(SOURCES).map(([rel, text]) => [
      uriOf(rel),
      { text, version: 1 },
    ]),
  )
  const timeIt = (name, ms) => {
    ;(T[name] ??= []).push(+ms.toFixed(2))
  }
  const req = async (name, method, params) => {
    const r = await c.request(method, params)
    timeIt(name, r.ms)
    if (r.error) return { error: r.error.message }
    return r.result
  }
  const setText = async (uri, text) => {
    const d = docs.get(uri)
    d.text = text
    d.version++
    const r = await c.notify("textDocument/didChange", {
      textDocument: { uri, version: d.version },
      contentChanges: [{ text }],
    })
    timeIt("didChange", r.ms)
  }
  const pull = async (uri, name = "pull") => {
    const r = await req(name, "textDocument/diagnostic", {
      textDocument: { uri },
    })
    return r?.items ?? r
  }

  // initialize / initialized
  const init = await c.request("initialize", {
    processId: null,
    clientInfo: { name: "tsrs-effect-probe" },
    rootUri: ROOT_URI,
    capabilities: richCapabilities(),
    initializationOptions: { userPreferences: USER_PREFERENCES },
  })
  timeIt("initialize", init.ms)
  const caps = init.result.capabilities
  K.serverCapabilities = {
    keys: Object.keys(caps).sort(),
    codeActionKinds: caps.codeActionProvider?.codeActionKinds,
    codeActionResolve: caps.codeActionProvider?.resolveProvider,
    completionTriggers: caps.completionProvider?.triggerCharacters,
    completionResolve: caps.completionProvider?.resolveProvider,
    diagnosticProvider: caps.diagnosticProvider,
    inlayHintProvider: caps.inlayHintProvider,
  }
  await c.notify("initialized", {})
  K.serverRequests = [...c.serverRequests]

  // Open every file, as the Scratchpad's MultiFileLspWorkspace does.
  for (const [uri, d] of docs) {
    const r = await c.notify("textDocument/didOpen", {
      textDocument: { uri, languageId: "typescript", version: 1, text: d.text },
    })
    timeIt("didOpen", r.ms)
  }
  K.pushAfterOpen = Object.fromEntries(
    [...c.pushes].map(([u, ds]) => [normUri(u), ds.map(normDiag)]),
  )

  // 1. Diagnostics, pulled per file.
  K.diagnostics = {}
  const diagsByUri = {}
  for (const uri of docs.keys()) {
    const items = await pull(uri, "pullFirst")
    diagsByUri[uri] = items
    K.diagnostics[normUri(uri)] = Array.isArray(items)
      ? items.map(normDiag)
      : items
  }
  log(
    `diagnostics: ${JSON.stringify(Object.fromEntries(Object.entries(K.diagnostics).map(([k, v]) => [k, Array.isArray(v) ? v.map((d) => d.code) : v])))}`,
  )

  // 2. Code actions for every diagnostic (quick fixes, Effect fixes, disable comments).
  K.codeActions = {}
  for (const [uri, items] of Object.entries(diagsByUri)) {
    if (!Array.isArray(items)) continue
    for (const d of items) {
      const actions = await req("codeAction", "textDocument/codeAction", {
        textDocument: { uri },
        range: d.range,
        context: { diagnostics: [d], triggerKind: 1 },
      })
      K.codeActions[`${normUri(uri)} ${d.code}@${r2s(d.range)}`] =
        Array.isArray(actions) ? actions.map(normAction) : actions
    }
  }

  // Apply fixes: find the action, resolve it if it carries no edit, apply its edit, re-pull, and check that the
  // diagnostic it targeted is gone. Sequential on the same file, as an editor would.
  K.appliedFixes = []
  const applyFix = async (uri, code, pick, label) => {
    const items = await pull(uri)
    const d = items.find((x) => x.code === code)
    if (!d)
      return K.appliedFixes.push({ label, error: `no ${code} diagnostic` })
    const actions = await req("codeAction", "textDocument/codeAction", {
      textDocument: { uri },
      range: d.range,
      context: { diagnostics: [d], triggerKind: 1 },
    })
    const a = (Array.isArray(actions) ? actions : []).find(pick)
    if (!a)
      return K.appliedFixes.push({
        label,
        error: "no matching action",
        titles: (actions ?? []).map?.((x) => x.title),
      })
    let edit = a.edit
    let resolved = false
    if (!edit && a.data !== undefined) {
      const ra = await req("codeActionResolve", "codeAction/resolve", a)
      edit = ra?.edit
      resolved = true
    }
    const before = docs.get(uri).text
    const after = applyTextEdits(before, editsFor(edit, uri))
    await setText(uri, after)
    const items2 = await pull(uri)
    const stillThere =
      Array.isArray(items2) &&
      items2.some((x) => x.code === code && r2s(x.range) === r2s(d.range))
    K.appliedFixes.push({
      label,
      title: a.title,
      resolved,
      edit: normEdit(edit),
      changedLines: diffLines(before, after),
      diagnosticCleared: !stillThere,
      codesAfter: Array.isArray(items2) ? items2.map((x) => x.code) : items2,
    })
  }
  const issues = uriOf("src/issues.ts")
  await applyFix(
    issues,
    377001,
    (a) => /yield\*/i.test(a.title) || /yield/i.test(a.title),
    "floatingEffect: add yield*",
  )
  await applyFix(
    issues,
    377008,
    (a) => /yield\*/.test(a.title),
    "missingStarInYield: replace with yield*",
  )
  await applyFix(
    issues,
    377006,
    (a) => /^Add return/i.test(a.title),
    "missingReturnYieldStar: add return",
  )
  await applyFix(
    issues,
    377012,
    (a) => /disable/i.test(a.title) && /line/i.test(a.title),
    "tryCatchInEffectGen: disable for this line",
  )
  await applyFix(
    issues,
    377017,
    (a) => /disable/i.test(a.title) && /file/i.test(a.title),
    "unnecessaryEffectGen: disable for the file",
  )
  await applyFix(
    uriOf("src/main.ts"),
    377001,
    (a) => /yield/i.test(a.title),
    "main.ts floatingEffect: add yield*",
  )
  K.issuesAfterFixes = docs.get(issues).text

  // 3. Refactors at chosen points (Effect refactors are kind refactor.rewrite, patch 017).
  K.refactors = {}
  const ref = uriOf("src/refactors.ts")
  const rt = SOURCES["src/refactors.ts"]
  const refactorPoints = {
    "async function name": pos(rt, "fetchCount", 2),
    "Effect.gen in genToFn": pos(rt, "Effect.gen", 8, "genToFn"),
    "type alias Person": pos(rt, "Person", 2),
    "pipe call": pos(rt, ".pipe(", 2),
    "Layer.succeed DbLive": pos(rt, "DbLive", 2),
    "Context.Service class Db": pos(rt, "class Db", 7),
    "useDb Effect.gen": pos(rt, "Effect.gen", 8, "useDb"),
  }
  const refactorActions = {}
  for (const [name, p] of Object.entries(refactorPoints)) {
    const actions = await req("codeActionRefactor", "textDocument/codeAction", {
      textDocument: { uri: ref },
      range: { start: p, end: p },
      context: { diagnostics: [], only: ["refactor"], triggerKind: 2 },
    })
    refactorActions[name] = Array.isArray(actions) ? actions : []
    K.refactors[name] = Array.isArray(actions)
      ? actions.map(normAction)
      : actions
  }
  // Apply two refactors on a copy (the file is restored afterwards).
  K.appliedRefactors = []
  for (const [name, pick] of [
    [
      "async function name",
      (a) => /Effect\.gen/.test(a.title) && !/failure|error/i.test(a.title),
    ],
    ["Effect.gen in genToFn", (a) => /Effect\.fn/.test(a.title)],
    ["type alias Person", (a) => /Schema/.test(a.title)],
  ]) {
    const a = refactorActions[name].find(pick)
    if (!a) {
      K.appliedRefactors.push({ name, error: "no matching action" })
      continue
    }
    let edit = a.edit
    if (!edit && a.data !== undefined)
      edit = (await req("codeActionResolve", "codeAction/resolve", a))?.edit
    const after = applyTextEdits(rt, editsFor(edit, ref))
    await setText(ref, after)
    const items = await pull(ref)
    K.appliedRefactors.push({
      name,
      title: a.title,
      changedLines: diffLines(rt, after),
      codesAfter: Array.isArray(items) ? items.map((x) => x.code) : items,
    })
    await setText(ref, rt)
  }

  // 4. Hover (Effect quick info: success/error/requirements; yield* hover).
  K.hover = {}
  const app = uriOf("src/app.ts")
  const at = SOURCES["src/app.ts"]
  const main = uriOf("src/main.ts")
  const mt = docs.get(main).text
  const hoverPoints = [
    [ref, rt, "useDb (Effect value)", pos(rt, "useDb", 2)],
    [ref, rt, "yield* keyword (db.query)", pos(rt, "yield* db.query", 1)],
    [ref, rt, "yield* asterisk (Db)", pos(rt, "yield* Db", 5)],
    [ref, rt, "rows", pos(rt, "rows =", 1)],
    [ref, rt, "DbLive (Layer)", pos(rt, "DbLive", 2)],
    [ref, rt, "Db class", pos(rt, "class Db", 7)],
    [ref, rt, "genToFn", pos(rt, "genToFn", 2)],
    [app, at, "program (Effect with requirement)", pos(at, "const program", 8)],
    [app, at, "yield* clock.now", pos(at, "yield* clock.now", 2)],
    [app, at, "run", pos(at, "const run", 7)],
    [main, mt, "program in main.ts", pos(mt, "const program", 8)],
    [main, mt, "greeting", pos(mt, "greeting =", 2)],
  ]
  for (const [uri, , name, position] of hoverPoints) {
    const h = await req("hover", "textDocument/hover", {
      textDocument: { uri },
      position,
    })
    K.hover[name] = h?.error ? h : { text: hoverText(h), range: r2s(h?.range) }
  }

  // 5. Completions. A scratch file whose text is replaced for each probe; `|` marks the cursor.
  K.completions = {}
  const cu = uriOf("src/complete.ts")
  docs.set(cu, { text: "", version: 1 })
  await c.notify("textDocument/didOpen", {
    textDocument: {
      uri: cu,
      languageId: "typescript",
      version: 1,
      text: "export {}\n",
    },
  })
  const completionProbes = [
    [
      "Effect. (genFunctionStar)",
      'import { Effect } from "effect"\nexport const a = Effect.|',
      { triggerKind: 2, triggerCharacter: "." },
      (i) => /function\*/.test(i.label),
    ],
    [
      "extends Context. (contextSelfInClasses)",
      'import { Context } from "effect"\nexport class MyService extends Context.|',
      { triggerKind: 2, triggerCharacter: "." },
      (i) => /MyService/.test(i.label) || /MyService/.test(i.insertText ?? ""),
    ],
    [
      "extends Schema. (schemaSelfInClasses)",
      'import { Schema } from "effect"\nexport class Person extends Schema.|',
      { triggerKind: 2, triggerCharacter: "." },
      (i) => /Person/.test(i.label) || /Person/.test(i.insertText ?? ""),
    ],
    [
      "// @ (effectDiagnosticsComment)",
      'import { Effect } from "effect"\n// @|\nexport const a = Effect.succeed(1)',
      { triggerKind: 2, triggerCharacter: "@" },
      (i) => /effect-diagnostics/.test(i.label),
    ],
    [
      "Duration string (durationInput)",
      'import { Effect } from "effect"\nexport const a = Effect.sleep("|")',
      { triggerKind: 2, triggerCharacter: '"' },
      (i) => /seconds|millis|minutes/.test(i.label),
    ],
    [
      "Effect.gen body (in-generator)",
      'import { Effect } from "effect"\nexport const a = Effect.gen(function* () {\n  const x = yield* Effect.succeed(1)\n  x.|\n})',
      { triggerKind: 2, triggerCharacter: "." },
      (i) => false,
    ],
    [
      "auto-import Stream",
      "export const s = Strea|",
      { triggerKind: 1 },
      (i) => i.label === "Stream",
    ],
    [
      "auto-import Schema",
      "export const s = Schem|",
      { triggerKind: 1 },
      (i) => i.label === "Schema",
    ],
  ]
  for (const [name, src, context, isEffectItem] of completionProbes) {
    const cursor = src.indexOf("|")
    const text = src.replace("|", "")
    await setText(cu, text)
    const before = text.slice(0, cursor)
    const position = {
      line: before.split("\n").length - 1,
      character: cursor - (before.lastIndexOf("\n") + 1),
    }
    const res = await req("completion", "textDocument/completion", {
      textDocument: { uri: cu },
      position,
      context,
    })
    const items = Array.isArray(res) ? res : (res?.items ?? [])
    const effectItems = items.filter(isEffectItem)
    const entry = {
      count: items.length,
      isIncomplete: res?.isIncomplete,
      itemDefaults: res?.itemDefaults
        ? Object.keys(res.itemDefaults)
        : undefined,
      effectItems: effectItems.map(normCompletionItem),
      first: items
        .slice()
        .sort(
          (a, b) =>
            (a.sortText ?? "").localeCompare(b.sortText ?? "") ||
            a.label.localeCompare(b.label),
        )
        .slice(0, 8)
        .map((i) => i.label),
    }
    // completionItem/resolve on the first Effect item (or the first item).
    const target = effectItems[0] ?? items[0]
    if (target && caps.completionProvider?.resolveProvider) {
      const resolved = await req(
        "completionResolve",
        "completionItem/resolve",
        target,
      )
      entry.resolved = resolved?.error
        ? resolved
        : normCompletionItem(resolved ?? {})
    }
    K.completions[name] = entry
  }
  await c.notify("textDocument/didClose", { textDocument: { uri: cu } })
  docs.delete(cu)

  // 6. Inlay hints (Effect suppresses return-type hints on Effect.gen / Effect.fn generators when `inlays` is on).
  K.inlayHints = {}
  for (const uri of [ref, app, main]) {
    const lines = docs.get(uri).text.split("\n").length
    const hints = await req("inlayHint", "textDocument/inlayHint", {
      textDocument: { uri },
      range: {
        start: { line: 0, character: 0 },
        end: { line: lines, character: 0 },
      },
    })
    K.inlayHints[normUri(uri)] = Array.isArray(hints)
      ? hints.map(
          (h) =>
            `${h.position.line}:${h.position.character} k${h.kind} ${typeof h.label === "string" ? h.label : h.label.map((p) => p.value).join("")}`,
        )
      : hints
  }

  // 7. Document symbols (Effect adds layer / service detail, patch 024).
  K.documentSymbols = {}
  for (const uri of [ref, app])
    K.documentSymbols[normUri(uri)] = normSymbols(
      await req("documentSymbol", "textDocument/documentSymbol", {
        textDocument: { uri },
      }),
    )

  // 8. The rest of what the Scratchpad client sends (lsp-client 6.3.1: definition, declaration, typeDefinition,
  //    implementation, references, rename, formatting, signatureHelp) plus documentHighlight and prepareRename.
  const mt2 = docs.get(main).text
  const greetPos = pos(mt2, "greet(", 2)
  K.definition = normLocations(
    await req("definition", "textDocument/definition", {
      textDocument: { uri: main },
      position: greetPos,
    }),
  )
  K.declaration = normLocations(
    await req("declaration", "textDocument/declaration", {
      textDocument: { uri: main },
      position: greetPos,
    }),
  )
  K.typeDefinition = normLocations(
    await req("typeDefinition", "textDocument/typeDefinition", {
      textDocument: { uri: main },
      position: pos(mt2, "const program", 8),
    }),
  )
  K.implementation = normLocations(
    await req("implementation", "textDocument/implementation", {
      textDocument: { uri: app },
      position: pos(at, "Clock extends", 2),
    }),
  )
  K.references = normLocations(
    await req("references", "textDocument/references", {
      textDocument: { uri: main },
      position: greetPos,
      context: { includeDeclaration: true },
    }),
  )
  K.prepareRename = await req("prepareRename", "textDocument/prepareRename", {
    textDocument: { uri: main },
    position: greetPos,
  })
  if (K.prepareRename?.range)
    K.prepareRename = {
      range: r2s(K.prepareRename.range),
      placeholder: K.prepareRename.placeholder,
    }
  K.rename = normEdit(
    await req("rename", "textDocument/rename", {
      textDocument: { uri: main },
      position: greetPos,
      newName: "hello",
    }),
  )
  K.documentHighlight = (
    await req("documentHighlight", "textDocument/documentHighlight", {
      textDocument: { uri: main },
      position: greetPos,
    })
  )?.map?.((h) => `${r2s(h.range)} k${h.kind}`)
  K.signatureHelp = await (async () => {
    const s = await req("signatureHelp", "textDocument/signatureHelp", {
      textDocument: { uri: main },
      position: pos(mt2, 'greet("', 6),
      context: { triggerKind: 1, isRetrigger: false },
    })
    return s?.signatures
      ? {
          labels: s.signatures.map((x) => x.label),
          activeSignature: s.activeSignature,
          activeParameter: s.activeParameter,
        }
      : s
  })()
  // Formatting a deliberately unformatted file.
  const fu = uriOf("src/format.ts")
  const ugly =
    'import {Effect} from "effect"\nexport const   x=Effect.gen(function*(){\nconst a=yield* Effect.succeed( 1 )\n    return a})\n'
  await c.notify("textDocument/didOpen", {
    textDocument: { uri: fu, languageId: "typescript", version: 1, text: ugly },
  })
  const fmt = await req("formatting", "textDocument/formatting", {
    textDocument: { uri: fu },
    options: { tabSize: 2, insertSpaces: true },
  })
  K.formatting = Array.isArray(fmt) ? applyTextEdits(ugly, fmt) : fmt
  await c.notify("textDocument/didClose", { textDocument: { uri: fu } })

  // 9. Push diagnostics after all of the above (the server pushes only project-level ones; pull is the file path).
  K.pushTotal = Object.fromEntries(
    [...c.pushCount].map(([u, n]) => [normUri(u), n]),
  )

  const sd = await c.request("shutdown", undefined)
  K.shutdown = sd.result === null
  await c.notify("exit", undefined)
  out.serverRequests = c.serverRequests
  out.backgroundMs = c.totalBgMs
  out.memoryBytes = server.memoryBytes?.()
  return out
}

function diffLines(a, b) {
  const x = a.split("\n"),
    y = b.split("\n")
  let s = 0
  while (s < x.length && s < y.length && x[s] === y[s]) s++
  let e = 0
  while (
    e < x.length - s &&
    e < y.length - s &&
    x[x.length - 1 - e] === y[y.length - 1 - e]
  )
    e++
  return {
    from: s,
    removed: x.slice(s, x.length - e),
    added: y.slice(s, y.length - e),
  }
}
