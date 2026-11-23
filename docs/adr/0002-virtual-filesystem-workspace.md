---
status: superseded by ADR-0004
---

# Virtual `FileSystem` (`@effect-vfs/memory`) for multi-file Workspaces

Multi-file Workspaces in the Scratchpad (and later the Playground) are backed by Effect's standard `FileSystem.FileSystem` service via `@effect-vfs/memory`, with UI state like open tabs, active file, and per-file CodeMirror `EditorState` held in a separate Effect Atom layer on top. Isolating file storage behind `FileSystem.FileSystem` gives us in-memory watches, byte quotas, and portable snapshots out of the box, and lets `/play` swap in a WebContainer-backed `FileSystem` layer later without rewriting the file explorer, editor, or LSP sync.

## Considered options

- **Reuse Playground's `Workspace` (`apps/web/src/features/playground/domain/workspace.ts`).** Rejected: Playground's `Workspace` is a static template schema (`initialContent` plus WebContainer-specific `prepare`, `shells`, and `snapshots` fields) rather than a live reactive file store. Live edits in `/play` live in WebContainer FS, Monaco models, and `FileSync`, so reusing it would still require building a live file store and change stream.
- **Custom in-repo in-memory `FileSystem`.** Avoids a third-party `0.x` dependency and the `effect` `4.1.2` to `4.1.5` catalog bump, but requires writing and maintaining our own path normalization, recursive watches, quotas, and snapshot encoding.

## Consequences

- **Catalog bump:** Adopting `@effect-vfs/memory` (`0.12.x`) requires bumping the `effect` catalog in `pnpm-workspace.yaml` from `4.1.2` to `4.1.5`.
- **Containment of `0.x` risk:** Application code depends on Effect's `FileSystem.FileSystem` service and a thin workspace interface, not `@effect-vfs/memory` directly. If `@effect-vfs` lags behind a future `effect` upgrade, swapping the backing layer is a single-file change.
- **Separation of concerns:** Protected-file rules, project metadata (`prepare`, `shells`), open tabs, and editor state stay outside the filesystem layer so the same `FileSystem` contract works for both Scratchpad and Playground.
