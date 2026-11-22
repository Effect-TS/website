// Node runner.
//   node run-node.mjs features <module.wasm | --native tsrs-binary> <dir with node_modules/effect> [--skiplib] [--inlays] [--out f.json]
//   node run-node.mjs session  <module.wasm | --native tsrs-binary> <dir with node_modules/effect> [--skiplib] [--noplugin]
//                              [--edits N] [--timers] [--out f.json]
//   node run-node.mjs deep     <module.wasm> <dir with node_modules/effect> [--shapes nestedGen,...] [--depths 100,200,...] [--out f.json]
// --skiplib adds skipLibCheck: true to the bridge tsconfig, --noplugin drops the @effect/language-service entry,
// --inlays sets the plugin option inlays: true, --severity sets diagnosticSeverity overrides (SEVERITY_OVERRIDES).
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { runDeep } from "./deep.js"
import { runFeatures } from "./features.js"
import { startLspServer, startRecoveringServer } from "./lsp-host.js"
import { startNativeServer } from "./native-server.mjs"
import { runSession, summarize } from "./session.js"
import { ROOT, workspaceFiles } from "./workspace.js"

// --severity: one rule per Effect severity level, to check the LSP severity mapping.
const SEVERITY_OVERRIDES = {
  floatingEffect: "warning",
  missingStarInYieldEffectGen: "message",
  unnecessaryEffectGen: "error",
  tryCatchInEffectGen: "suggestion",
  missingReturnYieldStar: "off",
}
const args = process.argv.slice(2)
const mode = args.shift()
const native = args[0] === "--native" ? (args.shift(), args.shift()) : null
const wasmPath = native ? null : args.shift()
const expDir = args.shift()
const flag = (name) => args.includes(name)
const opt = (name, d) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : d

export function loadEffectFiles(dir) {
  const files = {}
  const walk = (d, v) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e),
        vp = v + "/" + e
      if (statSync(p).isDirectory()) {
        if (e !== "node_modules") walk(p, vp)
      } else if (e.endsWith(".d.ts") || e === "package.json")
        files[vp] = readFileSync(p)
    }
  }
  walk(join(dir, "node_modules/effect"), `${ROOT}/node_modules/effect`)
  return files
}

const tsconfigOptions = {
  skipLibCheck: flag("--skiplib"),
  plugin: !flag("--noplugin"),
  pluginOptions: {
    ...(flag("--inlays") ? { inlays: true } : {}),
    ...(flag("--severity") ? { diagnosticSeverity: SEVERITY_OVERRIDES } : {}),
  },
}
const files = workspaceFiles(loadEffectFiles(expDir), tsconfigOptions)
const stderr = []
const log = flag("--quiet") ? () => {} : (s) => console.error(s)
let server, compileMs, instantiateMs, module
if (native) {
  server = startNativeServer(native, files, { stderr: (s) => stderr.push(s) })
} else {
  const t0 = performance.now()
  module = await WebAssembly.compile(readFileSync(wasmPath))
  compileMs = performance.now() - t0
  const t1 = performance.now()
  const start = mode === "deep" ? startRecoveringServer : startLspServer
  server = await start(module, {
    files,
    cwd: ROOT,
    stderr: (l) => stderr.push(l),
  })
  instantiateMs = performance.now() - t1
}
const runtime = native ? `native ${native}` : `node ${process.version} wasm`
let out
try {
  if (mode === "features") {
    const r = await runFeatures(server, { log })
    out = { runtime, tsconfigOptions, compileMs, instantiateMs, ...r }
    console.log(
      JSON.stringify({
        timings: Object.fromEntries(
          Object.entries(r.timings).map(([k, v]) => [k, median(v)]),
        ),
        memMiB: r.memoryBytes / 2 ** 20,
      }),
    )
  } else if (mode === "session") {
    const r = await runSession(server, {
      log,
      edits: +opt("--edits", 50),
      timerTest: flag("--timers"),
    })
    out = {
      runtime,
      tsconfigOptions,
      compileMs,
      instantiateMs,
      summary: summarize(r),
      results: r,
    }
    console.log(JSON.stringify(out.summary, null, 1))
  } else if (mode === "deep") {
    const depths = opt("--depths")
      ? opt("--depths").split(",").map(Number)
      : undefined
    const shapes = opt("--shapes") ? opt("--shapes").split(",") : undefined
    const r = await runDeep(server, { log, depths, shapes })
    out = { runtime, tsconfigOptions, ...r }
    console.log(JSON.stringify(r.summary, null, 1))
  } else throw new Error(`unknown mode ${mode}`)
} catch (e) {
  console.error(
    "failed:",
    e.stack ?? e,
    "\nstderr:",
    stderr.slice(-20).join("\n"),
  )
  process.exitCode = 1
} finally {
  server.close?.()
}
if (out) {
  out.stderrTail = stderr.slice(-10)
  if (opt("--out")) writeFileSync(opt("--out"), JSON.stringify(out, null, 1))
}

function median(v) {
  const s = [...v].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}
