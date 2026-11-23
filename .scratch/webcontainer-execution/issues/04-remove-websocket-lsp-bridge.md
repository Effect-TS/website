# 04: Remove the WebSocket LSP bridge and server path

Type: task
Status: ready-for-agent
Spec: ../spec.md

The worker becomes the Scratchpad's only LSP transport (ADR 0003 accepted, ADR 0004).

- [ ] Delete `packages/lsp-bridge` and remove it from the workspace and catalog
- [ ] Delete `apps/web/src/features/scratchpad/lsp-gateway.ts`, `dev-lsp-proxy-plugin.ts`, the WebSocket `LspTransport` layer, and any session or reconnect logic that only the socket path uses
- [ ] Remove the Cloudflare container and `/api/lsp` wiring from `alchemy.run.ts` and the Astro and Vite config
- [ ] Remove `PUBLIC_LSP_TRANSPORT` and `PUBLIC_LSP_WS_URL` and their docs
- [ ] Delete the WebSocket-only tests and `test/e2e/scratchpad.spec.ts`, and the test that keeps `WORKSPACE_TSCONFIG` in sync with the bridge's tsconfig
- [ ] Update `.scratch/codemirror-lsp` notes or READMEs that point at the bridge
- [ ] Typecheck, unit tests and the worker e2e pass
