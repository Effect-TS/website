/**
 * Cloudflare's test keys for an invisible check that always passes.
 * https://developers.cloudflare.com/turnstile/troubleshooting/testing/
 */
export const TURNSTILE_TEST_KEYS = {
  siteKey: "1x00000000000000000000BB",
  secret: "1x0000000000000000000000000000000AA",
} as const
