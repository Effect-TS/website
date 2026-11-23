# 11: Seed template and legacy workspace loading

Type: task
Status: resolved
Blocked by: 05, 06
Spec: ../spec.md

Seed new Scratchpads from the Playground v4 template and load legacy Playground workspaces.

- [x] Seed from the Playground v4 template plus the plugin entry and `verbatimModuleSyntax: true`, with `src/DevTools.ts` importing `@effect/platform-node/NodeSocket` and `@types/node` pinned to `^24`, replacing `src/main.ts` + `src/greeter.ts`
- [x] Load order: `#hash`, then `?code=` (a single `main.ts` swapped into the seed), then the Scratchpad autosave, then a one-time read of `/play`'s `workspace-autosave`, then the seed
- [x] Normalize with the shared module, injecting the plugin entry and `verbatimModuleSyntax: true`
- [x] A v3 workspace or one over the limits shows a notice with an "Open in Playground" link to the same source instead of loading
- [x] Unit tests with fixtures of real legacy shares (v4, v3, `?code=`, over-limit)

## Answer

New Scratchpads open the Playground v4 template, and `/scratchpad` loads legacy Playground workspaces through one loader.

- `scratchpad/seed.ts` derives the seed from `makeDefaultWorkspace("v4")` without touching the Playground's template. `tsconfig.json` goes through `patchScratchpadTsConfig`, `src/DevTools.ts` imports `* as NodeSocket from "@effect/platform-node/NodeSocket"` (the package exports `./*`, and `layerNet` lives there in 4.1.5), and `@types/node` is `^24`. Everything else keeps the template's ranges (`latest`, `typescript` `6.0.2`). `SCRATCHPAD_SEED` is the seed as a `FlatWorkspace`, metadata included, so sharing an unchanged seed writes the template's name and shells. The seed type-checks against effect 4.1.5 with only a language-service suggestion on the template's `main.ts`. `src/greeter.ts` and the old `DEFAULT_SCRATCHPAD_*` constants are gone; tests that need a cross-file import use `test/features/scratchpad/fixtures.ts`.
- `scratchpad/load.ts` exports `loadScratchpadWorkspace(location)`, an Effect needing `ShortenClient`, `WorkspaceCompression` and `KeyValueStore`. It returns `{ source, files, metadata, initialFilePath, notice }`. The order is `#hash`, `?code=`, `scratchpad-autosave` (`SCRATCHPAD_AUTOSAVE_KEY`, read only here), `/play`'s `workspace-autosave`, then the seed. Both autosaves use `/play`'s format: `Option<Workspace>` JSON. A source that fails (a corrupt or unknown hash, an undecodable `?code`, a bad autosave) is logged and skipped.
- Loaded workspaces go through `normalizeScratchpadWorkspace`, then `toFlatWorkspace`. Their metadata reaches the Scratchpad as `workspaceMetadataAtom` on the session context, for `fromFlatWorkspace` when sharing.
- `?code=` follows `/play`: a link without `version` is v3, so only `version=v4` loads (the param values are `v3`/`v4`, the `DocsVersion` literals). A v4 link swaps `src/main.ts` into the seed and keeps the seed's metadata.
- v3 workspaces, and ones the in-memory Workspace rejects, aren't loaded. The check builds a throwaway `makeMemoryWorkspace`, so it covers the limits (50 files, 256 KiB per file, 1 MiB total) and also invalid or reserved paths. The seed loads instead, with a dismissible amber bar (`LoadNoticeBar`) and an "Open in Playground" link: `/play#<hash>` for a Share, `/play?<same query>` for `?code=`, and `/play` for an autosave. A rejected source ends the search; the loader doesn't fall through to an autosave behind it.
- `initialFilePath` opens first when the file exists; otherwise `src/main.ts`, then the first file.
- Wiring: `ScratchpadPage.tsx` runs the loader once per page load through an atom and then mounts `Scratchpad` with the result. `scratchpad.astro` renders `ScratchpadPage`. `Scratchpad.tsx` takes optional `metadata` and `notice` props and defaults to the seed. `editor.ts` only swapped one import.
- Tests: `test/features/scratchpad/{load,seed}.test.ts`. The fixtures are share JSON in the shapes `/play` wrote (a v4 beta share with exact pins and an extensionless import, a pre-toggle v3 share with `npm install` and CommonJS, and over-limit shares by file count and by file size), compressed with the real `Compression`, with a fake shortener and an in-memory `KeyValueStore`. The e2e spec loads its two-file greeter workspace through `scratchpad-autosave`, and adds checks for the seed and the v3 `?code=` notice.

Notes for ticket 12:

- Write the autosave to `SCRATCHPAD_AUTOSAVE_KEY` with `Schema.Option(Workspace)`, the format the loader reads. Rebuild the tree with `fromFlatWorkspace({ files, directories, metadata })` from `workspaceMetadataAtom`.
- Don't autosave an unchanged seed (as `/play` skips unchanged defaults). Otherwise a v3 link's notice-plus-seed would overwrite a real autosave, and the one-time `/play` autosave read would stop happening after a visit with no edits.
- Until the Scratchpad writes its own autosave, a v3 `/play` autosave shows the notice on every visit.
- Empty directories in a loaded workspace aren't created in the Workspace, because `initialFiles` only holds files. `metadata.nodes` still lists them, but `fromFlatWorkspace` only restores them if they appear in `directories`.
