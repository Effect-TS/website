// Throwaway harness: exposes a tiny WebContainer API on window for Playwright.
import { WebContainer } from "@webcontainer/api"

let wc
const procs = new Map()
let nextId = 1

function collect(proc, marker) {
  const t0 = performance.now()
  const rec = { output: "", firstOutputMs: undefined, markerMs: undefined, t0 }
  proc.output
    .pipeTo(
      new WritableStream({
        write(chunk) {
          const now = performance.now() - t0
          // Ignore pure control-sequence chunks (jsh emits some) when timing first output.
          if (
            rec.firstOutputMs === undefined &&
            chunk.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "").trim() !== ""
          )
            rec.firstOutputMs = now
          rec.output += chunk
          if (
            marker &&
            rec.markerMs === undefined &&
            rec.output.includes(marker)
          )
            rec.markerMs = now
        },
      }),
    )
    .catch(() => {})
  return rec
}

window.api = {
  ready: true,
  async boot() {
    const t = performance.now()
    wc = await WebContainer.boot()
    return performance.now() - t
  },
  async mount(tree, mountPoint) {
    if (mountPoint) await wc.fs.mkdir(mountPoint, { recursive: true })
    await wc.mount(tree, mountPoint ? { mountPoint } : undefined)
  },
  async writeFile(path, contents) {
    await wc.fs.writeFile(path, contents)
  },
  async readFile(path) {
    return await wc.fs.readFile(path, "utf-8")
  },
  // Run to completion (or timeout -> kill). Returns output + timings.
  async run(cmd, args = [], { cwd, env, timeoutMs = 120000, marker } = {}) {
    const t0 = performance.now()
    const proc = await wc.spawn(cmd, args, { cwd, env })
    const spawnMs = performance.now() - t0
    const rec = collect(proc, marker)
    let timedOut = false
    const timer = new Promise((r) =>
      setTimeout(() => {
        timedOut = true
        r(undefined)
      }, timeoutMs),
    )
    const exitCode = await Promise.race([proc.exit, timer])
    if (timedOut) proc.kill()
    await new Promise((r) => setTimeout(r, 50))
    return {
      exitCode,
      timedOut,
      spawnMs,
      firstOutputMs: rec.firstOutputMs,
      markerMs: rec.markerMs,
      totalMs: performance.now() - t0,
      output: rec.output,
    }
  },
  // Start in background; returns an id.
  async start(cmd, args = [], { cwd, env, marker } = {}) {
    const proc = await wc.spawn(cmd, args, { cwd, env })
    const id = nextId++
    const rec = collect(proc, marker)
    let exitCode
    proc.exit.then((c) => {
      exitCode = c
    })
    procs.set(id, {
      proc,
      rec,
      get exitCode() {
        return exitCode
      },
    })
    return id
  },
  status(id) {
    const p = procs.get(id)
    return {
      exitCode: p.exitCode,
      output: p.rec.output,
      firstOutputMs: p.rec.firstOutputMs,
      markerMs: p.rec.markerMs,
    }
  },
  async kill(id) {
    const p = procs.get(id)
    const t = performance.now()
    p.proc.kill()
    const code = await Promise.race([
      p.proc.exit,
      new Promise((r) => setTimeout(() => r("no-exit-within-5s"), 5000)),
    ])
    return { exitCode: code, killMs: performance.now() - t }
  },
  async teardown() {
    wc?.teardown()
  },
}
document.getElementById("log").textContent = "ready"
