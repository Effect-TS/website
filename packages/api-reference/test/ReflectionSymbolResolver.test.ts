import { assert, test } from "vite-plus/test"
import { createReflectionSymbolResolver } from "../src/ReflectionSymbolResolver.ts"

const entries = [
  {
    version: "v4",
    packageName: "effect",
    packageSlug: "effect",
    sourcePath: "src/Effect.ts",
    modulePath: "Effect",
  },
  {
    version: "v4",
    packageName: "@effect/platform-node",
    packageSlug: "platform-node",
    sourcePath: "src/NodeSocket.ts",
    modulePath: "NodeSocket",
  },
] as const

test("resolves TypeDoc symbol IDs to versioned module pages", () => {
  const resolve = createReflectionSymbolResolver(entries)

  assert.equal(
    resolve({
      packageName: "effect",
      packagePath: "./src\\Effect.ts",
      qualifiedName: "Effect.runPromise",
    }),
    "/docs/v4/api/effect/Effect",
  )
  assert.equal(
    resolve({
      packageName: "@effect/platform-node",
      packagePath: "src//NodeSocket.ts",
      qualifiedName: "",
    }),
    "/docs/v4/api/platform-node/NodeSocket",
  )
  assert.equal(
    resolve({
      packageName: "typescript",
      packagePath: "lib/lib.es5.d.ts",
      qualifiedName: "Promise",
    }),
    undefined,
  )
  assert.equal(
    resolve({
      packageName: "effect",
      packagePath: "../src/Effect.ts",
      qualifiedName: "Effect",
    }),
    undefined,
  )
})

test("does not choose between duplicate symbol targets", () => {
  const resolve = createReflectionSymbolResolver([...entries, entries[0]])
  assert.equal(
    resolve({
      packageName: "effect",
      packagePath: "src/Effect.ts",
      qualifiedName: "Effect",
    }),
    undefined,
  )
})
