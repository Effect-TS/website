import { pathToFileURL } from "node:url"

const websiteHostnames = ["effect.website", "www.effect.website"]

export const detectTrafficMode = ({ routeOwner, domainOwners }) => {
  const hasApex = domainOwners.has("effect.website")
  const hasWww = domainOwners.has("www.effect.website")
  const apexOwner = domainOwners.get("effect.website")
  const wwwOwner = domainOwners.get("www.effect.website")

  if (hasApex !== hasWww) {
    throw new Error(
      "Cloudflare has only one website Custom Domain attached; repair the partial traffic configuration before deploying",
    )
  }
  if (
    hasApex &&
    (apexOwner === undefined ||
      wwwOwner === undefined ||
      apexOwner !== wwwOwner)
  ) {
    throw new Error(
      "The apex and www Custom Domains are attached to different Workers; repair the traffic configuration before deploying",
    )
  }
  if (
    routeOwner !== undefined &&
    apexOwner !== undefined &&
    routeOwner !== apexOwner
  ) {
    throw new Error(
      "The apex Worker Route and Custom Domains are attached to different Workers; repair the traffic configuration before deploying",
    )
  }

  if (routeOwner !== undefined && hasApex) return "bridge"
  if (routeOwner !== undefined) return "routes"
  if (hasApex) return "custom-domains"
  return "workers-dev"
}

export const validateTrafficTransition = (currentMode, targetMode) => {
  const removesCustomDomains =
    (currentMode === "bridge" || currentMode === "custom-domains") &&
    (targetMode === "routes" || targetMode === "workers-dev")
  if (removesCustomDomains) {
    throw new Error(
      `Unsafe Cloudflare traffic transition from ${currentMode} to ${targetMode}: detaching Custom Domains can remove their managed DNS records. Follow the manual Vercel rollback procedure instead.`,
    )
  }
}

const cloudflare = async (path, apiToken) => {
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

const main = async () => {
  const [targetMode] = process.argv.slice(2)
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  if (
    targetMode === undefined ||
    accountId === undefined ||
    apiToken === undefined
  ) {
    throw new Error(
      "Usage: validate-cloudflare-traffic-transition.mjs <target-mode> with CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN",
    )
  }

  const zones = await cloudflare(
    `/zones?name=${encodeURIComponent("effect.website")}&account.id=${encodeURIComponent(accountId)}`,
    apiToken,
  )
  const zone = zones.find((candidate) => candidate.name === "effect.website")
  if (zone === undefined) {
    throw new Error(
      "Cloudflare zone effect.website was not found in the account",
    )
  }

  const routes = await cloudflare(`/zones/${zone.id}/workers/routes`, apiToken)
  const apexRoutes = routes.filter(
    (route) => route.pattern === "effect.website/*",
  )
  if (apexRoutes.length > 1) {
    throw new Error(
      "Cloudflare has multiple apex Worker Routes; repair the traffic configuration before deploying",
    )
  }
  const routeOwner = apexRoutes[0]?.script
  if (apexRoutes.length === 1 && typeof routeOwner !== "string") {
    throw new Error(
      "The apex Worker Route has no Worker attached; repair the traffic configuration before deploying",
    )
  }

  const domains = (
    await Promise.all(
      websiteHostnames.map((hostname) =>
        cloudflare(
          `/accounts/${accountId}/workers/domains?hostname=${encodeURIComponent(hostname)}`,
          apiToken,
        ),
      ),
    )
  ).flat()
  const websiteDomains = domains.filter((domain) =>
    websiteHostnames.includes(domain.hostname),
  )
  if (
    websiteDomains.some(
      (domain) =>
        typeof domain.hostname !== "string" ||
        typeof domain.service !== "string",
    )
  ) {
    throw new Error(
      "Cloudflare returned a website Custom Domain without a Worker owner; repair the traffic configuration before deploying",
    )
  }
  const domainOwners = new Map(
    websiteDomains.map((domain) => [domain.hostname, domain.service]),
  )
  const currentMode = detectTrafficMode({
    routeOwner,
    domainOwners,
  })
  validateTrafficTransition(currentMode, targetMode)
  console.log(
    `PASS Cloudflare traffic transition: ${currentMode} -> ${targetMode}`,
  )
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main()
}
