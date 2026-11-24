# 03: Format-on-save with dprint

Type: task
Status: resolved
Blocked by:
Spec: ../spec.md

`/play` formats with dprint on Ctrl/Cmd+S. Find its implementation (`setupWorkspaceFormatters` in `features/playground/atoms/workspace.ts`, the `/api/dprint/plugins` route, and the dprint WASM usage) and bring the same behaviour to the Scratchpad.

- [x] Ctrl/Cmd+S in the editor formats the active file (TypeScript, JSON, Markdown, as far as `/play` supports) using the Workspace's `dprint.json`, and prevents the browser's save dialog
- [x] Plugins load lazily on the first format and are cached. Formatting failures (bad config, plugin download failure) show a small non-blocking message and leave the text untouched
- [x] The edit is a single undoable transaction that keeps the cursor near its position
- [x] If dprint code can be shared with `/play` without changing `/play`'s behaviour, move it to a shared module (for example `features/format/`); otherwise import from `/play`
- [x] Unit tests for the format command (with a fake formatter) and one worker e2e: badly formatted code, Ctrl+S, formatted result

## Answer

Ctrl/Cmd+S in any Scratchpad editor tab formats the file with dprint.

- `features/format/dprint.ts` (new, shared): the plugin URL rule (`plugins.dprint.dev` or `/vendor/dprint/plugins`, fetched through `/api/dprint/plugins/:plugin`), `loadDprintPlugin` and its two error classes, moved out of `/play`'s `atoms/workspace.ts`. `/play` imports them and behaves as before: same Cache, same monaco providers, same toasts.
- `features/scratchpad/format.ts` (new):
  - `makeDprintDocumentFormatter` reads `dprint.json` from the Workspace on every format, so config edits apply on the next save. Plugins load on the first format and are cached for the session. A plugin that fails to load is retried on the next save. It configures every plugin (global keys plus its own section) before matching, because dprint plugins panic if asked for file matching first. It picks the plugin by file extension or name and reports config diagnostics. Markdown works if `dprint.json` lists a Markdown plugin. The seed lists TypeScript and JSON, like `/play`.
  - `formatOnSave` is the CodeMirror extension: a high-precedence `Mod-s` keymap that always handles the key, so the browser's save dialog never opens. It applies the result as one change with `userEvent: "format"`, so one undo reverts it. Each cursor is mapped by counting non-whitespace characters, so it stays next to the same code. The result is dropped if the text changed while formatting. Read-only files are left alone. Failures (no `dprint.json`, bad JSON, no `plugins`, download failure, config diagnostics, syntax errors) show a small `role="status"` panel under the editor (`data-testid="format-message"`). It clears on the next edit, the next successful format, or after 6 s.
- `editor.ts`: one formatter per session (reads `dprint.json` through the Workspace service), plus `formatOnSave(formatter, relPath)` in each file's extensions. No other keymap changes.
- Tests: `test/features/scratchpad/format.test.ts` (command with a fake formatter; dprint formatter with fake plugins that panic like real ones before `setConfig`), plus one worker e2e in `scratchpad-worker.spec.ts`: badly formatted code, Ctrl+S, formatted result, one undo. It skips when plugins.dprint.dev is unreachable.
- Added `@codemirror/commands` as a web devDependency (already in the tree through `codemirror`) so the tests can call the real `undo`.
