# Design client Effect Transport service, reconnection policy, and Effect Atom bindings

Type: grilling
Status: resolved
Blocked by: 06, 08, 09, 11

## Question

Specify the browser-side Effect layer and React bindings for the Scratchpad at `/scratchpad`.

Settle:

1. The backend-agnostic Effect `Context.Service` `Transport` interface, its WebSocket layer (`BrowserSocket`), error model, and `@codemirror/lsp-client` timeout configuration for container cold starts.
2. Reconnection policy: backoff schedule, connection status states exposed to the compact status indicator, and re-syncing the open Scratchpad document after a dropped WebSocket.
3. Exact Effect Atom module design (`Atom.runtime`, `ScopedAtom.make`, and `EditorView` lifecycle; no extra LSP `runtime.fn` wrappers are needed in v1 per ticket 09).

## Answer

1. **`LspTransport` service boundary and error model.**
   - Define `LspTransport` as a `Context.Service` restricted to message transport: `{ transport: Transport, events: Stream.Stream<TransportEvent>, reconnect: Effect.Effect<void>, disconnect: Effect.Effect<void> }`. Keep it ignorant of LSP `initialize` handshakes so `layerWebSocket` (built on `effect/socket/Socket` and `@effect/platform-browser/BrowserSocket`) and `layerInMemoryFake` remain thin and interchangeable.
   - Model transport failures with `Data.TaggedError` (`TransportConnectError`, `TransportClosedError` carrying the WebSocket close code and reason).
   - Derive the combined UI status (transport lifecycle plus `LSPClient.initializing` promise) in the session atom layer above `LspTransport`.

2. **WebSocket close-code policy and idle eviction (`4000`).**
   - **Idle (`4000`):** Stop reconnecting and enter `idle` so background tabs do not defeat the server's 1-minute `sleepAfter` scale-to-zero window. Wake lazily on any user edit (`docChanged`), editor `focus`, or click on the status indicator, while ignoring passive pointer movement and background tabs.
   - **Retryable (`1006`, `1011`, `1013`, network/open errors, and `LSPClient.initializing` timeouts or rejections):** Close the socket if still open and auto-reconnect with backoff.
   - **Terminal (`1008`, `1009`):** Stop reconnecting and surface an actionable `error` state. For `1009` (`doc-too-large`), keep `retryable: false` while the buffer exceeds 256 KiB (UTF-8 bytes) and flip `retryable` to `true` once the user edits the buffer back under 256 KiB.

3. **Reconnection backoff, retry cap, and document resync.**
   - Use jittered exponential backoff starting at `500 ms` (factor `2`, capped at `10 s`) with a cap of `5` consecutive failed attempts before entering a retryable `error` state. Reset the attempt counter on reaching `ready`, and trigger an automatic retry when the browser fires `online` or when the user clicks the status indicator.
   - Before re-attaching `LSPClient` on reconnect, clear the pending outbound message queue and call `client.disconnect()` followed by `client.connect(transport)`. Clearing the queue prevents stale frames from flushing ahead of `initialize`, and `@codemirror/lsp-client`'s built-in `Workspace.connected()` automatically re-sends `textDocument/didOpen` with the live edited buffer.

4. **Cold-start timeout and non-blocking editor mount.**
   - Configure `LSPClient` with `timeout: 10_000` (10 s) so 1 to 3 s Cloudflare Container cold starts plus `tsrs` initialization do not hit the stock 3,000 ms timeout.
   - Mount `EditorView` immediately with Lezer TypeScript highlighting while the WebSocket connects and initializes in the background, keeping the Scratchpad editable in under 500 ms.

5. **Compact status indicator states (`LspStatus`).**
   - Expose a 5-state discriminated union to the indicator:
     - `connecting` (opening socket or running LSP `initialize`)
     - `ready` (initialized and synced)
     - `reconnecting` (`{ attempt: number, maxAttempts: number }`)
     - `idle` (disconnected after 1-minute server idle eviction; resumes on edit, focus, or click)
     - `error` (`{ code: "capacity" | "doc-too-large" | "policy" | "unreachable", message: string, retryable: boolean }`)

6. **Effect Atom module design, React binding, and file layout.**
   - Place the Scratchpad client in `apps/web/src/features/scratchpad/` (isolated from `apps/web/src/features/playground/`) and mount the page at `apps/web/src/pages/scratchpad.astro` behind Astro's `client:only="react"` boundary.
   - Connect to same-origin `ws(s)://<location.host>/api/lsp` by default, with an optional `PUBLIC_LSP_WS_URL` env override for pointing `astro dev` at a standalone local `packages/lsp-bridge` process.
   - Wrap `<Scratchpad>` in a per-instance `<RegistryProvider defaultIdleTTL={2000}>` with `Atom.runtime(transportLayer).pipe(Atom.setIdleTTL("2 seconds"))` so `React.StrictMode` double-mounts do not thrash sockets while unmounting disposes the registry and closes all scopes cleanly.
   - Drop `ScopedAtom.make` in favor of a plain `ScratchpadSessionContext` holding `{ elementAtom, statusAtom, editorAtom, reconnectAtom }` created once per `<Scratchpad>` mount.
   - Keep CodeMirror `EditorState` as the single source of truth for document text (no mirrored text atom, no diagnostics list atom, and no extra `runtime.fn` LSP wrappers in v1).
