// Usage: node browser.mjs <repo root with playwright> <exp dir (node_modules/@tsrs/wasm, node_modules/effect)> <module.wasm> <project dir> [runs]
// Serves the stock browser host + the given module + the in-memory project, runs it in a module Web Worker in
// headless Chromium and prints the diagnostics and timings.
import { createServer } from "node:http"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, dirname } from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
const [repo, exp, wasmPath, proj, runsArg] = process.argv.slice(2)
const pw = createRequire(join(repo, "package.json"))("playwright")
const here = dirname(fileURLToPath(import.meta.url))
const host = join(exp, "node_modules/@tsrs/wasm")
const files = {}
const walk = (dir, virt) => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e),
      v = virt + "/" + e
    if (statSync(p).isDirectory()) {
      if (e !== "node_modules") walk(p, v)
    } else if (e.endsWith(".d.ts") || e === "package.json")
      files[v] = readFileSync(p, "utf8")
  }
}
walk(join(exp, "node_modules/effect"), "/p/node_modules/effect")
files["/p/tsconfig.json"] = readFileSync(join(proj, "tsconfig.json"), "utf8")
files["/p/main.ts"] = readFileSync(join(proj, "main.ts"), "utf8")
const routes = {
  "/": [
    "text/html",
    "<!doctype html><meta charset=utf-8><title>tsrs effect</title>",
  ],
  "/worker.js": [
    "text/javascript",
    readFileSync(join(here, "browser-worker.js")),
  ],
  "/host/browser.js": [
    "text/javascript",
    readFileSync(join(host, "browser.js")),
  ],
  "/host/core.js": ["text/javascript", readFileSync(join(host, "core.js"))],
  "/tsrs.wasm": ["application/wasm", readFileSync(wasmPath)],
}
const server = createServer((req, res) => {
  const r = routes[req.url]
  if (!r) {
    res.writeHead(404).end()
    return
  }
  res.writeHead(200, { "content-type": r[0] }).end(r[1])
}).listen(0)
const url = `http://127.0.0.1:${server.address().port}/`
const browser = await pw.chromium.launch()
const page = await browser.newPage()
page.on("console", (m) => console.log("console:", m.text()))
await page.goto(url)
const out = await page.evaluate(
  ({ files, runs }) =>
    new Promise((resolve) => {
      const w = new Worker("/worker.js", { type: "module" })
      w.onmessage = (e) => resolve(e.data)
      w.onerror = (e) => resolve({ error: e.message })
      w.postMessage({ files, runs })
    }),
  { files, runs: Number(runsArg ?? 3) },
)
console.log("chromium", browser.version())
if (out.error) console.log("ERROR", out.error)
else {
  console.log("load+compile", out.loadMs.toFixed(0) + "ms")
  for (const [i, r] of out.results.entries())
    console.log(
      `run ${i} ${r.ms.toFixed(0)}ms exit ${r.exitCode} mem ${(r.memoryBytes / 2 ** 20).toFixed(0)}MiB`,
      r.stderr ? "stderr: " + r.stderr.slice(0, 500) : "",
    )
  for (const d of out.results[0].diagnostics)
    console.log(
      d.code,
      "cat",
      d.category,
      `${d.startPosition.line + 1}:${d.startPosition.character + 1}-${d.endPosition.line + 1}:${d.endPosition.character + 1}`,
      d.text,
    )
}
await browser.close()
server.close()
