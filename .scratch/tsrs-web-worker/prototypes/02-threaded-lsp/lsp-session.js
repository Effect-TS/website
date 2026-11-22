// The measured LSP session, shared by the Node driver (lsp-drive.mjs) and the browser harness (browser/page.js).
const enc = new TextEncoder()
const dec = new TextDecoder()
const concat = (a, b) => {
  const r = new Uint8Array(a.length + b.length)
  r.set(a, 0)
  r.set(b, a.length)
  return r
}
const findHeaderEnd = (b) => {
  for (let i = 0; i + 3 < b.length; i++)
    if (b[i] === 13 && b[i + 1] === 10 && b[i + 2] === 13 && b[i + 3] === 10)
      return i
  return -1
}

// A JSON-RPC client over LSP base-protocol framing. `write(Uint8Array)` sends bytes to the server; feed the
// server's output to `onData(Uint8Array)`. Server-to-client requests are answered with null (configuration: nulls).
export function makeClient(write, { log = () => {}, timeoutMs = 300000 } = {}) {
  let nextId = 1
  const pending = new Map()
  let buf = new Uint8Array(0)
  const notifications = []
  const send = (msg) => {
    const body = enc.encode(JSON.stringify({ jsonrpc: "2.0", ...msg }))
    write(concat(enc.encode(`Content-Length: ${body.length}\r\n\r\n`), body))
  }
  const onData = (chunk) => {
    buf = concat(
      buf,
      chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk),
    )
    for (;;) {
      const headerEnd = findHeaderEnd(buf)
      if (headerEnd < 0) return
      const header = dec.decode(buf.subarray(0, headerEnd))
      const len = Number(/Content-Length: (\d+)/i.exec(header)[1])
      if (buf.length < headerEnd + 4 + len) return
      const msg = JSON.parse(
        dec.decode(buf.subarray(headerEnd + 4, headerEnd + 4 + len)),
      )
      buf = buf.slice(headerEnd + 4 + len)
      if (msg.method && msg.id !== undefined) {
        // Server-to-client request: registerCapability, workDoneProgress/create, configuration.
        log("server request", msg.method)
        const result =
          msg.method === "workspace/configuration"
            ? msg.params.items.map(() => null)
            : null
        send({ id: msg.id, result })
      } else if (msg.method) {
        notifications.push(msg)
        if (msg.method === "window/logMessage")
          log("log", msg.params.message.slice(0, 200))
      } else if (pending.has(msg.id)) {
        const p = pending.get(msg.id)
        pending.delete(msg.id)
        p({ msg, t: performance.now() })
      }
    }
  }
  const request = (method, params) =>
    new Promise((resolve, reject) => {
      const id = nextId++
      const t0 = performance.now()
      const timer = setTimeout(
        () => reject(new Error(`timeout: ${method}`)),
        timeoutMs,
      )
      pending.set(id, ({ msg, t }) => {
        clearTimeout(timer)
        resolve({ ...msg, ms: t - t0 })
      })
      send({ id, method, params })
    })
  const notify = (method, params) => send({ method, params })
  return { onData, request, notify, notifications }
}

export async function session(
  client,
  {
    root,
    mainText,
    edits,
    report,
    quiet = false,
    gapMs = 0,
    sample = async () => ({}),
  },
) {
  const uri = `file://${root}/main.ts`
  const t0 = performance.now()
  const init = await client.request("initialize", {
    processId: null,
    rootUri: `file://${root}`,
    workspaceFolders: [{ uri: `file://${root}`, name: "ws" }],
    capabilities: {
      textDocument: {
        diagnostic: { dynamicRegistration: true },
        hover: { contentFormat: ["markdown", "plaintext"] },
        completion: { completionItem: { snippetSupport: false } },
        synchronization: { didSave: false },
      },
      workspace: { configuration: true, workspaceFolders: true },
    },
  })
  report(
    "initialize",
    init.ms,
    init.result
      ? `ok, diagnosticProvider=${JSON.stringify(init.result.capabilities?.diagnosticProvider ?? null)}`
      : JSON.stringify(init.error),
  )
  client.notify("initialized", {})
  client.notify("textDocument/didOpen", {
    textDocument: { uri, languageId: "typescript", version: 1, text: mainText },
  })
  const tOpen = performance.now()
  const diag = await client.request("textDocument/diagnostic", {
    textDocument: { uri },
  })
  const items = diag.result?.items ?? []
  report(
    "first diagnostics (didOpen to pull reply)",
    performance.now() - tOpen,
    JSON.stringify(
      items.map((d) => [d.code, d.range.start.line, d.message.slice(0, 80)]),
    ) + (diag.error ? " ERR " + JSON.stringify(diag.error) : ""),
  )
  report(
    "process start to first diagnostics",
    performance.now() - t0,
    JSON.stringify(await sample()),
  )
  const hover = await client.request("textDocument/hover", {
    textDocument: { uri },
    position: { line: 5, character: 9 },
  })
  report(
    "hover (now)",
    hover.ms,
    JSON.stringify(hover.result?.contents ?? hover.error ?? null).slice(0, 120),
  )
  const hover2 = await client.request("textDocument/hover", {
    textDocument: { uri },
    position: { line: 3, character: 8 },
  })
  report(
    "hover (program)",
    hover2.ms,
    JSON.stringify(hover2.result?.contents ?? hover2.error ?? null).slice(
      0,
      120,
    ),
  )
  const comp = await client.request("textDocument/completion", {
    textDocument: { uri },
    position: { line: 7, character: 9 },
  })
  const compItems = Array.isArray(comp.result)
    ? comp.result
    : (comp.result?.items ?? [])
  report(
    "completion (Effect.)",
    comp.ms,
    `${compItems.length} items, e.g. ${compItems
      .slice(0, 5)
      .map((i) => i.label)
      .join(",")}` + (comp.error ? " ERR " + JSON.stringify(comp.error) : ""),
  )
  const def = await client.request("textDocument/definition", {
    textDocument: { uri },
    position: { line: 0, character: 10 },
  })
  report(
    "definition (Effect import)",
    def.ms,
    JSON.stringify(def.result ?? def.error).slice(0, 160),
  )
  let version = 1
  let text = mainText
  const editTimes = []
  for (let i = 0; i < edits; i++) {
    // Optional idle time before each edit, so background work started by the previous edit can finish.
    if (gapMs) await new Promise((r) => setTimeout(r, gapMs))
    version++
    // Toggle the planted error: odd edits fix it, even edits put it back, plus a changing trailing line.
    const fixed = i % 2 === 0
    text =
      mainText.replace(
        "const label: string = now",
        fixed ? "const label: number = now" : "const label: string = now",
      ) + `export const v${i} = ${i}\n`
    client.notify("textDocument/didChange", {
      textDocument: { uri, version },
      contentChanges: [{ text }],
    })
    const tc = performance.now()
    const d = await client.request("textDocument/diagnostic", {
      textDocument: { uri },
    })
    editTimes.push(performance.now() - tc)
    if (!quiet)
      report(
        `edit ${i + 1} re-check (${fixed ? "fixed" : "error back"})`,
        performance.now() - tc,
        JSON.stringify(
          (d.result?.items ?? []).map((x) => [x.code, x.range.start.line]),
        ) + (d.error ? " ERR " + JSON.stringify(d.error) : ""),
      )
  }
  const sorted = [...editTimes].sort((a, b) => a - b)
  report(
    `edit re-check median of ${edits}`,
    sorted[Math.floor(sorted.length / 2)] ?? 0,
    `min ${sorted[0]?.toFixed(1)} max ${sorted.at(-1)?.toFixed(1)}`,
  )
  const hover3 = await client.request("textDocument/hover", {
    textDocument: { uri },
    position: { line: 5, character: 9 },
  })
  report(
    "hover after edits",
    hover3.ms,
    JSON.stringify(hover3.result?.contents ?? hover3.error ?? null).slice(
      0,
      80,
    ),
  )
  report("final sample", 0, JSON.stringify(await sample()))
  const sd = await client.request("shutdown")
  report("shutdown", sd.ms, "")
  client.notify("exit")
}

// Deep-recursion probe: opens deep.ts holding `export const x = 1 + 1 + ... ` with `terms` terms, pulls its
// diagnostics and hovers `x`. The checker recurses once per term (notes/wasm-build.md: ~800 B of shadow stack each).
export async function deepSession(client, { root, terms, report }) {
  const uri = `file://${root}/deep.ts`
  const init = await client.request("initialize", {
    processId: null,
    rootUri: `file://${root}`,
    capabilities: { textDocument: { diagnostic: {} } },
  })
  report("initialize", init.ms, init.error ? JSON.stringify(init.error) : "ok")
  client.notify("initialized", {})
  const text = `export const x = ${Array(terms).fill("1").join(" + ")}\n`
  client.notify("textDocument/didOpen", {
    textDocument: { uri, languageId: "typescript", version: 1, text },
  })
  const t = performance.now()
  const d = await client.request("textDocument/diagnostic", {
    textDocument: { uri },
  })
  report(
    `deep ${terms} terms: diagnostics`,
    performance.now() - t,
    JSON.stringify(
      d.result?.items?.map((i) => [i.code, i.message.slice(0, 60)]) ?? d.error,
    ),
  )
  const h = await client.request("textDocument/hover", {
    textDocument: { uri },
    position: { line: 0, character: 13 },
  })
  report(
    `deep ${terms} terms: hover`,
    h.ms,
    JSON.stringify(h.result?.contents ?? h.error ?? null).slice(0, 80),
  )
  const sd = await client.request("shutdown")
  report("shutdown", sd.ms, "")
  client.notify("exit")
}
