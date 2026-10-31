import type { APIRoute } from "astro"
import { createRequire } from "node:module"
import * as fs from "node:fs"
import * as path from "node:path"

export const prerender = true

/**
 * Type definitions of the `effect` package for the in-browser type checker.
 * Keys are paths under a virtual `/node_modules/effect`.
 */
export const GET: APIRoute = () => {
  const packageJson = createRequire(
    path.join(process.cwd(), "package.json"),
  ).resolve("effect/package.json")
  const root = path.dirname(packageJson)
  const files: Record<string, string> = {
    "/node_modules/effect/package.json": fs.readFileSync(packageJson, "utf8"),
  }
  const visit = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name)
      if (entry.isDirectory()) visit(full)
      else if (entry.name.endsWith(".d.ts")) {
        const relative = path.relative(root, full).split(path.sep).join("/")
        files[`/node_modules/effect/${relative}`] = fs.readFileSync(
          full,
          "utf8",
        )
      }
    }
  }
  visit(path.join(root, "dist"))
  return new Response(JSON.stringify(files), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  })
}
