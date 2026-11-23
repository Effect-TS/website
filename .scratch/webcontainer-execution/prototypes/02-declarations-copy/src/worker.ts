// The tsrs worker side of the spike: the real @website/tsrs-lsp-wasm host over
// a MemoryFileSystem, fed bulk node_modules copies from the page.
import {
  MemoryFileSystem,
  mountTypesPack,
  startLspHost,
  workspaceUri,
  WORKSPACE_ROOT_URI,
  type LspHost,
} from "../../../../../packages/tsrs-lsp-wasm/src/index.ts"

declare const self: {
  postMessage: (message: unknown) => void
  onmessage: ((event: { readonly data: any }) => void) | null
}

interface Diagnostic {
  readonly code?: number | string
  readonly message: string
  readonly severity?: number
  readonly range: { readonly start: { readonly line: number } }
}

let host: LspHost
const fs = new MemoryFileSystem()
const received = new Map<number, any>()
let nextId = 1
const workspaceFiles: Record<string, string> = {}

const request = async (method: string, params: unknown) => {
  const id = nextId++
  await host.send(JSON.stringify({ jsonrpc: "2.0", id, method, params }))
  const r = received.get(id)
  received.delete(id)
  if (r === undefined) throw new Error(`no response to ${method}`)
  if (r.error) throw new Error(`${method}: ${r.error.message}`)
  return r.result
}
const notify = (method: string, params: unknown) =>
  host.send(JSON.stringify({ jsonrpc: "2.0", method, params }))

const OPEN = ["src/main.ts", "src/DevTools.ts"]
const pullAll = async () => {
  const out: Record<string, Array<string>> = {}
  for (const rel of OPEN) {
    const result = (await request("textDocument/diagnostic", {
      textDocument: { uri: workspaceUri(rel) },
    })) as { items: Array<Diagnostic> }
    out[rel] = result.items.map(
      (d) =>
        `sev${d.severity} ${d.code} L${d.range.start.line + 1}: ${d.message.slice(0, 100)}`,
    )
  }
  return out
}

const hover = async (rel: string, line: number, character: number) =>
  JSON.stringify(
    await request("textDocument/hover", {
      textDocument: { uri: workspaceUri(rel) },
      position: { line, character },
    }),
  ).slice(0, 300)

const removeNodeModules = () => {
  if (fs.exists("/workspace/node_modules")) fs.remove("/workspace/node_modules")
}

self.onmessage = async (event) => {
  const msg = event.data
  try {
    switch (msg.type) {
      case "start": {
        const t0 = performance.now()
        Object.assign(workspaceFiles, msg.files)
        host = await startLspHost({
          module: fetch(msg.wasmUrl),
          fs,
          files: msg.files,
          tsconfig: null,
          onMessage: (m) => {
            const parsed = JSON.parse(m)
            if (parsed.id !== undefined && parsed.method === undefined)
              received.set(parsed.id, parsed)
          },
        })
        await request("initialize", {
          processId: null,
          rootUri: WORKSPACE_ROOT_URI,
          workspaceFolders: [{ uri: WORKSPACE_ROOT_URI, name: "workspace" }],
          capabilities: {
            textDocument: {
              diagnostic: { dynamicRegistration: false },
              hover: { contentFormat: ["markdown", "plaintext"] },
            },
            workspace: { didChangeWatchedFiles: { dynamicRegistration: true } },
          },
        })
        await notify("initialized", {})
        for (const rel of OPEN)
          await notify("textDocument/didOpen", {
            textDocument: {
              uri: workspaceUri(rel),
              languageId: "typescript",
              version: 1,
              text: msg.files[rel],
            },
          })
        const startMs = performance.now() - t0
        const t1 = performance.now()
        const diagnostics = await pullAll()
        self.postMessage({
          type: "started",
          startMs,
          firstPullMs: performance.now() - t1,
          diagnostics,
        })
        break
      }
      case "mount": {
        // msg.pack: ArrayBuffer (TSPK) or msg.files: Record<path under node_modules, string>
        removeNodeModules()
        const t0 = performance.now()
        let count = 0
        if (msg.pack) count = mountTypesPack(fs, msg.pack).files.length
        else
          for (const [p, c] of Object.entries(
            msg.files as Record<string, string>,
          )) {
            fs.writeFile(`/workspace/node_modules/${p}`, c)
            count++
          }
        const mountMs = performance.now() - t0
        // The host flushes the watched-file events before this pull.
        const t1 = performance.now()
        const diagnostics = await pullAll()
        const pullMs = performance.now() - t1
        const hoverRuntime = await hover("src/main.ts", 0, 15) // NodeRuntime
        const hoverSocket = await hover("src/DevTools.ts", 0, 11) // NodeSocket
        self.postMessage({
          type: "mounted",
          label: msg.label,
          count,
          mountMs,
          pullMs,
          diagnostics,
          hoverRuntime,
          hoverSocket,
          memoryBytes: host.memoryBytes(),
        })
        break
      }
      case "probe": {
        // Write a probe file that uses node:* and effect, check its diagnostics.
        const rel = "src/probe.ts"
        const text = msg.text as string
        await notify("textDocument/didOpen", {
          textDocument: {
            uri: workspaceUri(rel),
            languageId: "typescript",
            version: 1,
            text,
          },
        })
        const result = (await request("textDocument/diagnostic", {
          textDocument: { uri: workspaceUri(rel) },
        })) as { items: Array<Diagnostic> }
        await notify("textDocument/didClose", {
          textDocument: { uri: workspaceUri(rel) },
        })
        self.postMessage({
          type: "probed",
          diagnostics: result.items.map(
            (d) =>
              `sev${d.severity} ${d.code} L${d.range.start.line + 1}: ${d.message.slice(0, 100)}`,
          ),
        })
        break
      }
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      message: String((error as Error)?.stack ?? error),
    })
  }
}
