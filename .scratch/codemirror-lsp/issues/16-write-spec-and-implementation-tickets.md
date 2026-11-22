# Write final technical spec and implementation ticket breakdown

Type: task
Status: resolved
Blocked by: 15

## Question

Synthesize all resolved decisions on the map into `.scratch/codemirror-lsp/spec.md` and a clean set of ordered implementation tickets covering `packages/lsp-bridge`, Cloudflare Containers / `WebsiteWorker` `/api/lsp` wiring, `apps/web/src/features/scratchpad/` + `/scratchpad` page, and the test/verification suite.

## Answer

Synthesized all resolved map decisions and ADR `0001-server-hosted-effect-tsgo-lsp.md` into the final technical spec at [spec.md](../spec.md) and broke the build into six ordered, `ready-for-agent` vertical-slice implementation tickets:

1. [17: Build `packages/lsp-bridge` protocol core (framing, quirk absorption, pull-to-push diagnostics)](17-lsp-bridge-protocol-core.md) (unblocked)
2. [18: Add WebSocket server, sandboxing, session limits, and live `tsrs` smoke tests to `packages/lsp-bridge`](18-lsp-bridge-ws-server-and-limits.md) (blocked by 17)
3. [19: Containerize `packages/lsp-bridge` and wire Cloudflare Containers + `WebsiteWorker` `/api/lsp` gateway](19-cloudflare-container-and-worker-gateway.md) (blocked by 18)
4. [20: Build client `LspTransport` service, reconnection state machine, and `FakeLspController` test suite](20-client-lsp-transport-and-session-atoms.md) (unblocked, parallel with 17)
5. [21: Build `/scratchpad` Astro page, CodeMirror 6 editor mount, and compact LSP status indicator](21-scratchpad-page-and-editor-ui.md) (blocked by 20)
6. [22: Add Scratchpad Playwright E2E suite and CI workflow gate](22-scratchpad-e2e-and-ci-gate.md) (blocked by 18, 21)

With ticket 16 resolved, the Wayfinder map has reached its destination and is ready to hand off to implementation.
