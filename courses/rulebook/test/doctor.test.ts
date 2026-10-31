import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import * as Doctor from "../tools/doctor.ts"

// The doctor reads the host only through Doctor.Host, so these tests never
// depend on the machine running them.
const host = (options: {
  readonly nodeVersion: string
  readonly commands: ReadonlyArray<string>
  readonly viewerBinary: boolean
}) =>
  Layer.succeed(Doctor.Host, {
    nodeVersion: options.nodeVersion,
    hasCommand: (name) => Effect.succeed(options.commands.includes(name)),
    exists: (path) => Effect.succeed(options.viewerBinary && path.includes(".viewer"))
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
})
