// Browser harness: node browser/run-browser.mjs <dir with node_modules/effect> [--browsers chromium,firefox,webkit]
//   [--modes session,features,deep] [--edits N] [--wasm tsrs-effect-lsp-single.wasm] [--skiplib | --noplugin] [--tag name]
//   [--shapes nestedGen,flatMap] [--depths 50,60,70]
// Writes ../../../artifacts/05-files-{full,skiplib}.json (effect .d.ts + package.json files, the bridge tsconfig and
// the sources as one JSON map), serves .scratch/tsrs-web-worker/ WITHOUT cross-origin isolation headers, and runs each
// mode in each browser (Playwright from the repo root). Results: ../../../artifacts/05-results-<browser>-<mode>[-tag].json
// and one summary line per run on stdout. NixOS: FIREFOX_PATH, WEBKIT_PATH and PW_LD_LIBRARY_PATH as in prototype 03.
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import http from "node:http"
import { createRequire } from "node:module"
import { dirname, extname, join, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { ROOT, workspaceFiles } from "../workspace.js"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "../../..") // .scratch/tsrs-web-worker
const repo = resolve(root, "../..")
const artifacts = join(root, "artifacts")
const pw = createRequire(join(repo, "package.json"))("playwright")
const [expDir, ...rest] = process.argv.slice(2)
const opt = (name, d) =>
  rest.includes(name) ? rest[rest.indexOf(name) + 1] : d
const flag = (name) => rest.includes(name)

const effectFiles = {}
const walk = (d, v) => {
  for (const e of readdirSync(d)) {
    const p = join(d, e),
      vp = v + "/" + e
    if (statSync(p).isDirectory()) {
      if (e !== "node_modules") walk(p, vp)
    } else if (e.endsWith(".d.ts") || e === "package.json")
      effectFiles[vp] = readFileSync(p, "utf8")
  }
}
walk(join(expDir, "node_modules/effect"), `${ROOT}/node_modules/effect`)
writeFileSync(
  join(artifacts, "05-files-full.json"),
  JSON.stringify(workspaceFiles(effectFiles, {})),
)
writeFileSync(
  join(artifacts, "05-files-skiplib.json"),
  JSON.stringify(workspaceFiles(effectFiles, { skipLibCheck: true })),
)
writeFileSync(
  join(artifacts, "05-files-noplugin.json"),
  JSON.stringify(workspaceFiles(effectFiles, { plugin: false })),
)
const filesName = flag("--skiplib")
  ? "05-files-skiplib.json"
  : flag("--noplugin")
    ? "05-files-noplugin.json"
    : "05-files-full.json"
// deep mode: --shapes nestedGen,flatMap --depths 50,60,70 (default: deep.js's own lists)
const deepOptions = {
  maxMs: 30000,
  ...(opt("--shapes") ? { shapes: opt("--shapes").split(",") } : {}),
  ...(opt("--depths")
    ? { depths: opt("--depths").split(",").map(Number) }
    : {}),
}
const wasm = opt("--wasm", "tsrs-effect-lsp-single.wasm")
const tag = opt("--tag", "")

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
const url = `http://127.0.0.1:${server.address().port}/prototypes/05-effect-single-thread-lsp/browser/index.html`

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
      if (!isMine(+pid)) continue
      const status = readFileSync(`/proc/${pid}/status`, "utf8")
      const kb = (k) =>
        Number(status.match(new RegExp(`${k}:\\s+(\\d+)`))?.[1] ?? 0)
      procs.push({
        pid: +pid,
        name: status.match(/Name:\s+(\S+)/)?.[1],
        rssMiB: Math.round(kb("VmRSS") / 1024),
        hwmMiB: Math.round(kb("VmHWM") / 1024),
      })
    } catch {}
  }
  procs.sort((a, b) => b.rssMiB - a.rssMiB)
  return procs.slice(0, 3)
}

const launchOptions = {
  chromium: {},
  firefox: process.env.FIREFOX_PATH
    ? { executablePath: process.env.FIREFOX_PATH }
    : {},
  webkit: process.env.WEBKIT_PATH
    ? { executablePath: process.env.WEBKIT_PATH }
    : {},
}
if (process.env.PW_LD_LIBRARY_PATH)
  launchOptions.firefox.env = {
    ...process.env,
    LD_LIBRARY_PATH: process.env.PW_LD_LIBRARY_PATH,
  }
const modes = opt("--modes", "session,features,deep").split(",")
for (const name of opt("--browsers", "chromium,firefox,webkit").split(",")) {
  for (const mode of modes) {
    const out = { browser: name, mode, url, wasm, files: filesName }
    const file = join(
      artifacts,
      `05-results-${name}-${mode}${tag ? "-" + tag : ""}.json`,
    )
    let browser
    try {
      browser = await pw[name].launch({
        timeout: 60000,
        ...launchOptions[name],
      })
      out.version = browser.version()
    } catch (e) {
      out.launchError = String(e.message).split("\n").slice(0, 12).join("\n")
      console.log(`${name}: launch failed: ${out.launchError}`)
      writeFileSync(file, JSON.stringify(out, null, 1))
      break
    }
    const page = await browser.newPage()
    const consoleLines = []
    page.on("console", (m) => consoleLines.push(`${m.type()}: ${m.text()}`))
    page.on("pageerror", (e) => consoleLines.push(`pageerror: ${e.message}`))
    const t = Date.now()
    await page.goto(url)
    await page.waitForFunction(() => typeof window.runLsp === "function")
    try {
      const r = await page.evaluate((args) => window.runLsp(args), {
        mode,
        wasm,
        files: filesName,
        edits: +opt("--edits", 50),
        options: mode === "deep" ? deepOptions : {},
      })
      Object.assign(out, r)
      out.rss = sampleRss()
      out.wallMs = Date.now() - t
      const head = {
        browser: name,
        version: out.version,
        mode,
        coi: r.crossOriginIsolated,
        workerCoi: r.ready.crossOriginIsolated,
        sab: r.ready.sab,
        compileMs: +r.ready.compileMs.toFixed(0),
        instantiateMs: +r.ready.instantiateMs.toFixed(0),
        rssMiB: out.rss[0]?.rssMiB,
        hwmMiB: out.rss[0]?.hwmMiB,
      }
      if (mode === "session")
        console.log(
          JSON.stringify({
            ...head,
            ...r.summary,
            requestSummaries: undefined,
          }),
        )
      else if (mode === "features")
        console.log(
          JSON.stringify({
            ...head,
            timings: Object.fromEntries(
              Object.entries(r.result.timings).map(([k, v]) => [
                k,
                [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)],
              ]),
            ),
          }),
        )
      else console.log(JSON.stringify({ ...head, ...r.result.summary }))
    } catch (e) {
      out.error = String(e.message).slice(0, 3000)
      console.log(`${name} ${mode}: failed: ${out.error}`)
    }
    out.console = consoleLines.slice(-30)
    writeFileSync(file, JSON.stringify(out, null, 1))
    await browser.close()
  }
}
server.close()
