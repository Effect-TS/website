import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import type { Plugin } from "vite"

/** Foldkit's own browser dependency that Vite would find only after the first page. */
const FOLDKIT_PRE_BUNDLED = ["@foldkit/ui", "@foldkit/devtools/vite"]

const GLUE_DIRECTORY = fileURLToPath(new URL(".", import.meta.url))
const EFFECT_SPECIFIER = /(?:from|import\()\s*"((?:@effect\/|effect)[^"]*)"/g

/**
 * The Effect packages this directory imports. Vite's first scan starts from
 * the playground entry and never reads these files, so it would find these
 * packages only after the first page.
 */
export const glueDependencies = (
  directory: string = GLUE_DIRECTORY,
): ReadonlyArray<string> =>
  Array.from(
    new Set(
      readdirSync(directory)
        .filter((file) => file.endsWith(".ts"))
        .flatMap((file) =>
          Array.from(
            readFileSync(`${directory}/${file}`, "utf8").matchAll(
              EFFECT_SPECIFIER,
            ),
            (match) => match[1] as string,
          ),
        ),
    ),
  ).sort()

/**
 * Vite finds some dependencies only after the first page loads, then
 * re-optimizes and answers requests for modules it already served (the Astro
 * dev toolbar among them) with `504 Outdated Optimize Dep`. The Effect packages
 * the Foldkit glue imports are pre-bundled on their own. `preBundle` names any
 * other dependency the site would otherwise reveal late.
 *
 * Keeps Foldkit out of Vite's dependency pre-bundle in dev. The view-identity
 * transform rewrites any module it sees, including the pre-bundled copy of
 * Foldkit's own `brand` module: it wraps `isVNode`, whose body then calls
 * `brandViewResult`, which calls `isVNode`, until the stack overflows and
 * every island on the page fails to hydrate.
 */
export const foldkitDevDependencies = (
  preBundle: ReadonlyArray<string>,
): Plugin => ({
  name: "foldkit:dev-dependencies",
  apply: "serve",
  configEnvironment: (name) => ({
    optimizeDeps: {
      exclude: ["foldkit"],
      ...(name === "client"
        ? {
            include: Array.from(
              new Set([
                ...FOLDKIT_PRE_BUNDLED,
                ...glueDependencies(),
                ...preBundle,
              ]),
            ),
          }
        : {}),
    },
  }),
})

const BUNDLED_FOLDKIT = ["foldkit", "@foldkit/ui", "@foldkit/devtools"]

/**
 * Bundles Foldkit and its UI package into every server-side build. Foldkit
 * keeps its render state in a module singleton, so a second copy that the
 * `prerender` environment loads from `node_modules` cannot see the first.
 * Astro's `prerender` environment ignores the legacy `ssr.noExternal` option.
 *
 * Needed while `foldkit` is a linked workspace package, which Vite bundles
 * while `@foldkit/ui` stays external. Remove it when consuming from the
 * registry.
 */
export const foldkitBundled = (): Plugin => ({
  name: "foldkit:bundled",
  configEnvironment: (name) =>
    name === "client"
      ? undefined
      : { resolve: { noExternal: BUNDLED_FOLDKIT } },
})
