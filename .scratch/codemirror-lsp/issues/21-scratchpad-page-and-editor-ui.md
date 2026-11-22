# 21: Build `/scratchpad` Astro page, CodeMirror 6 editor mount, and compact LSP status indicator

**What to build:** Mount the standalone, unlisted **Scratchpad** at `/scratchpad` behind Astro's `client:only="react"` boundary, wiring the CodeMirror 6 editor, stock `@codemirror/lsp-client` single-file `Workspace`, Effect Atom `<RegistryProvider>` lifecycle, and compact 5-state LSP status indicator.

**Blocked by:** 20: Build client `LspTransport` service, reconnection state machine, and `FakeLspController` test suite

**Status:** ready-for-agent

- [ ] `/scratchpad` renders an unlisted Astro page (not added to main site navigation) with a `client:only="react"` island isolated under `apps/web/src/features/scratchpad/`
- [ ] `<Scratchpad>` uses a per-instance `<RegistryProvider defaultIdleTTL={2000}>`, `Atom.runtime(transportLayer).pipe(Atom.setIdleTTL("2 seconds"))`, and a plain `ScratchpadSessionContext` (`{ elementAtom, statusAtom, editorAtom, reconnectAtom }`) so `React.StrictMode` double-mount opens a single socket and unmount tears down all scopes cleanly
- [ ] `EditorView` mounts immediately with Lezer TypeScript syntax highlighting and one preloaded Effect snippet (demonstrating Effect `TS377xxx` diagnostics and quickinfo) before the WebSocket finishes connecting, keeping CodeMirror `EditorState` as the single source of truth for document text
- [ ] WebSocket URL defaults to same-origin `ws(s)://<location.host>/api/lsp` with `PUBLIC_LSP_WS_URL` override for local development against standalone `packages/lsp-bridge`
- [ ] Editor `docChanged` and `focus` events wake an `idle` session, browser `online` events trigger automatic retry from retryable errors, and document edits update the 256 KiB `doc-too-large` retryability state
- [ ] Compact status indicator clearly renders all 5 `LspStatus` states (`connecting`, `ready`, `reconnecting`, `idle`, `error`) and lets the user click to wake from `idle` or retry retryable errors
