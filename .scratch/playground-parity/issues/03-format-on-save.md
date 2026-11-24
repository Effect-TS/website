# 03: Format-on-save with dprint

Type: task
Status: ready-for-agent
Blocked by:
Spec: ../spec.md

`/play` formats with dprint on Ctrl/Cmd+S. Find its implementation (`setupWorkspaceFormatters` in `features/playground/atoms/workspace.ts`, the `/api/dprint/plugins` route, and the dprint WASM usage) and bring the same behaviour to the Scratchpad.

- [ ] Ctrl/Cmd+S in the editor formats the active file (TypeScript, JSON, Markdown, as far as `/play` supports) using the Workspace's `dprint.json`, and prevents the browser's save dialog
- [ ] Plugins load lazily on the first format and are cached. Formatting failures (bad config, plugin download failure) show a small non-blocking message and leave the text untouched
- [ ] The edit is a single undoable transaction that keeps the cursor near its position
- [ ] If dprint code can be shared with `/play` without changing `/play`'s behaviour, move it to a shared module (for example `features/format/`); otherwise import from `/play`
- [ ] Unit tests for the format command (with a fake formatter) and one worker e2e: badly formatted code, Ctrl+S, formatted result
