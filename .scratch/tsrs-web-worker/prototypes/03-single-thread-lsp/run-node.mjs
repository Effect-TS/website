// Node runner: node run-node.mjs <module.wasm> <dir containing node_modules/effect> [--edits N] [--config] [--pull] [--out file.json]
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { startLspServer } from "./lsp-host.js"
import { MAIN, TSCONFIG, runSession, summarize } from "./session.js"

const [wasmPath, expDir, ...rest] = process.argv.slice(2)
const flag = (name) => rest.includes(name)
const opt = (name, d) =>
  rest.includes(name) ? rest[rest.indexOf(name) + 1] : d

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
  walk(join(dir, "node_modules/effect"), "/p/node_modules/effect")
  return files
}

const files = loadEffectFiles(expDir)
files["/p/tsconfig.json"] = JSON.stringify(TSCONFIG)
files["/p/main.ts"] = MAIN

const t0 = performance.now()
const module = await WebAssembly.compile(readFileSync(wasmPath))
const compileMs = performance.now() - t0
const t1 = performance.now()
const stderr = []
const server = await startLspServer(module, {
  files,
  cwd: "/p",
  stderr: (l) => stderr.push(l),
})
const instantiateMs = performance.now() - t1
const log = flag("--quiet") ? () => {} : (s) => console.error(s)
let results
try {
  results = await runSession(server, {
    log,
    edits: +opt("--edits", 50),
    configuration: flag("--config"),
    pull: flag("--pull"),
    onLog: flag("--verbose")
      ? (m) => console.error("  [log] " + m.slice(0, 300))
      : undefined,
    deep: flag("--no-deep") ? [] : undefined,
    timerTest: flag("--timers"),
  })
} catch (e) {
  console.error(
    "session failed:",
    e.stack ?? e,
    "\nstderr:",
    stderr.slice(-20).join("\n"),
  )
  process.exit(1)
}
const out = {
  runtime: `node ${process.version}`,
  wasm: wasmPath,
  compileMs,
  instantiateMs,
  fsCalls: server.fsCalls,
  stderr: stderr.slice(-20),
  summary: summarize(results),
  results,
}
console.log(JSON.stringify(out.summary, null, 1))
if (opt("--out")) writeFileSync(opt("--out"), JSON.stringify(out, null, 1))
