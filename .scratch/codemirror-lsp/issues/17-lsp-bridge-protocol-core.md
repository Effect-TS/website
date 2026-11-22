# 17: Build `packages/lsp-bridge` protocol core (framing, quirk absorption, pull-to-push diagnostics)

**What to build:** Create the `@website/lsp-bridge` workspace package with the Effect-based stdio LSP protocol core that translates bare JSON-RPC frames to and from `Content-Length` stdio streams, absorbs `tsgo`/`tsrs` protocol quirks, and synthesizes pull-to-push diagnostics for `@codemirror/lsp-client`. Back the child process behind an injectable stdio service so the entire protocol layer runs deterministically in `vp test` under Effect `TestClock`.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `@website/lsp-bridge` workspace package is wired into the pnpm workspace and passes `vp test` and `vp run check`
- [x] Effect `Stream` `Content-Length` encoder and decoder use UTF-8 byte lengths and pass split-chunk, coalesced multi-frame, and multi-byte UTF-8 tests
- [x] Server-to-client `client/registerCapability` requests are answered `{ result: null }` on stdin and never forwarded to the client
- [x] `params: null` is stripped from client `shutdown` and `exit` messages before reaching stdin, and client `$/cancelRequest` notifications are forwarded untouched
- [x] Pull-to-push diagnostics fire `textDocument/diagnostic` immediately on `didOpen` and after a 150 ms `TestClock`-verified debounce on `didChange`, cancel in-flight synthetic pulls via `$/cancelRequest` on newer edits, use a disjoint `"bridge:..."` request ID namespace that never leaks to the client, drop empty server `textDocument/publishDiagnostics` notifications on open/change, and emit the pull result as `textDocument/publishDiagnostics`
- [x] Invalid stdout framing or child process exit fails the session cleanly and drains `stderr` to structured server logs

## Answer

Implemented on `feat/codemirror-lsp-scratchpad` (`c3baa09f`).
