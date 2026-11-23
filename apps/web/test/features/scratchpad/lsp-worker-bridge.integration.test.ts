/**
 * The worker's bridge against the real wasm language server, in Node: what
 * `lsp.worker.ts` wires up, minus the worker. The Workspace's tsconfig.json
 * is mirrored like any file (no hidden one), and types arrive later with
 * `ReplaceNodeModules`, as they do from the Container. The pack here is
 * collected from this repo's `effect`. Needs the built module:
 *   nix develop -c pnpm --filter @website/tsrs-lsp-wasm build
 */
import {
  encodeTypesPack,
  MemoryFileSystem,
  startLspHost,
  WORKSPACE_TSCONFIG,
  type LspHost,
} from "@website/tsrs-lsp-wasm"
import * as fs from "node:fs"
import { createRequire } from "node:module"
import * as path from "node:path"
import { afterAll, assert, beforeAll, describe, test } from "vite-plus/test"
import { DIAGNOSTIC_CLIENT_CAPABILITIES } from "../../../src/features/scratchpad/editor.ts"
import {
  makeLspWorkerBridge,
  QUARANTINE_DIAGNOSTIC_CODE,
  type LspWorkerBridge,
} from "../../../src/features/scratchpad/lsp-worker-bridge.ts"
import type { TypesMountResult } from "../../../src/features/scratchpad/worker-protocol.ts"
import { collectTypesPack } from "../../../../../packages/tsrs-lsp-wasm/scripts/types-pack.ts"
import { GREETER_FILES } from "./fixtures.ts"

const require = createRequire(import.meta.url)
const DIST = path.join(
  path.dirname(require.resolve("@website/tsrs-lsp-wasm/package.json")),
  "dist",
)
const WASM = path.join(DIST, "tsrs-effect-lsp.wasm")
const hasArtifacts = fs.existsSync(WASM)
const TSCONFIG = `${JSON.stringify(WORKSPACE_TSCONFIG, null, 2)}\n`

describe.runIf(!hasArtifacts)("worker bridge against the built module", () => {
  test("SKIPPED: @website/tsrs-lsp-wasm has not been built", (ctx) => {
    process.stderr.write(
      "\nSKIPPING the worker bridge integration test: build the module with\n" +
        "  nix develop -c pnpm --filter @website/tsrs-lsp-wasm build\n",
    )
    ctx.skip("@website/tsrs-lsp-wasm has not been built")
  })
})

interface Diagnostic {
  readonly code?: number | string
  readonly severity?: number
  readonly message: string
  readonly relatedInformation?: ReadonlyArray<{ readonly message: string }>
}

interface Push {
  readonly uri: string
  readonly version?: number
  readonly diagnostics: ReadonlyArray<Diagnostic>
}

const ROOT = "file:///workspace"
const uri = (relPath: string) => `${ROOT}/${relPath}`

const waitFor = async <A>(
  probe: () => A | undefined,
  label: string,
  timeoutMs = 20_000,
): Promise<A> => {
  const start = Date.now()
  for (;;) {
    const value = probe()
    if (value !== undefined) return value
    if (Date.now() - start > timeoutMs) throw new Error(`timed out: ${label}`)
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

describe.skipIf(!hasArtifacts)("worker bridge against the built module", () => {
  const pushes: Array<Push> = []
  const types: Array<TypesMountResult> = []
  const responses = new Map<number | string, unknown>()
  let host: LspHost
  let bridge: LspWorkerBridge
  let nextId = 1
  const versions = new Map<string, number>()

  const latest = (relPath: string, version?: number) => {
    for (let i = pushes.length - 1; i >= 0; i--) {
      const push = pushes[i]!
      if (push.uri !== uri(relPath)) continue
      if (version !== undefined && push.version !== version) return undefined
      return push
    }
    return undefined
  }
  const codes = (push: Push) => push.diagnostics.map((d) => Number(d.code))
  const client = (message: object) =>
    bridge.handleClientMessage(JSON.stringify({ jsonrpc: "2.0", ...message }))
  const request = (method: string, params: unknown) => {
    const id = nextId++
    client({ id, method, params })
    return waitFor(() => responses.get(id), method)
  }
  const open = (relPath: string, text: string) => {
    versions.set(relPath, 1)
    client({
      method: "textDocument/didOpen",
      params: {
        textDocument: {
          uri: uri(relPath),
          languageId: "typescript",
          version: 1,
          text,
        },
      },
    })
  }
  const change = (relPath: string, text: string) => {
    const version = (versions.get(relPath) ?? 1) + 1
    versions.set(relPath, version)
    client({
      method: "textDocument/didChange",
      params: {
        textDocument: { uri: uri(relPath), version },
        contentChanges: [{ text }],
      },
    })
    return version
  }

  beforeAll(async () => {
    const memoryFs = new MemoryFileSystem()
    bridge = makeLspWorkerBridge({
      fs: memoryFs,
      onTypes: (result) => types.push(result),
      postToPage: (raw) => {
        const message = JSON.parse(raw) as {
          id?: number | string
          method?: string
          params?: Push
          result?: unknown
        }
        if (message.method === "textDocument/publishDiagnostics") {
          pushes.push(message.params!)
        } else if (message.id !== undefined && message.method === undefined) {
          responses.set(message.id, message.result ?? message)
        }
      },
    })
    bridge.applyFsOp({
      _tag: "Reset",
      files: { ...GREETER_FILES, "tsconfig.json": TSCONFIG },
    })
    host = await startLspHost({
      module: fs.readFileSync(WASM),
      fs: memoryFs,
      tsconfig: null,
      onMessage: (raw) => bridge.handleServerMessage(raw),
    })
    bridge.connect(host)
    await request("initialize", {
      processId: null,
      rootUri: ROOT,
      capabilities: DIAGNOSTIC_CLIENT_CAPABILITIES,
    })
    client({ method: "initialized", params: {} })
    for (const [relPath, text] of Object.entries(GREETER_FILES)) {
      open(relPath, text)
    }
  }, 60_000)

  afterAll(() => {
    bridge?.dispose()
    host?.dispose()
  })

  test("cannot resolve effect before the installed types land; ReplaceNodeModules brings the floating Effect (377001) without any client pull", async () => {
    const before = await waitFor(() => latest("src/main.ts", 1), "main.ts push")
    assert.include(codes(before), 2307, JSON.stringify(before))

    const pack = encodeTypesPack(collectTypesPack(["effect"]))
    bridge.applyFsOp({
      _tag: "ReplaceNodeModules",
      id: 1,
      pack: pack.slice().buffer,
    })
    assert.equal(types[0]?._tag, "TypesMounted", JSON.stringify(types[0]))

    const push = await waitFor(() => {
      const next = latest("src/main.ts", 1)
      return next !== undefined && !codes(next).includes(2307)
        ? next
        : undefined
    }, "main.ts push after the types")
    assert.deepEqual(codes(push), [377001], JSON.stringify(push))
    assert.match(push.diagnostics[0]!.message, /floatingEffect/)
    assert.equal(push.diagnostics[0]!.severity, 1)
    const greeter = await waitFor(
      () => latest("src/greeter.ts", 1),
      "greeter.ts push",
    )
    assert.deepEqual(codes(greeter), [])
  }, 30_000)

  test("Effect diagnostics carry relatedInformation with the declared capabilities", async () => {
    const version = change(
      "src/main.ts",
      `import { Effect } from "effect"\n\nexport const program = Effect.gen(function* () {\n  const n = yield Effect.succeed(1)\n  return n\n})\n`,
    )
    const push = await waitFor(
      () => latest("src/main.ts", version),
      "main.ts after edit",
    )
    const missingStar = push.diagnostics.find((d) => Number(d.code) === 377008)
    assert.isDefined(missingStar, JSON.stringify(push))
    assert.match(
      missingStar!.relatedInformation?.[0]?.message ?? "",
      /Inside this Effect generator/,
    )
  }, 30_000)

  test("a change to a file updates the diagnostics of the file that imports it", async () => {
    change("src/main.ts", GREETER_FILES["src/main.ts"]!)
    await waitFor(() => {
      const push = latest("src/main.ts", versions.get("src/main.ts"))
      return push !== undefined && codes(push).join() === "377001"
        ? push
        : undefined
    }, "main.ts restored")

    // The editor sends didChange for the open greeter.ts and the Workspace
    // write reaches the file system mirror.
    const renamed = GREETER_FILES["src/greeter.ts"]!.replace(
      "export const greet",
      "export const greetUser",
    )
    change("src/greeter.ts", renamed)
    bridge.applyFsOp({
      _tag: "WriteFile",
      path: "src/greeter.ts",
      content: renamed,
    })
    const broken = await waitFor(() => {
      const push = latest("src/main.ts")
      return push !== undefined &&
        codes(push).some((c) => c === 2724 || c === 2305)
        ? push
        : undefined
    }, "main.ts reports the missing export")
    assert.match(broken.diagnostics.map((d) => d.message).join("\n"), /greet/)

    change("src/greeter.ts", GREETER_FILES["src/greeter.ts"]!)
    await waitFor(() => {
      const push = latest("src/main.ts")
      return push !== undefined && codes(push).join() === "377001"
        ? push
        : undefined
    }, "main.ts recovers")
  }, 30_000)

  test("a deleted file not open in the server breaks the import; restoring it fixes it", async () => {
    client({
      method: "textDocument/didClose",
      params: { textDocument: { uri: uri("src/greeter.ts") } },
    })
    bridge.applyFsOp({ _tag: "Remove", path: "src/greeter.ts" })
    await waitFor(() => {
      const push = latest("src/main.ts")
      return push !== undefined && codes(push).includes(2307) ? push : undefined
    }, "main.ts reports the missing module")

    bridge.applyFsOp({
      _tag: "WriteFile",
      path: "src/greeter.ts",
      content: GREETER_FILES["src/greeter.ts"]!,
    })
    await waitFor(() => {
      const push = latest("src/main.ts")
      return push !== undefined && codes(push).join() === "377001"
        ? push
        : undefined
    }, "main.ts resolves the restored file")
  }, 30_000)

  test("tsconfig.json is the Workspace's: removing it drops the Effect plugin, restoring it brings it back", async () => {
    bridge.applyFsOp({ _tag: "Remove", path: "tsconfig.json" })
    await waitFor(() => {
      const push = latest("src/main.ts")
      return push !== undefined && !codes(push).includes(377001)
        ? push
        : undefined
    }, "main.ts without the plugin's diagnostic")

    bridge.applyFsOp({
      _tag: "WriteFile",
      path: "tsconfig.json",
      content: TSCONFIG,
    })
    await waitFor(() => {
      const push = latest("src/main.ts")
      return push !== undefined && codes(push).join() === "377001"
        ? push
        : undefined
    }, "main.ts with the plugin again")
  }, 30_000)

  test("a document that crashes the server gets the quarantine warning, and an edit brings it back", async () => {
    const deep = `export const x = ${"[".repeat(20_000)}${"]".repeat(20_000)}\n`
    open("src/deep.ts", deep)
    const quarantined = await waitFor(() => {
      const push = latest("src/deep.ts")
      return push?.diagnostics.some(
        (d) => d.code === QUARANTINE_DIAGNOSTIC_CODE,
      )
        ? push
        : undefined
    }, "deep.ts quarantine warning")
    assert.equal(quarantined.diagnostics.length, 1)
    assert.equal(host.recoveries.length >= 1, true)

    // The rest of the session keeps working.
    const hover = await request("textDocument/hover", {
      textDocument: { uri: uri("src/main.ts") },
      position: { line: 3, character: 8 },
    })
    assert.include(JSON.stringify(hover), "Effect")

    const version = change("src/deep.ts", "export const ok: string = 1\n")
    const fixed = await waitFor(
      () => latest("src/deep.ts", version),
      "deep.ts after the edit",
    )
    assert.deepEqual(codes(fixed), [2322])
  }, 60_000)
})
