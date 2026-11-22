// A minimal LSP client over the pump interface ({ send(json) -> msgs, tick() -> msgs, status }), shared by the
// feature probe (features.js) and the timing session (session.js). Works with the wasm host (lsp-host.js, sync or
// async send) and with the native stdio adapter (native-server.mjs).
//
// It answers server-to-client requests the way the website bridge does (client/registerCapability -> null; Quirks.ts)
// and runs queued background work (status 3) right after each message, timing it separately, as prototype 03 did.

export function makeClient(server, { onLog = () => {} } = {}) {
  let nextId = 1
  const pushes = new Map() // uri -> last published diagnostics
  const pushCount = new Map()
  const serverRequests = []
  const logs = []
  let totalBgMs = 0
  const now = () => performance.now()

  const pump = async (msg) => {
    const t = now()
    let out = await server.send(JSON.stringify({ jsonrpc: "2.0", ...msg }))
    const ms = now() - t
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
        if (m.method === "textDocument/publishDiagnostics") {
          pushes.set(m.params.uri, m.params.diagnostics)
          pushCount.set(m.params.uri, (pushCount.get(m.params.uri) ?? 0) + 1)
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
    return {
      ms: r.ms,
      bgMs: r.bgMs,
      result: resp.result,
      error: resp.error,
      out: r.out,
    }
  }
  const notify = (method, params) => pump({ method, params })

  return {
    pump,
    request,
    notify,
    pushes,
    pushCount,
    serverRequests,
    logs,
    get totalBgMs() {
      return totalBgMs
    },
  }
}

/** Line/character of the `delta`-th UTF-16 unit after the first occurrence of `needle` (after `from`). */
export function pos(text, needle, delta = 0, from = 0) {
  const i = text.indexOf(
    needle,
    typeof from === "string" ? text.indexOf(from) : from,
  )
  if (i < 0) throw new Error(`needle not found: ${needle}`)
  return offsetToPos(text, i + delta)
}

export function offsetToPos(text, off) {
  const before = text.slice(0, off)
  const line = before.split("\n").length - 1
  return { line, character: off - (before.lastIndexOf("\n") + 1) }
}

export function posToOffset(text, p) {
  const lines = text.split("\n")
  let o = 0
  for (let i = 0; i < p.line; i++) o += lines[i].length + 1
  return o + p.character
}

/** Applies LSP TextEdits (any order, non-overlapping) to text. */
export function applyTextEdits(text, edits) {
  const sorted = [...edits]
    .map((e) => ({
      s: posToOffset(text, e.range.start),
      e: posToOffset(text, e.range.end),
      t: e.newText,
    }))
    .sort((a, b) => b.s - a.s || b.e - a.e)
  for (const { s, e, t } of sorted) text = text.slice(0, s) + t + text.slice(e)
  return text
}

/** The TextEdits a WorkspaceEdit makes to one uri (changes or documentChanges). */
export function editsFor(workspaceEdit, uri) {
  if (!workspaceEdit) return []
  const out = []
  if (workspaceEdit.changes?.[uri]) out.push(...workspaceEdit.changes[uri])
  for (const dc of workspaceEdit.documentChanges ?? [])
    if (dc.textDocument?.uri === uri) out.push(...dc.edits)
  return out
}

/** CodeMirror's @codemirror/lsp-client 6.3.1 capabilities (dist/index.js `clientCapabilities`), what the
 *  Scratchpad sends. */
export function codemirrorCapabilities() {
  return {
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
}

/** A VS Code-like capability set, so that code actions (literal + resolve), inlay hints, hierarchical document
 *  symbols, completion resolve and pull diagnostics are all on. Used by the feature probe. */
export function richCapabilities() {
  const caps = codemirrorCapabilities()
  Object.assign(caps.textDocument, {
    completion: {
      completionItem: {
        snippetSupport: true,
        documentationFormat: ["markdown", "plaintext"],
        insertReplaceSupport: true,
        labelDetailsSupport: true,
        resolveSupport: {
          properties: ["documentation", "detail", "additionalTextEdits"],
        },
        commitCharactersSupport: true,
        deprecatedSupport: true,
        tagSupport: { valueSet: [1] },
      },
      completionList: {
        itemDefaults: [
          "commitCharacters",
          "editRange",
          "insertTextFormat",
          "insertTextMode",
          "data",
        ],
      },
      contextSupport: true,
    },
    codeAction: {
      dynamicRegistration: false,
      isPreferredSupport: true,
      disabledSupport: true,
      dataSupport: true,
      resolveSupport: { properties: ["edit"] },
      codeActionLiteralSupport: {
        codeActionKind: {
          valueSet: [
            "",
            "quickfix",
            "refactor",
            "refactor.extract",
            "refactor.inline",
            "refactor.rewrite",
            "source",
            "source.organizeImports",
            "source.fixAll",
          ],
        },
      },
    },
    inlayHint: {
      dynamicRegistration: false,
      resolveSupport: {
        properties: ["tooltip", "textEdits", "label.location"],
      },
    },
    documentSymbol: {
      hierarchicalDocumentSymbolSupport: true,
      symbolKind: { valueSet: Array.from({ length: 26 }, (_, i) => i + 1) },
    },
    publishDiagnostics: {
      relatedInformation: true,
      tagSupport: { valueSet: [1, 2] },
      codeDescriptionSupport: true,
      dataSupport: true,
      versionSupport: true,
    },
    // Pull diagnostics carry relatedInformation and tags only if these are set here (tsrs_ls lsconv/converters.rs
    // diagnostic_to_lsp_pull reads textDocument.diagnostic, not publishDiagnostics).
    diagnostic: {
      dynamicRegistration: false,
      relatedDocumentSupport: false,
      relatedInformation: true,
      tagSupport: { valueSet: [1, 2] },
      codeDescriptionSupport: true,
      dataSupport: true,
    },
    documentHighlight: {},
  })
  caps.workspace = { applyEdit: true, workspaceEdit: { documentChanges: true } }
  return caps
}

/** Preferences through initializationOptions.userPreferences (the server reads them under "js/ts" when the client
 *  has no workspace/configuration; server.rs request_configuration). */
export const USER_PREFERENCES = {
  includeInlayParameterNameHints: "all",
  includeInlayVariableTypeHints: true,
  includeInlayFunctionLikeReturnTypeHints: true,
  includeInlayPropertyDeclarationTypeHints: true,
  includeCompletionsForModuleExports: true,
  includeCompletionsWithInsertText: true,
  includeCompletionsWithSnippetText: true,
}
