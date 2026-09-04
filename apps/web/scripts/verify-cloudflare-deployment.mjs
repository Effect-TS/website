const [baseUrlArgument, trafficMode, expectedRevision] = process.argv.slice(2)
const trafficModes = new Set([
  "workers-dev",
  "routes",
  "bridge",
  "custom-domains",
])

if (baseUrlArgument === undefined || !trafficModes.has(trafficMode)) {
  console.error(
    "Usage: verify-cloudflare-deployment.mjs <base-url> <traffic-mode>",
  )
  process.exit(1)
}

const baseUrl = new URL(baseUrlArgument)
if (baseUrl.protocol !== "https:") {
  console.error(`Deployment URL must use HTTPS: ${baseUrl.href}`)
  process.exit(1)
}

const retry = async (label, operation) => {
  const deadline = Date.now() + 2 * 60_000
  let lastError = new Error(
    `${label} did not complete before the retry deadline`,
  )
  while (Date.now() < deadline) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      console.warn(
        `WAIT ${label}: ${error instanceof Error ? error.message : String(error)}`,
      )
      await new Promise((resolve) => setTimeout(resolve, 10_000))
    }
  }
  throw lastError
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
  },
]

for (const check of checks) {
  const url = new URL(check.path, baseUrl)
  await retry(url.href, async () => {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    })
    if (response.status !== check.status) {
      throw new Error(
        `${url.href} returned ${response.status}; expected ${check.status}`,
      )
    }
    const contentType = response.headers.get("content-type") ?? ""
    const expectedContentTypes = Array.isArray(check.contentType)
      ? check.contentType
      : [check.contentType]
    if (
      !expectedContentTypes.some((expected) => contentType.includes(expected))
    ) {
      throw new Error(
        `${url.href} returned content-type ${JSON.stringify(contentType)}; expected ${expectedContentTypes.join(" or ")}`,
      )
    }
    if (
      check.isolated &&
      (response.headers.get("cross-origin-embedder-policy") !==
        "require-corp" ||
        response.headers.get("cross-origin-opener-policy") !== "same-origin")
    ) {
      throw new Error(`${url.href} is missing the playground isolation headers`)
    }
    if (check.path === "/" && expectedRevision !== undefined) {
      const html = await response.text()
      const marker = `name="effect-website-revision" content="${expectedRevision}"`
      if (!html.includes(marker)) {
        throw new Error(
          `${url.href} does not contain revision ${expectedRevision}`,
        )
      }
    }
    console.log(`PASS ${response.status} ${url.href}`)
  })
}

const legacyApiSource = new URL("/docs/api/v4/effect/Effect?cutover=1", baseUrl)
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
