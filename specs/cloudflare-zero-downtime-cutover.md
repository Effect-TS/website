# Cloudflare Zero-Downtime Cutover

## Objective

Move production traffic for `effect.website` and `www.effect.website` from
Vercel to the Cloudflare Worker without a DNS propagation window or an
unserved hostname.

This runbook uses a Cloudflare Worker Route as a temporary traffic bridge.
The existing Vercel records remain available until the Worker has served
production traffic successfully. The final state uses Worker Custom Domains
managed by Alchemy.

## Current State

Observed on 2026-08-21:

- The registrar is Name.com.
- The authoritative nameservers are already Cloudflare:
  `ben.ns.cloudflare.com` and `mary.ns.cloudflare.com`.
- DNSSEC is disabled.
- The apex resolves to Vercel.
- `www.effect.website` is a CNAME to `cname.vercel-dns.com`.
- The apex redirects to `www` at Vercel.
- The generated canonical and Open Graph URLs use `https://effect.website`.
- `_dmarc.effect.website` exists and is unrelated to the website cutover.

No registrar or nameserver change is required. Only the website records and
Cloudflare traffic configuration change.

## Desired State

- `effect.website` is the canonical hostname and serves `WebsiteWorker`.
- `www.effect.website` returns a permanent redirect to the matching apex URL,
  preserving the path and query string.
- Cloudflare manages DNS and certificates for both hostnames through Worker
  Custom Domains.
- Vercel is no longer an origin or rollback dependency.
- DNSSEC may be enabled separately after the migration is stable.

Changing the canonical host from the current Vercel behavior is intentional.
If `www` must remain canonical, reverse `name` and `redirects` in every example
before starting.

## Safety Invariants

1. Never remove the Vercel DNS targets before a proxied Worker Route is
   serving the apex.
2. Never remove the temporary Worker Route before both Custom Domains and
   their certificates are active.
3. Keep the Vercel project and domain attachments until the rollback window
   has ended.
4. Export the Cloudflare zone before changing records. Restore records from
   that export, not from IP addresses returned by `dig`.
5. Do not alter mail, verification, DMARC, delegated subdomain, or unrelated
   records.
6. Make one traffic-mode transition per successful deployment.

## Required Code Changes

### 1. Add Explicit Traffic Modes

Add `CLOUDFLARE_TRAFFIC_MODE` to `alchemy.run.ts` with these accepted values:

| Mode             | Custom Domains | Apex Worker Route | Purpose                                                   |
| ---------------- | -------------- | ----------------- | --------------------------------------------------------- |
| `workers-dev`    | Detached       | Removed           | Build and verify without production traffic               |
| `routes`         | Detached       | Attached          | Move traffic from Vercel to the Worker                    |
| `bridge`         | Attached       | Attached          | Provision Custom Domains while the Route protects traffic |
| `custom-domains` | Attached       | Removed           | Final state                                               |

Reject any other value. Default production deployments to `workers-dev` until
the cutover is complete. Preview stages must continue to omit production
domains and routes.

The production Worker props should be equivalent to:

```ts
const domainEnabled =
  trafficMode === "bridge" || trafficMode === "custom-domains"
const routeEnabled = trafficMode === "routes" || trafficMode === "bridge"

const productionTraffic =
  stage === "prod"
    ? {
        domain: domainEnabled
          ? {
              name: "effect.website",
              redirects: ["www.effect.website"],
            }
          : null,
        routes: routeEnabled
          ? [
              {
                pattern: "effect.website/*",
                zoneName: "effect.website",
              },
            ]
          : [],
      }
    : {}
```

Spread `productionTraffic` into the existing Astro Worker props.

The explicit `null` and empty array are important. In Alchemy, an omitted
`domain` leaves live domain attachments unmanaged; it does not detach them.
Explicit values make rollback from `bridge` to `routes` deterministic.

### 2. Pass the Mode Through Deployment Workflows

Use a repository variable named `CLOUDFLARE_TRAFFIC_MODE`. Do not use a
secret; the value is not sensitive.

Update the deployment chain so the value reaches the Alchemy process:

1. `.github/workflows/production.yml`
2. `.github/workflows/deploy.yml`
3. `.github/actions/deploy/action.yml`

The composite deployment action should pass:

```yaml
env:
  CLOUDFLARE_TRAFFIC_MODE: ${{ inputs.cloudflare-traffic-mode }}
```

to `vp exec alchemy deploy --stage prod --yes`.

The reusable workflow input should be a string with a safe default of
`workers-dev`. The production caller should supply:

```yaml
cloudflare-traffic-mode: ${{ vars.CLOUDFLARE_TRAFFIC_MODE || 'workers-dev' }}
```

The publish workflow also calls the reusable deployment workflow. It must use
the same repository variable so API-reference publishing cannot accidentally
deploy a different traffic mode.

### 3. Add a Deployment Preflight

Before invoking Alchemy in production, validate that the mode is exactly one
of the four supported values. `alchemy.run.ts` remains the authoritative
validation boundary; a workflow check should only improve the error message.

Log the selected mode, but never log Cloudflare credentials.

### 4. Add Post-Deployment HTTP Checks

For `routes`, `bridge`, and `custom-domains`, check:

```sh
curl --fail --silent --show-error https://effect.website/
curl --fail --silent --show-error --head https://www.effect.website/
```

The check should verify that the apex response is no longer from Vercel. In
`bridge` and `custom-domains`, it should also verify that `www` redirects to
the apex while preserving a test path and query string.

Do not enable these production-host checks in `workers-dev`; that mode is
expected to leave production on Vercel.

## Cloudflare Token Requirements

`CLOUDFLARE_API_TOKEN` must be scoped to the configured account and the
`effect.website` zone. It needs:

- Account: **Workers Scripts Edit**
- Zone: **Zone Read**
- Zone: **Workers Routes Edit**
- Zone: **Single Redirect Edit** (called **Dynamic URL Redirects Write** in
  some Cloudflare API permission listings)

DNS changes in this runbook are manual dashboard operations. If they are
automated, also grant:

- Zone: **DNS Edit**

Avoid granting access to unrelated accounts or zones.

### Current Token Assessment

The repository has a `CLOUDFLARE_API_TOKEN` secret, and successful preview
deployments prove that it is active and can deploy Worker scripts to the
configured account. That does not prove the permissions needed for this
cutover. Preview deployments do not read the production zone, attach Worker
Routes or Custom Domains, or edit Single Redirect rules.

The secret is not available in the local development environment, and GitHub
does not allow stored Actions secrets to be read back. Its policy therefore
cannot be inspected from this checkout.

Status: **not yet certified for the production cutover**. Confirm its
Cloudflare policy or complete the disposable end-to-end test below before
starting Phase 0.

### Definitive Token Verification

GitHub Actions secrets are write-only, so `gh secret list` proves only that a
secret exists. Preview deployment proves Workers script access, but does not
exercise production Routes, Custom Domains, zone lookup, or redirect rules.

Before cutover, inspect the token in Cloudflare under **My Profile > API
Tokens** and compare its permissions and resource scope with the list above.

For an end-to-end permission test, use disposable hostnames in a nonproduction
Alchemy stage:

1. Deploy a disposable Worker.
2. Attach a Route on a proxied disposable hostname.
3. Attach a Custom Domain on a second disposable hostname.
4. Create a redirect from a third disposable hostname.
5. Verify HTTPS.
6. Destroy the stage and verify all temporary records, routes, domains, rules,
   and certificates are removed or accounted for.

This is stronger than read-only API checks because Cloudflare separates read
and edit permissions.

## Cloudflare Dashboard Preparation

Complete these steps before changing `CLOUDFLARE_TRAFFIC_MODE`:

1. Confirm the `effect.website` zone is **Active** in the same account as
   `CLOUDFLARE_ACCOUNT_ID`.
2. Export the complete DNS zone.
3. Record the exact apex and `www` Vercel record definitions and proxy status.
4. Review all records for mail, DKIM, DMARC, verification, CAA, SRV, and
   delegated subdomains.
5. Confirm Universal SSL is active and covers `effect.website` and
   `www.effect.website`.
6. Confirm no other Worker owns either hostname.
7. Confirm the account plan supports a zone-level Single Redirect.
8. Keep the Vercel project and both domain attachments active.

## Cutover Runbook

### Phase 0: Deploy Without Production Traffic

1. Set `CLOUDFLARE_TRAFFIC_MODE=workers-dev`.
2. Deploy production.
3. Verify the production Worker at its `workers.dev` URL.
4. Exercise navigation, redirects, API reference pages, search, assets, Open
   Graph images, and error pages.
5. Stop if the Worker is not healthy.

Production remains entirely on Vercel in this phase.

### Phase 1: Put Cloudflare In Front Of Vercel

1. Confirm Universal SSL is active.
2. Change the existing apex and `www` Vercel records to **Proxied**.
3. Do not change their targets.
4. Verify both hostnames still behave exactly as they did on Vercel.
5. Confirm responses now traverse Cloudflare and still reach Vercel.

This changes the network path but not the application origin. If it fails,
return the records to **DNS only**.

### Phase 2: Prepare The Canonical Redirect

Create a temporary Cloudflare Single Redirect:

- Match: `www.effect.website/*`
- Target: the equivalent `https://effect.website/*`
- Status: permanent redirect
- Preserve path: yes
- Preserve query string: yes

The redirect executes before the origin or Worker Route. Verify it before
moving apex traffic.

### Phase 3: Move Apex Traffic To The Worker Route

1. Set `CLOUDFLARE_TRAFFIC_MODE=routes`.
2. Deploy production.
3. Verify Alchemy attached `effect.website/*` to `WebsiteWorker`.
4. Verify apex requests are served by Cloudflare, not Vercel.
5. Verify the temporary `www` redirect.
6. Monitor errors, search, and application telemetry.

No DNS target changes occur in this phase. The proxied Vercel apex record is
still present as a rollback origin, but the Worker Route runs first.

Rollback: set the mode to `workers-dev` and deploy. The Route is removed and
the proxied records resume forwarding to Vercel.

### Phase 4: Remove Vercel As The Hidden Origin

After the Route has been stable:

1. Replace the apex Vercel target with a proxied placeholder `A` record to
   `192.0.2.0`.
2. Replace the `www` Vercel CNAME with a proxied placeholder `A` record to
   `192.0.2.0`.
3. Verify the Worker Route and redirect still serve both hostnames.

The placeholder records are safe only while proxied. Requests must never be
allowed to reach the placeholder address.

Using `A` placeholders also removes the `www` CNAME that would prevent a
Worker Custom Domain attachment.

Rollback: restore the exact exported Vercel records, keep them proxied, set
the mode to `workers-dev`, and deploy.

### Phase 5: Attach Custom Domains Behind The Route

1. Set `CLOUDFLARE_TRAFFIC_MODE=bridge`.
2. Deploy production.
3. Confirm both Custom Domains are attached to `WebsiteWorker`.
4. Confirm Cloudflare created their managed DNS records.
5. Wait for both certificates to report **Active**.
6. Confirm Alchemy created its managed `www` redirect rule.
7. Verify apex HTTPS and the `www` redirect from multiple networks.

The existing Worker Route remains active throughout this phase. If Custom
Domain reconciliation fails, traffic continues through the Route.

Rollback: set the mode back to `routes` and deploy. Explicit `domain: null`
detaches partial Custom Domains while retaining the Route.

### Phase 6: Remove The Bridge

1. Remove the temporary dashboard-created redirect after confirming the
   Alchemy-managed redirect is active.
2. Set `CLOUDFLARE_TRAFFIC_MODE=custom-domains`.
3. Deploy production.
4. Confirm the Worker Route was removed.
5. Confirm the Custom Domains continue serving traffic.
6. Monitor for at least 48 hours.

Rollback: set the mode to `bridge` and deploy. This restores the Route without
removing the Custom Domains.

## Validation Checklist

Run from multiple resolvers and networks:

```sh
dig effect.website A @1.1.1.1
dig www.effect.website A @1.1.1.1
curl -I https://effect.website/
curl -I "https://www.effect.website/docs/?cutover=1"
```

Confirm:

- Cloudflare is still authoritative.
- Both hostnames return valid Cloudflare certificates.
- Apex responses do not contain Vercel response headers.
- `www` redirects to `https://effect.website/docs/?cutover=1`.
- Redirect status, path, and query behavior are correct.
- Documentation, API reference, search, assets, Open Graph images, 404s, and
  legacy redirects work.
- Cloudflare Worker errors and application telemetry remain healthy.

## Final Cleanup

After the rollback window:

1. Remove `effect.website` and `www.effect.website` from the Vercel project.
2. Remove obsolete Vercel deployments and integrations.
3. Remove `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` only after
   confirming no other repository automation uses them.
4. Keep `CLOUDFLARE_TRAFFIC_MODE=custom-domains` as an explicit repository
   variable.
5. Keep the transitional modes in code for one rollback window, then decide
   whether to simplify the configuration to Custom Domains only.
6. Consider enabling Cloudflare DNSSEC as a separate change. Publish the new
   Cloudflare DS record through Name.com only after the zone is stable.

## References

- Cloudflare Worker Custom Domains:
  https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- Cloudflare Worker Routes:
  https://developers.cloudflare.com/workers/configuration/routing/routes/
- Cloudflare Single Redirects:
  https://developers.cloudflare.com/rules/url-forwarding/single-redirects/
- Cloudflare Universal SSL:
  https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/enable-universal-ssl/
- Cloudflare API token permissions:
  https://developers.cloudflare.com/fundamentals/api/reference/permissions/
- Removing a domain from Vercel:
  https://vercel.com/docs/domains/working-with-domains/remove-a-domain
