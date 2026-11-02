import { assert, test } from "vite-plus/test"
import { foldkitBuildId } from "../../src/lib/foldkit/build-id.ts"

const plugin = foldkitBuildId("abc-123")
const resolveId = plugin.resolveId as (id: string) => string | undefined
const load = plugin.load as (id: string) => string | undefined

test("the virtual module resolves and exports the id", () => {
  const resolved = resolveId("virtual:foldkit/build-id")
  assert.isDefined(resolved)
  assert.strictEqual(load(resolved ?? ""), 'export default "abc-123"')
})

test("other modules are left alone", () => {
  assert.isUndefined(resolveId("effect"))
  assert.isUndefined(load("effect"))
})
