// The Run preload (ticket 01), loaded with
// `node --import ../.scratchpad/run-preload.mjs src/main.ts`. It lives in the
// host scripts directory, outside the mirrored Workspace.
import { existsSync } from "node:fs"
import { registerHooks } from "node:module"

// webcontainer-core#2184: process.title is undefined in WebContainer.
process.title ??= "node"

// Map relative `./x.js` to `./x.ts` when the `.js` file does not exist
// (legacy Playground shares were written for tsc emit). The in-thread hook
// is about 2.8 s faster per Run than `module.register` in the Container.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      /^\.\.?\//.test(specifier) &&
      /\.[cm]?js$/.test(specifier) &&
      context.parentURL?.startsWith("file:")
    ) {
      const js = new URL(specifier, context.parentURL)
      if (!existsSync(js)) {
        const ts = new URL(specifier.replace(/js$/, "ts"), context.parentURL)
        if (existsSync(ts)) return nextResolve(ts.href, context)
      }
    }
    return nextResolve(specifier, context)
  },
})
