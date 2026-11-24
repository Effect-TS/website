// The Run wrapper, typed into the terminal as
// `node ../.scratchpad/run.cjs src/main.ts`. It lives in the host scripts
// directory next to `run-preload.mjs`, outside the mirrored Workspace.
//
// It runs the entry file under the preload in a child process and prints two
// OSC markers the page reads for the Run's state: `start`, then `exit;<code>`
// once the program has exited (130 after Ctrl+C). xterm ignores unknown OSC
// sequences, and the page strips them before they reach the terminal.
// Keeping the program under this process means Ctrl+C releases jsh's PTY,
// as with the Playground's `run`.
const ChildProcess = require("node:child_process")
const Path = require("node:path")
const Url = require("node:url")

const MARKER = "\u001b]7777;scratchpad-run;"
const mark = (payload, done) =>
  process.stdout.write(`${MARKER}${payload}\u0007`, done)

const entry = process.argv[2] ?? "src/main.ts"
const preload = Url.pathToFileURL(Path.join(__dirname, "run-preload.mjs")).href

mark("start")
const child = ChildProcess.spawn(
  process.execPath,
  [
    "--experimental-transform-types",
    "--disable-warning=ExperimentalWarning",
    "--import",
    preload,
    entry,
  ],
  { stdio: "inherit" },
)

let finished = false
const finish = (code) => {
  if (finished) return
  finished = true
  mark(`exit;${code}`, () => process.exit(code))
}

child.on("error", (error) => {
  process.stderr.write(`${error.message}\n`)
  finish(1)
})
child.on("exit", (code, signal) =>
  finish(code ?? (signal === "SIGINT" ? 130 : signal === "SIGTERM" ? 143 : 1)),
)
const stop = (code) => () => {
  child.kill("SIGKILL")
  finish(code)
}
process.once("SIGINT", stop(130))
process.once("SIGTERM", stop(143))
