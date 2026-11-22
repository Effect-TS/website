# 19: Containerize `packages/lsp-bridge` and wire Cloudflare Containers + `WebsiteWorker` `/api/lsp` gateway

**What to build:** Package `packages/lsp-bridge` into a minimal Docker image with a baked read-only `/workspace`, wire it into `alchemy.run.ts` as a 4-instance Cloudflare Container pool, and expose the `/api/lsp` WebSocket upgrade gateway on `WebsiteWorker` with `Origin` allowlist checks and per-IP rate limiting.

**Blocked by:** 18: Add WebSocket server, sandboxing, session limits, and live `tsrs` smoke tests to `packages/lsp-bridge`

**Status:** ready-for-agent

- [ ] `packages/lsp-bridge` Docker image bakes a static, read-only `/workspace` (`0o555`/`0o444`) with hoisted `node_modules/effect` (pinned to the repo's `4.1.x` version), `tsrs` plus sibling `lib.*.d.ts` (stripping unused `tsc`, `oxlint`, and `tsgolint` artifacts), and `/workspace/tsconfig.json` (`strict: true`, `exactOptionalPropertyTypes: true`, `noEmit: true`, `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "bundler"`, `types: []`, `plugins: [{ "name": "@effect/language-service" }]`)
- [ ] `alchemy.run.ts` declares `Cloudflare.Container` on `basic` instances (1 GiB RAM, 1/4 vCPU) with `maxInstances: 4` named `DurableObject` instances, 1-minute `sleepAfter`, and `RAYON_NUM_THREADS=1`
- [ ] `WebsiteWorker` adds `/api/lsp` to `assets.runWorkerFirst`, checks the request `Origin` against an allowlist, enforces a per-IP `Cloudflare.RateLimit` binding, selects a container from the 4-instance pool by client IP hash or round-robin, and forwards WebSocket upgrades via `getTcpPort(port).fetch(request)`
- [ ] Pure unit tests under `apps/web/test/` cover `/api/lsp` `Origin` allowlist acceptance/rejection, non-upgrade rejection, rate-limit rejection, and deterministic container pool routing
