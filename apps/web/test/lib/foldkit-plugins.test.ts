import { Schema } from "effect"
import {
  PreserveModelMessage,
  RequestModelMessage,
  RestoreModelMessage,
} from "foldkit/model-preservation"
import type { ViteDevServer } from "vite"
import { assert, test } from "vite-plus/test"
import { foldkitPlugins } from "../../src/lib/foldkit/plugins.ts"

type HotUpdate = (
  this: unknown,
  context: {
    readonly server: ViteDevServer
    readonly modules: ReadonlyArray<unknown>
  },
) => unknown

const reloadPlugin = () => {
  const plugin = foldkitPlugins().find(({ name }) => name === "foldkit")
  if (plugin === undefined) throw new Error("The foldkit plugin is missing")
  // The hooks use Vite's plugin context as `this`. These tests need none.
  const configureServer = plugin.configureServer as (
    this: unknown,
    server: ViteDevServer,
  ) => void
  const handleHotUpdate = plugin.handleHotUpdate as HotUpdate
  return {
    configureServer: (server: ViteDevServer) => {
      configureServer.call({}, server)
    },
    handleHotUpdate: (context: Parameters<HotUpdate>[0]) =>
      handleHotUpdate.call({}, context),
  }
}

/** Every way a plugin can reach the browser, so a new one cannot go unnoticed. */
const fakeServer = () => {
  const handlers = new Map<string, (payload: unknown) => void>()
  const toBrowser: Array<{
    channel: string
    event: unknown
    payload: unknown
  }> = []
  const channel = (name: string) => ({
    send: (...args: ReadonlyArray<unknown>) => {
      toBrowser.push({ channel: name, event: args[0], payload: args[1] })
    },
  })
  const server = {
    // `mode: "test"` keeps the plugin from starting its MCP relay.
    config: { root: "/tmp/foldkit-test", mode: "test", plugins: [] },
    ws: {
      ...channel("ws"),
      on: (event: string, handler: (payload: unknown) => void) => {
        handlers.set(event, handler)
      },
    },
    hot: channel("hot"),
    environments: { client: { hot: channel("environments.client.hot") } },
  } as unknown as ViteDevServer
  return { handlers, toBrowser, server }
}

const encodePreserve = Schema.encodeSync(PreserveModelMessage)
const encodeRequest = Schema.encodeSync(RequestModelMessage)
const decodeRestore = Schema.decodeUnknownSync(RestoreModelMessage)

const restores = (
  toBrowser: ReadonlyArray<{ event: unknown; payload: unknown }>,
) => toBrowser.filter(({ event }) => event === "foldkit:restore-model")

/** The plugin handles messages on its own fiber, so wait for its answer. */
const until = async (condition: () => boolean) => {
  for (let tries = 0; tries < 100 && !condition(); tries++) {
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

test("only the plugins this site wants are used", () => {
  assert.deepEqual(
    foldkitPlugins().map(({ name }) => name),
    ["foldkit:view-identity", "foldkit"],
  )
})

test("a hot update keeps Vite's own update and sends nothing to the browser", async () => {
  const plugin = reloadPlugin()
  const { server, toBrowser } = fakeServer()
  plugin.configureServer(server)

  // Returning anything but undefined would replace Vite's update with it.
  assert.isUndefined(plugin.handleHotUpdate({ server, modules: [{}] }))
  assert.deepEqual(toBrowser, [])
})

test("a Model survives the reload a code change causes", async () => {
  const plugin = reloadPlugin()
  const { handlers, server, toBrowser } = fakeServer()
  plugin.configureServer(server)

  handlers.get("foldkit:preserve-model")?.(
    encodePreserve({ id: "app", model: { n: 5 } }),
  )
  plugin.handleHotUpdate({ server, modules: [{}] })
  handlers.get("foldkit:request-model")?.(encodeRequest({ id: "app" }))

  await until(() => restores(toBrowser).length > 0)
  assert.deepEqual(decodeRestore(restores(toBrowser)[0]?.payload), {
    id: "app",
    model: { n: 5 },
  })
})

test("a refresh without a code change starts fresh", async () => {
  const plugin = reloadPlugin()
  const { handlers, server, toBrowser } = fakeServer()
  plugin.configureServer(server)

  handlers.get("foldkit:preserve-model")?.(
    encodePreserve({ id: "app", model: { n: 5 } }),
  )
  handlers.get("foldkit:request-model")?.(encodeRequest({ id: "app" }))

  await until(() => restores(toBrowser).length > 0)
  assert.lengthOf(restores(toBrowser), 1)
  assert.isUndefined(decodeRestore(restores(toBrowser)[0]?.payload).model)
})
