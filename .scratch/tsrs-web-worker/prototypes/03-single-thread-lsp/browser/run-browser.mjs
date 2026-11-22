// Browser harness: node browser/run-browser.mjs <dir containing node_modules/effect> [--browsers chromium,firefox,webkit] [--edits N] [--wasm file]
// Writes ../../../artifacts/03-effect-files.json (the Effect .d.ts files + tsconfig + main.ts as one JSON map) and
// copies the module to ../../../artifacts/tsrs-lsp-single.wasm when --wasm is given, serves .scratch/tsrs-web-worker/
// WITHOUT cross-origin isolation headers, and runs the session in each browser with the repo root's Playwright.
// Results: ../../../artifacts/03-results-<browser>.json and a summary line per browser on stdout.
import {
  copyFileSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs"
import http from "node:http"
import { homedir } from "node:os"
import { createRequire } from "node:module"
import { dirname, extname, join, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { MAIN, TSCONFIG } from "../session.js"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "../../..") // .scratch/tsrs-web-worker
const repo = resolve(root, "../..")
const artifacts = join(root, "artifacts")
const pw = createRequire(join(repo, "package.json"))("playwright")
const [expDir, ...rest] = process.argv.slice(2)
const opt = (name, d) =>
  rest.includes(name) ? rest[rest.indexOf(name) + 1] : d

if (opt("--wasm"))
  copyFileSync(opt("--wasm"), join(artifacts, "tsrs-lsp-single.wasm"))
const files = {}
const walk = (d, v) => {
  for (const e of readdirSync(d)) {
    const p = join(d, e),
      vp = v + "/" + e
    if (statSync(p).isDirectory()) {
      if (e !== "node_modules") walk(p, vp)
    } else if (e.endsWith(".d.ts") || e === "package.json")
      files[vp] = readFileSync(p, "utf8")
  }
}
walk(join(expDir, "node_modules/effect"), "/p/node_modules/effect")
files["/p/tsconfig.json"] = JSON.stringify(TSCONFIG)
files["/p/main.ts"] = MAIN
writeFileSync(join(artifacts, "03-effect-files.json"), JSON.stringify(files))

const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".wasm": "application/wasm",
  ".json": "application/json",
}
const server = http.createServer((req, res) => {
  const file = join(
    root,
    decodeURIComponent(new URL(req.url, "http://x").pathname),
  )
  let ok = false
  try {
    ok = file.startsWith(root + sep) && statSync(file).isFile()
  } catch {}
  if (!ok) return res.writeHead(404).end("not found")
  // Deliberately no Cross-Origin-Opener-Policy / Cross-Origin-Embedder-Policy.
  res.writeHead(200, {
    "content-type": types[extname(file)] ?? "application/octet-stream",
    "cache-control": "no-store",
  })
  res.end(readFileSync(file))
})
await new Promise((r) => server.listen(0, "127.0.0.1", r))
const url = `http://127.0.0.1:${server.address().port}/prototypes/03-single-thread-lsp/browser/index.html`

const pwCache = resolve(homedir(), ".cache/ms-playwright")
const ppidOf = (pid) => {
  try {
    return Number(
      readFileSync(`/proc/${pid}/stat`, "utf8")
        .replace(/^.*\) /, "")
        .split(" ")[1],
    )
  } catch {
    return 0
  }
}
const isMine = (pid) => {
  for (let p = pid, i = 0; p > 1 && i < 50; p = ppidOf(p), i++)
    if (p === process.pid) return true
  return false
}
function sampleRss() {
  const procs = []
  for (const pid of readdirSync("/proc").filter((d) => /^\d+$/.test(d))) {
    try {
      const cmd = readFileSync(`/proc/${pid}/cmdline`, "utf8")
      if (!cmd.includes("ms-playwright") || !isMine(+pid)) continue
      const status = readFileSync(`/proc/${pid}/status`, "utf8")
      const kb = (k) =>
        Number(status.match(new RegExp(`${k}:\\s+(\\d+)`))?.[1] ?? 0)
      procs.push({
        pid: +pid,
        rssMiB: Math.round(kb("VmRSS") / 1024),
        hwmMiB: Math.round(kb("VmHWM") / 1024),
      })
    } catch {}
  }
  procs.sort((a, b) => b.rssMiB - a.rssMiB)
  return { largest: procs[0], processes: procs.length }
}
void pwCache

const launchOptions = {
  chromium: {},
  firefox: process.env.FIREFOX_PATH
    ? { executablePath: process.env.FIREFOX_PATH }
    : {},
  webkit: process.env.WEBKIT_PATH
    ? { executablePath: process.env.WEBKIT_PATH }
    : {},
}
// NixOS: PW_LD_LIBRARY_PATH supplies the shared libraries Playwright's Firefox / WebKit builds expect.
if (process.env.PW_LD_LIBRARY_PATH)
  for (const k of ["firefox", "webkit"])
    launchOptions[k].env = {
      ...process.env,
      LD_LIBRARY_PATH: process.env.PW_LD_LIBRARY_PATH,
    }
for (const name of opt("--browsers", "chromium,firefox,webkit").split(",")) {
  const out = { browser: name, url }
  let browser
  try {
    browser = await pw[name].launch({ timeout: 60000, ...launchOptions[name] })
    out.version = browser.version()
  } catch (e) {
    out.launchError = String(e.message).split("\n").slice(0, 12).join("\n")
    console.log(`${name}: launch failed: ${out.launchError}`)
    writeFileSync(
      join(artifacts, `03-results-${name}.json`),
      JSON.stringify(out, null, 1),
    )
    continue
  }
  const page = await browser.newPage()
  const consoleLines = []
  page.on("console", (m) => consoleLines.push(`${m.type()}: ${m.text()}`))
  page.on("pageerror", (e) => consoleLines.push(`pageerror: ${e.message}`))
  const t = Date.now()
  await page.goto(url)
  await page.waitForFunction(() => typeof window.runLsp === "function")
  try {
    const r = await page.evaluate(
      (edits) => window.runLsp({ edits }),
      +opt("--edits", 50),
    )
    Object.assign(out, r)
    out.rss = sampleRss()
    out.wallMs = Date.now() - t
    const s = r.summary
    console.log(
      JSON.stringify({
        browser: name,
        version: out.version,
        coi: r.crossOriginIsolated,
        workerCoi: r.ready.crossOriginIsolated,
        sab: r.ready.sab,
        compileMs: +r.ready.compileMs.toFixed(0),
        instantiateMs: +r.ready.instantiateMs.toFixed(0),
        readyMs: +r.readyMs.toFixed(0),
        didOpenMs: s.didOpenMs,
        firstDiagnosticsMs: s.firstDiagnosticsMs,
        firstPull: s.firstPull,
        firstEditCheckMs: s.firstEditCheckMs,
        firstEditBackgroundMs: s.firstEditBackgroundMs,
        editMedianMs: s.editMedianMs,
        editP90Ms: s.editP90Ms,
        hoverAfterEditMedianMs: s.hoverAfterEditMedianMs,
        deepMaxOk: s.deepMaxOk,
        deepFirstFail: s.deepFirstFail?.error?.slice(0, 120),
        wasmMemMiB: s.memMiB,
        rendererRssMiB: out.rss.largest?.rssMiB,
        rendererHwmMiB: out.rss.largest?.hwmMiB,
      }),
    )
  } catch (e) {
    out.error = String(e.message).slice(0, 2000)
    console.log(`${name}: session failed: ${out.error}`)
  }
  out.console = consoleLines.slice(-30)
  writeFileSync(
    join(artifacts, `03-results-${name}.json`),
    JSON.stringify(out, null, 1),
  )
  await browser.close()
}
server.close()
