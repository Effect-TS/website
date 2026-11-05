import { assert, test } from "vite-plus/test"
import { foldkit } from "../../src/lib/foldkit/integration.ts"

const setup = (command: "dev" | "build") => {
  const toolbars: Array<unknown> = []
  const renderers: Array<unknown> = []
  const updates: Array<unknown> = []
  const hook = foldkit({ buildId: "test" }).hooks["astro:config:setup"]
  assert.isDefined(hook)
  const options = {
    command,
    addDevToolbarApp: (app: unknown) => {
      toolbars.push(app)
    },
    addRenderer: (renderer: unknown) => {
      renderers.push(renderer)
    },
    updateConfig: (config: unknown) => {
      updates.push(config)
    },
  }
  ;(hook as unknown as (options: unknown) => void)(options)
  return { toolbars, renderers, updates }
}

test("the integration registers one renderer named foldkit", () => {
  const { renderers } = setup("build")
  assert.lengthOf(renderers, 1)
  assert.include(renderers[0] as object, { name: "foldkit" })
})

test("the toolbar app exists in dev and not in a build", () => {
  assert.lengthOf(setup("dev").toolbars, 1)
  assert.lengthOf(setup("build").toolbars, 0)
})

test("server rendering shares one Foldkit instance with the vendored packages", () => {
  const { updates } = setup("build")
  const [update] = updates as Array<{
    vite: { ssr: { noExternal: Array<string> } }
  }>
  assert.includeMembers(update?.vite.ssr.noExternal ?? [], [
    "foldkit",
    "@foldkit/ui",
    "@foldkit/devtools",
  ])
})
