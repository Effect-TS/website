// Runs after `vercel build` and before `vercel deploy --prebuilt` (see
// .github/workflows/production.yml and preview.yml). Replaces the
// auto-generated trailing-slash rule in the already-built
// .vercel/output/config.json with a properly scoped one.
//
// astro.config.ts sets `trailingSlash: "never"` so Astro's own dev server
// enforces it natively (no dev-only middleware workaround needed — that's
// the whole reason to use "never" instead of "ignore"). But the SAME setting
// makes @astrojs/vercel bake an unscoped `^/(.*)/$` redirect into
// config.json, with no way to exclude a path or method via any astro.config
// or vercel.json option (verified against @vercel/routing-utils source: the
// `trailingSlash` param is a plain boolean, nothing else). That unscoped rule
// also matches /ingest/* (PostHog's reverse proxy, see vercel.json rewrites)
// and every HTTP method, which breaks PostHog capture (confirmed by a real
// prod deploy: capture requests got redirected instead of proxied).
//
// Other things tried and confirmed not to work for this project, so this
// artifact-patching approach is what's left:
// - vercel.json's own redirects/trailingSlash: confirmed by direct prod test
//   to never apply to this deployment at all.
// - Defining both "/docs" and "/docs/" as separate astro.config redirects
//   entries under `trailingSlash: "ignore"`: Astro's router refuses ("A
//   static route cannot be defined more than once") — a known open Astro bug
//   (withastro/astro#12532), not fixable from userland config.
// - Root-level middleware.ts (Vercel Routing Middleware): never wired up for
//   this deployment even though CI runs `vercel build` (confirmed: no
//   Middleware entry in the Vercel dashboard after a real deploy) — once
//   @astrojs/vercel produces a complete Build Output API config.json,
//   `vercel build` does not separately scan for a standalone middleware.ts.
import { readFileSync, writeFileSync } from "node:fs"

const configPath = ".vercel/output/config.json"
const config = JSON.parse(readFileSync(configPath, "utf-8"))

const unscopedRuleIndex = config.routes.findIndex((route) => route.src === "^/(.*)/$")
if (unscopedRuleIndex === -1) {
  throw new Error(
    `Expected to find the unscoped trailing-slash rule ("^/(.*)/$") in ${configPath}. ` +
      "Did astro.config.ts's trailingSlash setting or @astrojs/vercel's generated rule shape change?",
  )
}

const scopedRule = {
  src: "^/((?!ingest/).*)/$",
  headers: { Location: "/$1" },
  status: 308,
  methods: ["GET", "HEAD"],
}

config.routes.splice(unscopedRuleIndex, 1, scopedRule)

writeFileSync(configPath, JSON.stringify(config, null, 2))
console.log(
  `Patched ${configPath}: replaced unscoped trailing-slash rule at index ${unscopedRuleIndex}`,
)
