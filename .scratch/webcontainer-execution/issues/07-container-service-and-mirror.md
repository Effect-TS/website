# 07: Container service: boot, isolation, and one-way Workspace mirror

Type: task
Status: resolved
Blocked by: 05
Spec: ../spec.md

Add the Scratchpad's `Container` Effect service.

- [x] `/scratchpad` sends COOP `same-origin` and COEP `require-corp` (non-prerendered like `/play`, or via `_headers`), and every tsrs asset still loads
- [x] A `Container` service that boots WebContainer on page load, holds one instance per page, and fails with typed errors: unsupported browser, boot failed
- [x] Mount the Workspace, then mirror `WorkspaceEvent`s one way (write, remove, rename) from the same stream that feeds the tsrs worker
- [x] A host spawn API (`jsh`, PATH including `node_modules/.bin`) used by install, Runs and tests
- [x] Start `/dev-tools-proxy` at boot and drop its output
- [x] Container phases exposed as an atom for the status badge
- [x] A fake `Container` layer for unit tests, plus mirror tests against it

## Answer

Implemented in `apps/web/src/features/scratchpad/`:

- **`container.ts`**: the `Container` service, its errors (`ContainerUnsupported`, `ContainerBootFailed`, `ContainerOperationFailed`), `ContainerPhase` (`booting | ready | failed`), `makeContainer(boot)`, the one-way `mirrorWorkspace`, and the fake (`makeFakeContainerBackend`, `layerFakeContainer`).
- **`container-webcontainer.ts`**: the real backend (`layerWebContainer`). It checks `crossOriginIsolated`/`SharedArrayBuffer` first, boots under a module-level one-instance semaphore with `workdirName: "scratchpad"`, tears down on scope close, and starts the `/dev-tools-proxy` (port 34437, the Playground's script) with its output drained and dropped.
- **Isolation**: `/scratchpad` is now `prerender = false` and sets COOP `same-origin` / COEP `require-corp` per request, like `/play`. That way `astro dev` and the e2e get isolation too; `_headers` only applies to deployed static files. A COEP page's dedicated worker must send COEP too, so the tsrs worker script gets it from a dev middleware in `tsrs-lsp-assets-plugin.ts`, and from a `/_astro/lsp.worker-*` entry in `public/_headers` for builds. The wasm and types-pack fetches are same-origin, so they need no CORP.
- **Wiring**: `makeScratchpadEditorSession` takes an optional `containerLayer`. A `containerAtom` (mounted by `editorAtom` before it waits on the LSP client) runs the mirror and copies phase changes into `containerPhaseAtom: Atom<Option<ContainerPhase>>`. The badge row shows a `ContainerStatusIndicator` (`data-testid="container-status"`, `data-container-phase`) next to the LSP badge.

Interface notes for later tickets:

- Container layout: the Workspace is mirrored to `<workdir>/workspace/`, and host-only scripts go in `<workdir>/.scratchpad/`. All `ContainerService` paths, and spawn `cwd`, are relative to the Workspace dir. Processes start there by default with `PATH=node_modules/.bin:/usr/local/bin:/usr/bin:/bin`. Ticket 08's collector output and ticket 09's preload need a host-dir path: either use `../.scratchpad/...` or add a small `hostPath` op to the backend.
- Building the service never waits on boot. Every operation awaits boot and fails with the boot error if boot failed. File-system mutations are serialized by a semaphore.
- `spawn(options)` is scoped: closing the scope or interrupting the fiber kills the process. It returns `{ output: Stream<string>, exitCode, kill }`. Read `output` at most once. `jsh(script, opts)` builds `jsh -c` options.
- The mirror maps a rename to "write new path, then remove old path", because the event carries the content. Applying an event twice is harmless, which is how the subscribe-then-list window is handled. Empty folders left behind by renames and deletes stay in the Container.
- The phase has only `booting | ready | failed`. Ticket 08 should add `installing` / `loading-types` to `ContainerPhase` (or a separate atom) and extend `describeContainerPhase`. Retry isn't implemented: a failed boot ends the mirror. Ticket 10 needs a way to rebuild the Container layer, for example by keying the runtime or by adding a `retry` op to `makeContainer`.
- The production `_headers` worker entry assumes Vite names the worker chunk `lsp.worker-<hash>.js`. It hasn't been checked against a real build.

Verification: unit tests in `test/features/scratchpad/container.test.ts` cover mount-then-mirror ordering, rename/remove mapping, skipped failed writes, a failed boot leaving the Workspace editable, phase transitions, and spawn/kill. Two `editor.test.ts` cases cover the Container booting without waiting on the LSP, and editing continuing after a failed boot. The worker e2e asserts that both the page and the worker are cross-origin isolated. A new Chromium smoke test, which skips if boot fails, boots the real Container to `ready`.
