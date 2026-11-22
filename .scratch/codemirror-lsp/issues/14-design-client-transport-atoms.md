# Design client Effect Transport service, reconnection policy, and Effect Atom bindings

Type: grilling
Status: open
Blocked by: 06, 08, 09, 11

## Question

Specify the browser-side Effect layer and React bindings for the Scratchpad at `/scratchpad`.

Settle:

1. The backend-agnostic Effect `Context.Service` `Transport` interface, its WebSocket layer (`BrowserSocket`), error model, and `@codemirror/lsp-client` timeout configuration for container cold starts.
2. Reconnection policy: backoff schedule, connection status states exposed to the compact status indicator, and re-syncing the open Scratchpad document after a dropped WebSocket.
3. Exact Effect Atom module design (`Atom.runtime`, `ScopedAtom.make`, `EditorView` lifecycle, and any `runtime.fn` + `AsyncResult` wrappers needed for extra LSP features from ticket 09).
