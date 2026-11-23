import { existsSync } from "node:fs"
export async function resolve(specifier, context, nextResolve) {
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
}
