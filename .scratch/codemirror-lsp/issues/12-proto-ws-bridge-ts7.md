# Prototype WebSocket bridge to @effect/tsgo --lsp --stdio

Type: prototype
Status: resolved
Blocked by: 02, 03, 04, 08

## Question

Build a throwaway WebSocket bridge to `@effect/tsgo --lsp --stdio` with one scoped Effect `ChildProcess` per connection against a shared read-only `node_modules` directory.

Validate `Content-Length` framing, server-side absorption of `tsgo` protocol quirks (answering `client/registerCapability` during `initialized` and stripping `params: null` on `shutdown`/`exit`), startup latency, hover/completion and Effect `TS377xxx` diagnostic round trips, and clean process teardown when a WebSocket disconnects.

## Answer

The Effect WebSocket bridge works end to end against `@effect/tsgo@0.73.2` (`7.0.2+effect-tsgo.0.73.2`) over `NodeSocketServer.makeWebSocket` and scoped `ChildProcess.make` processes, and uncovered one protocol mismatch that the server bridge must absorb for `@codemirror/lsp-client` to show diagnostics.

Archived throwaway prototype: branch `prototype/ws-bridge-ts7` (commit `e9a31cf3`, under `packages/proto-ws-bridge-ts7/`). Run `node packages/proto-ws-bridge-ts7/src/verify.ts` with `TSGO_BIN` pointing at `@effect/tsgo-<platform>-<arch>/lib/tsc` (or install `@effect/tsgo`).

### Verified behavior and latency (Linux x64, Node 24, `effect@4.1.2`)

- **Connect and `initialize`:** 42.2 ms total (21.5 ms `initialize` RPC) when spawning the native Go binary (`@effect/tsgo-linux-x64/lib/tsc --lsp --stdio`) directly instead of the `effect-tsgo` Node CLI wrapper.
- **Framing codec:** `Content-Length` framing using UTF-8 byte lengths (`Buffer.byteLength`) passed split-chunk (5-byte slices across header and body), coalesced multi-frame, and multi-byte UTF-8 (`日本語 🚀`) checks.
- **Protocol quirk absorption:**
  - `tsgo` sent `client/registerCapability` (id `"ts1"`) after `initialized`. The bridge answered `{ result: null }` on stdin; zero server requests leaked to the client, and no other server-to-client requests appeared.
  - `shutdown` and `exit` sent with `params: null` had `params` stripped before reaching `tsgo`, and `shutdown` returned `{ result: null }` without `-32602`.
- **Diagnostics (pull-to-push gap found and verified):**
  - `@effect/tsgo` only computes diagnostics on pull (`textDocument/diagnostic`), even when the client omits `textDocument.diagnostic` and only advertises `publishDiagnostics` (which is all `@codemirror/lsp-client@6.3.1` implements). Without bridge help, `tsgo` only pushes an empty `textDocument/publishDiagnostics` (`[]`).
  - Synthesizing a `textDocument/diagnostic` pull in the bridge on `didOpen` and `didChange`, then emitting `textDocument/publishDiagnostics` to the client, delivered both Effect `TS377001` (`floatingEffect`) and TypeScript `TS2322` diagnostics in 153.4 ms from `didOpen` (3.7 ms on a warm pull).
- **Hover and completion:** Hover on `program` returned Effect quickinfo (`Effect.Effect<number, never, never>` plus the `Effect Type Parameters` block) in 23.5 ms. First hover on `Effect.succeed` took 177.8 ms. Completions on `Effect.` after `textDocument/didChange` returned 233 items in 44 ms.
- **Shared read-only workspace and teardown:**
  - Two concurrent WebSocket connections opened the same `file://.../main.ts` URI inside a `0o555`/`0o444` read-only directory with a symlinked `node_modules/effect` and got independent diagnostics (0 diagnostics vs `TS2322`).
  - Clean `shutdown` + close exited the `tsgo` PID in 0.1 ms. Abrupt WebSocket disconnect without `shutdown` terminated the scoped `ChildProcess` via `SIGTERM` in 20.5 ms (20 to 41 ms across concurrent disconnects), with 0 leaked PIDs across 5 spawned processes.

### Implementation notes for server bridge design

1. **Spawn the native binary directly.** Invoking `@effect/tsgo-<platform>-<arch>/lib/tsc --lsp --stdio` avoids Node wrapper startup overhead and gives `ChildProcess` direct PID ownership so scope teardown kills `tsgo` cleanly with no orphaned grandchild.
2. **Bridge pull diagnostics to push, and suppress empty flicker.** Because `@codemirror/lsp-client@6.3.1` only listens for `textDocument/publishDiagnostics`, the server bridge should synthesize `textDocument/diagnostic` pulls on `didOpen`/`didChange` and drop `tsgo`'s own empty `publishDiagnostics` notifications on open/change so diagnostics do not flash empty.
3. **Drain `stderr`.** `tsgo` writes `"context canceled\n"` to `stderr` on `SIGTERM`; draining `proc.stderr` keeps the pipe from stalling and avoids spurious error logs on normal disconnect.
