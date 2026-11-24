#!/usr/bin/env node
// The watch runner, installed next to the Workspace dir as `run`
// and typed into the terminal as `../run src/main.ts`, like `/play`'s.
//
// It owns the terminal until Ctrl+C. On start, on a change to a watched file
// and on Restart, it clears the screen, waits for the page's type check of
// the files on disk (`.scratchpad/diagnostics.json`, written by the page from
// tsrs in the web worker), then prints the errors and doesn't run, or runs
// the entry under the preload, killing the previous program first.
//
// - Watched: the files the diagnostics file lists, `package.json` and the
//   entry. Polled, since `fs.watch` is unreliable in the Container.
// - The diagnostics file is `{ files: { path: sha256 }, errors: [{ text }] }`.
//   It matches when every listed file on disk has its hash. While the page
//   installs dependencies it is `{ installing: true }`, and the runner waits. Without a match
//   within `SCRATCHPAD_RUN_DIAGNOSTICS_TIMEOUT_MS` (5 s) it runs anyway with a
//   warning, and runs again once a matching one arrives.
// - `.scratchpad/restart` changing (the page's Restart button) re-runs.
// - OSC markers (`ESC ] 7777 ; scratchpad-run ; <payload> BEL`) tell the page
//   the state: `watch;start` and `watch;exit` for the runner, `start` and
//   `exit;<code>` for each program. xterm ignores them; the page strips them.
const ChildProcess = require("node:child_process")
const Crypto = require("node:crypto")
const Fs = require("node:fs")
const Path = require("node:path")
const Url = require("node:url")

const env = (name, fallback) => {
  const value = Number.parseInt(process.env[name] ?? "", 10)
  return Number.isNaN(value) ? fallback : value
}
const POLL_MS = env("SCRATCHPAD_RUN_POLL_MS", 100)
const DEBOUNCE_MS = env("SCRATCHPAD_RUN_DEBOUNCE_MS", 150)
const DIAGNOSTICS_TIMEOUT_MS = env(
  "SCRATCHPAD_RUN_DIAGNOSTICS_TIMEOUT_MS",
  5000,
)

const hostDir = Path.join(__dirname, ".scratchpad")
const diagnosticsPath = Path.join(hostDir, "diagnostics.json")
const restartPath = Path.join(hostDir, "restart")
const preload = Url.pathToFileURL(Path.join(hostDir, "run-preload.mjs")).href
const entry = process.argv[2] ?? "src/main.ts"

const MARKER = "\u001b]7777;scratchpad-run;"
const mark = (payload) => `${MARKER}${payload}\u0007`
const out = (text) => process.stdout.write(text)

const dim = (text) => `\u001b[90m${text}\u001b[0m`
const pad = (n) => String(n).padStart(2, "0")
const clock = () => {
  const now = new Date()
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}
const status = (text) => out(`[${dim(clock())}] ${text}\r\n`)
const clearScreen = () => out("\u001b[2J\u001b[3J\u001b[H")

const readText = (path) => {
  try {
    return Fs.readFileSync(path, "utf8")
  } catch {
    return undefined
  }
}

const hashFile = (path) => {
  try {
    return Crypto.createHash("sha256")
      .update(Fs.readFileSync(path))
      .digest("hex")
  } catch {
    return null
  }
}

const readDiagnostics = () => {
  const raw = readText(diagnosticsPath)
  if (raw === undefined) return undefined
  try {
    const parsed = JSON.parse(raw)
    return typeof parsed === "object" && parsed !== null && parsed.files
      ? parsed
      : undefined
  } catch {
    return undefined
  }
}

const watchedPaths = (diagnostics) => [
  ...new Set([entry, "package.json", ...Object.keys(diagnostics?.files ?? {})]),
]

// The last hash seen of each watched path (`null`: missing).
const hashes = new Map()

/**
 * Hashes the watched files and says whether one changed. A path that just
 * joined the watched set (a new diagnostics file lists it) is recorded, not
 * counted as a change.
 */
const changed = (paths) => {
  let any = false
  for (const path of paths) {
    const hash = hashFile(path)
    if (hashes.has(path) && hashes.get(path) !== hash) any = true
    hashes.set(path, hash)
  }
  return any
}

/** Whether the page is installing, so its type check can't be trusted yet. */
const installing = (diagnostics) => diagnostics?.installing === true

const matches = (diagnostics) =>
  diagnostics !== undefined &&
  !installing(diagnostics) &&
  Object.entries(diagnostics.files).every(
    ([path, hash]) => hashFile(path) === hash,
  )

let child
let childId = 0

/** Kills the running program, quietly: a new Run replaces it. */
const killProgram = () => {
  if (child === undefined) return
  const killed = child
  child = undefined
  killed.kill("SIGKILL")
  out(mark("exit;137"))
}

// Enums, namespaces and parameter properties need Node's type transform. The
// Container's Node takes `--experimental-transform-types`; Node 26 removed the
// flag (it only strips types) and refuses to start with it.
const TRANSFORM_TYPES = process.allowedNodeEnvironmentFlags.has(
  "--experimental-transform-types",
)
  ? ["--experimental-transform-types"]
  : []

const runProgram = () => {
  status(`Running ${entry}…\r\n`)
  out(mark("start"))
  const id = ++childId
  const program = ChildProcess.spawn(
    process.execPath,
    [
      ...TRANSFORM_TYPES,
      "--disable-warning=ExperimentalWarning",
      "--import",
      preload,
      entry,
    ],
    { stdio: "inherit" },
  )
  child = program
  const exited = (code) => {
    if (child !== program || id !== childId) return
    child = undefined
    out("\r\n")
    out(mark(`exit;${code}`))
    status(
      `${code === 0 ? "Exited with code 0" : `\u001b[31mExited with code ${code}\u001b[0m`}. Watching for file changes.`,
    )
  }
  program.on("error", (error) => {
    out(`${error.message}\r\n`)
    exited(1)
  })
  program.on("exit", (code, signal) =>
    exited(
      code ?? (signal === "SIGINT" ? 130 : signal === "SIGTERM" ? 143 : 1),
    ),
  )
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`

/** Prints the type check and runs the program if it has no errors. */
const report = (reason, diagnostics) => {
  const errors = diagnostics?.errors ?? []
  if (diagnostics === undefined) {
    status(
      `${reason} \u001b[33mNo type check from the editor after ${DIAGNOSTICS_TIMEOUT_MS / 1000} s: running anyway.\u001b[0m`,
    )
    runProgram()
    return
  }
  if (errors.length === 0) {
    status(reason)
    runProgram()
    return
  }
  status(`${reason}\r\n`)
  for (const error of errors) out(`${error.text}\r\n`)
  status(
    `Found ${plural(errors.length, "error")}. Not running. Watching for file changes.`,
  )
}

// The current cycle: waiting for the type check since `since`.
let waiting
// The last cycle ran without a type check: run again when one matches.
let ranUnchecked = false
let changedAt
let lastRestart = readText(restartPath)

const startCycle = (reason) => {
  killProgram()
  clearScreen()
  waiting = { reason, since: Date.now(), started: Date.now(), announced: false }
  ranUnchecked = false
}

const tick = () => {
  const diagnostics = readDiagnostics()
  const now = Date.now()
  if (changed(watchedPaths(diagnostics))) changedAt = now
  const restart = readText(restartPath)
  if (restart !== lastRestart) {
    lastRestart = restart
    changedAt = undefined
    startCycle("Restarting.")
  } else if (changedAt !== undefined && now - changedAt >= DEBOUNCE_MS) {
    changedAt = undefined
    startCycle("File change detected.")
  }
  if (waiting !== undefined) {
    if (installing(diagnostics)) {
      // The timeout counts from the end of the install.
      waiting.since = now
      // A stale marker the page is about to replace isn't worth a line.
      if (!waiting.announced && now - waiting.started >= 1000) {
        waiting.announced = true
        status("Waiting for the install to finish…")
      }
    } else if (matches(diagnostics)) {
      const { reason } = waiting
      waiting = undefined
      report(reason, diagnostics)
    } else if (now - waiting.since >= DIAGNOSTICS_TIMEOUT_MS) {
      const { reason } = waiting
      waiting = undefined
      report(reason, undefined)
      ranUnchecked = true
    }
  } else if (ranUnchecked && changedAt === undefined && matches(diagnostics)) {
    startCycle("Type check arrived.")
  }
}

out(mark("watch;start"))
changed(watchedPaths(readDiagnostics()))
startCycle("Starting in watch mode.")
tick()
const timer = setInterval(tick, POLL_MS)

const stop = (code) => () => {
  clearInterval(timer)
  if (child !== undefined) {
    const running = child
    child = undefined
    running.kill("SIGKILL")
    out(mark(`exit;${code}`))
  }
  process.stdout.write(mark("watch;exit"), () => process.exit(code))
}
process.once("SIGINT", stop(130))
process.once("SIGTERM", stop(143))
