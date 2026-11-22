// Drives one LSP session against a server command over stdio and prints timings.
// Usage: node lsp-drive.mjs [--root /ws] [--edits N] -- <command...>
// The workspace root (as the server sees it) must contain main.ts, tsconfig.json and node_modules/effect.
import { spawn } from "node:child_process"
import { readFileSync, readdirSync } from "node:fs"
import { makeClient, session, deepSession } from "./lsp-session.js"

const argv = process.argv.slice(2)
const sep = argv.indexOf("--")
const opts = {}
for (let i = 0; i < sep; i++) {
  const k = argv[i].replace(/^--/, "")
  if (i + 1 < sep && !argv[i + 1].startsWith("--")) opts[k] = argv[++i]
  else opts[k] = true
}
const cmd = argv.slice(sep + 1)
const root = opts.root ?? "/ws"
const edits = Number(opts.edits ?? 5)
const timeoutMs = Number(opts.timeout ?? 300000)
const mainText = readFileSync(new URL("./main.ts", import.meta.url), "utf8")

if (cmd.length) {
  const t0 = performance.now()
  const child = spawn(cmd[0], cmd.slice(1), { stdio: ["pipe", "pipe", "pipe"] })
  let stderr = ""
  child.stderr.on("data", (d) => {
    stderr += d
    if (opts.verbose) process.stderr.write(d)
  })
  const client = makeClient((b) => child.stdin.write(b), {
    timeoutMs,
    log: opts.verbose ? (...a) => console.error("[client]", ...a) : () => {},
  })
  child.stdout.on("data", client.onData)
  child.on("exit", (code, sig) =>
    console.log(
      `server exited code=${code} sig=${sig} at ${(performance.now() - t0).toFixed(0)}ms`,
    ),
  )
  // Threads and RSS of the server process (and of any child whose command line matches, e.g. node host).
  const sample = async () => {
    let host
    if (opts.usr2) {
      // node-host.mjs prints its wasm memory size and thread counts on SIGUSR2.
      process.kill(child.pid, "SIGUSR2")
      await new Promise((r) => setTimeout(r, 100))
      host = stderr
        .split("\n")
        .filter((l) => l.includes("[host] stats"))
        .pop()
    }
    try {
      const st = readFileSync(`/proc/${child.pid}/status`, "utf8")
      const get = (k) => new RegExp(`^${k}:\\s+(.*)$`, "m").exec(st)?.[1]
      return {
        threads: Number(get("Threads")),
        rssMiB: Math.round(parseInt(get("VmRSS")) / 1024),
        peakRssMiB: Math.round(parseInt(get("VmHWM")) / 1024),
        ...(host ? { host: host.replace("[host] stats ", "") } : {}),
      }
    } catch (e) {
      return { error: String(e) }
    }
  }
  const report = (label, ms, detail) =>
    console.log(
      `${label.padEnd(44)} ${ms.toFixed(1).padStart(9)} ms  ${detail}`,
    )
  try {
    if (opts.deep)
      await deepSession(client, { root, terms: Number(opts.deep), report })
    else
      await session(client, {
        root,
        mainText,
        edits,
        report,
        sample,
        quiet: !!opts.quiet,
        gapMs: Number(opts.gap ?? 0),
      })
  } catch (e) {
    console.log("FAILED:", e.message)
    console.log("sample", JSON.stringify(await sample()))
    if (process.env.HOST_STACKS) await new Promise((r) => setTimeout(r, 6000))
    console.log(
      "stderr tail:",
      stderr.slice(process.env.HOST_STACKS ? -60000 : -3000),
    )
    // Is the server busy or blocked? Per-thread CPU ticks over two seconds.
    const ticks = () =>
      Object.fromEntries(
        readdirSync(`/proc/${child.pid}/task`).map((t) => {
          const f = readFileSync(`/proc/${child.pid}/task/${t}/stat`, "utf8")
            .split(") ")[1]
            .split(" ")
          return [t, Number(f[11]) + Number(f[12])]
        }),
      )
    try {
      const a = ticks()
      await new Promise((r) => setTimeout(r, 2000))
      const b = ticks()
      const busy = Object.entries(b)
        .map(([t, v]) => [t, v - (a[t] ?? 0)])
        .filter(([, d]) => d > 0)
      console.log(
        "threads using CPU over 2 s (tid, ticks of 10 ms):",
        JSON.stringify(busy),
      )
    } catch (e) {
      console.log("cpu sample failed", String(e))
    }
    child.kill("SIGKILL")
    process.exit(1)
  }
  setTimeout(() => {
    if (child.exitCode === null) {
      console.log("server did not exit; killing")
      child.kill("SIGKILL")
    }
    if (stderr) console.log("stderr tail:", stderr.slice(-1500))
  }, 3000)
}
