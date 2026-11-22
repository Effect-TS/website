// One-command harness: node run.mjs [--browsers chromium,firefox,webkit] [--configs a,b] [--no-stress] [--edits 10]
// Runs `node prepare.mjs` first if ../../artifacts/ is not populated. Uses the repo root's Playwright (no install here).
// Results: ../../artifacts/results-<browser>.json, plus a summary on stdout.
// Firefox/WebKit on NixOS: set FIREFOX_PATH / WEBKIT_PATH and PW_LD_LIBRARY_PATH to point at a launchable build.
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { createRequire } from "node:module"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"
import { serve } from "./serve.mjs"

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, "../../../..")
const artifacts = resolve(here, "../../artifacts")
if (
  ![
    "tsrs/tsrs.wasm",
    "tsrs/core.js",
    "effect-pack.bin",
    "effect-pack.json",
  ].every((f) => existsSync(resolve(artifacts, f)))
) {
  execFileSync(process.execPath, [resolve(here, "prepare.mjs")], {
    stdio: "inherit",
  })
}
const pw = createRequire(resolve(repo, "package.json"))("playwright")

const { values: flags } = parseArgs({
  options: {
    browsers: { type: "string", default: "chromium,firefox,webkit" },
    configs: { type: "string" },
    "no-stress": { type: "boolean", default: false },
    edits: { type: "string", default: "10" },
    stress: { type: "string" },
    "chromium-args": { type: "string" },
    tag: { type: "string", default: "" },
  },
})

// Each config is a fresh browser context + worker. `baseline` is the naive use of the stock API.
const CONFIGS = {
  baseline: {
    module: "stock",
    fs: "strings",
    pack: "json",
    compile: "streaming",
  },
  "arraybuffer-compile": {
    module: "stock",
    fs: "strings",
    pack: "json",
    compile: "arraybuffer",
  },
  "compile-each-call": {
    module: "compileEachCall",
    fs: "strings",
    pack: "json",
  },
  "precompiled-module": { module: "precompiled", fs: "strings", pack: "json" },
  "uint8array-files": { module: "precompiled", fs: "bytes", pack: "bin" },
  "custom-hostfs": { module: "precompiled", fs: "custom", pack: "bin" },
  "custom+fast": {
    module: "precompiled",
    fs: "custom",
    pack: "bin",
    fast: true,
  },
  "stock+incremental": {
    module: "precompiled",
    fs: "strings",
    pack: "json",
    incremental: true,
  },
  "custom+incremental-mtime0": {
    module: "precompiled",
    fs: "custom",
    pack: "bin",
    incremental: true,
    mtimes: false,
  },
  "custom+incremental": {
    module: "precompiled",
    fs: "custom",
    pack: "bin",
    incremental: true,
    mtimes: true,
  },
  "custom+fast+incremental": {
    module: "precompiled",
    fs: "custom",
    pack: "bin",
    incremental: true,
    fast: true,
  },
  "custom+lib-es2022": {
    module: "precompiled",
    fs: "custom",
    pack: "bin",
    lib: ["ES2022"],
  },
}
const configs = flags.configs ? flags.configs.split(",") : Object.keys(CONFIGS)

const launchOptions = {
  chromium: {
    args: [
      "--enable-blink-features=ForceEagerMeasureMemory",
      ...(flags["chromium-args"]?.split(" ") ?? []),
    ],
  },
  firefox: process.env.FIREFOX_PATH
    ? { executablePath: process.env.FIREFOX_PATH }
    : {},
  webkit: process.env.WEBKIT_PATH
    ? { executablePath: process.env.WEBKIT_PATH }
    : {},
}
if (process.env.PW_LD_LIBRARY_PATH)
  for (const k of ["firefox", "webkit"])
    launchOptions[k].env = {
      ...process.env,
      LD_LIBRARY_PATH: process.env.PW_LD_LIBRARY_PATH,
    }

// Approximate process memory: VmRSS / VmHWM of every process whose executable lives in the Playwright cache.
// The largest single process is the renderer hosting the page and its worker.
const pwCache = resolve(homedir(), ".cache/ms-playwright")
// Only descendants of this Node process count (other harnesses may be running browsers at the same time).
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
      if (
        (!cmd.startsWith(pwCache) && !cmd.includes("/ms-playwright/")) ||
        !isMine(+pid)
      )
        continue
      const status = readFileSync(`/proc/${pid}/status`, "utf8")
      const kb = (k) =>
        Number(status.match(new RegExp(`${k}:\\s+(\\d+)`))?.[1] ?? 0)
      const type = cmd.match(/--type=([a-z-]+)/)?.[1] ?? "browser"
      procs.push({
        pid: +pid,
        type,
        rssMiB: +(kb("VmRSS") / 1024).toFixed(0),
        hwmMiB: +(kb("VmHWM") / 1024).toFixed(0),
      })
    } catch {}
  }
  procs.sort((a, b) => b.rssMiB - a.rssMiB)
  return {
    totalRssMiB: procs.reduce((n, p) => n + p.rssMiB, 0),
    largest: procs[0],
    processes: procs.length,
  }
}

const server = await serve(0)
const base = `http://127.0.0.1:${server.address().port}/prototypes/01-batch-worker/index.html`
const summary = []

for (const name of flags.browsers.split(",")) {
  const out = { browser: name, configs: {}, stress: null }
  let browser
  try {
    browser = await pw[name].launch({ timeout: 60000, ...launchOptions[name] })
    out.version = browser.version()
  } catch (e) {
    out.launchError = String(e.message).split("\n").slice(0, 8).join("\n")
    console.log(`${name}: launch failed\n${out.launchError}`)
    writeFileSync(
      resolve(
        artifacts,
        `results-${name}${flags.tag ? "-" + flags.tag : ""}.json`,
      ),
      JSON.stringify(out, null, 2),
    )
    continue
  }
  const fresh = async () => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const consoleLines = []
    await page.exposeFunction("__sampleRss", () => sampleRss())
    page.on("console", (m) => consoleLines.push(`${m.type()}: ${m.text()}`))
    page.on("pageerror", (e) => consoleLines.push(`pageerror: ${e.message}`))
    await page.goto(base)
    await page.waitForFunction(() => typeof window.runBench === "function")
    return { context, page, consoleLines }
  }
  for (const cfg of configs) {
    const { context, page, consoleLines } = await fresh()
    try {
      const r = await page.evaluate(
        ([o, edits]) => window.runBench(o, { edits }),
        [CONFIGS[cfg], Number(flags.edits)],
      )
      out.configs[cfg] = r
      const lew = r.latestEditWins
      const line = {
        browser: name,
        config: cfg,
        coldFirstDiagMs: +r.firstDiagnosticsSinceNavigationMs.toFixed(0),
        wasmCompileMs: +(r.startup.wasmFetchCompileMs ?? 0).toFixed(0),
        firstCheckMs: +r.firstCheck.totalMs.toFixed(0),
        editMedianMs: +r.editMedianMs.toFixed(0),
        memMiB: +(r.memoryBytes / 2 ** 20).toFixed(0),
        uaMemMiB: r.memory.bytes
          ? +(r.memory.bytes / 2 ** 20).toFixed(0)
          : "n/a",
        rendererRssMiB: r.rss?.largest?.rssMiB,
        rendererHwmMiB: r.rss?.largest?.hwmMiB,
        correct: r.firstCorrect.ok && r.editAllCorrect,
        latestWins:
          lew.finalCorrect.ok && lew.noLatePublish && !lew.stalePublished,
        burstChecks: r.burst.checks,
      }
      summary.push(line)
      console.log(JSON.stringify(line))
    } catch (e) {
      out.configs[cfg] = {
        error: String(e.message).slice(0, 2000),
        console: consoleLines.slice(-20),
      }
      console.log(
        `${name} ${cfg}: ERROR ${String(e.message).slice(0, 500)}\n${consoleLines.slice(-10).join("\n")}`,
      )
    }
    await context.close()
  }
  {
    const { context, page } = await fresh()
    try {
      out.phases = await page.evaluate(() =>
        window.runPhases({ module: "precompiled", fs: "custom", pack: "bin" }),
      )
      for (const [k, v] of Object.entries(out.phases))
        console.log(`${name} phases ${k}: ${JSON.stringify(v.at(-1))}`)
    } catch (e) {
      out.phases = { error: String(e.message).slice(0, 2000) }
      console.log(`${name} phases ERROR ${String(e.message).slice(0, 500)}`)
    }
    await context.close()
  }
  if (!flags["no-stress"]) {
    const { context, page, consoleLines } = await fresh()
    try {
      out.stress = await page.evaluate(
        (names) =>
          window.runStress(
            { module: "precompiled", fs: "custom", pack: "bin" },
            ...(names ? [names] : []),
          ),
        flags.stress?.split(","),
      )
      for (const [k, v] of Object.entries(out.stress.results))
        console.log(`${name} stress ${k}: ${JSON.stringify(v).slice(0, 400)}`)
    } catch (e) {
      out.stress = {
        error: String(e.message).slice(0, 2000),
        console: consoleLines.slice(-20),
      }
      console.log(`${name} stress ERROR ${String(e.message).slice(0, 500)}`)
    }
    await context.close()
  }
  await browser.close()
  writeFileSync(
    resolve(
      artifacts,
      `results-${name}${flags.tag ? "-" + flags.tag : ""}.json`,
    ),
    JSON.stringify(out, null, 2),
  )
}
server.close()
writeFileSync(
  resolve(artifacts, `summary${flags.tag ? "-" + flags.tag : ""}.json`),
  JSON.stringify(summary, null, 2),
)
console.table(summary)
