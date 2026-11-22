# Evaluate hosting feasibility for long-lived LSP backend

Type: research
Status: resolved

## Question

Can the Effect website's hosting setup support a long-lived backend with WebSockets and one TypeScript compiler process per active editor session?

Investigate and document:
1. Current hosting architecture in `alchemy.run.ts` and `apps/web` (Cloudflare Workers via `@alchemy.run/cloudflare`).
2. Whether Cloudflare Workers alone can run a native binary like TypeScript 7 (`tsc --lsp --stdio`), or whether it requires Cloudflare Containers, Durable Objects + external compute, or a separate host (Fly.io, Railway, etc.).
3. Practical constraints for one compiler process per session: WebSocket support, idle timeouts, cold start latency, memory per process, concurrency scaling, and operational/cost trade-offs.
4. A clear verdict on what backend options are realistically available for this repo.

## Answer

Cloudflare Workers alone cannot run a native TypeScript 7 binary (`tsc --lsp --stdio` / `tsgo`): Workers execute inside 128 MB V8 isolates with no OS shell or `child_process` support.

If a server-side native LSP is needed, two options are realistic for this repo:
1. **Cloudflare Containers via `@alchemy.run/cloudflare` (best fit):** Stays inside `alchemy.run.ts`, supports native Linux binaries and WebSockets via `DurableObject` (`getTcpPort(port).fetch`), isolates sessions cleanly, and scales to zero (~$0.009/GiB-hr on `basic` 1 GiB). Main caveats are 1 to 3 second cold starts (above `@codemirror/lsp-client`'s 3000 ms default timeout), `sleepAfter` vs WebSocket lifecycle tuning, and capping `GOMAXPROCS` for `tsgo` memory.
2. **Fly.io Machines with a warm pool (best external fallback):** One always-on `shared-cpu-1x` 1 GB VM ($6.70/month) avoids VM cold starts by multiplexing `tsgo --lsp --stdio` child processes behind an Effect WebSocket gateway, at the cost of a second cloud provider and deploy pipeline outside Alchemy.

Full findings and citations: [02-hosting-backend-feasibility.md](../research/02-hosting-backend-feasibility.md).
