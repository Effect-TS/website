import { assert, test } from "vite-plus/test"
import { EventEmitter } from "node:events"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import Path from "node:path"
import vm from "node:vm"

// The interleavings `run-lifecycle.test.ts` cannot reach with real processes:
// a SIGKILLed program exits before a test can act, and a real compile cannot
// be paused halfway. Here the real `runExe` runs in a VM against an in-memory
// file system, a stand-in TypeScript and programs that exit only when the test
// says so. The page treats `paused` as permission to replace the workspace, so
// `paused` must never be visible while a compile is starting or a program is
// still exiting.

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

class Program extends EventEmitter {
  exitCode: number | null = null
  signalCode: string | null = null
  constructor(
    readonly pid: number,
    private readonly events: Array<string>,
  ) {
    super()
  }
  kill() {
    this.events.push(`kill ${this.pid}`)
    return true
  }
  // The program exits only when the test calls this.
  finish() {
    this.signalCode = "SIGKILL"
    this.events.push(`exit ${this.pid}`)
    this.emit("exit", null, "SIGKILL")
  }
}

const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r))
}

const startRunner = (
  options: { readonly pageArrivesAtStartup?: boolean } = {},
) => {
  const files = new Map<string, string>()
  const events: Array<string> = []
  // When armed, the page takes the pause the moment the runner has found no
  // pause, before the runner acts on that, and records what it reads then.
  let arriveAfterNegativeCheck = options.pageArrivesAtStartup === true
  let arrival: { readonly saw: string } | undefined
  const programs: Array<Program> = []
  const intervals: Array<() => unknown> = []
  const state = "/home/.run-control/42"
  const pause = "/home/.run-control/pause"
  let host: { afterProgramCreate: (builder: unknown) => void } | undefined

  const typescript = {
    sys: {},
    createDiagnosticReporter: () => () => {},
    createWatchStatusReporter: () => () => {},
    createSemanticDiagnosticsBuilderProgram: () => {},
    getPreEmitDiagnostics: () => [],
    createWatchCompilerHost: () => (host = {} as never),
    createWatchProgram: (h: { afterProgramCreate: (b: unknown) => void }) => {
      // What the page would read if it looked while this compile runs.
      events.push(`open while ${files.get(state) ?? "unregistered"}`)
      if (arrival !== undefined)
        events.push(`open after the page saw ${arrival.saw}`)
      h.afterProgramCreate({ getProgram: () => ({}) })
      return { close: () => events.push("close") }
    },
  }
  const fs = {
    existsSync: (path: string) => {
      const exists = files.has(path)
      if (path === pause && !exists && arriveAfterNegativeCheck) {
        arriveAfterNegativeCheck = false
        arrival = { saw: files.get(state) ?? "unregistered" }
        files.set(pause, "")
      }
      return exists
    },
    writeFileSync: (path: string, data: unknown) =>
      files.set(path, String(data)),
    mkdirSync: () => {},
    rmSync: (path: string) => files.delete(path),
  }
  const childProcess = {
    spawn: () => {
      const program = new Program(100 + programs.length, events)
      programs.push(program)
      events.push(`spawn ${program.pid}`)
      return program
    },
  }
  const fakeProcess = Object.assign(new EventEmitter(), {
    argv: ["node", "/home/run", "src/main.ts"],
    execPath: "node",
    pid: 42,
    exit: () => {},
  })

  vm.runInNewContext(runExe, {
    require: (name: string) =>
      name.endsWith("fs")
        ? fs
        : name.endsWith("path")
          ? Path
          : name.endsWith("child_process")
            ? childProcess
            : typescript,
    __dirname: "/home",
    process: fakeProcess,
    console,
    setInterval: (fn: () => unknown) => intervals.push(fn),
    clearInterval: () => {},
  })

  return {
    events,
    programs,
    state: () => files.get(state),
    requestPause: () => files.set(pause, ""),
    // The page arrives right after the runner's next negative pause check.
    arriveAfterNextNegativeCheck: () => {
      arriveAfterNegativeCheck = true
    },
    releasePause: () => files.delete(pause),
    // Fires every interval the runner registered, as time passing would,
    // without waiting for work they leave pending.
    tick: async () => {
      for (const fn of intervals) void fn()
      await flush()
    },
    compile: () => host!.afterProgramCreate({ getProgram: () => ({}) }),
  }
}

test("registers before its first compile", async () => {
  const runner = startRunner()
  await flush()

  const [open] = runner.events.filter((event) => event.startsWith("open"))
  assert.notEqual(open, "open while unregistered", runner.events.join(", "))
  assert.notMatch(open!, /paused/, runner.events.join(", "))
})

test("stops saying paused before it compiles again on resume", async () => {
  const runner = startRunner()
  await flush()
  runner.requestPause()
  await runner.tick()
  runner.programs[0]!.finish()
  await flush()
  assert.equal(runner.state(), "paused")

  runner.releasePause()
  await runner.tick()

  const opens = runner.events.filter((event) => event.startsWith("open"))
  assert.lengthOf(opens, 2, runner.events.join(", "))
  assert.notMatch(opens[1]!, /paused/, runner.events.join(", "))
})

test("a pause while the program is still exiting waits for that exit", async () => {
  const runner = startRunner()
  await flush()
  runner.compile() // kills program 100; its exit is still pending
  runner.requestPause()
  await runner.tick()

  assert.notEqual(runner.state(), "paused", runner.events.join(", "))

  runner.programs[0]!.finish()
  await flush()
  await runner.tick()
  assert.equal(runner.state(), "paused", runner.events.join(", "))
})

test("compiles in quick succession start one program, after the old one exits", async () => {
  const runner = startRunner()
  await flush()
  runner.compile()
  runner.compile()
  await flush()

  assert.deepEqual(
    runner.programs.map((program) => program.pid),
    [100],
    runner.events.join(", "),
  )

  runner.programs[0]!.finish()
  await flush()
  assert.deepEqual(
    runner.programs.map((program) => program.pid),
    [100, 101],
    runner.events.join(", "),
  )
})

// The page takes a pause, then reads each registration; the runner publishes
// its state, then checks for a pause. Done in that order on both sides, at
// least one of them sees the other, so the page can never read "unregistered"
// or "paused" for a runner that goes on to compile.
test("a pause taken right after the startup check never meets a compile it cannot see", async () => {
  const runner = startRunner({ pageArrivesAtStartup: true })
  await flush()

  const unseen = runner.events.filter((event) =>
    /^open after the page saw (unregistered|paused)/.test(event),
  )
  assert.deepEqual(unseen, [], runner.events.join(", "))
})

test("a pause taken right after the resume check never meets a compile it cannot see", async () => {
  const runner = startRunner()
  await flush()
  runner.requestPause()
  await runner.tick()
  runner.programs[0]!.finish()
  await flush()
  assert.equal(runner.state(), "paused")

  runner.releasePause()
  runner.arriveAfterNextNegativeCheck()
  await runner.tick()

  const unseen = runner.events.filter((event) =>
    /^open after the page saw (unregistered|paused)/.test(event),
  )
  assert.deepEqual(unseen, [], runner.events.join(", "))
})
