# 05: Zip download, and the autosave-after-reload nit

Type: task
Status: ready-for-agent
Blocked by:
Spec: ../spec.md

**Zip download.** `/play` has `services/download.ts`. Bring it to the Scratchpad through `features/share/`.

- [ ] A download icon button next to Share. The zip holds the same files as a share (including `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `dprint.json`) under a folder named after the Workspace; the file name is the Workspace name
- [ ] Unit test for the zip contents; worker e2e: click, a download with the expected file name, entries listed

**Autosave nit** (from `../../webcontainer-execution/issues/12-share-and-autosave.md`, last note): decoding fills in `language` and `userManaged: false`, so after a reload, returning to the exact seed content saves instead of skipping.

- [ ] Compare content-only (paths and file contents, or the normalized form) when deciding whether the Workspace equals the seed baseline. Unit test for: load seed, reload from autosave, edit back to the seed, no save
