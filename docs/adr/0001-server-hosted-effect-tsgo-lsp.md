---
status: accepted
---

# Server-hosted `@effect/tsgo` LSP for the Scratchpad

The Scratchpad at `/scratchpad` runs `@effect/tsgo --lsp --stdio` on a server behind WebSockets instead of bundling a TypeScript compiler in a browser Web Worker. Keeping the compiler off the client holds the browser bundle to the 183.7 KB gzip CodeMirror 6 + `@codemirror/lsp-client` shell, gives native Effect `TS377xxx` diagnostics without shimming `@effect/language-service` for browsers, and serves types from a shared read-only `node_modules` directory instead of shipping `.d.ts` packs to every visitor.

## Considered options

- **Browser `vtsls` Web Worker.** Prototyped in `apps/web` and rejected: it added 5.05 MB gzip (~2x the Playground's static Monaco bundle), took ~3 s for first diagnostics, required Vite WASM inlining and COEP headers on static assets, and lacked Effect diagnostics.
- **Browser `@typescript/vfs` + `ts.createLanguageService` Web Worker.** Zero server cost and offline support, but still downloads `typescript@6` plus static `.d.ts` packs (~1.8 to 2.2 MB gzip), requires maintaining a custom JSON-RPC LSP adapter, and needs an unproven browser shim for `@effect/language-service`.
- **Fly.io always-on Machine ($6.70/month).** Avoids cold starts, but adds a second cloud provider and deploy pipeline outside `alchemy.run.ts`. Remains a clean fallback because the same container image works on either host.

## Consequences

- **Hosting:** v1 deploys on Cloudflare Containers via `@alchemy.run/cloudflare` with scale-to-zero, accepting 1 to 3 s cold starts when waking from idle. `@codemirror/lsp-client`'s request timeout must be raised above its 3000 ms default.
- **Bridge boundary:** The server WebSocket bridge spawns one scoped `@effect/tsgo` child process per WebSocket connection, translates `Content-Length` stdio framing to bare JSON-RPC frames, and absorbs `tsgo` quirks (replying to `client/registerCapability` during `initialized` and stripping `params: null` on `shutdown`/`exit`).
- **Client simplicity:** `@codemirror/lsp-client` stays behind a backend-agnostic Effect `Transport` service with a plain WebSocket layer, leaving room to add a browser worker layer later without changing the editor or Effect Atom bindings.
