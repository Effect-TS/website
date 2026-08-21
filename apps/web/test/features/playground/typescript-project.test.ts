import { assert, test, vi } from "vite-plus/test"
import { ExtraLibRegistry } from "../../../src/features/playground/services/typescript-project.ts"

test("reconciles Monaco extra libraries without retaining stale files", () => {
  const events: Array<string> = []
  const addExtraLib = vi.fn((content: string, filePath: string) => {
    events.push(`add:${filePath}:${content}`)
    return {
      dispose: () => events.push(`dispose:${filePath}:${content}`),
    }
  })
  const registry = ExtraLibRegistry.make({ addExtraLib })

  registry.replace(
    new Map([
      ["file:///playground/package.json", '{"type":"module"}'],
      ["file:///node_modules/effect/index.d.ts", "export {}"],
    ]),
  )
  registry.replace(
    new Map([["file:///playground/package.json", '{"type":"commonjs"}']]),
  )
  registry.dispose()

  assert.deepEqual(events, [
    'add:file:///playground/package.json:{"type":"module"}',
    "add:file:///node_modules/effect/index.d.ts:export {}",
    'add:file:///playground/package.json:{"type":"commonjs"}',
    'dispose:file:///playground/package.json:{"type":"module"}',
    "dispose:file:///node_modules/effect/index.d.ts:export {}",
    'dispose:file:///playground/package.json:{"type":"commonjs"}',
  ])
})

test("does not re-register unchanged extra libraries", () => {
  const dispose = vi.fn()
  const addExtraLib = vi.fn(() => ({ dispose }))
  const registry = ExtraLibRegistry.make({ addExtraLib })
  const files = new Map([["file:///playground/package.json", "{}"]])

  registry.replace(files)
  registry.replace(files)
  registry.dispose()

  assert.equal(addExtraLib.mock.calls.length, 1)
  assert.equal(dispose.mock.calls.length, 1)
})
