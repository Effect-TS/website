# Cloudflare migration plan

Last reviewed: 2026-09-03

## Goal

Move `effect.website` and `www.effect.website` from Vercel to the Cloudflare
Worker managed by Alchemy. Keep Vercel available as a rollback origin until the
Cloudflare deployment has been stable for 48 hours.

The final state is:

- `effect.website` is the canonical hostname and serves `WebsiteWorker`.
- `www.effect.website` permanently redirects to the same apex path and query.
- Cloudflare manages both hostnames, certificates, and DNS records through
  Worker Custom Domains.
- GitHub Actions deploys production and pull request previews through Alchemy.
- Vercel has no domains, credentials, integration, configuration, or package
  dependencies left in this project.

## Readiness decision

Do not move production traffic yet.

The Cloudflare preview works, and the branch has the main pieces needed for a
safe migration. The remaining release gates are concrete:

- Deploy the reconciled revision to the production `workers.dev` stage. The
  preview tested during this review was built from `4a1fef5`, not local HEAD.
- Fix and certify the Cloudflare CI token policy.
- Add enough production monitoring to detect a bad cutover and name the person
  responsible for rollback.
- Add protection rules to the GitHub `Production` environment and pause
  unrelated deployments during the cutover.
- Test the rollback workflow with an immutable known-good revision.

Rate limits, preview cleanup, and stronger deployment controls should also be
completed before the migration branch is considered finished. They do not need
to block the first route-based traffic test if the team accepts the risk.

## Verified state

### Production on 2026-09-03

- Name.com is the registrar.
- Cloudflare is already authoritative through `ben.ns.cloudflare.com` and
  `mary.ns.cloudflare.com`. No nameserver migration is needed.
- The apex resolves to Vercel addresses and returns a Vercel `308` redirect to
  `https://www.effect.website/`.
- `www.effect.website` is a CNAME to `cname.vercel-dns.com` and is served by
  Vercel.
- `CLOUDFLARE_TRAFFIC_MODE` is `workers-dev`, so production traffic remains on
  Vercel by design.
- GitHub still stores `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and
  `VERCEL_PROJECT_ID`.
- An active GitHub ruleset protects `main` with pull requests, linear history,
  and required `Format`, `Lint`, and `Types` checks. Organization administrators
  and one repository role can bypass it.
- The GitHub `Production` environments have no protection rules.

Do not copy the observed Vercel IP addresses into a rollback procedure. Export
the Cloudflare zone and record the exact DNS definitions before changing them.

### Cloudflare implementation

The branch already provides:

- An Astro Worker deployed by Alchemy in `alchemy.run.ts`.
- Cloudflare-hosted Alchemy state.
- Pull request Workers with PR comments and cleanup on PR close.
- Four production traffic modes: `workers-dev`, `routes`, `bridge`, and
  `custom-domains`.
- Explicit domain detachment and route removal for deterministic rollback.
- Runtime bindings for Mixedbread search and Upstash playground links.
- Worker replacements for the Vercel dprint and PostHog rewrites.
- Cloudflare `_headers` rules for Monaco workers.
- Production and preview incremental build caches.
- API reference snapshot verification and Mixedbread synchronization.
- Production traffic-mode validation and deployed HTTP smoke checks.
- Forced Alchemy and Astro rebuilds through the production workflow.
- Build invalidation when public PostHog configuration changes.
- A protected rollback workflow for immutable main-branch revisions.
- A deployment compatibility marker that rejects revisions built with an
  incompatible Cloudflare deployment contract.

The reviewed preview returned the expected responses for the home page,
documentation redirects, `/play`, an Open Graph image, and a custom 404. This
is useful evidence, but it is not a production acceptance test.

## Findings to resolve

### Cutover blockers

1. **The existing redirect order would loop.** Production currently redirects
   apex to `www`. Reverse that behavior in Vercel first so the apex serves the
   site and `www` redirects to apex. Otherwise a cached `www` to apex redirect
   can loop after a Vercel rollback.
2. **The CI token is too broad and may lack Zone Read.** `stacks/github.ts`
   grants write access across all zones in the account and includes broad
   account permissions. Restrict zone permissions to `effect.website`, add the
   read permissions Alchemy needs, and remove unrelated permissions.
3. **Monitoring is not defined.** Default Worker invocation logs are present,
   but there are no synthetic checks, server error alerts, dependency alerts,
   or agreed rollback thresholds.
4. **The infrastructure toolchain is a patched beta.** Alchemy and its
   Cloudflare framework package are pinned to `2.0.0-beta.72` with local patches
   required for Node prerendering. Freeze these versions through cutover and
   prove a clean install and build on the reconciled commit.
5. **Unrelated pushes can change production during cutover.** Production
   deploys on every main-branch push, the active ruleset has bypass actors, and
   the Production environments have no protection rules. Add a protected
   production environment and a cutover deployment lock before proxying either
   hostname.

### Risks to address before final teardown

- `workersDev: true` leaves a permanent alternate origin that can bypass
  zone-level controls. Disable it after the rollback window unless there is a
  documented reason to keep it.
- Search, playground shortening, dynamic Open Graph generation, dprint proxying,
  and PostHog proxying have no repository-managed rate limits or abuse rules.
- Preview cleanup only runs when GitHub delivers the PR close event. Add a
  scheduled job that removes Cloudflare stages for closed PRs.
- Same-repository PR builds receive production-capable credentials. Use a
  GitHub environment, least-privilege preview credentials, and trusted-branch
  controls where Alchemy permits them.
- There is no CI comparison between clean and incremental static output. A
  missing Astro cache key silently leaves stale HTML.

## Required code work

Complete these changes before setting the traffic mode to `routes`:

- [ ] Update `stacks/github.ts` with a least-privilege, zone-scoped token.
- [ ] Document how and when the GitHub bootstrap stack is applied.
- [x] Validate and log `CLOUDFLARE_TRAFFIC_MODE` before invoking Alchemy.
- [x] Add smoke checks after every production deployment.
- [x] Make a smoke-check failure fail the deployment and print the exact
      rollback command or workflow action.
- [x] Make `force_full_build` change Alchemy's build input, not only Astro's
      local cache state.
- [x] Include public build-time variables in Alchemy's memo or resource inputs.
- [x] Prevent failed builds from writing incremental cache entries.
- [x] Run `vp check` and `vp test`.
- [x] Make the E2E server use an isolated port and verify its identity before
      reusing it.
- [ ] Confirm the ruleset's required check names match the current workflows.
- [ ] Add protection rules to the production environment.
- [ ] Prevent unrelated main-branch and API-reference deployments while a
      cutover phase is running.
- [x] Add a protected rollback deployment that accepts an immutable source
      commit and explicit traffic mode.
- [x] Restrict rollback to revisions with the current Cloudflare deployment
      compatibility marker.
- [ ] Test the rollback deployment against the production `workers.dev` stage.

Complete these changes before deleting Vercel:

- [ ] Decide whether Worker logs need Logpush, a Tail Worker, or external error
      reporting, then configure the chosen alerts.
- [ ] Decide whether to disable the stable production `workers.dev` hostname.

## Cloudflare preparation

Assign one cutover operator and one reviewer. Record the start time, each mode
change, validation result, and rollback decision in the deployment issue.

- [ ] Confirm the `effect.website` zone is Active in the account named by
      `CLOUDFLARE_ACCOUNT_ID`.
- [ ] Export the complete DNS zone.
- [ ] Record the apex and `www` Vercel records and their proxy state.
- [ ] Confirm mail, DKIM, DMARC, verification, CAA, SRV, and delegated records
      will not change.
- [ ] Confirm Universal SSL covers the apex and `www`.
- [ ] Confirm no other Worker, Pages project, redirect, transform, or origin rule
      owns either hostname.
- [ ] Confirm the zone has an available Single Redirect rule within its quota.
- [ ] Inspect the API token policy in Cloudflare. A successful preview proves
      Workers Script access only.
- [ ] Exercise Route, Custom Domain, redirect, HTTPS, and cleanup permissions on
      disposable hostnames.
- [ ] Record current Vercel latency, error rate, search success rate, and key
      page checks as the rollback baseline.
- [ ] Keep the Vercel project and both domains active.

The deployment token should have only the account and zone permissions required
by the resources in `alchemy.run.ts`. Expected permissions include Workers
Scripts Edit, Zone Read, Workers Routes Edit, and the permissions required for
redirect management. Custom Domains use the Workers API rather than a separate
Custom Domain permission. DNS Edit is needed only if Alchemy or the cutover
process changes DNS through the API.

## Acceptance checks

Automate these where possible. Run them against the production `workers.dev`
URL first, then against the public hostnames after every traffic change.

### HTTP and routing

- [ ] Home page returns `200`.
- [ ] `/docs` reaches the expected documentation landing page.
- [ ] A trailing-slash URL redirects once to its non-trailing form.
- [ ] A known legacy URL reaches its expected destination.
- [ ] A missing URL returns the custom `404` with status `404`.
- [ ] `www` redirects to apex with the status expected for the current phase.
      Use `302` during the rollback window and `301` after Phase 6.
- [ ] The `www` redirect preserves a test path and query string.
- [ ] Apex responses have Cloudflare headers and no `server: Vercel` or
      `x-vercel-id` header.
- [ ] Canonical and Open Graph URLs use `https://effect.website`.

### Application behavior

- [ ] Search returns results with the production read-only key.
- [ ] Playground shortening can write and read a disposable test value.
- [ ] `/play` and Monaco worker assets return the required COEP and COOP headers.
- [ ] A dprint plugin downloads through the Worker proxy.
- [ ] PostHog requests use `/ingest` and reach the correct upstream without a
      redirect or CORS error.
- [ ] Static and generated Open Graph images render.
- [ ] Current API reference pages load and contain no unresolved module links.
- [ ] RSS, sitemap, robots, fonts, JavaScript, and CSS load.

### Operations

- [ ] TLS is valid from at least two networks.
- [ ] Worker exceptions, CPU time, latency, and 5xx responses remain within the
      agreed Vercel baseline.
- [ ] Mixedbread and Upstash errors remain within baseline.
- [ ] The deployment records the Worker version and source commit.
- [ ] The operator has tested deployment of an immutable known-good commit.
- [ ] The operator can execute both application and traffic rollback procedures.

## Cutover procedure

Make one traffic change at a time. Stop after any failed check.

### Phase 0: align Vercel with the final canonical host

1. In Vercel, make `effect.website` the primary production domain.
2. Confirm that the apex serves the site without redirecting.
3. Confirm that `www` redirects to the same apex path and query.
4. Confirm that canonical and Open Graph URLs remain on the apex.

Treat this canonical change as forward-only once public requests have received
the new redirect. Restoring the previous apex to `www` redirect can loop for
clients that cached the new `www` to apex redirect. If validation fails, keep
the apex canonical and fix the Vercel domain configuration before continuing.
If the team cannot accept that constraint, stop and arrange a temporary redirect
or an intermediate Vercel state in which both hostnames serve content.

### Phase 1: prove the production Worker

1. Merge the required code work.
2. Set the repository variable `CLOUDFLARE_TRAFFIC_MODE=workers-dev`.
3. Deploy the exact production revision with the production secrets and API
   reference snapshot.
4. Run the full acceptance checklist against the production `workers.dev` URL.
5. Confirm that production still comes from Vercel.

Rollback is not needed in this phase because the Worker has no production
traffic. Fix the deployment and repeat the phase.

### Phase 2: proxy the existing Vercel records

1. Confirm Cloudflare SSL mode is Full or Full (strict), as supported by the
   Vercel origin.
2. Change the existing apex Vercel record to Proxied in Cloudflare.
3. Do not change its DNS target. Verify the apex still serves Vercel correctly.
4. Change the existing `www` Vercel record to Proxied.
5. Do not change its DNS target. Verify `www` still redirects to apex.
6. Confirm that Cloudflare proxying has not changed application behavior.

Rollback one hostname at a time by returning it to its recorded DNS-only state.

### Phase 3: move the apex to the Worker Route

1. Set `CLOUDFLARE_TRAFFIC_MODE=routes`.
2. Deploy production.
3. Confirm that Alchemy attached `effect.website/*` to `WebsiteWorker`.
4. Run the acceptance checks against the apex.
5. Confirm that the apex no longer redirects to `www` and has no Vercel headers.
6. Confirm that Vercel still handles the `www` to apex redirect.
7. Keep this mode for at least 48 hours. Monitor the agreed checks and compare
   them with the Vercel baseline.

The proxied Vercel apex record remains underneath the Worker Route as a
rollback origin. To roll back, set the mode to `workers-dev` and deploy. The
route is removed and Vercel resumes serving the apex. Because Phase 0 made the
apex canonical in Vercel, cached `www` redirects remain valid after rollback.

### Phase 4: remove Vercel as the DNS origin

Only start this phase after the 48-hour route soak. This ends the simple Vercel
rollback window.

1. Create a temporary Cloudflare Single Redirect with the filter expression
   `http.host eq "www.effect.website"`.
2. Use status `302` and the dynamic target
   `concat("https://effect.website", http.request.uri.path)`.
3. Preserve the query string and test both HTTP and HTTPS with a path and query.
4. Replace the apex Vercel target with a proxied placeholder A record to
   `192.0.2.0`.
5. Replace the `www` Vercel CNAME with a proxied placeholder A record to
   `192.0.2.0`.
6. Verify that the Worker Route and temporary redirect still serve both hosts.
7. Confirm that neither placeholder can be reached directly.

The placeholder records are temporary. They are safe only while proxied and
while the Worker Route or redirect owns every request.

An emergency Vercel rollback is still possible here. Restore the exported
Vercel records while the Worker Route stays active. Verify the records are
proxied, disable the temporary redirect so Vercel handles `www`, then set the
mode to `workers-dev` and deploy.

### Phase 5: attach Custom Domains behind the route

1. Set `CLOUDFLARE_TRAFFIC_MODE=bridge`.
2. Deploy production.
3. Confirm that both Custom Domains are attached to `WebsiteWorker`.
4. Confirm that Cloudflare created the managed DNS records.
5. Wait for both certificates to become Active.
6. Confirm that the Alchemy-managed `www` redirect exists.
7. Keep the temporary redirect and apex Worker Route in place while checking
   the Custom Domains.
8. Do not claim that this phase tests apex Custom Domain traffic. The Worker
   Route takes precedence and still handles apex requests.

Before cutover, prove Custom Domain attachment and detachment on a disposable
hostname, including the resulting DNS records. If provisioning fails here,
leave the live Worker Route in place and deploy a corrected `bridge` state.
Do not detach domains until the operator has confirmed a proxied DNS record will
remain or be recreated for the route.

### Phase 6: remove temporary routing

1. Disable the temporary dashboard-created `www` redirect.
2. Immediately verify the Alchemy-managed `www` redirect.
3. Set `CLOUDFLARE_TRAFFIC_MODE=custom-domains`.
4. Deploy production.
5. Confirm that the apex Worker Route was removed.
6. Run the full acceptance checklist from multiple networks.
7. Monitor for at least 48 hours.

This is the first phase that sends apex traffic through the Custom Domain rather
than the Worker Route. For a routing rollback, set the mode to `bridge` and
deploy. This adds the route without detaching either Custom Domain. For an
application rollback, deploy the immutable last known-good source revision.

Do not improvise a full Vercel rollback from `custom-domains`. Detaching Custom
Domains can remove their managed DNS records before a Route can receive traffic.
Use only the Vercel rollback procedure proven with disposable hostnames, or
schedule a maintenance window to restore the exported records.

## Vercel teardown

Start only after the 48-hour Custom Domain observation period and explicit
approval from the cutover owner.

### External cleanup

- [ ] Remove `effect.website` and `www.effect.website` from the Vercel project.
- [ ] Disable Vercel production and preview deployments for this repository.
- [ ] Remove the Vercel GitHub integration or project connection.
- [ ] Remove stale Vercel deployment checks from repository rules and external
      automation.
- [ ] Remove obsolete Vercel deployments according to the retention policy.
- [ ] Delete `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` from GitHub
      after confirming that no other automation uses them.
- [ ] Confirm that DNS has no Vercel targets and Cloudflare Custom Domains own
      both website records.

### Repository cleanup

- [ ] Delete `apps/web/vercel.json` after testing its Cloudflare replacements.
- [ ] Delete `apps/web/scripts/patch-vercel-trailing-slash.mjs`.
- [ ] Change the default `.vercel/output/static` path in
      `verify-api-reference-links.mjs` to the Cloudflare build output or require
      the path argument.
- [ ] Remove the commented Vercel adapter import and configuration from
      `apps/web/astro.config.ts`.
- [ ] Remove the `.vercel` watcher and gitignore entries.
- [ ] Remove `vercel` and `@astrojs/vercel` from the package manifests.
- [ ] Regenerate `pnpm-lock.yaml` with `pnpm` and verify that unneeded Vercel
      transitive packages disappear.
- [ ] Update the privacy policy to name Cloudflare instead of Vercel and change
      its last-updated date.
- [ ] Replace the transitional traffic modes with a fixed Custom Domain setup
      after the team no longer needs Vercel rollback.
- [ ] Mark this runbook complete and record the final Worker version, commit,
      DNS export, and completion date.

Editorial references to Vercel, company logos, podcast assets, and third-party
`vercel.app` links are content, not hosting dependencies. Do not remove them as
part of the infrastructure cleanup.

## Later work

Treat these as separate changes after hosting is stable:

- Enable DNSSEC in Cloudflare, then publish the DS record through Name.com.
- Add HSTS, CSP, `X-Content-Type-Options`, `Referrer-Policy`, and frame policy
  after testing them against the playground and embedded content.
- Review Open Graph cache versioning so changed images do not remain immutable
  at an unchanged URL.
- Review the playground short-link collision behavior before increasing public
  traffic or retention.
- Pin secret-bearing GitHub Actions to commit SHAs.

## References

- [Cloudflare Worker Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Cloudflare Worker Routes](https://developers.cloudflare.com/workers/configuration/routing/routes/)
- [Cloudflare Single Redirects](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/)
- [Cloudflare Universal SSL](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/enable-universal-ssl/)
- [Cloudflare API token permissions](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)
- [Remove a domain from Vercel](https://vercel.com/docs/domains/working-with-domains/remove-a-domain)
