import { Effect, Runtime, Schema } from "effect"
import { ChildProcess } from "effect/process"
import { realpathSync } from "node:fs"
import * as NodePath from "node:path"

// True when the module that passes its `import.meta` is the file Node was
// started with, so `pnpm receiver` runs the receiver while a test importing
// the same file only gets its exports. Works on Node 22.16, which has no
// `import.meta.main`.
export const isMain = (meta: ImportMeta): boolean => {
  const script = process.argv[1]
  if (script === undefined) return false
  const resolved = realpath(NodePath.resolve(script))
  const self = realpath(meta.filename)
  return resolved === self || resolved === self.slice(0, -NodePath.extname(self).length)
}

const realpath = (path: string) => {
  try {
    return realpathSync(path)
  } catch {
    return path
  }
}

// Fails `runMain` with an exit code, without printing anything more: whatever
// failed, a child process or a CLI command, has already said what went wrong.
export class ExitCode extends Schema.TaggedError<ExitCode>()("ExitCode", {
  code: Schema.Number
}) {
  override readonly [Runtime.errorExitCode] = this.code
  override readonly [Runtime.errorReported] = false
}

// Runs a command in this terminal until it exits, and fails with its exit
// code when that is not 0. Interrupting the run stops the command.
export const runInherited = Effect.fn("runInherited")(function*(command: string, args: ReadonlyArray<string>) {
  const handle = yield* ChildProcess.make(command, args, { stdin: "inherit", stdout: "inherit", stderr: "inherit" })
  const code = Number(yield* handle.exitCode)
  if (code !== 0) {
    return yield* new ExitCode({ code })
  }
}, Effect.scoped)

// Runs a TypeScript file with tsx in a child process, as `runInherited` does.
export const runFile = (file: string, args: ReadonlyArray<string>) =>
  runInherited(process.execPath, ["--import", "tsx", file, ...args])
