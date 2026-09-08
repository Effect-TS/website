const [workerName] = process.argv.slice(2)
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
const apiToken = process.env.CLOUDFLARE_API_TOKEN
const expectedHostnames = ["effect.website", "www.effect.website"]

if (
  workerName === undefined ||
  accountId === undefined ||
  apiToken === undefined
) {
  console.error(
    "Usage: verify-cloudflare-traffic.mjs <worker-name> with CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN",
  )
  process.exit(1)
}

const cloudflare = async (path) => {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    headers: { Authorization: `Bearer ${apiToken}` },
    signal: AbortSignal.timeout(30_000),
  })
  const body = await response.json()
  if (!response.ok || body.success !== true) {
    throw new Error(
      `Cloudflare GET ${path} failed with ${response.status}: ${JSON.stringify(body.errors ?? body)}`,
    )
  }
  return body.result
}

const verifyTraffic = async () => {
  const subdomain = await cloudflare(
    `/accounts/${accountId}/workers/scripts/${workerName}/subdomain`,
  )
  if (subdomain.enabled !== true) {
    throw new Error(`workers.dev is disabled for Worker ${workerName}`)
  }

  const zones = await cloudflare(
    `/zones?name=${encodeURIComponent("effect.website")}&account.id=${encodeURIComponent(accountId)}`,
  )
  const zone = zones.find((candidate) => candidate.name === "effect.website")
  if (zone === undefined) {
    throw new Error(
      "Cloudflare zone effect.website was not found in the account",
    )
  }

  const routes = await cloudflare(`/zones/${zone.id}/workers/routes`)
  const apexRoutes = routes.filter(
    (route) => route.pattern === "effect.website/*",
  )
  if (apexRoutes.length !== 0) {
    const owners = apexRoutes
      .map((route) => route.script ?? "<none>")
      .join(", ")
    throw new Error(
      `Expected no effect.website/* Worker Route, received ${owners || "no route"}`,
    )
  }

  const websiteHostnames = expectedHostnames
  const domains = (
    await Promise.all(
      websiteHostnames.map((hostname) =>
        cloudflare(
          `/accounts/${accountId}/workers/domains?hostname=${encodeURIComponent(hostname)}`,
        ),
      ),
    )
  ).flat()
  const attached = new Map(
    domains
      .filter((domain) => websiteHostnames.includes(domain.hostname))
      .map((domain) => [domain.hostname, domain.service]),
  )
  const byName = (left, right) => left.localeCompare(right)
  const expectedSorted = expectedHostnames.toSorted(byName)
  const hostnames = [...attached.keys()].sort(byName)
  const domainsMatch =
    JSON.stringify(hostnames) === JSON.stringify(expectedSorted) &&
    hostnames.every((hostname) => attached.get(hostname) === workerName)
  if (!domainsMatch) {
    const owners = [...attached]
      .map(([hostname, service]) => `${hostname}=${service ?? "<none>"}`)
      .join(", ")
    throw new Error(
      `Expected ${expectedSorted.join(", ")} on ${workerName}, received ${owners || "none"}`,
    )
  }

  console.log(
    `PASS Cloudflare traffic: route=false, domains=${hostnames.join(",")}`,
  )
}

const deadline = Date.now() + 5 * 60_000
let lastError
while (Date.now() < deadline) {
  try {
    await verifyTraffic()
    process.exit(0)
  } catch (error) {
    lastError = error
    console.warn(
      `WAIT Cloudflare traffic state: ${error instanceof Error ? error.message : String(error)}`,
    )
    await new Promise((resolve) => setTimeout(resolve, 10_000))
  }
}
throw lastError
