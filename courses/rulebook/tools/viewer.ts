// Starts otel-desktop-viewer v0.6.0, the trace, log and metric viewer the
// course exports to. You never edit it.
//
//   pnpm viewer
//
// The first run downloads the release binary for this machine into .viewer/.
// When the binary cannot run here (Linux older than glibc 2.39, or an
// unsupported OS), it runs the same version with Docker instead.
import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { Console, Effect, FileSystem, Path, Runtime, Schema } from "effect"
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http"
import { ChildProcess, ChildProcessSpawner } from "effect/process"
import { createHash } from "node:crypto"
import * as NodePath from "node:path"
import { isMain, runInherited } from "./entrypoint.ts"

export const version = "0.6.0"
export const image = `ghcr.io/ctrlspice/otel-desktop-viewer:v${version}`
export const uiUrl = "http://localhost:8000"
export const otlpHttpUrl = "http://localhost:4318"

export const directory = NodePath.join(import.meta.dirname, "..", ".viewer")
export const binaryPath = NodePath.join(directory, "otel-desktop-viewer")

// SHA-256 of each release archive, from the v0.6.0 checksums.txt.
const assets: Record<string, { readonly file: string; readonly sha256: string }> = {
  "darwin-arm64": {
    file: "otel-desktop-viewer_darwin_arm64.tar.gz",
    sha256: "85488d4e170f281ddea50ca4ea3680ead3ea43e061256fd54b6362da6c6f39d5"
  },
  "darwin-x64": {
    file: "otel-desktop-viewer_darwin_amd64.tar.gz",
    sha256: "d795891d8d046d2bfb269f5b7a71773adfb1bd5ec48ae4c6f11fd8524ba74985"
  },
  "linux-arm64": {
    file: "otel-desktop-viewer_linux_arm64.tar.gz",
    sha256: "6394c4f53645cf9eaaa27c3290bed49f45a9cdd4433aa886fc425396c23afb2c"
  },
  "linux-x64": {
    file: "otel-desktop-viewer_linux_amd64.tar.gz",
    sha256: "c292e3ca36ef874b71a47db3746295b7da7dc85a5f7dd22b3acbe9d88d613930"
  }
}

export class ViewerError extends Schema.TaggedError<ViewerError>()("ViewerError", {
  message: Schema.String
}) {
  // The message is printed before exiting; no stack trace on top of it.
  override readonly [Runtime.errorReported] = false
}

// The glibc version on Linux, undefined elsewhere (and on musl).
export const glibcVersion = (): string | undefined => {
  if (process.platform !== "linux") return undefined
  const report = process.report.getReport() as { header?: { glibcVersionRuntime?: string } }
  return report.header?.glibcVersionRuntime
}

const isAtLeast = (version: string, minimum: string) => {
  const [major = 0, minor = 0] = version.split(".").map(Number)
  const [minMajor = 0, minMinor = 0] = minimum.split(".").map(Number)
  return major > minMajor || (major === minMajor && minor >= minMinor)
}

// Why the release binary cannot run on this machine, if it cannot.
export const binaryUnsupported = (): string | undefined => {
  if (assets[`${process.platform}-${process.arch}`] === undefined) {
    return `no otel-desktop-viewer binary for ${process.platform}/${process.arch}`
  }
  if (process.platform === "linux") {
    const glibc = glibcVersion()
    if (glibc === undefined) return "the Linux binary needs glibc 2.39 or newer, and this system has no glibc"
    if (!isAtLeast(glibc, "2.39")) return `the Linux binary needs glibc 2.39 or newer, this system has ${glibc}`
  }
  return undefined
}

// Downloads the release binary for this machine into .viewer/ and checks it
// against the release checksum.
export const download = Effect.fn("download")(
  function*() {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
    const asset = assets[`${process.platform}-${process.arch}`]!
    const url = `https://github.com/CtrlSpice/otel-desktop-viewer/releases/download/v${version}/${asset.file}`
    yield* Console.log(`Downloading ${url}`)
    const response = yield* HttpClient.get(url).pipe(Effect.flatMap(HttpClientResponse.filterStatusOk))
    const archive = new Uint8Array(yield* response.arrayBuffer)
    const sha256 = createHash("sha256").update(archive).digest("hex")
    if (sha256 !== asset.sha256) {
      return yield* new ViewerError({ message: `checksum mismatch for ${asset.file}: got ${sha256}` })
    }
    yield* fs.makeDirectory(directory, { recursive: true })
    const archivePath = path.join(directory, asset.file)
    yield* fs.writeFile(archivePath, archive)
    yield* spawner.string(ChildProcess.make("tar", ["-xzf", archivePath, "-C", directory, "otel-desktop-viewer"]))
    yield* fs.remove(archivePath)
  },
  Effect.catchTags({
    HttpClientError: (error) =>
      Effect.fail(new ViewerError({ message: `Could not download the viewer: ${error.message}` })),
    PlatformError: (error) =>
      Effect.fail(new ViewerError({ message: `Could not install the viewer: ${error.message}` }))
  }),
  Effect.provide(FetchHttpClient.layer)
)

const canRun = (command: string, args: ReadonlyArray<string>) =>
  Effect.gen(function*() {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
    const code = yield* spawner.exitCode(ChildProcess.make(command, args, { stdout: "ignore", stderr: "ignore" }))
    return Number(code) === 0
  }).pipe(Effect.orElseSucceed(() => false))

// Whether the binary at `path` starts on this machine.
export const binaryRuns = (path: string) => canRun(path, ["--version"])

export const binaryDoesNotRun = `${binaryPath} does not run on this machine (delete .viewer/ to download it again)`

const banner = (how: string) =>
  Console.log(
    `otel-desktop-viewer v${version} (${how})\n  UI:        ${uiUrl}\n  OTLP HTTP: ${otlpHttpUrl}\nPress Ctrl-C to stop.`
  )

// Runs the viewer image with Docker until it exits, saying why the binary is
// not used.
export const runDocker = Effect.fn("runDocker")(function*(reason: string) {
  yield* Console.log(`Using Docker because ${reason}.`)
  if (!(yield* canRun("docker", ["--version"]))) {
    return yield* new ViewerError({ message: `${reason}, and docker is not available. Install Docker and try again.` })
  }
  yield* banner(`docker, ${image}`)
  return yield* runInherited("docker", [
    "run",
    "--rm",
    "-p",
    "8000:8000",
    "-p",
    "4317:4317",
    "-p",
    "4318:4318",
    image
  ])
})

// Runs the binary under .viewer/ until it exits.
export const runBinary = Effect.gen(function*() {
  yield* banner(binaryPath)
  return yield* runInherited(binaryPath, [])
})

// Download the binary if needed and run it, falling back to Docker.
export const run = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const unsupported = binaryUnsupported()
  if (unsupported !== undefined) {
    return yield* runDocker(unsupported)
  }
  if (!(yield* fs.exists(binaryPath))) {
    yield* download()
  }
  if (!(yield* binaryRuns(binaryPath))) {
    return yield* runDocker(binaryDoesNotRun)
  }
  return yield* runBinary
}).pipe(Effect.withSpan("viewer.run"))

if (isMain(import.meta)) {
  run.pipe(
    Effect.tapErrorTag("ViewerError", (error) => Console.error(error.message)),
    Effect.provide(NodeServices.layer),
    NodeRuntime.runMain
  )
}
