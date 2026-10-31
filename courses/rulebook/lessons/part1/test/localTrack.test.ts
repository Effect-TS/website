import { NodeServices } from "@effect/platform-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect, FileSystem, Stream } from "effect"
import { ChildProcess } from "effect/process"
import * as NodePath from "node:path"

// In the local track a learner edits each lessons/part1/<n>/start/main.ts in
// place until it matches that lesson's solution. Later lessons tell them to
// run `pnpm check` and `pnpm test` on the same project. This test finishes
// Part 1 in a copy of the starter and runs both there.

const root = NodePath.join(import.meta.dirname, "..", "..", "..")
const part1 = NodePath.join(root, "lessons", "part1")
const self = NodePath.relative(root, import.meta.filename)
const skipped = new Set(["node_modules", ".viewer", "alerts.log"])

const collect = (stream: Stream.Stream<Uint8Array, unknown>) => stream.pipe(Stream.decodeText, Stream.mkString)

// Runs a package.json script the way pnpm does: as shell text, with the
// project's node_modules/.bin on the PATH.
const script = Effect.fn("script")(function*(cwd: string, name: string) {
  const fs = yield* FileSystem.FileSystem
  const scripts = JSON.parse(yield* fs.readFileString(NodePath.join(cwd, "package.json"))).scripts
  const bin = NodePath.join(cwd, "node_modules", ".bin")
  const handle = yield* ChildProcess.make(scripts[name], {
    cwd,
    shell: "/bin/sh",
    env: { PATH: `${bin}${NodePath.delimiter}${process.env.PATH}` },
    extendEnv: true
  })
  const [output, exitCode] = yield* Effect.all([collect(handle.all), handle.exitCode], { concurrency: "unbounded" })
  return { output, exitCode: Number(exitCode) }
}, Effect.scoped)

// A copy of the starter, sharing its node_modules, with every Part 1 start
// file replaced by its solution: Part 1 as a learner leaves it.
const finishedPart1 = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const copy = yield* fs.makeTempDirectoryScoped({ prefix: "rulebook-learner-" })
  for (const entry of yield* fs.readDirectory(root)) {
    if (skipped.has(entry) || entry.endsWith(".db") || entry.startsWith(".tsc-")) continue
    yield* fs.copy(NodePath.join(root, entry), NodePath.join(copy, entry))
  }
  yield* fs.symlink(NodePath.join(root, "node_modules"), NodePath.join(copy, "node_modules"))
  yield* fs.remove(NodePath.join(copy, self))
  for (const lesson of yield* fs.readDirectory(part1)) {
    const start = NodePath.join(copy, "lessons", "part1", lesson, "start", "main.ts")
    if (!/^\d{2}-/.test(lesson) || !(yield* fs.exists(start))) continue
    yield* fs.copyFile(NodePath.join(part1, lesson, "solution", "main.ts"), start)
  }
  return copy
})

describe("the local track", () => {
  it.live("a finished Part 1 leaves pnpm check and pnpm test green", () =>
    Effect.gen(function*() {
      const copy = yield* finishedPart1
      const check = yield* script(copy, "check")
      assert.strictEqual(check.exitCode, 0, `pnpm check:\n${check.output}`)
      const test = yield* script(copy, "test")
      assert.strictEqual(test.exitCode, 0, `pnpm test:\n${test.output}`)
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)), 300_000)
})
