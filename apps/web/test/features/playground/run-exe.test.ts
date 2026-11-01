import { assert, test } from "vite-plus/test"
import { spawn } from "node:child_process"
import { readdirSync, readFileSync } from "node:fs"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

// `run` is the compile-and-run loop behind every playground terminal. Inside
// a WebContainer, resetting the workspace (Solve, Reset) while it watches can
// raise a bare `{ code: "ENOENT" }` object with no path, syscall or stack from
// the runtime itself, not from anything `run` called. These tests run the real
// script in Node against a stand-in TypeScript that compiles once, raises the
// given failure, then compiles again, the way the watcher does after a reset.

// The script is a template literal in the playground services, installed into
// the container as `run`. Read it from the source so it can move between files.
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

const fakeTypeScript = `
let raised = false
module.exports = {
  sys: {},
  createDiagnosticReporter: () => () => {},
  createWatchStatusReporter: () => () => {},
  createSemanticDiagnosticsBuilderProgram: () => {},
  getPreEmitDiagnostics: () => [],
  createWatchCompilerHost: () => ({}),
  createWatchProgram: (host) => {
    const builder = { getProgram: () => ({}) }
    const watching = setInterval(() => {}, 1000)
    host.afterProgramCreate(builder)
    if (!raised) {
      raised = true
      setTimeout(() => { throw JSON.parse(process.env.FAILURE) }, 300)
    }
    setTimeout(() => host.afterProgramCreate(builder), 600)
    return { close: () => clearInterval(watching) }
  },
}
`

const runWithFailure = async (failure: unknown) => {
  const directory = await mkdtemp(join(tmpdir(), "run-exe-"))
  try {
    await mkdir(join(directory, "node_modules", "typescript"), {
      recursive: true,
    })
    await mkdir(join(directory, "src"))
    await mkdir(join(directory, "dist"))
    await writeFile(
      join(directory, "node_modules", "typescript", "index.js"),
      fakeTypeScript,
    )
    await writeFile(join(directory, "src", "main.ts"), "")
    await writeFile(
      join(directory, "dist", "main.js"),
      `console.log("program ran")`,
    )
    await writeFile(join(directory, "run"), runExe)

    const child = spawn(process.execPath, ["run", "src/main.ts"], {
      cwd: directory,
      env: { ...process.env, FAILURE: JSON.stringify(failure) },
    })
    let output = ""
    child.stdout.on("data", (chunk) => (output += chunk))
    child.stderr.on("data", (chunk) => (output += chunk))
    const exited = new Promise<number | null>((resolve) =>
      child.on("exit", (code, signal) =>
        resolve(signal === "SIGTERM" ? 143 : code),
      ),
    )
    const stillRunning = await Promise.race([
      exited.then(() => false),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 2_000)),
    ])
    if (stillRunning) child.kill("SIGTERM")
    return { stillRunning, exitCode: await exited, output }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

test("keeps watching and runs the program again after the runtime's bare ENOENT", async () => {
  const result = await runWithFailure({
    code: "ENOENT",
    errno: -2,
    message: "no such file or directory",
  })

  assert.isTrue(result.stillRunning, result.output)
  assert.equal(result.output.match(/program ran/g)?.length, 2, result.output)
})

test("still stops on any other uncaught error", async () => {
  const result = await runWithFailure({
    code: "EACCES",
    errno: -13,
    syscall: "open",
    path: "/denied",
    message: "permission denied",
  })

  assert.isFalse(result.stillRunning, result.output)
  assert.notEqual(result.exitCode, 0)
})
