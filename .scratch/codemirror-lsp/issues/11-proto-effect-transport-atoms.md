# Prototype Effect transport service and Effect Atom UI bindings

Type: prototype
Status: resolved
Blocked by: 06, 10

## Question

On top of the bare CodeMirror + vtsls prototype (10), put the LSP `Transport` behind an Effect `Context.Service` layer with scoped lifecycle, and drive a connection status indicator and diagnostics list from Effect Atoms (`@effect/atom-react`).

Validate:

1. Whether `Atom.runtime` cleanly owns the transport and worker scope on mount/unmount.
2. Whether syncing editor/LSP state with Effect Atom stays free of update loops and leaks.
3. How clean the boundary feels between Effect, `@codemirror/lsp-client`, and React.

## Answer

Yes. Wrapping `@codemirror/lsp-client`'s `Transport` in an Effect `Context.Service` (`LspTransport`) owned by `Atom.runtime` inside `<RegistryProvider>` works cleanly in `apps/web` with zero leaks, zero update loops, and deterministic teardown. Because [Choose primary architecture: server-hosted TS 7 vs browser-only TS 6](08-server-ts7-vs-browser-ts6.md) ruled out browser `vtsls` for v1, the prototype ran against the live `@effect/tsgo` WebSocket bridge from [Prototype WebSocket bridge to @effect/tsgo --lsp --stdio](12-proto-ws-bridge-ts7.md) via `effect/socket/Socket` + `@effect/platform-browser/BrowserSocket`, plus a swappable in-memory fake `LspTransport` layer to prove the backend-agnostic seam.

Archived throwaway prototype: branch `prototype/effect-transport-atoms` (commit `00cb7acb`, under `apps/web/src/features/proto-effect-lsp/` and `apps/web/src/pages/proto-effect-lsp.astro`). Run `node apps/web/src/features/proto-effect-lsp/verify.ts` to execute the full Astro dev + `@effect/tsgo` WS bridge + headless Chromium verification.

### Verified behavior (Astro 7 dev + headless Chromium + live `@effect/tsgo@0.73.2`, `React.StrictMode` ON)

1. **Scoped lifecycle and StrictMode safety:**
   - `Atom.runtime(transportLayer).pipe(Atom.setIdleTTL("2 seconds"))` inside `<RegistryProvider defaultIdleTTL={2000}>` absorbed `React.StrictMode` double-mount with `transportAcquires: 1`, `lspClientAcquires: 1`, `editorAcquires: 1`, and 1 spawned `tsgo` PID (`bridgeActivePids: 1`).
   - Cold page load to `"ready"` with first real diagnostics (`TS377001` `floatingEffect` and `TS2322`) took 1,265 ms, rendering both in the React diagnostics list and as 2 inline `.cm-lintRange` squiggles in CodeMirror.
   - Unmounting `<RegistryProvider>` disposed the registry and closed all scopes cleanly: `transportReleases === 1`, `lspClientReleases === 1`, `editorReleases === 1`, and `bridgeActivePidsAfterUnmount === 0` (zero leaked `tsgo` processes, sockets, or `EditorView` instances).
2. **Loop-free Atom sync and reconnect resync:**
   - Programmatic document replacement through `runtime.fn` tagged with a CodeMirror `ExternalSync` `Annotation` updated the buffer and cleared diagnostics to `0` while keeping `userEdits: 0` (`externalSyncs: 1`, `docUpdatesTotal: 1`). Subsequent typing inside `.cm-content` incremented `userEdits` to `9` with `externalSyncs: 2` and `docUpdatesTotal: 11` (exact 1:1 accounting, zero feedback loops).
   - Simulating a WebSocket drop (`Socket.CloseEvent(4000)`) transitioned status through `reconnecting` back to `ready`, terminated the old `tsgo` PID, spawned a new one (`pidsBeforeDrop: 1 -> pidsAfterReconnect: 2`, `bridgeActivePids: 1`), and re-initialized `LSPClient`. `@codemirror/lsp-client`'s built-in `Workspace.connected()` automatically re-sent `textDocument/didOpen` with the live edited buffer, returning `TS2322` at shifted line 13 without custom resync plumbing.
   - Zero browser console or page errors across all steps.
3. **Boundary ergonomics (Effect, `@codemirror/lsp-client`, React):**
   - **Clean fits:** Effect v4's `Socket.readerString` + `Effect.scoped` + `Effect.retry(Schedule.exponential(...))` expresses WebSocket connection and reconnection in ~40 lines without raw `WebSocket` listeners. Returning `false` from `LSPClientConfig.notificationHandlers["textDocument/publishDiagnostics"]` and calling `registry.set(diagnosticsAtom, ...)` mirrors diagnostics into React without duplicating JSON parsing or suppressing inline squiggles. Swapping `layerWebSocket` for `layerInMemoryFake` worked with zero changes to `LSPClient`, atoms, or React.
   - **Friction points to address in [Design client Effect Transport service, reconnection policy, and Effect Atom bindings](14-design-client-transport-atoms.md):**
     - `ScopedAtom.make` wraps a single `Atom`, so passing a multi-atom session bundle required wrapping an immutable `ScratchpadSession` handle inside `Atom.make` and unwrapping it with `useAtomValue(SessionScoped.use())` in every child. A plain React context holding the session bundle inside `<RegistryProvider>` is simpler and avoids double-wrapping.
     - Because `Socket.writer` suspends writes while disconnected, clearing the outbound `Queue` on reconnect before `client.disconnect(); client.connect(transport)` is necessary so stale messages from the dropped session do not flush ahead of the new `initialize` handshake.
