// Checks that this machine has what the course needs. You never edit it.
//
//   pnpm doctor           check Node, pnpm, git and the viewer
//   pnpm doctor --viewer  check, then start the viewer
import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { Console, Context, Effect, FileSystem, Layer, Runtime, Schema } from "effect"
import { Command, Flag } from "effect/cli"
import * as NodePath from "node:path"
import { isMain } from "./entrypoint.ts"
import * as Viewer from "./viewer.ts"

export const minimumNode = "22.16"

// Everything the doctor reads from the machine, so tests can describe a
// machine instead of depending on the one running them.
export class Host extends Context.Service<Host, {
  readonly nodeVersion: string
  readonly glibcVersion?: string | undefined
  hasCommand(name: string): Effect.Effect<boolean>
  exists(path: string): Effect.Effect<boolean>
}>()("rulebook/tools/doctor/Host") {
  static readonly layer = Layer.effect(
    Host,
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const isExecutable = (file: string) =>
        fs.stat(file).pipe(
          Effect.map((info) => info.type === "File" && (info.mode & 0o111) !== 0),
          Effect.orElseSucceed(() => false)
        )
      return Host.of({
        nodeVersion: process.version,
        glibcVersion: Viewer.glibcVersion(),
        // Looks the command up on PATH without running it.
        hasCommand: Effect.fn(function*(name) {
          const directories = (process.env.PATH ?? "").split(NodePath.delimiter).filter((_) => _ !== "")
          for (const directory of directories) {
            if (yield* isExecutable(NodePath.join(directory, name))) return true
          }
          return false
        }),
        exists: (path) => fs.exists(path).pipe(Effect.orElseSucceed(() => false))
      })
    })
  ).pipe(Layer.provide(NodeServices.layer))
}

export class DoctorFailed extends Schema.TaggedError<DoctorFailed>()("DoctorFailed", {
  message: Schema.String
}) {
  // The doctor has already printed every check; no stack trace on top of it.
  override readonly [Runtime.errorReported] = false
}

interface Check {
  readonly name: string
  readonly ok: boolean
  readonly detail: string
}

const nodeAtLeast = (version: string, minimum: string) => {
  const [major = 0, minor = 0] = version.replace(/^v/, "").split(".").map(Number)
  const [minMajor = 0, minMinor = 0] = minimum.split(".").map(Number)
  return major > minMajor || (major === minMajor && minor >= minMinor)
}

// Prints one line per requirement and fails listing every one that is missing.
export const doctor = Effect.gen(function*() {
  const host = yield* Host
  const checks: Array<Check> = []

  checks.push(
    nodeAtLeast(host.nodeVersion, minimumNode)
      ? { name: "node", ok: true, detail: host.nodeVersion }
      : { name: "node", ok: false, detail: `found ${host.nodeVersion}, need ${minimumNode} or newer` }
  )
  checks.push(
    (yield* host.hasCommand("pnpm"))
      ? { name: "pnpm", ok: true, detail: "on PATH" }
      : { name: "pnpm", ok: false, detail: "not on PATH; install pnpm or run `corepack enable`" }
  )
  checks.push(
    (yield* host.hasCommand("git"))
      ? { name: "git", ok: true, detail: "on PATH" }
      : { name: "git", ok: false, detail: "not on PATH; install git" }
  )

  const hasBinary = yield* host.exists(Viewer.binaryPath)
  const hasDocker = !hasBinary && (yield* host.hasCommand("docker"))
  checks.push(
    hasBinary
      ? { name: "viewer", ok: true, detail: `otel-desktop-viewer v${Viewer.version} in .viewer/` }
      : hasDocker
      ? { name: "viewer", ok: true, detail: `docker on PATH, runs ${Viewer.image}` }
      : { name: "viewer", ok: false, detail: missingViewer(host.glibcVersion) }
  )

  for (const check of checks) {
    yield* Console.log(`${check.ok ? "✓" : "✗"} ${check.name.padEnd(7)} ${check.detail}`)
  }

  const missing = checks.filter((check) => !check.ok)
  if (missing.length > 0) {
    yield* Console.log(`\n${missing.length} missing. Fix the lines marked ✗ and run \`pnpm doctor\` again.`)
    return yield* new DoctorFailed({
      message: `Missing requirements: ${missing.map((check) => `${check.name} (${check.detail})`).join("; ")}`
    })
  }
  yield* Console.log("\nAll set.")
})

const missingViewer = (glibc: string | undefined) =>
  glibc !== undefined && !nodeAtLeast(glibc, "2.39")
    ? `no otel-desktop-viewer and no docker on PATH; the viewer binary needs glibc 2.39+ (found ${glibc}), install Docker`
    : "no otel-desktop-viewer in .viewer/ and no docker on PATH; run `pnpm viewer` to download it, or install Docker"

export const command = Command.make(
  "doctor",
  {
    viewer: Flag.Boolean("viewer").pipe(
      Flag.withDescription("Start the viewer once every check passes"),
      Flag.withDefault(false)
    )
  },
  Effect.fn(function*({ viewer }) {
    yield* doctor.pipe(Effect.provide(Host.layer))
    if (viewer) {
      yield* Viewer.run.pipe(Effect.tapErrorTag("ViewerError", (error) => Console.error(error.message)))
    }
  })
).pipe(Command.withDescription("Check that this machine is ready for the rulebook course"))

if (isMain(import.meta)) {
  command.pipe(
    Command.run({ version: "0.0.0" }),
    Effect.provide(NodeServices.layer),
    NodeRuntime.runMain
  )
}
