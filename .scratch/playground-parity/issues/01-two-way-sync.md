# 01: Two-way Container sync

Type: task
Status: ready-for-agent
Blocked by:
Spec: ../spec.md

Implement ADR 0005's two-way sync (`docs/adr/0005-two-way-sync-and-one-terminal.md`). Read `/play`'s version for reference: `features/playground/services/webcontainer.ts` (`watchWorkspace`, `reconcileWorkspace`, `restoreProtectedNodes`) and `services/file-sync.ts`. Don't copy its generation bookkeeping unless you need it; the Scratchpad writes immediately, so the dirty window is short.

- [ ] Watch the Container's Workspace directory recursively. Debounce about 100 ms, then rescan and diff against the Workspace. Ignore `node_modules`, `dist`, `.git`, `.tsc-run.json`, files over 1 MB and non-UTF-8 files
- [ ] Apply created, changed and deleted files to the Workspace store, tagged as coming from the Container so `mirrorWorkspace` doesn't write them back
- [ ] Conflict rule: a file is dirty from the page's last change until the Container has written that exact content. Container changes to a dirty file are dropped
- [ ] Open editors update in place (cursor preserved where possible), and the tsrs worker gets the change. New files appear in the explorer; tabs for deleted files close
- [ ] Protected files (`package.json`, `tsconfig.json`) deleted in the Container are restored
- [ ] A Container-side `package.json` change (for example `pnpm add` from a terminal) doesn't trigger a page reinstall. Once the Container's pnpm process has exited, or after a short quiet period, sync the lockfile back and reload types (`dependencies.ts`)
- [ ] Synced files show up in shares and autosave
- [ ] Unit tests against the fake Container (extend `test/features/scratchpad/fake-container.ts` with a way to simulate Container-side writes and watch events). Extend the real-Container e2e (`scratchpad-container.spec.ts`): write a file through the backend's spawn (`echo … > src/extra.ts`) and assert it appears in the explorer; `pnpm add` through the DEV test hook updates types and `package.json` in the editor
- [ ] Update `GLOSSARY.md` if a term changes (for example the "mirror")
