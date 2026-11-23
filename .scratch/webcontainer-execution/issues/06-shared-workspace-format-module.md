# 06: Extract the shared Workspace format module

Type: task
Status: resolved
Spec: ../spec.md

Move the share format out of `features/playground` into one module that both `/play` and `/scratchpad` use.

- [x] Move the `Workspace` schema (`File`, `Directory`, `WorkspaceShell`, `userManaged`, `prepare`, `shells`, `snapshots`), `normalizeWorkspace`, effect-version detection, `WorkspaceCompression`, and the shortener client
- [x] Add a converter between the format's tree and the Scratchpad Workspace's flat file map, preserving `userManaged`, `prepare`, `shells` and `snapshots` on round trip
- [x] Add the `@effect/language-service` plugin injection into `tsconfig.json` as a normalization step
- [x] Switch the Playground to the shared module with no behaviour change, keeping `import.test.ts` green

## Answer

The share format now lives in `apps/web/src/features/share/`, named after the glossary's **Share**. `/play` imports it directly; there's no re-export left in the Playground.

- `share/workspace.ts`: the old `playground/domain/workspace.ts`, moved as-is. It holds the `Workspace` schema (`File`, `Directory`, `WorkspaceShell`, `userManaged`, `prepare`, `shells`, `snapshots`), effect-version detection, the v3/v4 templates and `normalizeWorkspace`. The templates came along because `normalizeWorkspace` uses them to fill in missing configs and migrate dist-tags. `WorkspaceTerminal`, a Playground UI type, moved to `playground/domain/terminal.ts`.
- `share/compression.ts`: `Compression` and `WorkspaceCompression`, unchanged. `decompress` still applies `normalizeWorkspace` only.
- `share/shorten/{api,client,domain}.ts`: the shortener HTTP API, its client and `ShortenError`. The server handler, the KV-backed `Shorten` service and `kvs.ts` stay in `playground/services/`.
- `share/flat.ts`: `toFlatWorkspace` / `fromFlatWorkspace` convert between the tree and `{ files: Record<path, content>, directories, metadata }`. `directories` lists only empty directories. `metadata` keeps `name`, `initialFilePath`, `prepare`, `shells`, `snapshots`, plus each node's `userManaged`, `language` and `solution`, in tree order. A round trip with no edits is structurally equal to the input. New files are added after the known nodes, with the language `/play` infers from the path (`languageFromPath`, moved here from `webcontainer.ts`). Without metadata, for example the Scratchpad seed, the name and shells come from the matching `/play` template, `prepare` is `pnpm install`, and the entry is `src/main.ts`.
- `share/tsconfig.ts`: `patchScratchpadTsConfig(content)` adds `{ name: "@effect/language-service" }` to `compilerOptions.plugins` (other plugins and an existing entry's options are kept) and sets `verbatimModuleSyntax: true`. It is idempotent and returns `undefined` when nothing changes. It accepts JSONC (comments and trailing commas), but comments are dropped when a rewrite is needed. Invalid JSON and non-objects are left alone, matching `normalizeWorkspace`'s handling of mid-edit autosaves. `normalizeScratchpadWorkspace(workspace)` runs `normalizeWorkspace` and then patches the root `tsconfig.json`. That is the Scratchpad's load step. The Playground's load path doesn't call it, and a test pins that.

The existing `tsconfig.json` files in the format are `JSON.stringify` output, and `normalizeWorkspace`'s `patchTsConfig` parses strict JSON and skips anything else. JSONC support is new and only applies to the Scratchpad patch.

Tests: `test/features/share/{flat,tsconfig}.test.ts` are new. `workspace.test.ts` and `migration.test.ts` moved to `test/features/share/`. `test/features/playground/import.test.ts` only had its import paths updated and passes.
