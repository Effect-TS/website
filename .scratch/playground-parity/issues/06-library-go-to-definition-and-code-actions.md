# 06: Go-to-definition into libraries, and quick fixes

Type: task
Status: resolved
Blocked by:
Spec: ../spec.md

**Library go-to-definition.** Jump-to-definition currently returns nothing for `node_modules` targets (see `lsp-workspace.ts`, around the definition handling).

- [x] A worker protocol op (`worker-protocol.ts`, `lsp.worker.ts`, `lsp-worker-client.ts`) that reads a file from the worker's file system (where the collected declarations live)
- [x] Definition/type-definition targets inside `node_modules` open a read-only tab with that file, labelled `node_modules/<pkg>/…`, scrolled to the target. It's not in the explorer, isn't saved or shared, and closes like a normal tab. Go-to-definition from inside it works as well (it's a document the language server knows about)
- [x] Unit tests with the fake transport; worker e2e: Cmd/Ctrl-click `Effect` in `import { Effect } from "effect"`, a read-only `node_modules/effect/…d.ts` tab opens

**Quick fixes and refactors.** The tsrs wasm supports `textDocument/codeAction` and `codeAction/resolve`. `@codemirror/lsp-client` 6.3.1 has no UI for them, so use `client.request` directly.

- [x] Diagnostics with fixes show them as buttons in the lint tooltip (CodeMirror `Diagnostic.actions`), requesting code actions for the diagnostic's range lazily or when diagnostics arrive, whichever fits better
- [x] Ctrl/Cmd+. opens a small menu (an autocomplete-style list or a tooltip) with the code actions at the cursor, including Effect refactors. Picking one applies its `WorkspaceEdit` (resolve first if needed). Edits to other files go through the Workspace store
- [x] Unit tests for applying `WorkspaceEdit`s; worker e2e: a diagnostic with a fix (pick a reliable one, for example a missing import or an Effect diagnostic quick fix), apply it, the error goes away

## Answer

Implemented in `apps/web/src/features/scratchpad/`.

**Library go-to-definition**

- **Worker op**: `ReadFile { id, path }` (page to worker, path relative to the Workspace root) is answered by `FileRead { id, content: string | null }`. `LspWorkerBridge.readFile` reads the worker's file system and returns content held back for an open document first. It refuses paths with `.` or `..` segments, directories and missing files. `LspWorkspaceMirror.readFile(path): Effect<Option<string>>` matches answers by id. It returns `None` when no worker is running, and pending reads also get `None` when their worker closes or crashes.
- **`library-files.ts`** (new): `isLibraryPath`, `isLibraryDocumentPath` (`.d.ts`, `.d.mts`, `.d.cts`, ...), `libraryUriToPath` (`workspaceUriToPath` rejects `node_modules`, so library URIs need their own mapping), and `libraryTabLabel` (`node_modules/<pkg>/…/<file>`, including scoped packages).
- **`MultiFileLspWorkspace.displayFile`** sends `node_modules` URIs to `onDisplayFile` with their library path. `jumpToDefinition` then sets the selection and scrolls in the returned view, the same way it does for Workspace files.
- **`editor.ts`** (hook-ins only): `mountFileInView` reads a library file through the mirror before it adds the tab, so a file the worker lacks opens no tab. The state is read-only, and library documents get the LSP plugin, so the client sends `didOpen` and go-to-definition, hover and code actions work inside the file. Closing a library tab drops its state and sends `didClose`, and reopening reads the file again. Library documents never block a Run (the Run gate skips them) and never get diagnostic badges. The file is not in the Workspace, so it is not in the explorer, autosave or shares. `EditorTabs` shows the label, the full path as `title`, and `data-library`.

**Quick fixes and refactors** (`code-actions.ts`, new)

- `diagnosticsWithCodeActions()` is an `LSPClientExtension` placed before `languageServerExtensions()`. It handles `publishDiagnostics` the way `serverDiagnostics` does (`serverDiagnostics` stays for its auto-sync). It renders the diagnostics at once, then sends one `textDocument/codeAction` request for the whole document with all the diagnostics and `only: ["quickfix"]`. When the document version is unchanged and no newer push has arrived, it renders again with the fixes as CodeMirror lint `actions`, matched to diagnostics through each action's `diagnostics`, preferred fixes first. A probe against the real wasm showed tsrs returns fixes for every diagnostic in the context, each tagged with its diagnostic (about 27 ms for two diagnostics), so a single request per push is enough. It also declares `codeAction` client capabilities (literal kinds, `isPreferred`, `disabled`, `data`, `resolveSupport` for `edit`).
- **Ctrl/Cmd+.** (`Mod-.`) asks for every action at the selection (`triggerKind` Invoked, with the pushed diagnostics overlapping the selection as context) and shows a tooltip `listbox` named "Code actions". Quick fixes come first, then refactors. ArrowUp/ArrowDown, Enter and Escape work, and so does clicking. An edit or a selection change closes the menu. With no actions it says so.
- **Applying an action** (`runCodeAction`): the client syncs first. If the document changed since the action was offered, the actions are requested again for the diagnostic's current range and the one with the same title and kind is used. An action with no `edit` but with `data` is resolved with `codeAction/resolve` when the server advertises `resolveProvider`. Then `applyWorkspaceEdit` runs, and the action's command, if any, goes to `workspace/executeCommand`.
- **`applyWorkspaceEdit(client, edit, mapping?)`** collects text edits from `documentChanges`, which takes precedence over `changes` as the protocol requires, and skips resource operations. Each document goes through `client.workspace.updateFile`, with positions mapped through a `WorkspaceMapping`, like the client's own rename. It returns `{ applied, skipped }`, and URIs the workspace does not know (library files, for example) are skipped. The mounted editor gets a transaction. Other files go to `onServerUpdateFile`, which now also handles files never opened in a tab: it reads them from the Workspace store, applies the edit, writes them back and sends `didChange`. F2 rename benefits from this too.
- `@codemirror/lint` (^6.9.8, the version `@codemirror/lsp-client` already resolves) is now a direct dependency of `apps/web`, for `setDiagnostics` and the `Diagnostic` and `Action` types. The lockfile change is 3 lines.

**Verification**

- Unit tests: `lsp-worker-bridge.test.ts` (readFile: declarations and Workspace files, held-back content of an open document, missing files, directories and escaping paths), `worker-transport.test.ts` (id correlation, `None` for a missing file, no worker, or a worker that crashes mid-read), `editor.test.ts` (go-to-definition opens a read-only typescript library tab read through the mirror, not in the Workspace or tree, closes and reopens; a missing library file opens no tab; WorkspaceEdits to unmounted files, both never opened and cached, reach the Workspace store, `didChange` and the tab content later; `documentChanges` precedence and skipped URIs), and `library-files.test.ts` (labels and document extensions). The other mirror fakes gained `readFile`.
- E2E, in `scratchpad-worker.spec.ts`. These are language server features, and that spec already waits for the Container's installed types:
  - Cmd/Ctrl-click `Effect` in `import { Effect } from "effect"` opens a selected, read-only `node_modules/effect/…/Effect.d.ts` tab with the cursor line in view and nothing in the explorer. Cmd/Ctrl-clicking `Cause` inside it opens `Cause.d.ts`, and both tabs close.
  - Hovering the floating Effect shows the "Disable floatingEffect for this line" button. Clicking it inserts the directive and the error goes away.
  - Ctrl/Cmd+. on `Effect.succeed` lists that quick fix and "Wrap with Effect.gen". Picking the refactor applies it, and Escape closes the menu.
- `vp lint` is clean, `astro check` reports 0 errors, `vp test run apps/web/test/features packages/tsrs-lsp-wasm` passes 578 tests (2 skipped are the build-artifacts placeholders), the worker Playwright config passes 13/13 and the container config 6/6.

**Not done / notes**

- A command-only code action is sent to `workspace/executeCommand`. If the server answers with a `workspace/applyEdit` request, `@codemirror/lsp-client` 6.3.1 replies MethodNotFound. tsrs's quick fixes and Effect refactors all carry inline edits, so none of them hits this today.
- ADR 0003 still says the code actions are out of reach. Its consequence can be updated to point here.
