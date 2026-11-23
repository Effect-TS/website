// Drives the harness page in headless Chromium and runs every experiment.
// Usage: node drive.mjs  (expects server.mjs listening on 5181)
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import Fs from "node:fs"
import Path from "node:path"

const here = Path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(Path.resolve(here, "../../../../package.json"))
const { chromium } = require("playwright")

function tree(dir) {
  const out = {}
  for (const e of Fs.readdirSync(dir, { withFileTypes: true })) {
    const p = Path.join(dir, e.name)
    out[e.name] = e.isDirectory()
      ? { directory: tree(p) }
      : { file: { contents: Fs.readFileSync(p, "utf8") } }
  }
  return out
}

const results = []
const log = (...a) => console.log(...a)
const strip = (s) => s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "")

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
page.on("console", (m) => {
  if (m.type() === "error") log("[page error]", m.text())
})
page.on("pageerror", (e) => log("[pageerror]", e.message))
await page.goto("http://localhost:5181/")
await page.waitForFunction(() => window.api?.ready)
log("crossOriginIsolated:", await page.evaluate(() => crossOriginIsolated))

const call = (fn, ...args) =>
  page.evaluate(([fn, args]) => window.api[fn](...args), [fn, args])
async function run(label, cmd, args, opts = {}) {
  const r = await call("run", cmd, args, { cwd: "ws", ...opts })
  r.output = strip(r.output)
  results.push({ label, cmd: [cmd, ...args].join(" "), ...r })
  log(
    `\n=== ${label}: ${[cmd, ...args].join(" ")}  exit=${r.exitCode} first=${r.firstOutputMs?.toFixed(0)}ms marker=${r.markerMs?.toFixed(0)}ms total=${r.totalMs.toFixed(0)}ms${r.timedOut ? " TIMEOUT" : ""}`,
  )
  log(
    r.output
      .split("\n")
      .slice(0, opts.lines ?? 14)
      .join("\n"),
  )
  return r
}

const bootMs = await call("boot")
log("boot ms", bootMs.toFixed(0))
await call(
  "mount",
  {
    ...tree(Path.join(here, "workspace")),
    ...tree(Path.join(here, "container")),
  },
  "ws",
)

const only = process.argv[2]

await run("node version", "node", ["--version"])
await run("features.typescript", "node", [
  "-p",
  "JSON.stringify({ts: process.features.typescript, title: process.title, versions: process.versions.node, execArgv: process.execArgv, platform: process.platform})",
])
await run("pnpm version", "pnpm", ["--version"])
await run("jsh which ps", "jsh", ["-c", "which ps; ps; echo PS_EXIT=$?"])
const install = await run("pnpm install", "pnpm", ["install"], {
  timeoutMs: 300000,
  lines: 30,
})
results.push({ label: "installMs", value: install.totalMs })
await run("versions", "node", [
  "-p",
  "[require('./node_modules/effect/package.json').version, require('./node_modules/@effect/platform-node/package.json').version, require('./node_modules/typescript/package.json').version].join(' ')",
])

// devtools sink on 34437 inside the container
const proxy = await call("start", "node", ["dev-tools-proxy.cjs"], {
  cwd: "ws",
})
await new Promise((r) => setTimeout(r, 1500))
log("proxy:", (await call("status", proxy)).output)

const PRE = ["--import", "./runner-preload.mjs"]
const T = { timeoutMs: 20000 }
// 1. v4 template
await run("v4 plain (no hook)", "node", ["src/main.ts"], T)
await run("v4 sync hook", "node", [...PRE, "src/main.ts"], T)
await run(
  "v4 async module.register hook",
  "node",
  ["--import", "./register-async.mjs", "src/main.ts"],
  T,
)
log("proxy after v4:", (await call("status", proxy)).output)
// 2. legacy .js imports
await run("legacy plain", "node", ["variants/legacy/main.ts"], T)
await run("legacy sync hook", "node", [...PRE, "variants/legacy/main.ts"], T)
await run(
  "legacy async hook",
  "node",
  ["--import", "./register-async.mjs", "variants/legacy/main.ts"],
  T,
)
await run("elide sync hook", "node", [...PRE, "variants/elide/main.ts"], T)
// 3. enum / param props / namespace
await run("enum stripping", "node", [...PRE, "variants/enum/main.ts"], T)
await run(
  "enum transform-types",
  "node",
  ["--experimental-transform-types", ...PRE, "variants/enum/main.ts"],
  T,
)
await run(
  "v4 transform-types",
  "node",
  ["--experimental-transform-types", ...PRE, "src/main.ts"],
  T,
)
// 4. stack traces
await run("error strip", "node", [...PRE, "variants/error/main.ts"], T)
await run(
  "error strip+sourcemaps",
  "node",
  ["--enable-source-maps", ...PRE, "variants/error/main.ts"],
  T,
)
await run(
  "error transform",
  "node",
  ["--experimental-transform-types", ...PRE, "variants/error/main.ts"],
  T,
)
await run(
  "error transform+sourcemaps",
  "node",
  [
    "--enable-source-maps",
    "--experimental-transform-types",
    ...PRE,
    "variants/error/main.ts",
  ],
  T,
)
await run(
  "effect-error strip",
  "node",
  [...PRE, "variants/effect-error/main.ts"],
  { ...T, lines: 25 },
)
await run(
  "effect-error strip+sourcemaps",
  "node",
  ["--enable-source-maps", ...PRE, "variants/effect-error/main.ts"],
  { ...T, lines: 25 },
)
// 5. process.title
await run("title no preload", "node", ["variants/title/main.ts"], T)
await run(
  "title with preload",
  "node",
  ["--import", "./title-only.mjs", "variants/title/main.ts"],
  T,
)
// 6. tsc fallback
await run(
  "tsc emit (noCheck)",
  "node",
  ["node_modules/typescript/bin/tsc", "-p", "tsconfig.emit.json"],
  { timeoutMs: 120000 },
)
await run(
  "tsc fallback v4",
  "node",
  ["--enable-source-maps", "dist/src/main.js"],
  T,
)
await run(
  "tsc fallback legacy",
  "node",
  ["--enable-source-maps", "dist/variants/legacy/main.js"],
  T,
)
await run(
  "tsc fallback elide",
  "node",
  ["--enable-source-maps", "dist/variants/elide/main.js"],
  T,
)
await run(
  "tsc fallback error",
  "node",
  ["--enable-source-maps", "dist/variants/error/main.js"],
  T,
)
await run(
  "tsc fallback error (no sm)",
  "node",
  ["dist/variants/error/main.js"],
  T,
)

// 7. edit -> first output latency
const mainSrc = Fs.readFileSync(
  Path.join(here, "workspace/src/main.ts"),
  "utf8",
)
const N = 6
const lat = { strip: [], stripFirst: [], tsc: [], tscFirst: [], tscCheck: [] }
for (let i = 0; i < N; i++) {
  for (const mode of ["strip", "tsc", "tscCheck"]) {
    const marker = `edit-${mode}-${i}`
    const t0 = Date.now()
    await call(
      "writeFile",
      "ws/src/main.ts",
      mainSrc.replace("Welcome to the Effect v4 Playground!", marker),
    )
    let r
    if (mode === "strip") {
      r = await call("run", "node", [...PRE, "src/main.ts"], {
        cwd: "ws",
        marker,
        timeoutMs: 20000,
      })
      lat.strip.push(Date.now() - t0 - (r.totalMs - r.markerMs))
      lat.stripFirst.push(r.firstOutputMs)
    } else {
      const tsArgs =
        mode === "tsc"
          ? ["-p", "tsconfig.emit.json"]
          : ["-p", "tsconfig.emit.json", "--noCheck", "false"]
      const c = await call(
        "run",
        "node",
        ["node_modules/typescript/bin/tsc", ...tsArgs],
        { cwd: "ws", timeoutMs: 120000 },
      )
      if (c.exitCode !== 0) log("tsc failed", strip(c.output).slice(0, 2000))
      r = await call(
        "run",
        "node",
        ["--enable-source-maps", "dist/src/main.js"],
        { cwd: "ws", marker, timeoutMs: 20000 },
      )
      lat[mode].push(Date.now() - t0 - (r.totalMs - r.markerMs))
      if (mode === "tsc") lat.tscFirst.push(r.firstOutputMs)
    }
    if (r.markerMs === undefined)
      log(`marker missing for ${marker}:`, strip(r.output).slice(0, 500))
  }
}
const stats = (a) => {
  const s = [...a].sort((x, y) => x - y)
  return {
    n: s.length,
    min: Math.round(s[0]),
    median: Math.round(s[Math.floor(s.length / 2)]),
    max: Math.round(s.at(-1)),
    all: a.map(Math.round),
  }
}
const latency = Object.fromEntries(
  Object.entries(lat)
    .filter(([, v]) => v.length)
    .map(([k, v]) => [k, stats(v)]),
)
log("\nLATENCY (ms)", JSON.stringify(latency, null, 1))
results.push({ label: "latency", latency })

// 8. kill / restart
await run("ps before", "jsh", ["-c", "ps"], { cwd: "ws" })
for (let i = 0; i < 2; i++) {
  const id = await call("start", "node", [...PRE, "variants/long/main.ts"], {
    cwd: "ws",
    marker: "tick 2",
  })
  await new Promise((r) => setTimeout(r, 3000))
  log(
    `long run ${i} output:`,
    strip((await call("status", id)).output)
      .split("\n")
      .slice(0, 6)
      .join(" | "),
  )
  await run(`ps during ${i}`, "jsh", ["-c", "ps"], { cwd: "ws" })
  const k = await call("kill", id)
  log("kill:", JSON.stringify(k))
  await new Promise((r) => setTimeout(r, 1500))
  await run(`ps after kill ${i}`, "jsh", ["-c", "ps"], { cwd: "ws" })
}
// same via jsh -c wrapper (the Playground pattern)
const jid = await call(
  "start",
  "jsh",
  ["-c", "node --import ./runner-preload.mjs variants/long/main.ts"],
  { cwd: "ws" },
)
await new Promise((r) => setTimeout(r, 3000))
await run("ps during jsh-wrapped", "jsh", ["-c", "ps"], { cwd: "ws" })
log("kill jsh:", JSON.stringify(await call("kill", jid)))
await new Promise((r) => setTimeout(r, 1500))
await run("ps after jsh-wrapped kill", "jsh", ["-c", "ps"], { cwd: "ws" })

Fs.writeFileSync(
  Path.join(here, "results.json"),
  JSON.stringify(results, null, 1),
)
await call("teardown")
await browser.close()
log("\ndone; results.json written")
