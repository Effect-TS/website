import type { Plugin } from "vite"

/** Foldkit's own browser dependency that Vite would find only after the first page. */
const FOLDKIT_PRE_BUNDLED = ["@foldkit/ui", "@foldkit/devtools/vite"]

/**
 * Vite finds some dependencies only after the first page loads, then
 * re-optimizes and answers requests for modules it already served (the Astro
 * dev toolbar among them) with `504 Outdated Optimize Dep`. `preBundle` names
 * the dependencies the site would otherwise reveal late.
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
        ? { include: [...FOLDKIT_PRE_BUNDLED, ...preBundle] }
        : {}),
    },
  }),
})
