import { Schema } from "effect"
import { defineMessageUnion } from "foldkit/message"
import { assert, test } from "vite-plus/test"
import {
  ApplicationTypeId,
  defineApplication,
  isApplication,
} from "../../src/lib/foldkit/application.ts"
import renderer from "../../src/lib/foldkit/server.ts"

const Model = Schema.Struct({ count: Schema.Number })
const Flags = Schema.Struct({ start: Schema.Number })
const Message = defineMessageUnion({ Clicked: {} })

const Counter = defineApplication<
  { readonly start: number },
  typeof Model.Type,
  typeof Message.Type,
  typeof Flags.Type
>({
  Model,
  Flags,
  init: (flags) => ({ model: { count: flags.start } }),
  update: (model) => ({ model }),
  view: (model, h) => ({
    title: `Count ${model.count}`,
    body: h.div([h.Class("counter")], [`${model.count} ${"slot"}`]),
  }),
  flags: ({ props }) => ({ start: props.start }),
})

test("an application carries its spec under the application id", () => {
  assert.isTrue(isApplication(Counter))
  assert.deepEqual(
    Counter[ApplicationTypeId].flags({ props: { start: 3 }, slots: {} }),
    { start: 3 },
  )
})

test("only applications pass the guard", () => {
  assert.isFalse(isApplication(() => null))
  assert.isFalse(isApplication({}))
  assert.isFalse(isApplication(undefined))
})

test("calling an application as a component fails loudly", () => {
  assert.throws(() => Counter({ start: 1 }), "renders only through Astro")
})

test("the renderer claims only applications", async () => {
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
  assert.include(html, 'data-foldkit-app="app"')
  assert.include(html, 'data-foldkit-build="test-build"')
  assert.include(html, 'data-foldkit-flags="app"')
  assert.include(html, '{"start":7}')
})

test("slot HTML arrives as plain strings even when Astro hands over String objects", async () => {
  const htmlString = new String("<p>prose</p>") as unknown as string
  const App = defineApplication<
    unknown,
    { readonly prose: string },
    typeof Message.Type,
    { readonly prose: string }
  >({
    Model: Schema.Struct({ prose: Schema.String }),
    Flags: Schema.Struct({ prose: Schema.String }),
    init: (flags) => ({ model: { prose: flags.prose } }),
    update: (model) => ({ model }),
    view: (model, h) => ({
      title: "t",
      body: h.div([], [model.prose]),
    }),
    flags: ({ slots }) => ({ prose: slots["default"] ?? "" }),
  })
  const { html } = await renderer.renderToStaticMarkup(
    App,
    {},
    { default: htmlString },
  )
  assert.include(html, "prose")
})

test("a second application on the same page is refused, naming both", async () => {
  const page = {}
  await renderer.renderToStaticMarkup.call(
    page && { result: page },
    Counter,
    { start: 1 },
    {},
    { displayName: "First" },
  )
  let message = ""
  await renderer.renderToStaticMarkup
    .call(
      { result: page },
      Counter,
      { start: 2 },
      {},
      { displayName: "Second" },
    )
    .catch((error: Error) => {
      message = error.message
    })
  assert.include(message, "one Foldkit application")
  assert.include(message, "Second")
  assert.include(message, "First")
})

test("separate pages each get their application", async () => {
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

test("the renderer refuses something that is not an application", async () => {
  let message = ""
  await renderer
    .renderToStaticMarkup(() => null, {}, {})
    .catch((error: Error) => {
      message = error.message
    })
  assert.include(message, "defineApplication")
})
