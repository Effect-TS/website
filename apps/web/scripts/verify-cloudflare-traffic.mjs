const [workerName, trafficMode] = process.argv.slice(2)
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
const apiToken = process.env.CLOUDFLARE_API_TOKEN
const expected = {
  "workers-dev": { route: false, domains: [] },
  routes: { route: true, domains: [] },
  bridge: { route: true, domains: ["effect.website", "www.effect.website"] },
  "custom-domains": {
    route: false,
    domains: ["effect.website", "www.effect.website"],
  },
}[trafficMode]

if (
  workerName === undefined ||
  expected === undefined ||
  accountId === undefined ||
  apiToken === undefined
) {
  console.error(
    "Usage: verify-cloudflare-traffic.mjs <worker-name> <traffic-mode> with CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN",
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
  const routeMatches = expected.route
    ? apexRoutes.length === 1 && apexRoutes[0].script === workerName
    : apexRoutes.length === 0
  if (!routeMatches) {
    const owners = apexRoutes
      .map((route) => route.script ?? "<none>")
      .join(", ")
    throw new Error(
      `Worker Route state does not match traffic mode ${trafficMode}: expected ${expected.route ? workerName : "no route"}, received ${owners || "no route"}`,
    )
  }

  const websiteHostnames = ["effect.website", "www.effect.website"]
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
  const expectedHostnames = expected.domains.toSorted(byName)
  const hostnames = [...attached.keys()].sort(byName)
  const domainsMatch =
    JSON.stringify(hostnames) === JSON.stringify(expectedHostnames) &&
    hostnames.every((hostname) => attached.get(hostname) === workerName)
  if (!domainsMatch) {
    const owners = [...attached]
      .map(([hostname, service]) => `${hostname}=${service ?? "<none>"}`)
      .join(", ")
    throw new Error(
      `Custom Domain state does not match traffic mode ${trafficMode}: expected ${expectedHostnames.join(", ") || "none"} on ${workerName}, received ${owners || "none"}`,
    )
  }

  console.log(
    `PASS Cloudflare traffic mode ${trafficMode}: route=${expected.route}, domains=${hostnames.join(",") || "none"}`,
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
