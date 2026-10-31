import { assert, describe, it } from "@effect/vitest"
import { readFileSync } from "node:fs"
import * as NodePath from "node:path"

const source = (file: string) => readFileSync(NodePath.join(import.meta.dirname, "../src", file), "utf8")

// Lesson 23: one src/Layers.ts builds both graphs. The entrypoints only pick
// theirs: no layer is assembled there and no command provides its own.
describe("Layers", () => {
  it("the server and the CLI take their layers from src/Layers.ts", () => {
    for (const main of ["server/main.ts", "cli/main.ts"]) {
      const text = source(main)
      assert.match(text, /from "\.\.\/Layers\.ts"/, main)
      assert.notMatch(text, /Layer\.provide/, main)
      assert.isAtMost(text.match(/Effect\.provide\(/g)?.length ?? 0, 1, `${main}: one provide, at the entrypoint`)
    }
  })
})
