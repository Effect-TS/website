import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { assert, test } from "vite-plus/test"
import { glueDependencies } from "../../src/lib/foldkit/dev-dependencies.ts"

test("it lists the Effect packages a directory imports, once each", () => {
  const directory = mkdtempSync(join(tmpdir(), "glue-"))
  try {
    writeFileSync(
      join(directory, "a.ts"),
      [
        'import { Effect } from "effect"',
        'import { Stream } from "effect/Stream"',
        'import { BrowserKeyValueStore } from "@effect/platform-browser"',
        'import { x } from "./local"',
        'import { y } from "astro/toolbar"',
        'const z = await import("effect/persistence")',
      ].join("\n"),
    )
    writeFileSync(join(directory, "b.ts"), 'import { Effect } from "effect"\n')
    writeFileSync(join(directory, "c.txt"), 'import "effect/ignored"\n')
    assert.deepEqual(glueDependencies(directory), [
      "@effect/platform-browser",
      "effect",
      "effect/Stream",
      "effect/persistence",
    ])
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test("the Foldkit glue's own Effect imports are covered", () => {
  const found = glueDependencies()
  assert.include(found, "@effect/platform-browser")
  assert.include(found, "effect/persistence")
})
