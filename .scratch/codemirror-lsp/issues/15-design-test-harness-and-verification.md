# Design fake LSP test harness and v1 verification strategy

Type: grilling
Status: open
Blocked by: 13, 14

## Question

Specify how we test and verify the v1 Scratchpad client (`apps/web/src/features/scratchpad/`) and server bridge (`packages/lsp-bridge`) deterministically and end to end.

Settle:

1. The scripted in-memory fake `LspTransport` layer (`layerInMemoryFake`) for deterministic unit and integration tests of close-code handling (`4000`, `1013`, `1011`, `1009`, `1008`), exponential backoff and retry caps, lazy wake from `idle`, `doc-too-large` recovery, outbound queue clearing on reconnect, and `ScratchpadSession` atom state transitions.
2. Server bridge test coverage for `packages/lsp-bridge`: `Content-Length` UTF-8 framing codec, `client/registerCapability` and `shutdown`/`exit` quirk absorption, debounced pull-to-push diagnostics and `$/cancelRequest` cancellation, URI sandboxing, 256 KiB frame cap, idle eviction, and session capacity limits.
3. End-to-end browser verification against live `tsrs` (and CI gating): how we measure and assert the v1 latency targets (<500 ms editable, <1.5 s warm first diagnostic/hover), Effect `TS377xxx` diagnostics and quickinfo, and bundle size tracking.
