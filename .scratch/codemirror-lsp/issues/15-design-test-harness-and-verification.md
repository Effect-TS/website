# Design fake LSP test harness and v1 verification strategy

Type: grilling
Status: resolved
Blocked by: 13, 14

## Question

Specify how we test and verify the v1 Scratchpad client (`apps/web/src/features/scratchpad/`) and server bridge (`packages/lsp-bridge`) deterministically and end to end.

Settle:

1. The scripted in-memory fake `LspTransport` layer (`layerInMemoryFake`) for deterministic unit and integration tests of close-code handling (`4000`, `1013`, `1011`, `1009`, `1008`), exponential backoff and retry caps, lazy wake from `idle`, `doc-too-large` recovery, outbound queue clearing on reconnect, and `ScratchpadSession` atom state transitions.
2. Server bridge test coverage for `packages/lsp-bridge`: `Content-Length` UTF-8 framing codec, `client/registerCapability` and `shutdown`/`exit` quirk absorption, debounced pull-to-push diagnostics and `$/cancelRequest` cancellation, URI sandboxing, 256 KiB frame cap, idle eviction, and session capacity limits.
3. End-to-end browser verification against live `tsrs` (and CI gating): how we measure and assert the v1 latency targets (<500 ms editable, <1.5 s warm first diagnostic/hover), Effect `TS377xxx` diagnostics and quickinfo, and bundle size tracking.

## Answer

1. **Client unit tests and `layerInMemoryFake` (`apps/web/test/features/scratchpad/`).**
   - Keep client unit tests in Node under `vp test` using Effect `TestClock`, `AtomRegistry`, `LSPClient`, and `layerInMemoryFake` (no `jsdom`, `happy-dom`, or React Testing Library). Leave `EditorView` DOM mounting, focus, and edit triggers to Playwright E2E.
   - Pair `layerInMemoryFake` with an Effect-based `FakeLspController` handle (methods to inspect sent messages, reply to or stall requests such as `initialize`, push server notifications, trigger `close(code, reason)`, and inject connection failures, plus an optional auto-handshake helper).
   - Cover all close-code branches (`4000` idle, `1013`/`1011`/`1006` retryable, `1008`/`1009` terminal), `TestClock`-driven jittered exponential backoff and the 5-attempt retry cap, lazy wake from `idle`, `doc-too-large` retryability toggling across the 256 KiB UTF-8 threshold, outbound queue clearing on reconnect before the next `initialize`, and `ScratchpadSession` `LspStatus` atom transitions.
   - Cover `WebsiteWorker`'s `/api/lsp` `Origin` allowlist check and upgrade/routing logic with pure unit tests under `apps/web/test/`.

2. **Server bridge test coverage (`packages/lsp-bridge`).**
   - Run two tiers inside `vp test`:
     - **Deterministic fake stdio tier:** Use an in-memory fake child-process stdio layer with `TestClock` to test UTF-8 `Content-Length` framing encode/decode, `client/registerCapability` interception and `shutdown`/`exit` `params: null` stripping, 150 ms debounced pull-to-push diagnostics with `$/cancelRequest` cancellation and disjoint `"bridge:..."` request IDs, URI sandboxing to `/workspace/main.ts`, the 256 KiB frame cap (`1009`), malformed JSON/URI rejection (`1008`), crash teardown (`1011`), 1-minute idle eviction (`4000`), and the 8-session capacity limit (`503`/`1013`).
     - **Live `tsrs` smoke tier:** Include 1 to 2 integration tests in `vp test` that spawn the real local `tsrs` binary over a localhost WebSocket to verify Effect `TS377xxx` diagnostics, Effect quickinfo, and quirk parity on every test run without Docker.

3. **Playwright E2E, CI gating, and manual container checks.**
   - Add `apps/web/test/e2e/scratchpad.spec.ts` wired to a dedicated Playwright project or config that starts standalone `packages/lsp-bridge` + `astro dev` (via `PUBLIC_LSP_WS_URL`) so local dev and CI do not require Docker. Support a `SCRATCHPAD_URL` override so the same spec can run against `alchemy dev` (Docker) or a deployed preview.
   - Assert core functional behavior in E2E: the editor is mounted and editable before LSP is ready, the preloaded snippet renders Effect `TS377xxx` diagnostic squiggles, hover shows Effect quickinfo, and the session recovers after a dropped connection.
   - Gate v1 in `.github/workflows/check.yml` on unit tests (`vp test`) plus a dedicated Playwright E2E job running only `scratchpad.spec.ts` against standalone `packages/lsp-bridge` + `astro dev`. Skip automated CI latency gates and bundle-size scripts for v1; check the latency targets (<500 ms editable, <1.5 s warm first diagnostic/hover), Scratchpad bundle size, and the Docker-backed `alchemy dev` + Cloudflare Container path manually before deploying.
