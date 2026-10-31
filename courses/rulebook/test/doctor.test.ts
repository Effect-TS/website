import { NodeServices } from "@effect/platform-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Path, Result, Stream } from "effect"
import { ChildProcess } from "effect/process"
import * as Doctor from "../tools/doctor.ts"

// The doctor reads the host only through Doctor.Host, so these tests never
// depend on the machine running them.
const host = (options: {
  readonly nodeVersion: string
  readonly commands: ReadonlyArray<string>
  readonly viewerBinary: boolean
  // Whether the binary under .viewer/ actually runs here; a present binary
  // runs unless a test says otherwise.
  readonly viewerRuns?: boolean
}) =>
  Layer.succeed(Doctor.Host, {
    nodeVersion: options.nodeVersion,
    hasCommand: (name) => Effect.succeed(options.commands.includes(name)),
    exists: (path) => Effect.succeed(options.viewerBinary && path.includes(".viewer")),
    canRun: (path) => Effect.succeed((options.viewerRuns ?? options.viewerBinary) && path.includes(".viewer"))
  })

describe("doctor", () => {
  it.effect("passes with Node 22.16, pnpm and the viewer binary under .viewer/", () =>
    Doctor.doctor.pipe(
      Effect.provide(host({ nodeVersion: "v22.16.0", commands: ["pnpm", "git"], viewerBinary: true }))
    ))

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

  // The command itself: with an empty PATH no host has pnpm, so `pnpm doctor`
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
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)))
})
