# 05: Replace the vfs-backed Workspace with an in-memory store

Type: task
Status: ready-for-agent
Spec: ../spec.md

Replace the vfs-backed Workspace (ADR 0002, now superseded) with a plain in-memory store.

- [ ] Back `Workspace` with a map of path to content, with incremental size accounting (no full-tree re-read per write), keeping the service interface and `WorkspaceEvent` stream unchanged
- [ ] Remove `@effect-vfs/memory`, `@effect-vfs/core`, `makeMemoryFileSystemLayer` and `makeWorkspaceFromFileSystem`
- [ ] Allow any UTF-8 text file. Reserve only `node_modules/**` and `dist/**`. Let `tsconfig.json` be a normal Workspace file
- [ ] Support protected paths: `package.json` and `pnpm-lock.yaml` are read-only to the editor, and those two plus `tsconfig.json` and `src/main.ts` cannot be deleted or renamed. Add a host-only write path for synced-back files
- [ ] CodeMirror language support for `.json`, plain text for other extensions, and read-only editor state for read-only files
- [ ] Explorer "new file" accepts any extension, and disables delete and rename on protected files
- [ ] Rework `workspace.test.ts` and `editor.test.ts` for the new store
