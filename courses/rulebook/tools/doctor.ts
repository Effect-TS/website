// Checks that this machine has what the course needs. You never edit it.
//
//   pnpm run doctor           check Node, pnpm, git and the viewer
//   pnpm run doctor --viewer  download the viewer if needed, check, then start it
import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { Console, Context, Effect, FileSystem, Layer, Path, Runtime, Schema } from "effect"
import { Command, Flag } from "effect/cli"
import { ChildProcessSpawner } from "effect/process"
import * as NodePath from "node:path"
import { type ExitCode, isMain } from "./entrypoint.ts"
import * as Viewer from "./viewer.ts"

export const minimumNode = "22.16"

// Everything the doctor reads from or does to the machine, so tests can
// describe a machine instead of depending on the one running them.
export class Host extends Context.Service<Host, {
  readonly nodeVersion: string
  readonly glibcVersion?: string | undefined
  // Why the viewer binary cannot run on this machine, if it cannot.
  readonly viewerUnsupported: string | undefined
  hasCommand(name: string): Effect.Effect<boolean>
  exists(path: string): Effect.Effect<boolean>
  canRun(path: string): Effect.Effect<boolean>
  readonly downloadViewer: Effect.Effect<void, Viewer.ViewerError>
  // Runs the viewer in this terminal until it exits or is interrupted.
  startViewer(via: "binary" | "docker"): Effect.Effect<void, Viewer.ViewerError | ExitCode>
}>()("rulebook/tools/doctor/Host") {
  static readonly layer = Layer.effect(
    Host,
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const context = yield* Effect.context<
        FileSystem.FileSystem | Path.Path | ChildProcessSpawner.ChildProcessSpawner
      >()
      const viewerUnsupported = Viewer.binaryUnsupported()
      const isExecutable = (file: string) =>
        fs.stat(file).pipe(
          Effect.map((info) => info.type === "File" && (info.mode & 0o111) !== 0),
          Effect.orElseSucceed(() => false)
        )
      return Host.of({
        nodeVersion: process.version,
        glibcVersion: Viewer.glibcVersion(),
        viewerUnsupported,
        // Looks the command up on PATH without running it.
        hasCommand: Effect.fn(function*(name) {
          const directories = (process.env.PATH ?? "").split(NodePath.delimiter).filter((_) => _ !== "")
          for (const directory of directories) {
            if (yield* isExecutable(NodePath.join(directory, name))) return true
          }
          return false
        }),
        exists: (path) => fs.exists(path).pipe(Effect.orElseSucceed(() => false)),
        canRun: (path) => Viewer.binaryRuns(path).pipe(Effect.provideContext(context)),
        downloadViewer: Viewer.download().pipe(Effect.provideContext(context)),
        startViewer: (via) =>
          (via === "binary" ? Viewer.runBinary : Viewer.runDocker(viewerUnsupported ?? Viewer.binaryDoesNotRun)).pipe(
            Effect.catchTag(
              "PlatformError",
              (error) =>
                Effect.fail(new Viewer.ViewerError({ message: `Could not start the viewer: ${error.message}` }))
            ),
            Effect.provideContext(context)
          )
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
// Succeeds with how the viewer runs here. `downloadFailure` is why the viewer
// download just failed, if it did.
const check = Effect.fn("check")(function*(options: {
  readonly retry: string
  readonly downloadFailure?: string | undefined
}) {
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

  const hasBinary = options.downloadFailure === undefined && (yield* host.exists(Viewer.binaryPath))
  const binaryRuns = hasBinary && (yield* host.canRun(Viewer.binaryPath))
  const hasDocker = !binaryRuns && options.downloadFailure === undefined && (yield* host.hasCommand("docker"))
  checks.push(
    binaryRuns
      ? { name: "viewer", ok: true, detail: `otel-desktop-viewer v${Viewer.version} in .viewer/` }
      : hasDocker
      ? { name: "viewer", ok: true, detail: `docker on PATH, runs ${Viewer.image}` }
      : { name: "viewer", ok: false, detail: missingViewer(host.viewerUnsupported, hasBinary, options.downloadFailure) }
  )

  for (const check of checks) {
    yield* Console.log(`${check.ok ? "✓" : "✗"} ${check.name.padEnd(7)} ${check.detail}`)
  }

  const missing = checks.filter((check) => !check.ok)
  if (missing.length > 0) {
    yield* Console.log(`\n${missing.length} missing. Fix the lines marked ✗ and run \`${options.retry}\` again.`)
    return yield* new DoctorFailed({
      message: `Missing requirements: ${missing.map((check) => `${check.name} (${check.detail})`).join("; ")}`
    })
  }
  yield* Console.log("\nAll set.")
  return binaryRuns ? "binary" as const : "docker" as const
})

const missingViewer = (unsupported: string | undefined, hasBinary: boolean, downloadFailure: string | undefined) =>
  downloadFailure !== undefined
    ? `${downloadFailure}; run \`pnpm run doctor --viewer\` again, or install Docker`
    : unsupported !== undefined
    ? `no docker on PATH, and ${unsupported}; install Docker`
    : hasBinary
    ? "the otel-desktop-viewer in .viewer/ does not run here and there is no docker on PATH; delete .viewer/ and run `pnpm run doctor --viewer`, or install Docker"
    : "no otel-desktop-viewer in .viewer/ and no docker on PATH; run `pnpm run doctor --viewer` to download it, or install Docker"

// `pnpm run doctor`: checks only, never downloads or starts anything.
export const doctor = check({ retry: "pnpm run doctor" }).pipe(Effect.asVoid)

// `pnpm run doctor --viewer`: downloads the viewer binary when this machine can
// run it and it is not there yet, runs every check, then starts the viewer.
export const doctorWithViewer = Effect.gen(function*() {
  const host = yield* Host
  const needsDownload = host.viewerUnsupported === undefined && !(yield* host.exists(Viewer.binaryPath))
  const downloadFailure = needsDownload
    ? yield* host.downloadViewer.pipe(
      Effect.match({ onFailure: (error) => error.message, onSuccess: () => undefined })
    )
    : undefined
  const via = yield* check({ retry: "pnpm run doctor --viewer", downloadFailure })
  yield* host.startViewer(via)
})

export const command = Command.make(
  "doctor",
  {
    viewer: Flag.Boolean("viewer").pipe(
      Flag.withDescription("Download the viewer if needed, then start it once every check passes"),
      Flag.withDefault(false)
    )
  },
  ({ viewer }) =>
    (viewer
      ? doctorWithViewer.pipe(Effect.tapErrorTag("ViewerError", (error) => Console.error(error.message)))
      : doctor).pipe(Effect.provide(Host.layer))
).pipe(Command.withDescription("Check that this machine is ready for the rulebook course"))

if (isMain(import.meta)) {
  command.pipe(
    Command.run({ version: "0.0.0" }),
    Effect.provide(NodeServices.layer),
    NodeRuntime.runMain
  )
}
