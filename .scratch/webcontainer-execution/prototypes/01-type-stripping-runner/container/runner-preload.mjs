// Preload for `node --import ./runner-preload.mjs src/main.ts`.
import { registerHooks } from "node:module"
import { existsSync } from "node:fs"

// webcontainer-core#2184: process.title is undefined in WebContainer.
process.title ??= "node"

// Map relative `./x.js` to `./x.ts` when the `.js` file does not exist
// (legacy Playground shares were written for tsc emit).
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
