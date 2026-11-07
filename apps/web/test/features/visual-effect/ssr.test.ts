import { Effect } from "effect"
import { Server } from "foldkit/experimental"
import { assert, test } from "vite-plus/test"
import { Flags } from "../../../src/features/visual-effect/program/model.ts"
import { init } from "../../../src/features/visual-effect/program/update.ts"
import { view } from "../../../src/features/visual-effect/program/view/index.ts"

const config = {
  Flags,
  init,
  view: (model: Parameters<typeof view>[0], h: Parameters<typeof view>[1]) => ({
    title: "",
    body: view(model, h),
  }),
}

const render = () =>
  Effect.runPromise(
    Server.renderToString(config, {
      flags: { defaultLines: [] },
      buildId: "build-a",
    }),
  )

test("the server renders the default example, idle, into hydratable HTML", async () => {
  const { html } = await render()
  assert.include(html, 'data-foldkit-app="app"')
  assert.include(html, "Concurrency")
  assert.include(html, 'aria-label="Run Effect.all"')
  assert.include(html, "Combine multiple effects into one")
  assert.include(html, "Effect.all([nyc, berlin, tokyo, london])")
})

test("the server renders every step node and the result node", async () => {
  const { html } = await render()
  for (const label of ["nyc", "berlin", "tokyo", "london", "result"]) {
    assert.include(html, `<span>${label}</span>`)
  }
  assert.strictEqual(html.split('role="group"').length - 1, 5)
  assert.include(html, 'aria-label="nyc: not run"')
  assert.include(html, 'aria-label="result: not run"')
})

test("the server renders the control with its first option chosen", async () => {
  const { html } = await render()
  assert.include(html, 'aria-label="Concurrency"')
  assert.include(html, 'aria-selected="true"')
  assert.include(html, "sequential")
})

test("the render is the same for the same inputs", async () => {
  assert.strictEqual((await render()).html, (await render()).html)
})
