# Research Effect Atom patterns for CodeMirror and LSP state

Type: research
Status: resolved

## Question

How should Effect Atom (`effect@4.1.2` reactivity modules + `@effect/atom-react@4.1.2`) connect CodeMirror 6 and the LSP transport/server lifecycle to React UI?

Answer each of the following against the actual installed APIs in this repo:
1. **Scoped lifecycle:** Can `Atom.runtime` built from the transport and server layers own their lifetime so unmounting the editor closes the scope and terminates the server/worker?
2. **State ownership:** Which state belongs in atoms (connection status, diagnostics, server capabilities, open files, active file, cursor position)?
3. **Document text source of truth:** CodeMirror's `EditorState` already holds document text. Should an atom mirror it via an update listener, or should UI read the view directly, and how do we prevent update loops?
4. **Multi-file state:** Does `Atom.family` keyed by file URI fit per-file state (diagnostics, dirty state, open tabs)?
5. **Extra LSP requests:** Should LSP calls that `@codemirror/lsp-client` lacks (such as code actions or inlay hints) be `Atom.fn` or `AtomRpc` clients, with `AsyncResult` driving loading and error UI?
6. **Mutable `EditorView` integration:** How does `EditorView` live alongside the atom registry? Check `ScopedAtom`, `RegistryContext`, and existing patterns in `apps/web/src/features/playground`.
7. **SSR and hydration:** Given Astro's rendering model, does the editor need Effect Atom `Hydration` or a client-only React island boundary?

## Answer

- **Scoped lifecycle:** `Atom.runtime(layer)` owns the transport and LSP server scope via `ManagedRuntime` in `AtomRegistry`. Give it a short `Atom.setIdleTTL` (2 to 5 seconds) to survive React StrictMode double-mounts without thrashing worker startup, and wrap each editor instance in `<RegistryProvider>` so unmounting disposes the registry and terminates the worker or socket.
- **State ownership:** Put connection status, server capabilities, workspace diagnostics maps, open tabs, active URI, dirty flags, and theme/preferences in atoms. Keep live document text, transient popups, undo history, and unthrottled cursor updates inside CodeMirror `EditorState` and extensions.
- **Document text & loop prevention:** `EditorState` is the single source of truth. Read `view.state.doc.toString()` on demand for share/save and feed persistence from a debounced `Stream.callback` on `EditorView.updateListener`. Prevent loops with one-way `Atom.fn` dispatches tagged with a custom CodeMirror `Annotation`, plus a revision guard if syncing with external storage.
- **Multi-file state:** Store canonical maps (`diagnosticsByUriAtom`, `dirtyByUriAtom`) and collection state (`openTabsAtom`, `activeUriAtom`) in top-level/registry-scoped atoms, and expose `Atom.family((uri: string) => ...)` derived selectors so background file state is never lost to `WeakRef` GC while tabs still get fine-grained subscriptions.
- **Extra LSP requests:** Use `runtime.fn` + `AsyncResult` (not `AtomRpc`) for user-triggered UI requests like code actions, mapping fiber interruption to LSP `$/cancelRequest`. Keep CodeMirror-rendered features (inlay hints, semantic tokens) inside CodeMirror plugins calling the Effect LSP service directly.
- **Mutable `EditorView` integration:** Follow the playground's `element` atom + `get.some(element)` + `Effect.acquireRelease` + `useAtomMount` pattern, upgraded with `<RegistryProvider>` and `ScopedAtom.make` for multi-instance isolation and proper `null` ref cleanup.
- **SSR and hydration:** Use Astro's `client:only="react"` with a static `slot="fallback"` (matching `apps/web/src/pages/play.astro`), passing initial files as Astro island props. Do not use `effect/reactivity/Hydration`.

Full findings: [06-effect-atom-editor-link.md](../research/06-effect-atom-editor-link.md).
