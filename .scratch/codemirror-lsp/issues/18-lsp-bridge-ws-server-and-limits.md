# 18: Add WebSocket server, sandboxing, session limits, and live `tsrs` smoke tests to `packages/lsp-bridge`

**What to build:** Expose the `packages/lsp-bridge` protocol core over a standalone Effect `NodeSocketServer.makeWebSocket` server that spawns one scoped `@effect/tsgo` `tsrs --lsp --stdio` child process per connection against a read-only workspace. Enforce URI sandboxing, frame size limits, session capacity caps, and idle eviction, and verify the full stack with both fake-stdio `TestClock` tests and live `tsrs` WebSocket smoke tests.

**Blocked by:** 17: Build `packages/lsp-bridge` protocol core (framing, quirk absorption, pull-to-push diagnostics)

**Status:** ready-for-agent

- [ ] Standalone server starts on localhost without Docker (configurable port and workspace path) and spawns `tsrs --lsp --stdio` directly with `RAYON_NUM_THREADS=1` (and `GOMAXPROCS=1` fallback) so scope teardown kills the process cleanly with zero leaked PIDs
- [ ] Editable document URIs are rewritten and restricted to `/workspace/main.ts` while read-only definition targets inside `/workspace` remain allowed; malformed JSON or disallowed URIs close with `1008 Policy Violation`
- [ ] Incoming WebSocket frames and open document text exceeding 256 KiB (UTF-8 bytes) close with `1009 Message Too Big`
- [ ] Child process crashes or invalid stdout framing close with `1011 Internal Error` and tear down the Effect scope
- [ ] Per-session 1-minute idle eviction closes with `4000`, resetting the timer only on real LSP frames (not keepalive pings), verified via `TestClock`
- [ ] Concurrent sessions are capped at 8 per server instance, rejecting overflow with HTTP `503` or WebSocket close `1013 Try Again Later`, verified via `TestClock` / fake stdio
- [ ] 1 to 2 live `tsrs` WebSocket smoke tests run inside `vp test`, verifying Effect `TS377xxx` diagnostics, Effect quickinfo, `tsrs` quirk parity, and clean process teardown on disconnect
