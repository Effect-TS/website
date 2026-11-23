# WebContainer execution in the Scratchpad

Status: ready-for-agent

## Problem Statement

The **Scratchpad** (`/scratchpad`) edits multi-file Effect TypeScript with in-browser tsrs language intelligence, but it cannot run code, share, or save. The **Playground** (`/play`) can run code, but it waits on WebContainer boot and `pnpm install` before anything is editable. It also keeps Monaco and the container file system in step with two-way sync workarounds, and it type-checks twice: once in Monaco and once with `tsc --watch` in the container. The Scratchpad is meant to replace the Playground, so it needs execution, sharing and autosave, and it should do them better than the Playground does.

## Solution

The Scratchpad boots a **Container** (a WebContainer) on page load. The in-page **Workspace** stays the source of truth, and the Container mirrors it one way. The Container installs dependencies with pnpm. The host copies the installed `node_modules` declarations into the tsrs worker, so the editor type-checks against the same packages the program runs with, and no declarations pack is bundled. The page decides when to **Run**: once edits settle and tsrs reports no errors, the page restarts `src/main.ts` in the Container with Node's built-in type stripping, and the output streams into a read-only terminal panel. **Shares** and autosave use the Playground's format, so either page can open a hash and legacy Playground workspaces load in the Scratchpad.

Decisions are recorded in `docs/adr/0004-webcontainer-execution-in-the-scratchpad.md`, which supersedes ADR 0002 and amends ADR 0003. Terms are in `GLOSSARY.md`.

## Cutover bar

The Scratchpad replaces `/play` once it has all of the following. This spec delivers 1 to 3 and lays the groundwork for the rest.

1. Runs with output
2. Loading legacy Playground workspaces
3. Share and autosave
4. Interactive terminal, which is also how visitors add dependencies (`pnpm add`)
5. Trace viewer
6. Format-on-save (dprint)
7. Effect v3 support
8. Zip download

## User Stories

1. As a visitor opening `/scratchpad`, I want to edit with full language intelligence while the Container boots and installs, so that I never wait on execution to start writing code.
2. As a visitor, I want the status badge to show booting, installing, loading types and running, so that I know why diagnostics or output are pending.
3. As a visitor, I want no diagnostics until installed types have loaded, so that I don't see a flash of "cannot find module `effect`" errors.
4. As a visitor, I want my program to run automatically about 500 ms after I stop typing, so that I see output without pressing a button.
5. As a visitor with a type error, I want the output panel to say that the Run was skipped and why, so that a stale or missing output never confuses me.
6. As a visitor, I want each Run to clear the panel and start with a header, and I want Stop and Restart controls, so that long-running programs and servers stay under my control.
7. As a visitor, I want `tsconfig.json` to be a real file that both the editor and the runtime obey, so that the editor and the runtime never disagree.
8. As a visitor, I want to see `package.json` and `pnpm-lock.yaml` read-only, so that I know exactly which versions are installed.
9. As a visitor whose browser can't run WebContainer, or whose boot or install fails, I want a clear non-blocking message with Retry and help, while editing, sharing and autosave keep working.
10. As a visitor, I want to share my Workspace as `/scratchpad#<hash>`, and I want the same hash to open on `/play`.
11. As a visitor with an old `/play#<hash>`, `?code=` link or `/play` autosave, I want it to load in the Scratchpad, or I want a notice with an "Open in Playground" link if it's v3 or over the Workspace limits.
12. As a visitor, I want my work autosaved and restored on my next visit.
13. As a maintainer, I want the share format in one module used by both pages, so that it cannot drift during coexistence.
14. As a maintainer, I want a single LSP transport (the worker), so that there's no server-side type checker that disagrees with the Container.

## Implementation Decisions

### Workspace

- Back the `Workspace` service with a plain in-memory map of path to content, with incremental size accounting. Remove `@effect-vfs/memory`, `@effect-vfs/core`, and the `FileSystem.FileSystem` dependency. Keep the `Workspace` service interface and the `WorkspaceEvent` stream.
- Accept any UTF-8 text file. CodeMirror gets language support for `.ts`, `.tsx` and `.json`, and other files open as plain text. "New file" accepts any extension. `node_modules/**` and `dist/**` stay reserved.
- Keep the limits: 50 files, 256 KiB per file, 1 MiB total.
- Protected files: `package.json` and `pnpm-lock.yaml` are read-only in the editor. Those two, `tsconfig.json` and `src/main.ts` cannot be deleted or renamed, and the explorer disables those actions instead of restoring the files afterwards.
- Seed: the Playground v4 template (`src/main.ts`, `src/DevTools.ts`, `package.json` with `latest` dist-tags, `tsconfig.json`, `dprint.json`), plus the `@effect/language-service` plugin entry in `tsconfig.json`.

### Container

- One `Container` Effect service per page, booted on page load, with typed errors. WebContainer allows one instance per page.
- `/scratchpad` sends COOP `same-origin` and COEP `require-corp`. `credentialless` is not used because Safari lacks it.
- Mirror the Workspace one way, page to Container, from the same event stream that feeds the tsrs worker: initial mount, then write, remove and rename.
- Run `pnpm install -E` after mount and whenever `package.json` changes. After each install, write the Container's `package.json` and `pnpm-lock.yaml` back into the Workspace. These are the only Workspace files that flow back from the Container.
- After each install, copy `package.json` and `*.d.ts` files from `node_modules` into the tsrs worker's `/workspace/node_modules` through a bulk file-system op (the copy mechanism is chosen in ticket 02). Remove the `effect-types.pack.gz` pipeline from the Scratchpad. Don't use a recursive `fs.watch` on the Container root.
- `tsconfig.json` is a Workspace file mirrored to both tsrs and the Container. It replaces the hidden `WORKSPACE_TSCONFIG` for the Scratchpad.
- Start the `/dev-tools-proxy` at boot and drop its output until the trace viewer lands.
- Don't cache `node_modules` snapshots. `export()` omits lazily loaded large files and `mount()` drops executable bits.

### Runs

- The page triggers Runs. The first Run starts when types are first ready, and later Runs start about 500 ms after Workspace edits settle.
- Any tsrs error anywhere in the Workspace blocks a Run. Warnings and suggestions don't block it. A skipped Run prints why in the panel.
- The runner is `node src/main.ts` with Node 24 type stripping and a resolve hook that maps `./x.js` to `./x.ts`, plus `--experimental-transform-types` if needed. This is subject to ticket 01, with `tsc` emit then `node` as the fallback.
- A new Run kills the previous process. There's no time limit. Stop and Restart sit in the panel.
- The entry file is fixed at `src/main.ts`. The legacy `prepare`, `shells` and `snapshots` fields are ignored.

### UI

- Layout: explorer, editor, and a resizable, collapsible bottom panel with tabs. "Output" comes now, and "Terminal" and "Traces" come later.
- Output is a read-only xterm, so ANSI colors render. Each Run clears it and writes a header showing the time and trigger.
- The status badge covers both the LSP and the Container phases.
- Failures (unsupported browser, boot failure, install failure, types never arriving) show a non-blocking overlay in the output panel with a plain-language explanation, Retry, and browser-support help. If types never arrive, diagnostics unhide after a timeout with a "dependencies unavailable" status. The visual design is confirmed in ticket 03.

### Share, autosave and legacy

- Extract the Playground's `Workspace` schema, `normalizeWorkspace`, compression and shortener client into one module used by both pages.
- Shares use `/api/playground/shorten`, served at `/scratchpad#<hash>`. The same hash opens on either page. `prepare`, `shells`, `snapshots` and `userManaged` are written for compatibility.
- Autosave uses the same format under a separate localStorage key. If the Scratchpad has no autosave yet, it reads `/play`'s `workspace-autosave` once. At cutover it switches to the original key.
- Load order: `#hash`, then `?code=`, then the Scratchpad autosave, then the one-time `/play` autosave, then the seed.
- Normalize legacy workspaces with `normalizeWorkspace` and inject the plugin entry. A v3 workspace (detected from the `effect` range) or one over the limits shows a notice with an "Open in Playground" link instead of loading.

### LSP transport

- The worker is the only transport. Delete `packages/lsp-bridge`, the `/api/lsp` gateway (`lsp-gateway.ts`), `dev-lsp-proxy-plugin.ts`, the WebSocket transport layer, the Cloudflare container config in `alchemy.run.ts`, `PUBLIC_LSP_TRANSPORT`/`PUBLIC_LSP_WS_URL`, and their tests and e2e spec.

## Testing Decisions

- Unit and integration tests use a fake `Container` service. They cover the one-way mirror, sync-back of `package.json` and the lockfile, the types copy to the worker, diagnostics gating, Run gating, debounce and replacement, failure states, legacy normalization, the v3 and over-limit notices, share and autosave round-trips, and protected files.
- A Chromium Playwright suite runs against a real Container. It covers boot, install, types arriving with no diagnostics, a Run producing output, a type error blocking a Run, and `pnpm add <pkg>` through the host spawn API syncing `package.json` back and resolving the import with no diagnostics. It runs in CI as a separate, non-blocking job until its flakiness is known.

## Out of Scope

- Interactive terminal and adding dependencies from the UI
- Trace viewer UI (only the proxy runs)
- dprint format-on-save (`dprint.json` round-trips as a file)
- Effect v3
- Zip download
- Replacing `/play` (cutover)
- `node_modules` snapshot caching
