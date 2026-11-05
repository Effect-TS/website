import { Schema } from "effect"
import { defineMessageUnion } from "foldkit/message"
import { assert, test } from "vite-plus/test"
import {
  ProgramTypeId,
  defineProgram,
  isProgram,
} from "../../src/lib/foldkit/program.ts"
import renderer from "../../src/lib/foldkit/server.ts"

const Model = Schema.Struct({ count: Schema.Number })
const Flags = Schema.Struct({ start: Schema.Number })
const Message = defineMessageUnion({ Clicked: {} })

const Counter = defineProgram<
  { readonly start: number },
  typeof Model.Type,
  typeof Message.Type,
  typeof Flags.Type
>({
  Model,
  Flags,
  init: (flags) => ({ model: { count: flags.start } }),
  update: (model) => ({ model }),
  view: (model, h) => h.div([h.Class("counter")], [`${model.count} ${"slot"}`]),
  flags: ({ props }) => ({ start: props.start }),
})

test("a Program carries its spec under the Program id", () => {
  assert.isTrue(isProgram(Counter))
  assert.deepEqual(
    Counter[ProgramTypeId].flags({ props: { start: 3 }, slots: {} }),
    { start: 3 },
  )
})

test("only Programs pass the guard", () => {
  assert.isFalse(isProgram(() => null))
  assert.isFalse(isProgram({}))
  assert.isFalse(isProgram(undefined))
})

test("calling a Program as a component fails loudly", () => {
  assert.throws(() => Counter({ start: 1 }), "renders only through Astro")
})

test("the renderer claims only Programs", async () => {
  assert.isTrue(await renderer.check(Counter))
  assert.isFalse(await renderer.check(() => null))
})

test("the renderer returns hydratable HTML stamped with the build id", async () => {
  const { html } = await renderer.renderToStaticMarkup(
    Counter,
    { start: 7 },
    {},
  )
  assert.include(html, 'class="counter"')
  assert.include(html, "7 slot")
  assert.include(html, 'data-foldkit-app="program-')
  assert.include(html, 'data-foldkit-build="test-build"')
  assert.include(html, 'data-foldkit-flags="program-')
  assert.include(html, '{"start":7}')
})

test("slot HTML arrives as plain strings even when Astro hands over String objects", async () => {
  const htmlString = new String("<p>prose</p>") as unknown as string
  const App = defineProgram<
    unknown,
    { readonly prose: string },
    typeof Message.Type,
    { readonly prose: string }
  >({
    Model: Schema.Struct({ prose: Schema.String }),
    Flags: Schema.Struct({ prose: Schema.String }),
    init: (flags) => ({ model: { prose: flags.prose } }),
    update: (model) => ({ model }),
    view: (model, h) => h.div([], [model.prose]),
    flags: ({ slots }) => ({ prose: slots["default"] ?? "" }),
  })
  const { html } = await renderer.renderToStaticMarkup(
    App,
    {},
    { default: htmlString },
  )
  assert.include(html, "prose")
})

test("several Programs on one page each get their own root and Flags", async () => {
  const page = { result: {} }
  const first = await renderer.renderToStaticMarkup.call(
    page,
    Counter,
    { start: 1 },
    {},
  )
  const second = await renderer.renderToStaticMarkup.call(
    page,
    Counter,
    { start: 2 },
    {},
  )
  assert.include(first.html, 'data-foldkit-app="program-1"')
  assert.include(first.html, "data-foldkit-element")
  assert.include(first.html, 'data-foldkit-flags="program-1"')
  assert.include(second.html, 'data-foldkit-app="program-2"')
  assert.include(second.html, 'data-foldkit-flags="program-2"')
})

test("separate pages each number their Programs from one", async () => {
  await renderer.renderToStaticMarkup.call(
    { result: {} },
    Counter,
    { start: 1 },
    {},
    {},
  )
  await renderer.renderToStaticMarkup.call(
    { result: {} },
    Counter,
    { start: 1 },
    {},
    {},
  )
})

test("a render outside a page has no page to guard", async () => {
  await renderer.renderToStaticMarkup.call(
    undefined,
    Counter,
    { start: 1 },
    {},
    {},
  )
  await renderer.renderToStaticMarkup.call(
    undefined,
    Counter,
    { start: 1 },
    {},
    {},
  )
})

test("the renderer refuses something that is not a Program", async () => {
  let message = ""
  await renderer
    .renderToStaticMarkup(() => null, {}, {})
    .catch((error: Error) => {
      message = error.message
    })
  assert.include(message, "defineProgram")
})
