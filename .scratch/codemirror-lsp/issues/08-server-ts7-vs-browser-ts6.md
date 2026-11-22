# Choose primary architecture: server-hosted TS 7 vs browser-only TS 6

Type: grilling
Status: resolved
Blocked by: 02, 03, 04, 05, 07

## Question

Should the primary LSP backend be server-hosted TypeScript 7 (`tsc --lsp --stdio` over WebSockets) or browser-only TypeScript 6 in a Web Worker (vtsls or `@typescript/vfs`)?

Weigh the findings from hosting feasibility (02), the TS 7 stdio probe (03), `@effect/tsgo` / `@effect/language-service` support (04), `.d.ts` delivery (05), and v1 use cases (07):

1. Pick the primary route for v1.
2. Decide whether the alternate route is out of scope or kept as a secondary `Transport` layer.
3. Confirm whether the working hypothesis (keeping `@codemirror/lsp-client` behind an Effect `Transport` service) still holds under the chosen route.

## Answer

1. **Primary v1 route:** Server-hosted TypeScript 7 over WebSockets, running `@effect/tsgo --lsp --stdio` directly as the server binary. This keeps the browser payload to the 183.7 KB gzip CodeMirror 6 + `@codemirror/lsp-client` shell, delivers 2.3 ms warm server hover, gives full Effect `TS377xxx` diagnostics without browser-shimming `@effect/language-service`, and uses a shared read-only server `node_modules` without shipping `.d.ts` packs to clients.
2. **Alternate route:** Browser-only TypeScript 6 in a Web Worker (`vtsls` or `@typescript/vfs`) is out of scope for v1. The client Effect `Transport` service interface stays backend-agnostic so a second layer can be added later if needed.
3. **LSP client hypothesis:** Confirmed. Keep `@codemirror/lsp-client` behind an Effect `Context.Service` `Transport` layer, with a raised request timeout to tolerate container cold starts. Rule out building a custom LSP client on Effect RPC.
4. **Hosting target:** Cloudflare Containers via `@alchemy.run/cloudflare` so the backend stays inside `alchemy.run.ts` and scales to zero. The same container image can move to Fly.io later if cold starts prove disruptive.
5. **Process isolation and protocol-quirk boundary:** The server WebSocket bridge spawns one scoped `@effect/tsgo --lsp --stdio` `ChildProcess` per WebSocket connection against the shared read-only `node_modules` directory. The server bridge owns `Content-Length` stdio framing and absorbs `tsgo`'s protocol quirks (answering `client/registerCapability` during `initialized` and stripping `params: null` on `shutdown`/`exit`), keeping the browser `Transport` a plain JSON-RPC WebSocket layer.

Recorded as ADR: [0001-server-hosted-effect-tsgo-lsp.md](../../../docs/adr/0001-server-hosted-effect-tsgo-lsp.md).
