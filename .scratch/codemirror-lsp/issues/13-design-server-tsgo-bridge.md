# Design server-side @effect/tsgo WebSocket bridge and container lifecycle

Type: grilling
Status: resolved
Blocked by: 02, 05, 08, 12

## Question

Specify the server-side LSP bridge running on Cloudflare Containers (`@alchemy.run/cloudflare`) that connects WebSocket clients to scoped `@effect/tsgo --lsp --stdio` processes.

Settle:

1. Effect `Content-Length` stdio framing codec and message routing design.
2. Per-session workspace directory layout under the shared read-only `node_modules` directory, plus `tsconfig.json` defaults.
3. Server-side handling of `tsgo` protocol quirks (`client/registerCapability`, `shutdown`/`exit` params) and `$/cancelRequest` forwarding.
4. Cloudflare Containers lifecycle: `DurableObject` WebSocket forwarding, `sleepAfter`, `GOMAXPROCS` cap, idle session eviction, and per-container concurrency limits.

## Answer

1. **Compiler binary and Docker image.** Spawn `@effect/tsgo`'s embedded Rust `tsrs` binary (`artifacts/tsrs/<latest>/tsrs --lsp --stdio`, verified in `@effect/tsgo-linux-x64@0.73.2` at `artifacts/tsrs/7.1.0-beta.tsrs3/tsrs`) directly alongside its sibling `lib.*.d.ts` files instead of the Go `tsc` binary, for lower memory usage and smaller footprint. Strip unused `tsc`, `oxlint`, and `tsgolint` artifacts from the Docker image. Verify `tsrs` RSS and LSP quirk parity during implementation.
2. **Package placement, framing codec, and error policy.** Implement the bridge and its `Dockerfile` in a new workspace package `packages/lsp-bridge` (`@website/lsp-bridge`) using Effect `NodeSocketServer.makeWebSocket` and one scoped `ChildProcess.make` per WebSocket connection. Encode and decode LSP `Content-Length` frames using UTF-8 byte lengths over Effect `Stream`. Enforce a 256 KiB cap on incoming WebSocket frames and open document text (closing with `1009 Message Too Big`), close with `1008 Policy Violation` on malformed JSON or disallowed document URIs, close with `1011 Internal Error` (tearing down the Effect scope and child process) on `tsrs` crashes or invalid stdout framing, and drain `stderr` to structured server logs. Support running `packages/lsp-bridge` standalone on localhost during `astro dev` without Docker.
3. **Protocol quirks, pull-to-push diagnostics, and `$/cancelRequest`.**
   - Intercept `client/registerCapability` requests from the server and answer `{ result: null }` on stdin without forwarding them to the browser.
   - Strip `params: null` from client `shutdown` and `exit` messages before writing to stdin.
   - Synthesize pull-to-push diagnostics for `@codemirror/lsp-client`: send `textDocument/diagnostic` immediately on `didOpen`, debounce `didChange` pulls by 150 ms, cancel any in-flight synthetic pull via `$/cancelRequest` when a newer edit arrives, drop the server's own empty `textDocument/publishDiagnostics` notifications, and emit the pull result as `textDocument/publishDiagnostics`.
   - Use a disjoint `"bridge:..."` request ID namespace for bridge-synthesized requests so they never collide with client JSON-RPC IDs or leak to the client, and forward client-originated `$/cancelRequest` notifications untouched.
4. **Workspace layout and `tsconfig.json` defaults.** Bake one static, immutable read-only `/workspace` directory (`0o555`/`0o444`, no per-session temp directories) into the Docker image with hoisted `node_modules` containing `effect` (pinned to the repo's `4.1.x` version) and `tsrs`. Rewrite and restrict editable document URIs to `/workspace/main.ts` while allowing read-only definition targets inside `/workspace`. Configure `/workspace/tsconfig.json` with `strict: true`, `exactOptionalPropertyTypes: true`, `noEmit: true`, `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "bundler"`, `types: []`, and `plugins: [{ "name": "@effect/language-service" }]`. Dynamic or multi-package installation beyond `effect` is deferred beyond v1.
5. **Cloudflare Containers lifecycle and edge gating.** Wire `packages/lsp-bridge` into `alchemy.run.ts` via `Cloudflare.Container` on `basic` instances (1 GiB RAM, 1/4 vCPU) using a fixed pool of 4 named `DurableObject` instances (`maxInstances: 4`, selected by client IP hash or round-robin) with a cap of 8 concurrent `tsrs` processes per container (32 concurrent sessions globally, rejecting overflow with HTTP `503` / close code `1013 Try Again Later`). Cap threads with `RAYON_NUM_THREADS=1` (keeping `GOMAXPROCS=1` as a fallback if ever swapping back to Go `tsgo`). Set both per-session idle eviction (closing with `4000`) and container `sleepAfter` to 1 minute, renewing container activity only on real LSP frames rather than keepalive pings. Expose upgrades on `WebsiteWorker` at `/api/lsp` (added to `assets.runWorkerFirst`), forwarding to the container `DurableObject` via `getTcpPort(port).fetch(request)`, gated by an `Origin` allowlist check and a per-IP `Cloudflare.RateLimit` binding (skipping Turnstile in v1).
