// Runs the browser harness headless: node browser/run-playwright.mjs <chromium|firefox|webkit> <url>
import { createRequire } from "node:module"
const require = createRequire(process.env.PLAYWRIGHT_FROM ?? import.meta.url)
const pw = require(process.env.PLAYWRIGHT_MODULE ?? "playwright")
const [
  name = "chromium",
  url = "http://127.0.0.1:8765/browser/index.html",
  timeout = "240000",
] = process.argv.slice(2)
const t0 = performance.now()
let browser
try {
  browser = await pw[name].launch({
    headless: true,
    ...(process.env.BROWSER_PATH
      ? { executablePath: process.env.BROWSER_PATH }
      : {}),
    args:
      name === "chromium"
        ? ["--enable-blink-features=ForceEagerMeasureMemory"]
        : [],
  })
} catch (e) {
  console.log(
    `${name}: launch failed: ${String(e.message).split("\n").slice(0, 14).join(" | ")}`,
  )
  process.exit(2)
}
const page = await browser.newPage()
page.on("console", (m) => {
  if (process.env.VERBOSE) console.log("[console]", m.text())
})
page.on("pageerror", (e) => console.log("[pageerror]", e.message))
if (url === "blank") {
  // Baseline: the same browser with an empty cross-origin-isolated page, for the memory comparison.
  await page.goto("http://127.0.0.1:8765/browser/blank.html")
  await new Promise((r) => setTimeout(r, 3000))
  await page.evaluate(() => {
    window.__result = { lines: [], ok: true }
  })
} else await page.goto(url)
try {
  await page.waitForFunction(() => window.__result, null, {
    timeout: Number(timeout),
    polling: 250,
  })
} catch (e) {
  console.log("timed out; page log:\n" + (await page.textContent("#log")))
  await browser.close()
  process.exit(1)
}
const r = await page.evaluate(() => window.__result)
// Memory of the whole browser: PSS summed over the browser process and its descendants (Linux).
const { readFileSync, readdirSync } = await import("node:fs")
const pssMiB = (() => {
  try {
    const kids = new Map()
    for (const p of readdirSync("/proc").filter((d) => /^\d+$/.test(d))) {
      try {
        const ppid = Number(
          readFileSync(`/proc/${p}/stat`, "utf8").split(") ")[1].split(" ")[1],
        )
        if (!kids.has(ppid)) kids.set(ppid, [])
        kids.get(ppid).push(Number(p))
      } catch {}
    }
    let total = 0,
      threads = 0
    const visit = (pid) => {
      try {
        total += Number(
          /^Pss:\s+(\d+)/m.exec(
            readFileSync(`/proc/${pid}/smaps_rollup`, "utf8"),
          )[1],
        )
      } catch {}
      try {
        threads += Number(
          /^Threads:\s+(\d+)/m.exec(
            readFileSync(`/proc/${pid}/status`, "utf8"),
          )[1],
        )
      } catch {}
      for (const k of kids.get(pid) ?? []) visit(k)
    }
    // The launched browser's top process: its command line names the Playwright browser directory.
    const roots = readdirSync("/proc")
      .filter((d) => /^\d+$/.test(d))
      .filter((p) => {
        try {
          const cmd = readFileSync(`/proc/${p}/cmdline`, "utf8")
          const ppid = Number(
            readFileSync(`/proc/${p}/stat`, "utf8")
              .split(") ")[1]
              .split(" ")[1],
          )
          const parentCmd = readFileSync(`/proc/${ppid}/cmdline`, "utf8")
          const pw = (c) =>
            c.includes("ms-playwright") ||
            c.includes("playwright-webkit") ||
            c.includes("playwright-browsers")
          return pw(cmd) && !pw(parentCmd)
        } catch {
          return false
        }
      })
    for (const r of roots) visit(Number(r))
    return { pssMiB: Math.round(total / 1024), osThreads: threads }
  } catch (e) {
    return String(e)
  }
})()
console.log(
  `${name} ${browser.version()} (${(performance.now() - t0).toFixed(0)} ms incl. launch)`,
)
for (const l of r.lines) console.log(l.slice(0, 170))
console.log(
  JSON.stringify({
    browserMemory: pssMiB,
    ok: r.ok,
    sample: r.sample,
    uaMemoryMiB: r.uaMemoryMiB,
    hardwareConcurrency: r.hardwareConcurrency,
    error: r.error,
  }),
)
if (!r.ok || process.env.VERBOSE) console.log("stderr:", r.stderr)
await browser.close()
