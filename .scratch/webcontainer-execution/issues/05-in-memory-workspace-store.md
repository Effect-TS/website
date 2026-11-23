# 05: Replace the vfs-backed Workspace with an in-memory store

Type: task
Status: resolved
Spec: ../spec.md

Replace the vfs-backed Workspace (ADR 0002, now superseded) with a plain in-memory store.

- [x] Back `Workspace` with a map of path to content, with incremental size accounting (no full-tree re-read per write), keeping the service interface and `WorkspaceEvent` stream unchanged
- [x] Remove `@effect-vfs/memory`, `@effect-vfs/core`, `makeMemoryFileSystemLayer` and `makeWorkspaceFromFileSystem`
- [x] Allow any UTF-8 text file. Reserve only `node_modules/**` and `dist/**`. Let `tsconfig.json` be a normal Workspace file
- [x] Support protected paths: `package.json` and `pnpm-lock.yaml` are read-only to the editor, and those two plus `tsconfig.json` and `src/main.ts` cannot be deleted or renamed. Add a host-only write path for synced-back files
- [x] CodeMirror language support for `.json`, plain text for other extensions, and read-only editor state for read-only files
- [x] Explorer "new file" accepts any extension, and disables delete and rename on protected files
- [x] Rework `workspace.test.ts` and `editor.test.ts` for the new store

## Answer

- `workspace.ts` is now a plain in-memory store (`makeMemoryWorkspace`, `layerMemoryWorkspace`). It keeps files in a `path → { content, bytes }` map, every folder in a set, and a running byte total, so limit checks no longer re-read the tree. The service interface, the `WorkspaceEvent` stream (per-file `FileRenamed`/`FileDeleted` on folder rename/remove, then `DirectoryChanged`) and the semaphore-serialized mutations are unchanged. Reads don't take the lock: in-memory state is always consistent between mutations.
- `@effect-vfs/core` and `@effect-vfs/memory` are gone from `apps/web/package.json`, `pnpm-workspace.yaml` and the lockfile, along with `makeMemoryFileSystemLayer`, `makeWorkspaceFromFileSystem` and `validateFilePath`. The `effect` catalog is unchanged.
- Paths: any UTF-8 text file. Only top-level `node_modules/` and `dist/` are reserved, in both `normalizeRelativePath` and `workspaceUriToPath`. `tsconfig.json` is a normal file. The `invalid-extension` error code is removed.
- Protected files: `WORKSPACE_READ_ONLY_PATHS` (`package.json`, `pnpm-lock.yaml`) reject `writeFile`/`createFile`, and renaming another file onto them, with the `read-only` code. `WORKSPACE_PROTECTED_PATHS` (those two, `tsconfig.json`, `src/main.ts`) and folders holding them reject `remove`/`rename` with the `protected` code. `writeHostFile` is the host-only write path for Container sync-back. It can write read-only files, emits the usual events and still enforces the limits. `initialFiles` and `restoreSnapshot` are host operations and can also write read-only files.
- Editor: `.ts`/`.tsx` use the TypeScript language and the LSP plugin, `.json` uses `@codemirror/lang-json` (added to the default pnpm catalog), and anything else is plain text. Read-only files get `EditorState.readOnly` and are not written back. `MultiFileLspWorkspace.upsertWorkspaceFile` ignores non-TypeScript paths (`isLspDocumentPath`), so only `.ts`/`.tsx` documents get `didOpen`. Every file still reaches the worker's file system through the `WorkspaceEvent` mirror.
- Explorer: "new file" accepts any name (placeholder `file-name`, also updated in the worker e2e). Rename and delete are disabled, with an explanatory title, on protected files and on folders that hold them.
- Left for ticket 08: `lsp-worker-bridge.ts` still treats `/workspace/tsconfig.json` as a non-Workspace file. A user-created `tsconfig.json` is written over the hidden one in the worker, and a `Reset` without one keeps the hidden one.
