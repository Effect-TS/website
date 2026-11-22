# Investigate type definition delivery for effect and other packages

Type: research
Status: resolved

## Question

How will the CodeMirror LSP editor obtain `.d.ts` type definitions for `effect` (4.1.x) and other packages used in website examples?

Investigate and document:
1. How the existing Monaco playground (`apps/web/src/features/playground`) currently loads `effect` and TypeScript lib `.d.ts` files, and what its bundle/network cost is.
2. For the browser Web Worker route (vtsls or `@typescript/vfs`): how `.d.ts` files are packaged, fetched, cached, and mounted into the virtual file system, including measured payload size for `effect@4.1.2` + `lib.*.d.ts` and startup impact.
3. For the server route: how a workspace `node_modules` is provisioned and shared across sessions (read-only template directory vs per-session copy).
4. How multi-package examples (e.g. `@effect/platform-*`, `@effect/sql-*`, `@effect/atom-react`) would be supported on each route.

## Answer

- **Existing Monaco playground:** Embeds TypeScript 5.6 and `lib.*.d.ts` inside `@effect/monaco-editor`'s `ts.worker.js` (~6 to 7.8 MB minified, ~0.9 to 1.5 MB gzipped) and gets `effect` types by booting WebContainer (requiring COOP/COEP headers), running live `pnpm install` against npm, and walking `/node_modules/.pnpm` to register every `package.json` and `*.d.ts` via `addExtraLib`.
- **Browser Web Worker route:** Generate content-hashed static type packs at build time from `pnpm-workspace.yaml` (one core pack for the needed `lib.*.d.ts` closure plus `effect@4.1.2`, plus small on-demand add-on packs for `@effect/platform-*`, `@effect/sql-*`, `@effect/atom-react`, and `@types/*`). Cache them in the Cache API or IndexedDB (not `localStorage`), mount them into the worker's VFS `Map`, and optionally fall back to `@typescript/ata` only for non-curated imports. Exact local byte counts for `effect@4.1.2` + `typescript@6.0.3` still need to be run once `node_modules` is installed in this worktree.
- **Server route:** Pre-install curated packages into a single hoisted, read-only parent `node_modules` directory per Effect major version and place per-session scratch folders underneath it so upward resolution finds them without per-session copies or symlinks (avoiding `tsgo --lsp` symlink caching and watcher bugs). Set explicit `"types"` in each session's `tsconfig.json` so unused `@types/*` packages stay unloaded.

Full report: [05-type-definitions-delivery.md](../research/05-type-definitions-delivery.md).
