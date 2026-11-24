# 06: Go-to-definition into libraries, and quick fixes

Type: task
Status: ready-for-agent
Blocked by:
Spec: ../spec.md

**Library go-to-definition.** Jump-to-definition currently returns nothing for `node_modules` targets (see `lsp-workspace.ts`, around the definition handling).

- [ ] A worker protocol op (`worker-protocol.ts`, `lsp.worker.ts`, `lsp-worker-client.ts`) that reads a file from the worker's file system (where the collected declarations live)
- [ ] Definition/type-definition targets inside `node_modules` open a read-only tab with that file, labelled `node_modules/<pkg>/…`, scrolled to the target. It's not in the explorer, isn't saved or shared, and closes like a normal tab. Go-to-definition from inside it works as well (it's a document the language server knows about)
- [ ] Unit tests with the fake transport; worker e2e: Cmd/Ctrl-click `Effect` in `import { Effect } from "effect"`, a read-only `node_modules/effect/…d.ts` tab opens

**Quick fixes and refactors.** The tsrs wasm supports `textDocument/codeAction` and `codeAction/resolve`. `@codemirror/lsp-client` 6.3.1 has no UI for them, so use `client.request` directly.

- [ ] Diagnostics with fixes show them as buttons in the lint tooltip (CodeMirror `Diagnostic.actions`), requesting code actions for the diagnostic's range lazily or when diagnostics arrive, whichever fits better
- [ ] Ctrl/Cmd+. opens a small menu (an autocomplete-style list or a tooltip) with the code actions at the cursor, including Effect refactors. Picking one applies its `WorkspaceEdit` (resolve first if needed). Edits to other files go through the Workspace store
- [ ] Unit tests for applying `WorkspaceEdit`s; worker e2e: a diagnostic with a fix (pick a reliable one, for example a missing import or an Effect diagnostic quick fix), apply it, the error goes away
