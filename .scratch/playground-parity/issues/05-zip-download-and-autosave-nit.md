# 05: Zip download, and the autosave-after-reload nit

Type: task
Status: resolved
Blocked by:
Spec: ../spec.md

**Zip download.** `/play` has `services/download.ts`. Bring it to the Scratchpad through `features/share/`.

- [x] A download icon button next to Share. The zip holds the same files as a share (including `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `dprint.json`) under a folder named after the Workspace; the file name is the Workspace name
- [x] Unit test for the zip contents; worker e2e: click, a download with the expected file name, entries listed

**Autosave nit** (from `../../webcontainer-execution/issues/12-share-and-autosave.md`, last note): decoding fills in `language` and `userManaged: false`, so after a reload, returning to the exact seed content saves instead of skipping.

- [x] Compare content-only (paths and file contents, or the normalized form) when deciding whether the Workspace equals the seed baseline. Unit test for: load seed, reload from autosave, edit back to the seed, no save

## Answer

The Scratchpad has a download button next to Share. Returning to the seed after a reload no longer autosaves.

- **Zip service moved.** `/play`'s `services/download.ts` is now `features/share/download.ts`. `/play` imports it from there, and its `Zip`/`WorkspaceDownload` behaviour is unchanged. The new `zipWorkspace(workspace)` zips a share-format Workspace's tree under a `<name>/` folder and returns `{ name: "<name>.zip", content }`. `workspaceFolderName` turns the Workspace name into one safe path segment (separators and reserved characters become `-`) and falls back to `workspace`.
- **Scratchpad.** `share.ts`'s `downloadScratchpad(source)` is `zipWorkspace(toShareWorkspace(source))`, so the zip holds exactly the files a Share holds, `package.json`, `pnpm-lock.yaml`, `tsconfig.json` and `dprint.json` included. `share-atoms.ts` adds `downloadAtom`, which snapshots the Workspace, zips it and clicks a hidden `<a download>`. `DownloadButton.tsx` is an icon button with a spinner while zipping and a red state with a tooltip when zipping fails. `EditorTabs.tsx` gains only `<DownloadButton />` after `<ShareButton />`. For the seed, the file is `playground-v4.zip` with entries under `playground-v4/`.
- **Autosave nit.** `saveAutosave` no longer compares share-format Workspaces with `isUnchangedFrom`, which also compares node metadata. It now checks whether the current Workspace holds exactly the baseline's files (same paths and contents, no empty directories). The baselines are the files the Scratchpad opened with and the seed's files. `package.json` is left out of the comparison, as `isUnchangedFrom` does.
- **Tests.**
  - `test/features/scratchpad/download.test.ts` zips a seed Workspace with an edit, a new nested file and a lockfile, reads the zip back, and checks the name and every entry and its contents.
  - `autosave.test.ts` gains the scenario from the ticket: save an edit, load it back through `loadScratchpadWorkspace`, write the seed's `src/main.ts` again, and check that no second write happens. This test failed before the fix.
  - The e2e `scratchpad-share.spec.ts` clicks the download button, checks the suggested file name and reads the entries from the downloaded file.

Note: an imported Workspace with empty directories still saves on its first change event even with no edits, because the opened-with baseline is a flat file map with no directories. This was already the case before, and the write is harmless.
