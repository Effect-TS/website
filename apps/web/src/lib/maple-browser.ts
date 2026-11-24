import { MapleBrowser } from "@maple-dev/browser"
import { redactUrl } from "./redacted-url-params"

// Maple's public ingest key. It can only write to our Maple project, so it is
// safe to ship to browsers.
const INGEST_KEY = "maple_pk_doKc_48_4cbiFc8M4ndfZ5-ww7ZU0pNg"

const PRODUCTION_HOSTS: ReadonlySet<string> = new Set([
  "effect.website",
  "www.effect.website",
])
const LOCAL_HOSTS: ReadonlySet<string> = new Set(["localhost", "127.0.0.1"])

/** Which Maple environment a page on `hostname` reports to, if any. */
export function environmentFor(
  hostname: string,
): "production" | "preview" | undefined {
  if (PRODUCTION_HOSTS.has(hostname)) return "production"
  // Keep local development out of Maple.
  if (LOCAL_HOSTS.has(hostname)) return undefined
  return "preview"
}

/** Starts Maple in the browser. Call once per page, from the base layout. */
export function startBrowserTelemetry(): void {
  const environment = environmentFor(location.hostname)
  if (environment === undefined) return

  MapleBrowser.init({
    ingestKey: INGEST_KEY,
    serviceName: "effect-website-browser",
    environment,
    privacy: {
      // Nothing is stored on the device. Maple counts unique visitors within a
      // day from an id it derives on its servers and rotates daily.
      persistence: "cookieless",
      sanitizeUrl: redactUrl,
    },
    replay: { enabled: false },
  })

  // Each document load is one page load, named after its route pattern.
  MapleBrowser.startNavigation(location.pathname)
  addEventListener("load", () =>
    MapleBrowser.endNavigation(document.documentElement.dataset.route),
  )
}
