import { pathToFileURL } from "node:url"

const trafficModes = new Set([
  "workers-dev",
  "routes",
  "bridge",
  "custom-domains",
])

export const retry = async (
  label,
  operation,
  { timeoutMs = 2 * 60_000, delayMs = 10_000 } = {},
) => {
  const deadline = Date.now() + timeoutMs
  let attempt = 0
  let lastError = new Error(
    `${label} did not complete before the retry deadline`,
  )
  while (Date.now() < deadline) {
    try {
      return await operation(attempt)
    } catch (error) {
      lastError = error
      console.warn(
        `WAIT ${label}: ${error instanceof Error ? error.message : String(error)}`,
      )
      attempt += 1
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
  throw lastError
}

export const withCacheBuster = (url, nonce, attempt) => {
  const requestUrl = new URL(url)
  requestUrl.searchParams.set("deployment-check", `${nonce}-${attempt}`)
  return requestUrl
}

const checks = [
  { path: "/", status: 200, contentType: "text/html" },
  {
    path: "/docs/v4/onboarding",
    status: 200,
    contentType: "text/html",
  },
  {
    path: "/docs/v4/api/effect/Effect",
    status: 200,
    contentType: "text/html",
  },
  { path: "/play", status: 200, contentType: "text/html", isolated: true },
  { path: "/robots.txt", status: 200, contentType: "text/plain" },
  { path: "/rss.xml", status: 200, contentType: "application/xml" },
  {
    path: "/api/dprint/plugins/typescript-0.96.1.wasm",
    status: 200,
    contentType: ["application/wasm", "application/octet-stream"],
  },
  {
    path: "/cutover-smoke-test-not-found",
    status: 404,
    contentType: "text/html",
    cacheBust: true,
    timeoutMs: 5 * 60_000,
  },
]

const main = async () => {
  const [baseUrlArgument, trafficMode, expectedRevision] = process.argv.slice(2)
  if (baseUrlArgument === undefined || !trafficModes.has(trafficMode)) {
    throw new Error(
      "Usage: verify-cloudflare-deployment.mjs <base-url> <traffic-mode>",
    )
  }

  const baseUrl = new URL(baseUrlArgument)
  if (baseUrl.protocol !== "https:") {
    throw new Error(`Deployment URL must use HTTPS: ${baseUrl.href}`)
  }

  const probeNonce = Date.now().toString(36)
  for (const check of checks) {
    const url = new URL(check.path, baseUrl)
    await retry(
      url.href,
      async (attempt) => {
        const requestUrl = check.cacheBust
          ? withCacheBuster(url, probeNonce, attempt)
          : url
        const response = await fetch(requestUrl, {
          redirect: "follow",
          signal: AbortSignal.timeout(30_000),
        })
        if (response.status !== check.status) {
          throw new Error(
            `${requestUrl.href} returned ${response.status}; expected ${check.status}`,
          )
        }
        const contentType = response.headers.get("content-type") ?? ""
        const expectedContentTypes = Array.isArray(check.contentType)
          ? check.contentType
          : [check.contentType]
        if (
          !expectedContentTypes.some((expected) =>
            contentType.includes(expected),
          )
        ) {
          throw new Error(
            `${requestUrl.href} returned content-type ${JSON.stringify(contentType)}; expected ${expectedContentTypes.join(" or ")}`,
          )
        }
        if (
          check.isolated &&
          (response.headers.get("cross-origin-embedder-policy") !==
            "require-corp" ||
            response.headers.get("cross-origin-opener-policy") !==
              "same-origin")
        ) {
          throw new Error(
            `${requestUrl.href} is missing the playground isolation headers`,
          )
        }
        if (check.path === "/" && expectedRevision !== undefined) {
          const html = await response.text()
          const marker = `name="effect-website-revision" content="${expectedRevision}"`
          if (!html.includes(marker)) {
            throw new Error(
              `${requestUrl.href} does not contain revision ${expectedRevision}`,
            )
          }
        }
        console.log(`PASS ${response.status} ${requestUrl.href}`)
      },
      check.timeoutMs === undefined
        ? undefined
        : { timeoutMs: check.timeoutMs },
    )
  }

  const legacyApiSource = new URL(
    "/docs/api/v4/effect/Effect?cutover=1",
    baseUrl,
  )
  await retry(legacyApiSource.href, async () => {
    const response = await fetch(legacyApiSource, {
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    })
    if (response.status !== 308) {
      throw new Error(
        `${legacyApiSource.href} returned ${response.status}; expected 308`,
      )
    }
    const location = response.headers.get("location")
    const destination =
      location === null ? undefined : new URL(location, legacyApiSource)
    const expected = new URL("/docs/v4/api/effect/Effect?cutover=1", baseUrl)
    if (destination?.href !== expected.href) {
      throw new Error(
        `${legacyApiSource.href} redirected to ${destination?.href ?? "no location"}; expected ${expected.href}`,
      )
    }
    console.log(
      `PASS ${response.status} ${legacyApiSource.href} -> ${destination.href}`,
    )
  })

  if (trafficMode !== "workers-dev") {
    await retry("production origin", async () => {
      const rootResponse = await fetch(new URL("/", baseUrl), {
        redirect: "manual",
        signal: AbortSignal.timeout(30_000),
      })
      if (
        rootResponse.headers.get("server")?.toLowerCase() === "vercel" ||
        rootResponse.headers.has("x-vercel-id")
      ) {
        throw new Error(`${baseUrl.href} is still served by Vercel`)
      }
    })

    const redirectSource = new URL(
      "https://www.effect.website/docs/v4/onboarding?cutover=1",
    )
    await retry(redirectSource.href, async () => {
      const redirectResponse = await fetch(redirectSource, {
        redirect: "manual",
        signal: AbortSignal.timeout(30_000),
      })
      if (![301, 302, 307, 308].includes(redirectResponse.status)) {
        throw new Error(
          `${redirectSource.href} returned ${redirectResponse.status}; expected a redirect`,
        )
      }
      const location = redirectResponse.headers.get("location")
      if (location === null) {
        throw new Error(`${redirectSource.href} returned no redirect location`)
      }
      const destination = new URL(location, redirectSource)
      const expected = "https://effect.website/docs/v4/onboarding?cutover=1"
      if (destination.href !== expected) {
        throw new Error(
          `${redirectSource.href} redirected to ${destination.href}; expected ${expected}`,
        )
      }
      console.log(
        `PASS ${redirectResponse.status} ${redirectSource.href} -> ${destination.href}`,
      )
    })
  }
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main()
}
