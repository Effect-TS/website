import { assert, test } from "vite-plus/test"
import { spawn } from "node:child_process"
import { readdirSync, readFileSync } from "node:fs"
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

// `run` is typed into the learner's shell, so the page has no handle on it.
// Replacing the workspace (Solve, Reset) under its live compiler watch leaves
// it compiling stale files or not at all, so `run` takes part in the swap
// through a control directory beside it, `.run-control/`:
//
// - each `run` keeps `.run-control/<pid>` holding `watching` or `paused`, and
//   removes it when it exits;
// - while `.run-control/pause` exists, every `run` closes its watch program,
//   kills the program it started, waits for it to exit, then writes `paused`;
// - once `pause` is removed, `run` opens a fresh watch program on the files now
//   in the workspace and writes `watching`.
//
// The page creates `pause`, waits for every runner to report `paused`, replaces
// the files, then removes `pause`. These tests drive that protocol against the
// real script with a stand-in TypeScript that logs every watch program it opens
// and closes, and a program that prints the source it was compiled from.

const runExe = (() => {
  const services = join(
    import.meta.dirname,
    "../../../src/features/playground/services",
  )
  for (const file of readdirSync(services)) {
    if (!file.endsWith(".ts")) continue
    const match = /const runExe = `((?:[^`\\]|\\.)*)`/.exec(
      readFileSync(join(services, file), "utf8"),
    )
    if (match !== null) return match[1]!.replace(/\\(.)/g, "$1")
  }
  throw new Error("runExe not found in src/features/playground/services")
})()

// Each watch program "compiles" src/main.ts into a program that prints its
// source and its pid, then keeps running like a server would.
const fakeTypeScript = `
const Fs = require("node:fs")
let open = 0
const log = (line) => Fs.appendFileSync("../events.log", line + "\\n")
module.exports = {
  sys: {},
  createDiagnosticReporter: () => () => {},
  createWatchStatusReporter: () => () => {},
  createSemanticDiagnosticsBuilderProgram: () => {},
  getPreEmitDiagnostics: () => [],
  createWatchCompilerHost: () => ({}),
  createWatchProgram: (host) => {
    open++
    log(open > 1 ? "overlap" : "open")
    const source = Fs.readFileSync("src/main.ts", "utf8")
    Fs.writeFileSync(
      "dist/main.js",
      "console.log('program ' + " + JSON.stringify(source) + " + ' pid ' + process.pid); setInterval(() => {}, 1000)",
    )
    const watching = setInterval(() => {}, 1000)
    host.afterProgramCreate({ getProgram: () => ({}) })
    return {
      close: () => {
        clearInterval(watching)
        open--
        log("close")
      },
    }
  },
}
`

const until = async <A>(
  what: string,
  check: () => Promise<A | undefined>,
  timeout = 4_000,
): Promise<A> => {
  const deadline = Date.now() + timeout
  for (;;) {
    const value = await check().catch(() => undefined)
    if (value !== undefined) return value
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`)
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}

const alive = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const startRunner = async () => {
  const root = await mkdtemp(join(tmpdir(), "run-lifecycle-"))
  const workspace = join(root, "learn")
  await mkdir(join(workspace, "node_modules", "typescript"), {
    recursive: true,
  })
  await mkdir(join(workspace, "src"))
  await mkdir(join(workspace, "dist"))
  await writeFile(
    join(workspace, "node_modules", "typescript", "index.js"),
    fakeTypeScript,
  )
  await writeFile(join(workspace, "src", "main.ts"), "v0")
  await writeFile(join(root, "run"), runExe)

  const runner = spawn(process.execPath, ["../run", "src/main.ts"], {
    cwd: workspace,
  })
  let output = ""
  runner.stdout.on("data", (chunk) => (output += chunk))
  runner.stderr.on("data", (chunk) => (output += chunk))
  const exited = new Promise<void>((resolve) =>
    runner.on("exit", () => resolve()),
  )

  const control = join(root, ".run-control")
  const state = () =>
    readFile(join(control, String(runner.pid)), "utf8").then((s) => s.trim())
  const programs = () =>
    [...output.matchAll(/program (\S+) pid (\d+)/g)].map(([, source, pid]) => ({
      source: source!,
      pid: Number(pid),
    }))
  const events = () =>
    readFile(join(root, "events.log"), "utf8").then((s) =>
      s.split("\n").filter(Boolean),
    )

  // Creates `pause`, waits for `paused`, replaces the source, removes `pause`
  // and waits for the fresh program, the way the page swaps a workspace.
  const swap = async (source: string) => {
    await mkdir(control, { recursive: true })
    await writeFile(join(control, "pause"), "")
    await until("the runner to pause", async () =>
      (await state()) === "paused" ? true : undefined,
    )
    // `paused` means the program has exited, not just been signalled.
    const stopped = programs()
    const stillRunning = stopped.filter((program) => alive(program.pid))
    await writeFile(join(workspace, "src", "main.ts"), source)
    await rm(join(control, "pause"))
    const fresh = await until("the fresh program", async () =>
      programs().find((program) => program.source === source),
    )
    await until("the runner to watch again", async () =>
      (await state()) === "watching" ? true : undefined,
    )
    return { stopped, stillRunning, fresh }
  }

  const stop = async () => {
    runner.kill("SIGTERM")
    await exited
    const left = await stat(join(control, String(runner.pid))).then(
      () => true,
      () => false,
    )
    await rm(root, { recursive: true, force: true })
    return { left }
  }

  await until("the runner to start watching", async () =>
    (await state()) === "watching" && programs().length === 1
      ? true
      : undefined,
  ).catch(async (error: Error) => {
    runner.kill("SIGKILL")
    await rm(root, { recursive: true, force: true })
    throw new Error(`${error.message}\n${output}`)
  })

  return { swap, stop, programs, events, output: () => output }
}

test("pauses before a swap and compiles the swapped files afresh after it", async () => {
  const runner = await startRunner()
  try {
    const { stopped, stillRunning, fresh } = await runner.swap("v1")

    assert.isNotEmpty(stopped)
    assert.deepEqual(stillRunning, [], "the old program is gone once paused")
    assert.isTrue(alive(fresh.pid), runner.output())
    assert.deepEqual(await runner.events(), ["open", "close", "open"])
  } finally {
    const { left } = await runner.stop()
    assert.isFalse(left, "the runner removes its state file when it exits")
  }
})

test("repeated swaps never overlap watch programs or programs", async () => {
  const runner = await startRunner()
  try {
    for (let swap = 1; swap <= 6; swap++) {
      const { stillRunning, fresh } = await runner.swap(`v${swap}`)
      assert.deepEqual(stillRunning, [], "the old program is gone once paused")
      const running = runner.programs().filter((program) => alive(program.pid))
      assert.deepEqual(running, [fresh], runner.output())
    }

    const events = await runner.events()
    assert.notInclude(events, "overlap")
    assert.deepEqual(events, [
      "open",
      ...Array.from({ length: 6 }, () => ["close", "open"]).flat(),
    ])
  } finally {
    await runner.stop()
  }
})
