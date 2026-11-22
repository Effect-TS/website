# Prototype Effect transport service and Effect Atom UI bindings

Type: prototype
Status: open
Blocked by: 06, 10

## Question

On top of the bare CodeMirror + vtsls prototype (10), put the LSP `Transport` behind an Effect `Context.Service` layer with scoped lifecycle, and drive a connection status indicator and diagnostics list from Effect Atoms (`@effect/atom-react`).

Validate:
1. Whether `Atom.runtime` cleanly owns the transport and worker scope on mount/unmount.
2. Whether syncing editor/LSP state with Effect Atom stays free of update loops and leaks.
3. How clean the boundary feels between Effect, `@codemirror/lsp-client`, and React.
