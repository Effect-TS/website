# 20: Build client `LspTransport` service, reconnection state machine, and `FakeLspController` test suite

**What to build:** Implement the browser-side Effect `LspTransport` `Context.Service` (WebSocket layer via `effect/socket/Socket` + `@effect/platform-browser/BrowserSocket` and swappable `layerInMemoryFake` + `FakeLspController`) and the `ScratchpadSession` Effect Atom state machine under `apps/web/src/features/scratchpad/`. Verify all status transitions, close-code policies, backoff caps, lazy wake, and reconnect queue clearing in Node via `vp test` and `TestClock` without `jsdom` or React Testing Library.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `LspTransport` is a message-level `Context.Service` (`transport`, `events`, `reconnect`, `disconnect`) with `Data.TaggedError` failures (`TransportConnectError`, `TransportClosedError` carrying close `code` and `reason`) and swappable `layerWebSocket` and `layerInMemoryFake` layers
- [x] `FakeLspController` lets tests inspect outbound client messages, reply to or stall requests (including `initialize`), push server notifications, trigger `close(code, reason)`, and inject connection failures, with an optional auto-handshake helper
- [x] `ScratchpadSession` exposes the 5-state `LspStatus` union (`connecting`, `ready`, `reconnecting`, `idle`, `error`) and configures `LSPClient` with `timeout: 10_000`
- [x] Close code `4000` stops reconnecting and enters `idle`; explicit wake triggers (`docChanged`, `focus`, indicator click) reconnect while passive events do not
- [x] Retryable drops (`1006`, `1011`, `1013`, open/network errors, `LSPClient.initializing` timeout/rejection) close any open socket and retry with jittered exponential backoff (500 ms base, factor 2, 10 s cap, max 5 consecutive attempts before entering retryable `error`), resetting attempts on reaching `ready`
- [x] Terminal closes (`1008`, `1009`) stop reconnecting and surface actionable `error` states; `doc-too-large` (`1009`) keeps `retryable: false` while the buffer exceeds 256 KiB (UTF-8 bytes) and flips `retryable` to `true` once trimmed below 256 KiB
- [x] Reconnecting clears the pending outbound message queue before `client.disconnect()` and `client.connect(transport)` so stale frames never precede the next `initialize`, verified via `FakeLspController` and `TestClock` in `vp test`

## Answer

Implemented on `feat/codemirror-lsp-scratchpad` (`79b60a8d`, review follow-up `675b121a`).
