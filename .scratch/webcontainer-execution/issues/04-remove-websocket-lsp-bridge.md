# 04: Remove the WebSocket LSP bridge and server path

Type: task
Status: resolved
Spec: ../spec.md

The worker becomes the Scratchpad's only LSP transport (ADR 0003 accepted, ADR 0004).

- [x] Delete `packages/lsp-bridge` and remove it from the workspace and catalog
- [x] Delete `apps/web/src/features/scratchpad/lsp-gateway.ts`, `dev-lsp-proxy-plugin.ts`, the WebSocket `LspTransport` layer, and any session or reconnect logic that only the socket path uses
- [x] Remove the Cloudflare container and `/api/lsp` wiring from `alchemy.run.ts` and the Astro and Vite config
- [x] Remove `PUBLIC_LSP_TRANSPORT` and `PUBLIC_LSP_WS_URL` and their docs
- [x] Delete the WebSocket-only tests and `test/e2e/scratchpad.spec.ts`, and the test that keeps `WORKSPACE_TSCONFIG` in sync with the bridge's tsconfig
- [x] Update `.scratch/codemirror-lsp` notes or READMEs that point at the bridge
- [x] Typecheck, unit tests and the worker e2e pass

## Answer

The tsrs Web Worker is now the Scratchpad's only LSP transport.

Removed:

- `packages/lsp-bridge` (with its Dockerfile and `workspace.tsconfig.json`), its `tsconfig.workspace.json` reference and its lockfile entries.
- `lsp-gateway.ts`, `dev-lsp-proxy-plugin.ts`, `apps/web/src/worker.ts` (the `LspContainer` Durable Object and `/api/lsp` routing) and the `DurableObject` and `LSP_*` declarations in `cloudflare-workers.d.ts`. The `cloudflare:workers` dev fallback is back to `export const env = {}`.
- From `alchemy.run.ts`: the `main` worker entry, `/api/lsp` in `runWorkerFirst`, the `LspContainer` container, `LSP_RATE_LIMIT` and `LSP_ALLOW_PREVIEW_ORIGINS`. These now match the file as it was before ticket 19 of `.scratch/codemirror-lsp`.
- `PUBLIC_LSP_TRANSPORT` and `PUBLIC_LSP_WS_URL` (Astro env schema, `scratchpad.astro`, the `Scratchpad` props, `resolveLspTransportKind`, `resolveLspWsUrl`). `Scratchpad.tsx` always uses `layerBrowserWorker`.
- From `transport.ts`: `layerSocket`, `layerWebSocket`, `TransportConnectError`, `TransportClosedError` and the `TransportError` union. `Disconnected` now carries a `TransportFatalError`. The in-memory fake swaps `close(code)` and `failConnects` for `crash(message)`.
- From `session.ts`: the parts only the socket used. That covers the close-code handling (1008 policy, 1009 too big, 1013 capacity, 4000 idle eviction), the `idle` status, the `capacity`, `policy` and `doc-too-large` error codes, `wakeAtom`, `onlineAtom`, `documentChangedAtom`, `MAX_DOC_BYTES` and `utf8ByteLength`. `editor.ts` no longer wires focus, doc-change or `online` events into the session. Backoff on `initialize` failures and the `crashed` error with a manual restart stay.
- Tests: `lsp-gateway.test.ts`, the `layerSocket` test, the close-code, idle, wake and online session and editor tests, the `PUBLIC_LSP_*` config tests, the `WORKSPACE_TSCONFIG` and bridge tsconfig sync test (`WORKSPACE_TSCONFIG` itself stays until ticket 08), `test/e2e/scratchpad.spec.ts`, `playwright.scratchpad.config.ts`, the `test:e2e:scratchpad` task and its CI step in `check.yml`. New session tests cover exhausting the `initialize` retry budget and the fatal crash with manual restart.
- `.scratch/codemirror-lsp/map.md` has a note pointing here. Its historical tickets are unchanged.

Verification:

- `astro check`: 0 errors. `vp check --no-fmt`: every error is in pre-existing `.scratch/*/prototypes` files. `vp fmt --check` passes on all changed files (other formatting failures are in untouched `.agents/` and `.scratch/` files).
- `vp test` with `tsrs-lsp-wasm` built: all Scratchpad and tsrs-lsp-wasm suites pass (78 passed, 2 skipped). The one failure is in the untouched `@website/api-reference` `snapshot.test.mjs`, which times out at 5 s. It is pre-existing.
- Worker e2e: 3 of 4 pass. The test "recovers from a document that crashes the language server" fails because the hover on the 40k-character line is intercepted by the gutter. The base commit fails in the same place, so this is pre-existing and not caused by this change.
- No references to `lsp-bridge`, `lsp-gateway`, `PUBLIC_LSP`, `/api/lsp` or `layerWebSocket` remain outside `.scratch/`, `docs/adr/` and the unrelated `specs/_references`.
