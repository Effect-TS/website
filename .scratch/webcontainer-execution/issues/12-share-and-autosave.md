# 12: Share and autosave in the Scratchpad

Type: task
Status: resolved
Blocked by: 06, 11
Spec: ../spec.md

Add Share and autosave to the Scratchpad.

- [x] A Share action that compresses the Workspace in the shared format, POSTs to `/api/playground/shorten`, and copies `/scratchpad#<hash>`
- [x] A share made in the Scratchpad opens on `/play`, and the reverse
- [x] Autosave to a Scratchpad-specific localStorage key every couple of seconds, skipping writes when nothing has changed from the seed or the import
- [x] `pnpm-lock.yaml` and `package.json` are included in shares and autosave
- [x] Round-trip unit tests

## Answer

The Scratchpad has a Share button and autosaves to `scratchpad-autosave`. Both write `/play`'s format, so the same hash and the same autosave shape work on either page.

- `scratchpad/share.ts` builds the share-format Workspace from a Workspace snapshot plus `workspaceMetadataAtom` (`fromFlatWorkspace({ files, directories, metadata })`, then `withPrepare("pnpm install").withNoSnapshot`, as `/play` shares). `shareScratchpad` compresses it with `WorkspaceCompression`, POSTs it through `ShortenClient` and returns `{ hash, url: "/scratchpad#<hash>" }`. A compressed text over 128 KB fails with `ShortenError("TooLarge")` before the request; it's the same limit the server checks. `shareErrorMessage` turns that, network errors and anything else into the message shown under the button.
- `scratchpad/autosave.ts`: `runAutosave` debounces the Workspace `events` stream by 2 s, then calls `saveAutosave`. That saves to `SCRATCHPAD_AUTOSAVE_KEY` as `Schema.Option(Workspace)` unless the content is unchanged (`Workspace.isUnchangedFrom`) from the files the Scratchpad opened with or from the seed. A visit that loads the seed under a v3 notice therefore never overwrites a real autosave, and the one-time `/play` autosave read still happens after visits with no edits. A failed write (storage blocked, quota) is logged and the next change tries again. `/play`'s `workspace-autosave` is never written.
- `scratchpad/share-atoms.ts` runs both on the session's runtime, so they see the editor's Workspace. `shareAtom` shares, replaces the page URL hash and copies the link (a refused clipboard write isn't an error; the popover still shows the URL). `autosaveAtom` forks `runAutosave` with `BrowserKeyValueStore.layerLocalStorage`.
- UI: `ShareButton.tsx` sits in the editor tab bar next to the status badge. It shows a spinner while sharing, then a popover with the link and a copy button, or the error. Escape or an outside click closes it.
- Wiring is small: `Scratchpad.tsx` creates the share atoms and mounts an `<Autosave />`, `context.tsx` adds them to the session context, `EditorTabs.tsx` renders the button, and `workspace.ts` exports `comparePaths` so the autosave baseline lists files in the Workspace's order.
- `package.json` and `pnpm-lock.yaml` are ordinary Workspace files and nothing filters them out; the tests check that both travel.
- Tests: `test/features/scratchpad/share.test.ts` covers a Scratchpad Workspace with an edit, a lockfile and a new file: share, then decompress with `/play`'s `WorkspaceCompression.decompress`, which includes `normalizeWorkspace`. The files come back identical, with name, shells, `initialFilePath`, `prepare`, snapshots and per-node `userManaged` preserved. It also covers a `/play`-shaped share loaded by the Scratchpad loader and shared again (stable), the size limit, and the error messages. `autosave.test.ts` runs on a TestClock with a map-backed `KeyValueStore`. It covers the debounce, the lockfile being included, skips for an unchanged seed and an unchanged import, a seed visit keeping an existing autosave, write failures, and the loader reading the autosave back. A fake shortener stands in for the network. The e2e `test/e2e/scratchpad-share.spec.ts`, run by `playwright.scratchpad-worker.config.ts`, covers share then open in a fresh context, the size-limit error, and autosave then reload.

Notes:

- Decoding a share fills in `language` and `userManaged: false` for nodes that lacked them, so the metadata after a reload isn't byte-identical to `SCRATCHPAD_SEED.metadata`. The data is the same. The autosave's seed baseline is built from the seed's own metadata, so after a reload, returning to the exact seed content does save; it doesn't skip.
- `scratchpad-worker.spec.ts`'s "recovers from a document that crashes the language server" fails without this change too: the hover on the 40 000-character line is intercepted by the gutter or the file explorer.
