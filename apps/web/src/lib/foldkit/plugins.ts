import { foldkit as officialFoldkit } from "@foldkit/vite-plugin"
import { Predicate } from "effect"
import type { Plugin, ViteDevServer } from "vite"

type HotUpdateHook = Extract<NonNullable<Plugin["handleHotUpdate"]>, Function>

/**
 * The two parts of `@foldkit/vite-plugin` this site wants: the view-identity
 * transform, and the dev server half of Model preservation, which lives in the
 * plugin named `foldkit`.
 */
const KEPT = ["foldkit:view-identity", "foldkit"] as const

/**
 * The plugin named `foldkit` answers every hot update with a full reload and an
 * empty module list. That takes HMR away from everything else on the dev
 * server: React Fast Refresh and CSS HMR become page reloads. It has no option
 * to stop. Its hot update hook is also what marks preserved Models restorable,
 * so the hook cannot be dropped.
 *
 * This runs the hook with the reload channel silenced and returns nothing, so
 * Vite carries on with its own update. A contract test in `test/lib` feeds the
 * real plugin a fake server and fails if it reaches the browser any other way.
 */
const silenced = (server: ViteDevServer): ViteDevServer => ({
  ...server,
  ws: { ...server.ws, send: () => {} },
})

const withoutReloadTakeover = (plugin: Plugin): Plugin => {
  const hook = plugin.handleHotUpdate
  if (!Predicate.isFunction(hook)) {
    throw new Error(
      "@foldkit/vite-plugin no longer hooks hot updates the way this site expects.",
    )
  }
  return {
    ...plugin,
    handleHotUpdate(
      this: ThisParameterType<HotUpdateHook>,
      context: Parameters<HotUpdateHook>[0],
    ) {
      void hook.call(this, { ...context, server: silenced(context.server) })
      return undefined
    },
  }
}

/** The official plugins this site uses, without the ones that would harm the rest of the dev server. */
export const foldkitPlugins = (): ReadonlyArray<Plugin> => {
  const official = officialFoldkit({ devToolsMcpPort: false })
  return KEPT.map((name) => {
    const plugin = official.find((candidate) => candidate.name === name)
    if (plugin === undefined) {
      throw new Error(
        `@foldkit/vite-plugin no longer has a plugin named ${name}.`,
      )
    }
    return name === "foldkit" ? withoutReloadTakeover(plugin) : plugin
  })
}
