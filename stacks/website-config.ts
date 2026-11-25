export const WEBSITE_ROOT_DIR = "./apps/web"

export const WEBSITE_MIGRATIONS_DIR = "./apps/web/migrations"

export const WEBSITE_ASTRO_OPTIONS = {
  rootDir: WEBSITE_ROOT_DIR,
  astro: { output: "static" as const },
  sessionKVBindingName: false as const,
  prerenderEnvironment: "node" as const,
}

export const WEBSITE_ASSETS_CONFIG = {
  htmlHandling: "drop-trailing-slash" as const,
  // Route the PostHog proxy through the Worker before the asset layer.
  runWorkerFirst: ["/_ingest/*"],
}

export const WEBSITE_CACHE_CONFIG = {
  enabled: true,
  crossVersionCache: true,
}

export const WEBSITE_BUILD_COMPATIBILITY = {
  date: "2026-08-31",
  flags: ["new_module_registry", "nodejs_compat"],
}

// Each stage counts in its own rate-limit namespace, so a preview cannot use up
// the production limit. Namespaces are numbers.
export const rateLimitNamespaceId = (stage: string): number => {
  let hash = 0
  for (const char of stage) hash = (hash * 31 + char.charCodeAt(0)) % 90_000
  return 1_000 + hash
}
