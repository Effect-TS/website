import { NodeServices } from "@effect/platform-node"
import { assert, describe, it } from "@effect/vitest"
import { Console, Effect, FileSystem, Layer, Path, Result, Stream } from "effect"
import { ChildProcess } from "effect/process"
import * as Doctor from "../tools/doctor.ts"
import * as Viewer from "../tools/viewer.ts"

// The doctor reads and changes the host only through Doctor.Host, so these
// tests never depend on, download to, or start anything on the machine
// running them. `events` records what the doctor did, in order: "command <name>"
// for every PATH lookup, "download", "start binary" or "start docker", and
// "print <line>" for every printed line.
const host = (options: {
  readonly nodeVersion: string
  readonly commands: ReadonlyArray<string>
  readonly viewerBinary: boolean
  // Whether the binary under .viewer/ actually runs here; a present binary
  // runs unless a test says otherwise.
  readonly viewerRuns?: boolean
  readonly glibcVersion?: string
  // Why the release binary cannot run on this machine, if it cannot.
  readonly viewerUnsupported?: string
  // What downloading the viewer does; once it succeeds the binary is present.
  readonly download?: Effect.Effect<void, Viewer.ViewerError>
  readonly events?: Array<string>
}) => {
  const events = options.events ?? []
  let downloaded = false
  const present = () => options.viewerBinary || downloaded
  const print = (...args: ReadonlyArray<unknown>) => {
    for (const line of args.join(" ").split("\n")) events.push(`print ${line}`)
  }
  return Layer.mergeAll(
    Layer.succeed(Doctor.Host, {
      nodeVersion: options.nodeVersion,
      glibcVersion: options.glibcVersion,
      viewerUnsupported: options.viewerUnsupported,
      hasCommand: (name) =>
        Effect.sync(() => {
          events.push(`command ${name}`)
          return options.commands.includes(name)
        }),
      exists: (path) => Effect.sync(() => present() && path.includes(".viewer")),
      canRun: (path) => Effect.sync(() => (options.viewerRuns ?? present()) && path.includes(".viewer")),
      downloadViewer: Effect.suspend(() => {
        events.push("download")
        return options.download ?? Effect.void
      }).pipe(Effect.tap(() =>
        Effect.sync(() => {
          downloaded = true
        })
      )),
      startViewer: (via) => Effect.sync(() => events.push(`start ${via}`)).pipe(Effect.asVoid)
    }),
    Layer.succeed(Console.Console, Object.assign(Object.create(console), { log: print, error: print }))
  )
}

const starts = (events: ReadonlyArray<string>) => events.filter((event) => event.startsWith("start "))
const viewerLine = (events: ReadonlyArray<string>) => events.find((event) => /^print [✓✗] viewer/.test(event))

// Positions of the pnpm and git lookups and of every printed check line, so a
// test can place all of the checks relative to the download and the start.
const checkPositions = (events: ReadonlyArray<string>) => {
  const positions = new Map<string, number>()
  for (const probe of ["command pnpm", "command git"]) positions.set(probe, events.indexOf(probe))
  for (const name of ["node", "pnpm", "git", "viewer"]) {
    positions.set(`${name} line`, events.findIndex((event) => new RegExp(`^print [✓✗] ${name} `).test(event)))
  }
  return positions
}

// A bare `pnpm doctor` runs pnpm's own diagnostics, never tools/doctor.ts.
const bareDoctor = /\bpnpm doctor\b/

describe("doctor", () => {
  it.effect("passes with Node 22.16, pnpm and the viewer binary under .viewer/", () => {
    const events: Array<string> = []
    return Effect.gen(function*() {
      yield* Doctor.doctor
      assert.deepStrictEqual(starts(events), [], "the doctor started the viewer without --viewer")
      assert.notInclude(events, "download")
    }).pipe(
      Effect.provide(host({ nodeVersion: "v22.16.0", commands: ["pnpm", "git"], viewerBinary: true, events }))
    )
  })

  it.effect("accepts docker for the viewer when there is no binary", () =>
    Doctor.doctor.pipe(
      Effect.provide(host({ nodeVersion: "v24.3.0", commands: ["pnpm", "git", "docker"], viewerBinary: false }))
    ))

  it.effect("fails listing every missing requirement", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(Doctor.doctor)
      assert.strictEqual(error._tag, "DoctorFailed")
      assert.match(error.message, /node/i)
      assert.match(error.message, /22\.16/)
      assert.match(error.message, /pnpm/)
      assert.match(error.message, /viewer/i)
    }).pipe(
      Effect.provide(host({ nodeVersion: "v22.15.1", commands: ["git"], viewerBinary: false }))
    ))

  it.effect("fails when the binary under .viewer/ does not run and there is no docker", () =>
    Effect.gen(function*() {
      const result = yield* Effect.result(Doctor.doctor)
      assert.isTrue(Result.isFailure(result), "the doctor reported the machine ready")
      if (Result.isFailure(result)) {
        assert.strictEqual(result.failure._tag, "DoctorFailed")
        assert.match(result.failure.message, /viewer/i)
        assert.match(result.failure.message, /docker/i)
      }
    }).pipe(
      Effect.provide(
        host({ nodeVersion: "v22.16.0", commands: ["pnpm", "git"], viewerBinary: true, viewerRuns: false })
      )
    ))

  it.effect("without --viewer a missing binary is reported, never downloaded or started", () => {
    const events: Array<string> = []
    return Effect.gen(function*() {
      const result = yield* Effect.result(Doctor.doctor)
      assert.isTrue(Result.isFailure(result), "the doctor reported the machine ready")
      if (Result.isFailure(result)) {
        assert.strictEqual(result.failure._tag, "DoctorFailed")
        assert.match(result.failure.message, /viewer/i)
      }
      assert.notInclude(events, "download")
      assert.deepStrictEqual(starts(events), [])
      assert.include(viewerLine(events), "pnpm run doctor --viewer", "the missing-viewer hint")
    }).pipe(
      Effect.provide(host({ nodeVersion: "v22.16.0", commands: ["pnpm", "git"], viewerBinary: false, events }))
    )
  })

  describe("--viewer", () => {
    it.effect("downloads a missing binary, then checks, then starts it once", () => {
      const events: Array<string> = []
      return Effect.gen(function*() {
        yield* Doctor.doctorWithViewer
        const download = events.indexOf("download")
        const start = events.indexOf("start binary")
        assert.deepStrictEqual(starts(events), ["start binary"])
        assert.isAtLeast(download, 0, "the binary was not downloaded")
        assert.match(viewerLine(events) ?? "", /^print ✓ viewer/)
        for (const [check, position] of checkPositions(events)) {
          assert.isAbove(position, download, `${check} before the download`)
          assert.isBelow(position, start, `${check} after the viewer started`)
        }
      }).pipe(
        Effect.provide(host({ nodeVersion: "v22.16.0", commands: ["pnpm", "git"], viewerBinary: false, events }))
      )
    })

    it.effect("reports a failed download on the viewer line and starts nothing", () => {
      const events: Array<string> = []
      const message = "Could not download the viewer: connection refused"
      return Effect.gen(function*() {
        const result = yield* Effect.result(Doctor.doctorWithViewer)
        assert.isTrue(Result.isFailure(result), "the doctor reported the machine ready")
        if (Result.isFailure(result)) {
          assert.strictEqual(result.failure._tag, "DoctorFailed")
        }
        const download = events.indexOf("download")
        assert.isAtLeast(download, 0, "no download was attempted")
        for (const [check, position] of checkPositions(events)) {
          assert.isAbove(position, download, `${check} missing or before the download`)
        }
        assert.match(viewerLine(events) ?? "", /^print ✗ viewer/)
        assert.include(viewerLine(events), message)
        assert.deepStrictEqual(starts(events), [])
      }).pipe(
        Effect.provide(host({
          nodeVersion: "v22.16.0",
          commands: ["pnpm", "git"],
          viewerBinary: false,
          download: Effect.fail(new Viewer.ViewerError({ message })),
          events
        }))
      )
    })

    it.effect("uses docker without downloading when the binary cannot run here", () => {
      const events: Array<string> = []
      return Effect.gen(function*() {
        yield* Doctor.doctorWithViewer
        assert.notInclude(events, "download")
        assert.match(viewerLine(events) ?? "", /^print ✓ viewer.*docker/)
        assert.deepStrictEqual(starts(events), ["start docker"])
      }).pipe(
        Effect.provide(host({
          nodeVersion: "v22.16.0",
          commands: ["pnpm", "git", "docker"],
          viewerBinary: false,
          glibcVersion: "2.35",
          viewerUnsupported: "the Linux binary needs glibc 2.39 or newer, this system has 2.35",
          events
        }))
      )
    })
  })

  it.effect("spells the command `pnpm run doctor` in the README, the tools and the doctor's output", () => {
    const events: Array<string> = []
    return Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = path.join(import.meta.dirname, "..")
      const offenders: Array<string> = []

      // README prose may explain the clash; only the commands to copy count.
      const readme = yield* fs.readFileString(path.join(root, "README.md"))
      for (const [block] of readme.matchAll(/^```[^\n]*\n[\s\S]*?^```/gm)) {
        if (bareDoctor.test(block)) offenders.push(`README.md: ${block}`)
      }
      const tools = path.join(root, "tools")
      for (const file of yield* fs.readDirectory(tools)) {
        if (!file.endsWith(".ts")) continue
        const source = yield* fs.readFileString(path.join(tools, file))
        source.split("\n").forEach((line, index) => {
          if (bareDoctor.test(line)) offenders.push(`tools/${file}:${index + 1}: ${line.trim()}`)
        })
      }
      yield* Effect.ignore(Doctor.doctor.pipe(
        Effect.provide(host({ nodeVersion: "v22.15.1", commands: [], viewerBinary: false, events }))
      ))
      for (const event of events) {
        if (bareDoctor.test(event)) offenders.push(`output: ${event.slice("print ".length)}`)
      }

      assert.deepStrictEqual(offenders, [], "`pnpm doctor` written without `run`")
    }).pipe(Effect.provide(NodeServices.layer))
  })

  // The command itself: with an empty PATH no host has pnpm, so `pnpm run doctor`
  // must exit non-zero and say so, whatever else the machine has installed.
  it.live("the doctor command exits non-zero and lists what is missing", () =>
    Effect.gen(function*() {
      const path = yield* Path.Path
      const handle = yield* ChildProcess.make(process.execPath, ["--import", "tsx", "tools/doctor.ts"], {
        cwd: path.join(import.meta.dirname, ".."),
        env: { PATH: "" }
      })
      const [output, exitCode] = yield* Effect.all([
        handle.all.pipe(Stream.decodeText, Stream.mkString),
        handle.exitCode
      ], { concurrency: "unbounded" })
      assert.notStrictEqual(Number(exitCode), 0)
      assert.match(output, /pnpm/)
      const retry = output.split("\n").find((line) => line.includes("again"))
      assert.match(retry ?? "", /\bpnpm run doctor\b/, "the retry line")
      assert.notMatch(retry ?? "", bareDoctor, "the retry line")
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)))
})
