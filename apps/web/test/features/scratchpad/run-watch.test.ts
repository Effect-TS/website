import * as ChildProcess from "node:child_process"
import * as Crypto from "node:crypto"
import * as Fs from "node:fs"
import * as Os from "node:os"
import * as Path from "node:path"
import { afterEach, assert, describe, test } from "vite-plus/test"

// The watch runner (`run-watch.cjs`) under Node, in a temp dir laid out like
// the Container's workdir: `run`, `.scratchpad/` and `workspace/`.

const SOURCE_DIR = Path.resolve(
  import.meta.dirname,
  "../../../src/features/scratchpad",
)
// oxlint-disable-next-line no-control-regex
const MARKER = /\u001b\]7777;scratchpad-run;([^\u0007]*)\u0007/g

const sha256 = (text: string) =>
  Crypto.createHash("sha256").update(text).digest("hex")

const plain = (text: string) =>
  text
    .replace(MARKER, "")
    // oxlint-disable-next-line no-control-regex
    .replace(/\u001b\[[0-9;]*[A-Za-z]/g, "")
    .replace(/\r/g, "")

interface Runner {
  readonly dir: string
  /** Everything printed so far, markers and ANSI included. */
  readonly output: () => string
  readonly markers: () => ReadonlyArray<string>
  /** The text after the last clear-screen, markers and ANSI removed. */
  readonly screen: () => string
  readonly write: (path: string, content: string) => void
  /** Writes the diagnostics file for the workspace files on disk now. */
  readonly check: (
    paths: ReadonlyArray<string>,
    errors?: ReadonlyArray<string>,
  ) => void
  /** Writes the diagnostics file as the page does while installing. */
  readonly installing: () => void
  readonly restart: () => void
  readonly waitFor: (
    predicate: () => boolean,
    what: string,
    timeoutMs?: number,
  ) => Promise<void>
  readonly process: ChildProcess.ChildProcess
  readonly exited: Promise<number | null>
}

const runners: Array<Runner> = []

afterEach(() => {
  for (const runner of runners.splice(0)) {
    runner.process.kill("SIGKILL")
    Fs.rmSync(runner.dir, { recursive: true, force: true })
  }
})

const CLEAR = "\u001b[2J\u001b[3J\u001b[H"

const startRunner = (
  files: Readonly<Record<string, string>>,
  options: { readonly diagnosticsTimeoutMs?: number } = {},
): Runner => {
  const dir = Fs.mkdtempSync(Path.join(Os.tmpdir(), "scratchpad-run-"))
  const workspace = Path.join(dir, "workspace")
  const hostDir = Path.join(dir, ".scratchpad")
  Fs.mkdirSync(hostDir, { recursive: true })
  Fs.copyFileSync(Path.join(SOURCE_DIR, "run-watch.cjs"), Path.join(dir, "run"))
  Fs.copyFileSync(
    Path.join(SOURCE_DIR, "run-preload.mjs"),
    Path.join(hostDir, "run-preload.mjs"),
  )
  const write = (path: string, content: string) => {
    const full = Path.join(workspace, path)
    Fs.mkdirSync(Path.dirname(full), { recursive: true })
    Fs.writeFileSync(full, content)
  }
  for (const [path, content] of Object.entries(files)) write(path, content)

  const child = ChildProcess.spawn(
    process.execPath,
    ["../run", "src/main.ts"],
    {
      cwd: workspace,
      env: {
        ...process.env,
        SCRATCHPAD_RUN_POLL_MS: "20",
        SCRATCHPAD_RUN_DEBOUNCE_MS: "40",
        SCRATCHPAD_RUN_DIAGNOSTICS_TIMEOUT_MS: String(
          options.diagnosticsTimeoutMs ?? 10_000,
        ),
      },
    },
  )
  let output = ""
  child.stdout.setEncoding("utf8")
  child.stdout.on("data", (chunk: string) => {
    output += chunk
  })
  child.stderr.setEncoding("utf8")
  child.stderr.on("data", (chunk: string) => {
    output += chunk
  })
  const exited = new Promise<number | null>((resolve) =>
    child.on("exit", (code) => resolve(code)),
  )
  const runner: Runner = {
    dir,
    output: () => output,
    markers: () => [...output.matchAll(MARKER)].map((match) => match[1]!),
    screen: () => plain(output.slice(output.lastIndexOf(CLEAR))),
    write,
    check: (paths, errors = []) =>
      Fs.writeFileSync(
        Path.join(hostDir, "diagnostics.json"),
        JSON.stringify({
          files: Object.fromEntries(
            paths.map((path) => [
              path,
              sha256(Fs.readFileSync(Path.join(workspace, path), "utf8")),
            ]),
          ),
          errors: errors.map((text) => ({ text })),
        }),
      ),
    installing: () =>
      Fs.writeFileSync(
        Path.join(hostDir, "diagnostics.json"),
        JSON.stringify({ installing: true, files: {}, errors: [] }),
      ),
    restart: () =>
      Fs.writeFileSync(Path.join(hostDir, "restart"), String(Date.now())),
    waitFor: async (predicate, what, timeoutMs = 10_000) => {
      const started = Date.now()
      while (!predicate()) {
        if (Date.now() - started > timeoutMs) {
          assert.fail(`Timed out waiting for ${what}. Output:\n${output}`)
        }
        await new Promise((resolve) => setTimeout(resolve, 20))
      }
    },
    process: child,
    exited,
  }
  runners.push(runner)
  return runner
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const MAIN = `const n: number = 1\nconsole.log("hello", n)\n`

describe("the watch runner", { timeout: 30_000 }, () => {
  test("waits for a matching type check, then runs the entry with TypeScript syntax and reports its exit", async () => {
    const runner = startRunner({ "src/main.ts": MAIN })
    await sleep(300)
    assert.deepEqual(runner.markers(), ["watch;start"], "runs before the check")

    runner.check(["src/main.ts"])
    await runner.waitFor(
      () => runner.screen().includes("Watching for file changes."),
      "the exit line",
    )
    assert.match(
      runner.screen(),
      /^\[\d\d:\d\d:\d\d\] Starting in watch mode\.\n\[\d\d:\d\d:\d\d\] Running src\/main\.ts…\n\nhello 1\n\n\[\d\d:\d\d:\d\d\] Exited with code 0\. Watching for file changes\.\n$/,
    )
  })

  test("prints the type errors and doesn't run; fixing the file runs it", async () => {
    const runner = startRunner({
      "src/main.ts": `const n: number = "nope"\nconsole.log("ran")\n`,
    })
    runner.check(
      ["src/main.ts"],
      [
        "src/main.ts:1:7 - error TS2322: Type 'string' is not assignable to type 'number'.\r\n",
      ],
    )
    await runner.waitFor(
      () => runner.screen().includes("Not running."),
      "the error report",
    )
    assert.match(
      runner.screen(),
      /Starting in watch mode\.\n\nsrc\/main\.ts:1:7 - error TS2322: Type 'string' is not assignable to type 'number'\.\n\n\[\d\d:\d\d:\d\d\] Found 1 error\. Not running\. Watching for file changes\.\n$/,
    )

    runner.write("src/main.ts", `console.log("ran")\n`)
    runner.check(["src/main.ts"])
    await runner.waitFor(
      () => runner.screen().includes("Exited with code 0"),
      "the fixed Run",
    )
    assert.include(runner.screen(), "\nran\n")
  })

  test("an edit kills the running program and runs the new one", async () => {
    const runner = startRunner({
      "src/main.ts": `let n = 0\nsetInterval(() => console.log("tick", ++n), 50)\n`,
    })
    runner.check(["src/main.ts"])
    await runner.waitFor(() => runner.screen().includes("tick 3"), "ticks")
    runner.write("src/main.ts", `console.log("replaced")\n`)
    runner.check(["src/main.ts"])
    await runner.waitFor(
      () => runner.screen().includes("Exited with code 0"),
      "the new Run",
    )
    await sleep(200)
    assert.notInclude(
      runner.output().slice(runner.output().indexOf("replaced")),
      "tick",
    )
  })

  test("re-runs on a change to package.json or a file the type check lists, and on Restart, but not when a file joins the watched set", async () => {
    const runner = startRunner({
      "src/main.ts": `import { x } from "./other.ts"\nconsole.log("x is", x)\n`,
      "src/other.ts": `export const x = 1\n`,
      "package.json": `{}`,
    })
    const runs = () => runner.markers().filter((marker) => marker === "start")
    runner.check(["src/main.ts", "src/other.ts"])
    await runner.waitFor(() => runner.screen().includes("x is 1"), "Run 1")
    await sleep(400)

    runner.write("src/other.ts", `export const x = 2\n`)
    runner.check(["src/main.ts", "src/other.ts"])
    await runner.waitFor(() => runner.screen().includes("x is 2"), "Run 2")

    runner.write("package.json", `{ "name": "changed" }`)
    await runner.waitFor(() => runs().length === 3, "Run 3")

    runner.restart()
    await runner.waitFor(() => /Restarting\./.test(runner.screen()), "Restart")
    await runner.waitFor(
      () => runner.screen().includes("Exited with code 0"),
      "Run 4",
    )
    assert.lengthOf(runs(), 4)
  })

  test("without a type check it runs anyway after the timeout, with a warning", async () => {
    const runner = startRunner(
      { "src/main.ts": `console.log("unchecked")\n` },
      { diagnosticsTimeoutMs: 300 },
    )
    await runner.waitFor(
      () => runner.screen().includes("Exited with code 0"),
      "the unchecked Run",
    )
    assert.include(
      runner.screen(),
      "No type check from the editor after 0.3 s: running anyway.",
    )
  })

  test("while the page installs it waits past the timeout for the type check", async () => {
    const runner = startRunner(
      { "src/main.ts": `console.log("installed")\n` },
      { diagnosticsTimeoutMs: 300 },
    )
    runner.installing()
    await sleep(700)
    assert.deepEqual(runner.markers(), ["watch;start"])
  })

  test("Ctrl+C kills the program and exits the runner", async () => {
    const runner = startRunner({
      "src/main.ts": `setInterval(() => console.log("alive"), 50)\n`,
    })
    runner.check(["src/main.ts"])
    await runner.waitFor(() => runner.screen().includes("alive"), "the program")
    runner.process.kill("SIGINT")
    assert.deepEqual(
      { code: await runner.exited, markers: runner.markers().slice(-2) },
      { code: 130, markers: ["exit;130", "watch;exit"] },
    )
  })
})
