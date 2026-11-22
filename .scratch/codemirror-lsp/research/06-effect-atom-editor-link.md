# Effect Atom patterns for CodeMirror 6 and LSP state

Research for [issue 06](../issues/06-effect-atom-editor-link.md). Targets `effect@4.1.2` and `@effect/atom-react@4.1.2` (pinned in `pnpm-workspace.yaml:64-65`).

> Note on module paths: in `effect@4.1.2`, core reactivity modules live under `effect/reactivity/*` (`Atom`, `AtomRegistry`, `AsyncResult`, `Hydration`, `AtomRpc`), not `effect/unstable/reactivity/*`. `node_modules` is not installed in this worktree, so API shapes were verified against the repo's live `effect@4.1.2` usage in `apps/web/src/features/playground/` and Effect v4 API docs.

## 1. Scoped lifecycle with `Atom.runtime`

Yes. `Atom.runtime(layer)` can own the transport and language server lifetime so unmounting the editor closes the scope and terminates the worker or socket.

How it works in `effect/reactivity/Atom`:
- `Atom.runtime(layer)` produces an `AtomRuntime` backed by a `ManagedRuntime` node inside `AtomRegistry`.
- Every atom created with `runtime.atom(effect)` subscribes to that runtime node and runs its effect inside a `Scope` tied to the atom's own lifetime.
- Atoms default to `keepAlive: false` (`Atom.autoDispose`). When the last React subscriber unmounts (for example, `useAtomMount(editor)`), the editor atom's scope closes first, running `Effect.acquireRelease` finalizers (`view.destroy()`), interrupting `Effect.forkScoped` fibers, and detaching `get.subscribe` listeners. Once the `AtomRuntime` node has zero remaining subscribers and its idle TTL expires, `AtomRegistry` disposes the `ManagedRuntime`, which closes the layer `Scope` and runs the transport and server release finalizers (terminating the Web Worker or closing the WebSocket).
- `AtomRegistry.AtomRegistry` is automatically available in the layer context of `Atom.runtime` (used in `apps/web/src/features/playground/services/loader.ts:27` and `services/webcontainer.ts:54`). Transport and LSP services can `yield* AtomRegistry.AtomRegistry` to push status or diagnostics straight into atoms without React callback plumbing.

One practical catch: React StrictMode double-invokes mount, unmount, and mount, and tab switches can briefly drop subscribers. If `idleTTL` is unset, the runtime tears down and restarts the worker immediately. The Monaco playground avoids this in `apps/web/src/features/playground/atoms/editor.ts:19-21`:

```ts
const runtime = Atom.runtime(
  Layer.mergeAll(Loader.layer, Monaco.layer, Toaster.layer),
).pipe(Atom.setIdleTTL("10 seconds"))
```

For CodeMirror + LSP, set a short idle TTL on the runtime (2 to 5 seconds) or pass `defaultIdleTTL` to `<RegistryProvider>` so StrictMode remounts reuse the worker while real unmounts still terminate it promptly. If each editor instance gets its own `<RegistryProvider>`, unmounting the provider disposes the registry itself (after a short cancelable delay for StrictMode), which tears down every atom and runtime inside it deterministically.

## 2. State ownership

Put low-frequency, React-facing state in atoms. Keep high-frequency editor internals inside CodeMirror `EditorState` and extensions.

**Store in atoms:**
- **Connection status** (`"disconnected" | "connecting" | "initializing" | "ready" | "reconnecting" | "error"`): pushed by the Effect transport/LSP layer via `AtomRegistry` or a stream atom. Drives status indicators, loading states, and retry actions.
- **Server capabilities** (`Option<ServerCapabilities>`): written once after LSP `initialize`. Controls which UI actions (format, rename, code actions) are enabled.
- **Diagnostics list / counts** (workspace map keyed by URI): powers a Problems panel, tab error badges, and status-bar counts. `@codemirror/lint` still renders inline squiggles inside the editor.
- **Open files, file tree, and active file URI**: mirrors `selectedPath` and `workspaceAtom` in `apps/web/src/features/playground/atoms/workspace.ts:105,225-230`. Drives tabs, explorer UI, and buffer switching.
- **Dirty / sync status** (per-file boolean or revision): drives unsaved indicators and autosave/share flows.
- **Editor preferences and theme**: mirrors `apps/web/src/features/playground/atoms/theme.ts:10-21` and `atoms/editor.ts:15-17,34-40`. Subscribed inside the editor atom with `get.subscribe(..., { immediate: true })` to reconfigure CodeMirror `Compartment`s in place.

**Keep out of hot-path atoms:**
- **Raw document text on every keystroke** (see section 3).
- **Transient editor popups and geometry**: completions, hover tooltips, signature help, scroll offsets, and undo history belong to CodeMirror and `@codemirror/lsp-client`.
- **Cursor position (`line:col`)**: do not write on every transaction unless a status bar actually renders it. If needed, update a leaf `cursorAtom` only when `update.selectionSet` is true, and debounce or batch to animation frames so typing never re-renders the editor shell.

## 3. Document text source of truth and loop prevention

CodeMirror's `EditorState` should remain the single source of truth for live document text. Do not mirror full document strings into a React-subscribed atom on every `docChanged` event. Calling `state.doc.toString()` on every keystroke allocates a full buffer copy and forces React reconciliation for no benefit.

The playground already proves the right pattern in `apps/web/src/features/playground/services/monaco.ts:172-185`, `atoms/editor.ts:44-79`, and `services/file-sync.ts`:
1. **On-demand reads:** Actions like share, download, or manual save read directly from the live editor (`view.state.doc.toString()`), matching `editor.ts:44-62` (`model.getValue()`) and `services/webcontainer.ts:456-471`.
2. **Debounced background streams:** Persistence, autosave, and dirty tracking consume a `Stream.callback` fed by `EditorView.updateListener` and debounced via `Stream.debounce("2 seconds")` (matching `atoms/editor.ts:67-72`).
3. **LSP sync stays inside CodeMirror:** `@codemirror/lsp-client` observes CodeMirror transactions directly to emit `textDocument/didChange`. No atom sits in the middle of editor-to-LSP text sync.

To prevent update loops when external events write to the editor (reset, file switch, format, or LSP `WorkspaceEdit`):
- **Keep data flow one-way.** Never pass `value={text}` back into CodeMirror as a controlled React prop. Route external mutations through `Atom.fn` commands that call `view.dispatch(...)`.
- **Tag programmatic transactions.** Define a CodeMirror `Annotation.define<boolean>()` (for example, `ExternalSync`) and attach it to external dispatches. In `EditorView.updateListener`, ignore updates whose transactions carry `ExternalSync` so external writes do not echo back to persistence or external sync loops.
- **Guard async storage reads with revisions.** If the editor syncs with `localStorage`, URL hashes, or a virtual filesystem, use a monotonic generation/revision guard like `apps/web/src/features/playground/services/file-sync.ts:43-171` so stale async reads cannot overwrite newer keystrokes.

## 4. Multi-file state with `Atom.family`

`Atom.family` keyed by file URI fits per-file reads well, with one memory-management rule to respect.

In `effect@4.1.2`, `Atom.family` uses `MutableHashMap` (structural equality, so plain `string` URIs work directly as keys) backed by `WeakRef` and `FinalizationRegistry`. That gives automatic garbage collection for unused keys, which is great for per-file selectors, but dangerous if you store canonical state in an unmounted family atom: a background file's diagnostics written to a writable `diagnosticsAtom(uri)` can be garbage-collected and reset if no tab currently subscribes to that URI.

Recommended split:
- **Collection and canonical maps live in top-level (or registry-scoped) atoms:** `openTabsAtom` (`ReadonlyArray<string>`), `activeUriAtom` (`string`), `diagnosticsByUriAtom` (`HashMap<string, ReadonlyArray<Diagnostic>>`), and `dirtyByUriAtom` (`HashSet<string>`).
- **Per-file selectors use `Atom.family` derived from those maps:**
  ```ts
  const fileDiagnosticsAtom = Atom.family((uri: string) =>
    diagnosticsByUriAtom.pipe(
      Atom.map((map) => Option.getOrElse(HashMap.get(map, uri), () => [])),
    ),
  )
  ```
  Each tab or file-tree row subscribes only to its own URI slice, avoiding cross-file re-renders, while background diagnostics never disappear when a tab unmounts.

## 5. Extra LSP requests: `Atom.fn` vs `AtomRpc`

Use `runtime.fn` (Effect Atom's `Atom.fn` bound to the LSP `AtomRuntime`) with `AsyncResult`, not `AtomRpc`.

Why `AtomRpc` does not fit here:
- `effect/reactivity/AtomRpc` wraps `@effect/rpc` (`RpcGroup` + `RpcClient`). Because we are keeping `@codemirror/lsp-client`, it already owns the JSON-RPC connection, request IDs, and document version synchronization, and exposes `client.request(method, params)`.
- Wrapping LSP calls in `AtomRpc` would either duplicate the JSON-RPC transport into an `RpcGroup` or clash with LSP's `$/cancelRequest` semantics.

How to wire extra LSP calls cleanly:
- **User-triggered UI requests** (code actions menu, manual document formatting, execute command): define `runtime.fn<Params>()(Effect.fnUntraced(function* (params, get) { ... }))`, matching `apps/web/src/features/playground/atoms/share.ts:23-53` and `atoms/workspace.ts:243-289`. `runtime.fn` produces an `AtomResultFn` whose state is `AsyncResult.AsyncResult<A, E>`. React renders loading, success, and error states with `AsyncResult.builder(result)` (`apps/web/src/features/playground/index.tsx:31-44`) or `result.waiting` / `AsyncResult.isFailure` (`components/share-button.tsx:55-57`). Re-invoking the `Atom.fn` interrupts the in-flight fiber automatically, so the Effect wrapper around `client.request` can send `$/cancelRequest` in an `Effect.onInterrupt` hook.
- **Editor-rendered LSP features** (inlay hints, semantic tokens): these paint CodeMirror decorations inside a `ViewPlugin` or `StateField`, not React DOM. Call the Effect LSP service directly from a scoped fiber or debounced stream rather than pushing decoration arrays through React atoms. Keep only user toggles (such as `inlayHintsEnabledAtom`) in atoms.

## 6. Mutable `EditorView` integration

The repo already has a proven pattern for mounting an imperative editor (`monaco.editor.create`) and terminal (`xterm.open`) inside Effect Atom without `useEffect` lifecycles:
- `apps/web/src/features/playground/atoms/editor.ts:23-108` + `components/file-editor.tsx:11-43`
- `apps/web/src/features/playground/atoms/workspace.ts:113-196` + `components/terminal.tsx:20-38`

The pattern works step by step:
1. Pair a writable container atom `element = Atom.make(Option.none<HTMLElement>())` with a scoped `editor = runtime.atom(Effect.fnUntraced(function* (get) { ... }))`.
2. Inside `editor`, wait for the DOM node with `const el = yield* get.some(element)`, then construct `EditorView` via `Effect.acquireRelease` whose release calls `view.destroy()`.
3. In React, mount the atom with `useAtomMount(editor)` and wire a callback `ref` that sets `element` to `Option.some(node)` on attach and `Option.none()` on detach. (Note: `file-editor.tsx:21-26` omits the `null` check on unmount; handle `null` in the CodeMirror component so unmount cleanly resets `element`, and clear residual DOM before creating `EditorView` as `services/monaco.ts:91-101` does for StrictMode.)
4. Subscribe to reactive config atoms inside the `editor` atom via `get.subscribe(themeAtom, (theme) => view.dispatch({ effects: themeCompartment.reconfigure(theme) }), { immediate: true })`.
5. Expose imperative actions (`focus`, `format`, `getSnapshot`) on the handle returned by `editor` so other atoms can read it with `yield* get.result(editor)` (as `atoms/share.ts:27` does).

**`RegistryProvider` and `ScopedAtom` improvement over the Monaco playground:**
The Monaco playground omits `<RegistryProvider>` (falling back to `@effect/atom-react`'s default global `AtomRegistry`), passes `AtomWorkspaceHandle` through a manual `WorkspaceContext` (`apps/web/src/features/playground/context/workspace.tsx:10-34`), and relies on `useMemo(constVoid, [atom])` (`components/file-editor.tsx:14-15`) to stop `Atom.family`'s `WeakRef` from collecting the handle.

For a reusable CodeMirror editor that may appear multiple times on one page (docs snippets, blog posts, or standalone route):
- Wrap each editor root in `<RegistryProvider defaultIdleTTL={...}>` so each instance owns an isolated `AtomRegistry` (exposed via `RegistryContext`) and disposes cleanly on unmount.
- Use `ScopedAtom.make` from `@effect/atom-react` for the per-instance editor/session handle instead of a global `Atom.family` + manual React context. `ScopedAtom.make` provides `.Provider`, `.Context`, and `.use()` bound to that subtree without global key collisions or `WeakRef` retention tricks.

## 7. SSR and hydration in Astro

Use a client-only React island (`client:only="react"`) with a static Astro fallback slot. Do not use `effect/reactivity/Hydration` or `HydrationBoundary`.

The playground establishes this exact boundary in `apps/web/src/pages/play.astro:22-24`:

```astro
<CodeEditor client:only="react">
  <PlaygroundLoaderShell slot="fallback" />
</CodeEditor>
```

Why Effect Atom `Hydration` is the wrong tool here:
- `effect/reactivity/Hydration` (`dehydrate`, `hydrate`, `HydrationBoundary`) exists to transfer server-evaluated `Atom.serializable` results from SSR into a client `AtomRegistry` without refetching.
- CodeMirror 6 (`EditorView`, DOM measurement, `ResizeObserver`), Web Workers, WebSockets, and `@codemirror/lsp-client` cannot execute on the Astro server and are not serializable.
- Initial files and editor options are static data. Passing them as Astro island props (`<CodeMirrorEditor client:only="react" initialFiles={...} />`) lets Astro serialize them automatically and seed the client `<RegistryProvider>` or `ScopedAtom.Provider` on mount.
- For embedded editors in docs or blog posts where instant first-paint code matters, render a static Shiki-highlighted code block in `slot="fallback"` (Shiki is already in `apps/web/package.json:47`) instead of a spinner, then swap to the live CodeMirror island once mounted.
