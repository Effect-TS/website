# Design server-side @effect/tsgo WebSocket bridge and container lifecycle

Type: grilling
Status: claimed
Blocked by: 02, 05, 08, 12

## Question

Specify the server-side LSP bridge running on Cloudflare Containers (`@alchemy.run/cloudflare`) that connects WebSocket clients to scoped `@effect/tsgo --lsp --stdio` processes.

Settle:

1. Effect `Content-Length` stdio framing codec and message routing design.
2. Per-session workspace directory layout under the shared read-only `node_modules` directory, plus `tsconfig.json` defaults.
3. Server-side handling of `tsgo` protocol quirks (`client/registerCapability`, `shutdown`/`exit` params) and `$/cancelRequest` forwarding.
4. Cloudflare Containers lifecycle: `DurableObject` WebSocket forwarding, `sleepAfter`, `GOMAXPROCS` cap, idle session eviction, and per-container concurrency limits.
