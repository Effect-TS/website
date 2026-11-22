# Hosting feasibility for a long-lived LSP backend

Ticket: [02-hosting-backend-feasibility.md](../issues/02-hosting-backend-feasibility.md)

## Verdict

Cloudflare Workers alone cannot run a native TypeScript 7 binary (`tsc --lsp --stdio` / `tsgo`). Workers execute inside 128 MB V8 isolates with no OS shell and no subprocess support.

If this editor needs a server-side native LSP, two options are realistic for this repo:

1. **Cloudflare Containers via `@alchemy.run/cloudflare` (best fit for this repo).** Stays inside `alchemy.run.ts`, supports native Linux binaries and WebSockets through container-backed Durable Objects, isolates sessions cleanly, and scales to zero. Trade-offs: 1 to 3 second cold starts from stopped state, `sleepAfter` vs WebSocket lifecycle tuning, and beta-era ergonomics in `@alchemy.run/cloudflare@2.0.0-beta.85`.
2. **Fly.io Machines with a warm pool (best external fallback).** One or two always-on `shared-cpu` VMs ($6.70/month for 1 GB RAM) running an Effect WebSocket gateway that spawns `tsgo --lsp --stdio` child processes on demand. Eliminates VM cold starts, but introduces a second cloud provider, separate CI/CD, and manual session/resource isolation.

Before committing to either backend, keep the baseline comparison in mind: any hosted compiler backend adds network round-trips, cold-start or idle-reconnection edge cases, abuse exposure (rate limiting / Turnstile for anonymous visitors), and ongoing compute billing. If a browser Web Worker running TypeScript 6 meets the UX bar, it removes all backend hosting work.

---

## 1. Current hosting architecture

The website deploys through Alchemy (`alchemy@2.0.0-beta.85`, `@alchemy.run/cloudflare@2.0.0-beta.85`, `@alchemy.run/frontend-frameworks@2.0.0-beta.85`) defined in `alchemy.run.ts` and pinned in `pnpm-workspace.yaml`.

- **Single Worker entry point.** `alchemy.run.ts` defines one `Cloudflare.Website.Astro("WebsiteWorker", ...)` targeting `./apps/web` with `astro: { output: "static" }`. Dynamic routes opt out of prerendering per file (`export const prerender = false`), as `apps/web/src/lib/ingest-proxy.ts` does for `/_ingest/[...path]` via `assets.runWorkerFirst`.
- **Current bindings.** `WebsiteWorker` binds a D1 database (`MotwVote`), a Cloudflare RateLimit namespace (`MOTW_VOTE_LIMIT`), an invisible Turnstile widget in prod, Upstash Redis (`KV_REST_API_URL`/`KV_REST_API_TOKEN`), and Mixedbread search credentials.
- **No stateful edge compute today.** The repo has no Durable Objects, no Containers, and no WebSocket endpoints.
- **Preview and local dev model.** PR previews spin up isolated Worker stages (`workersDev: true`) with state stored in `Cloudflare.state()`. Local `astro dev` does not provide `cloudflare:workers`, so `apps/web/src/features/motw-vote/dev-fallback-plugin.ts` stubs `export const env = {}` unless running under `alchemy dev`.

Adding a server-side LSP backend means either extending `alchemy.run.ts` with a container-backed Durable Object, or running a separate service on a subdomain such as `lsp.effect.website`.

---

## 2. Why Cloudflare Workers alone cannot run TypeScript 7

TypeScript 7 (`tsgo` / `typescript-go`) ships as a compiled Go binary invoked with `--lsp --stdio`. Standard Cloudflare Workers and standalone Durable Objects cannot run it:

- **No OS processes.** Under `nodejs_compat`, `node:child_process` is only a stub. Workers run in `workerd` V8 isolates without a Linux shell or process table, so spawning a child binary is impossible.
- **No native binaries.** Linux ELF binaries and Node C++ addons do not run in V8 isolates.
- **128 MB memory ceiling.** Every Worker isolate and standalone Durable Object has a hard 128 MB RAM limit across both Free and Paid plans. Even if `tsgo` were compiled to WebAssembly to run inside V8, 128 MB is too tight for `effect`'s generic-heavy type definitions, and Wasm loses Go's native multi-threaded execution model.
- **CPU limit.** Workers Paid allows up to 5 minutes of CPU time per request, which is plenty for HTTP handlers, not for holding an OS compiler process open.

Running `tsc --lsp --stdio` requires a real Linux container or VM.

---

## 3. Hosting options compared

### Option A: Cloudflare Containers (inside `alchemy.run.ts`)

Cloudflare Containers attaches Linux containers to Durable Objects. A Worker routes a WebSocket upgrade to a Durable Object, which forwards it to the container's TCP port via the Durable Object Container API (`this.ctx.container.getTcpPort(port).fetch(request)`). Inside the container, a thin Node or Effect server bridges WebSocket frames to `tsgo --lsp --stdio` over stdio.

- **Alchemy support.** `@alchemy.run/cloudflare` exposes `Cloudflare.Container` (taking a Dockerfile, context, `instanceType`, and `maxInstances`). The LSP service can live in `alchemy.run.ts` next to `WebsiteWorker`, sharing auth, Turnstile/RateLimit bindings, and PR preview lifecycles.
- **Instance sizes.** Predefined tiers:
  - `lite`: 1/16 vCPU, 256 MiB RAM, 2 GB disk
  - `basic`: 1/4 vCPU, 1 GiB RAM, 4 GB disk
  - `standard-1`: 1/2 vCPU, 4 GiB RAM, 8 GB disk
  - Up to `standard-4` (4 vCPU, 12 GiB RAM, 20 GB disk).
- **Pricing (Workers Paid plan, $5/month base).** Containers scale to zero when asleep. Memory and disk bill on allocated capacity while awake; CPU bills on active usage.
  - Included monthly allowance: 25 GiB-hours RAM, 375 vCPU-minutes, 200 GB-hours disk.
  - Overages: $0.0000025 per GiB-second RAM (~$0.009 per GiB-hour), $0.000020 per vCPU-second active CPU, $0.00000007 per GB-second disk.
  - Companion Workers and Durable Objects bill separately (DO Paid includes 1M requests and 400,000 GB-s/month; incoming WebSocket messages meter at a 20:1 ratio).
- **Concurrency limits.** Account defaults allow 6 TiB concurrent RAM, 1,500 concurrent vCPUs, and 30 TB concurrent disk across live instances. That covers thousands of concurrent `basic` containers.
- **Main drawbacks.** Cold starts from stopped state take 1 to 3 seconds. `sleepAfter` (default `10m`) wipes container memory and ephemeral disk on sleep, killing the LSP process. Local development also requires Docker alongside `alchemy dev`, and `@alchemy.run/cloudflare` is still in `2.0.0-beta`.

### Option B: Fly.io Machines (separate host)

Deploy a small Docker image containing an Effect `NodeSocketServer` and the `tsgo` binary to Fly.io (e.g., `lsp.effect.website`), with the browser connecting directly over WebSocket.

- **Warm pool vs per-session VMs.** Running one always-on `shared-cpu-1x` VM with 1 GB RAM costs $6.70/month ($3.69/month at 512 MB; extra RAM is $6.00/GB/month). With `min_machines_running = 1` and `auto_stop_machines = "off"`, the WebSocket gateway stays warm with zero VM cold start and spawns a `tsgo --lsp --stdio` child process per active WebSocket connection, reaping idle processes in app code.
- **Scale-to-zero behavior.** Fly supports `auto_stop_machines = "stop"` (~2+ second cold start) or `"suspend"` (memory snapshot, a few hundred milliseconds resume). However, auto-stopping a Machine abruptly drops open WebSockets, so Fly's own guidance for persistent WebSocket services is to keep at least one Machine running.
- **Main drawbacks.** Separate cloud account, separate CI/CD deploy, separate secrets and monitoring, and no automatic PR preview environment tied to `alchemy.run.ts`. Multiplexing multiple `tsgo` processes on one shared VM also requires careful memory caps and process cleanup so one abusive tab cannot OOM the host for other visitors.

### Option C: Cloudflare Worker/DO proxy in front of an external host

A Worker can proxy WebSockets to Fly.io or a VPS, or the browser can connect straight to `lsp.effect.website`. Adding a Worker/DO hop in front of Fly.io pays Worker/DO request costs and adds latency without solving the Linux compute requirement. Only worth doing if you specifically want Cloudflare Turnstile verification or RateLimit enforcement on the upgrade request before issuing a short-lived token (and even then, an HTTP token-minting endpoint on `WebsiteWorker` followed by a direct WebSocket to `lsp.effect.website` avoids proxying every LSP frame).

### Option D: Railway

Railway supports WebSockets and scale-to-zero, but its idle detector watches for 5 to 10 minutes of zero *outbound* packets. Standard 30-second WebSocket keepalive pings count as outbound traffic and prevent sleeping; turning pings off lets upstream proxies drop idle sockets after 60 to 100 seconds. In practice, a Railway WebSocket server runs always-on without Fly's regional edge placement or Machines API, making Fly.io the stronger external host.

---

## 4. Practical constraints for one compiler process per session

### WebSocket support and framing
Both Cloudflare Containers (`getTcpPort(port).fetch(request)`) and Fly.io proxy WebSockets cleanly. Cloudflare Workers cap standard WebSocket messages at 1 MiB (Durable Objects allow 32 MiB); normal LSP traffic is a few kilobytes, though large `textDocument/didOpen` or workspace symbol responses should stay under 1 MiB if routed through a Worker.

### Cold start latency vs `@codemirror/lsp-client` timeout
`@codemirror/lsp-client` defaults to a 3000 ms request timeout. On Cloudflare Containers, a 1 to 3 second container boot plus `tsgo` startup and project initialization will regularly exceed 3000 ms on the first `initialize` request. Any container-per-session design must raise the initialization timeout, show a clear connecting/warming state in the UI, and handle reconnect + full document re-sync (`didOpen` for all open files) after a container sleeps.

### Idle timeouts and Durable Object hibernation
Durable Object WebSocket Hibernation (`ctx.acceptWebSocket`) stops DO duration billing after ~10 seconds of inactivity while keeping the client socket open, but it does not hibernate an attached Linux container. While the container is awake, you pay for allocated container RAM until `sleepAfter` expires. Setting `sleepAfter` to a short window (for example, 3 to 5 minutes) and calling `renewActivityTimeout()` only on real editor LSP requests (not background pings) keeps costs down while letting abandoned browser tabs scale to zero.

### Memory per `tsgo` process
`tsgo` is much faster than Node `tsserver`, but its multi-threaded checker allocates a separate type checker per thread and retains AST/type arenas rather than aggressively collecting them. On huge monorepos, `tsgo --lsp` has been observed consuming gigabytes of RAM. A docs/playground workspace is much smaller, but `effect`'s type definitions are heavy on generics and conditional types.

Concrete sizing implications:
- Cap Go's concurrency inside the container with `GOMAXPROCS=1` (or `2`) to prevent per-thread type-checker duplication from multiplying memory usage.
- On Cloudflare Containers, `lite` (256 MiB) is too tight to trust with `effect` types. Budget `basic` (1 GiB RAM, 1/4 vCPU) as the floor per isolated session container, and verify real RSS with a prototype before choosing an instance tier.
- On a shared Fly.io VM, budget 150 to 300 MB per concurrent `tsgo` process (roughly 3 to 6 concurrent sessions per GB of RAM) and enforce a hard cap on concurrent sessions per Machine.

### Abuse and anonymous traffic
`effect.website` is public. Spawning a Linux container or native compiler process on every page load is an easy denial-of-wallet vector. Any hosted LSP backend needs:
- Lazy connection (do not connect until the user focuses or edits the playground, not on page load).
- Rate limiting per IP (reusing `Cloudflare.RateLimit`) and/or invisible Turnstile verification (already configured in `alchemy.run.ts`) before opening a session.
- Hard caps on `maxInstances` (Cloudflare Containers) or concurrent child processes (Fly.io) with graceful degradation to syntax-only editing when capacity is full.

---

## Summary matrix

| Criterion | Workers alone | Cloudflare Containers | Fly.io (warm pool) | Railway |
| :--- | :--- | :--- | :--- | :--- |
| Runs `tsc --lsp --stdio` | No | Yes | Yes | Yes |
| Lives in `alchemy.run.ts` | Yes | Yes (`Cloudflare.Container`) | No | No |
| WebSockets | Yes (1 MiB Worker / 32 MiB DO) | Yes (`getTcpPort().fetch`) | Yes | Yes |
| Cold start | ~0 ms | 1 to 3 s (from stopped) | ~0 ms warm / ~2 s stopped | Seconds (from sleep) |
| Idle scale-to-zero | N/A | Yes (`sleepAfter`) | Drops WS if stopped | Conflicts with WS pings |
| Realistic floor cost | N/A | $5/mo plan + ~$0.009/GiB-hr | ~$6.70/mo (1 GB always-on) | Always-on usage |
| Session isolation | N/A | 1 container per session | Shared VM (process per session) | Shared container |

---

## Sources

- Repo hosting config: `alchemy.run.ts`, `apps/web/astro.config.ts`, `apps/web/src/lib/ingest-proxy.ts`, `apps/web/src/features/motw-vote/dev-fallback-plugin.ts`, `pnpm-workspace.yaml`
- Cloudflare Workers limits (128 MB RAM, CPU time, WebSocket limits, `nodejs_compat`): https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare Durable Objects WebSocket Hibernation, limits, and pricing: https://developers.cloudflare.com/durable-objects/best-practices/websockets/ and https://developers.cloudflare.com/durable-objects/platform/pricing/
- Cloudflare Containers instance types, pricing, concurrency limits, and WebSocket forwarding (`getTcpPort().fetch`): https://developers.cloudflare.com/containers/platform-details/limits/, https://developers.cloudflare.com/containers/pricing/, https://developers.cloudflare.com/containers/examples/websocket/
- Alchemy Cloudflare Containers (`Cloudflare.Container` in `@alchemy.run/cloudflare`): https://github.com/alchemy-run/alchemy
- Fly.io Machines pricing, `auto_stop_machines`, suspend/stop cold starts, and WebSockets: https://fly.io/docs/about/pricing/ and https://fly.io/docs/launch/autostop-autostart/
- Railway serverless / scale-to-zero outbound traffic behavior: https://docs.railway.com/reference/app-sleeping
- TypeScript 7 (`typescript-go` / `tsgo`) LSP speed and per-thread checker memory behavior: https://github.com/microsoft/typescript-go
