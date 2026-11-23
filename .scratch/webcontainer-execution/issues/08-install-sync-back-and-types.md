# 08: Install, sync-back, and installed types in the tsrs worker

Type: task
Status: resolved
Blocked by: 02, 05, 07
Spec: ../spec.md

Make the Container's installed packages the source of types (ADR 0004).

- [x] Run plain `pnpm install` (pnpm 8.15.6 rejects `-E`) after mount and whenever `package.json` changes, as an interruptible, serialized install
- [x] After each install, write the Container's `package.json` and `pnpm-lock.yaml` back into the Workspace through the host-only write path
- [x] After each install, copy declarations into the tsrs worker with the in-container collector script and the `ReplaceNodeModules` op from ticket 02 (`prototypes/02-declarations-copy/src/collect.cjs`)
- [x] Mirror `tsconfig.json` from the Workspace into the worker, and stop writing `WORKSPACE_TSCONFIG` for the Scratchpad
- [x] Remove the `effect-types.pack.gz` build, asset plugin wiring and worker fetch for the Scratchpad
- [x] Hide diagnostics until the first copy lands, keep the current diagnostics visible during re-installs, and unhide after a timeout with a "dependencies unavailable" status
- [x] Status badge phases: booting, installing, loading types, ready
- [x] Unit tests with the fake Container, and update `lsp-worker-bridge` tests for the new op

## Answer

Implemented in `apps/web/src/features/scratchpad/`.

- **`dependencies.ts`** (new): the `Dependencies` service (`makeDependencies`, `layerDependencies`). Each cycle runs plain `pnpm install`, syncs `package.json` and `pnpm-lock.yaml` back through `writeHostFile` (only when they differ), then collects and mounts types. A cycle starts after the mount and whenever the mirror lands a `package.json` that differs from the one the last cycle installed, so the sync-back's own write never starts another install. Cycles are serialized under a lock: a new trigger interrupts the running cycle, which kills its process through the spawn scope, before the next one starts.
- **`collect-types.cjs`** (new): spike 02's collector, shipped as `?raw` and written to the host scripts dir. It follows the same flattening rule (realpath of `node_modules/<name>`, then `node_modules/.pnpm/node_modules/<name>`, nested `node_modules` skipped), skips `typescript/lib/lib.*.d.ts` with `--skip-ts-libs`, tolerates a missing `.pnpm`, and prints one JSON line (`files`, `bytes`, `packages`, `dropped`, `ms`). It runs as `node ../.scratchpad/collect-types.cjs node_modules ../.scratchpad/types.pack --skip-ts-libs`. The host reads the pack once and deletes it.
- **Container** (`container.ts`): adds host-dir operations (`writeHostDirFile`, `readHostDirFile`, `removeHostDirFile`, and `hostDirPath(name)` for spawn args; the dir is `CONTAINER_HOST_DIR_FROM_WORKSPACE = "../.scratchpad"`). `mirrorWorkspace` takes `onChange`, which runs after the mount and after each event lands. The service's own phase type is now `ContainerBootPhase` (`booting | ready | failed`). The fake backend has `hostFiles`, and `FakeSpawnResult.exit` takes a promise for test-controlled exits.
- **Worker protocol**: `ReplaceNodeModules { id, pack: ArrayBuffer }`, answered by `TypesMounted { id, files, bytes, packages }` or `TypesRejected { id, message }`. The bridge decodes the pack first, so a bad pack is rejected and the old types stay. Otherwise it removes `/workspace/node_modules`, writes the pack's files and re-pulls open documents. `LspWorkspaceMirror.mountTypes(pack)` posts a copy of the pack in the transfer list, waits for the answer with the matching id, and keeps the bytes. Every new worker gets them replayed after the `Reset` and before `Start`. The page keeps one copy of the pack (about 20 MB) for that replay.
- **tsconfig**: the bridge treats `tsconfig.json` as an ordinary Workspace file (writes, removes, dropped by a `Reset` that lacks it), and the worker starts the host with `tsconfig: null`. `WORKSPACE_TSCONFIG` stays exported from `@website/tsrs-lsp-wasm`, because its host default and the tests use it. The worker integration test now mirrors it in as a file, and checks that removing it drops the Effect plugin's diagnostics.
- **Removed**: the worker's pack fetch and inflate (`loadTypesPack`, `inflateIfGzip`, `isGzip`), `WorkerAssets.typesPacks`, `typesPackUrl`/`typesPackBytes` in `virtual:tsrs-lsp-assets`, the `effect-types.pack.gz` artifact check, the `_headers` entry, and, in `packages/tsrs-lsp-wasm`, `scripts/build-types-pack.ts`, the `build:types-pack` script, the manifest's `typesPack` entry and the CI action step. The package's own tests only need `scripts/types-pack.ts` (`collectTypesPack`), which stays.
- **Diagnostics gating** (`editor.ts`): with a Container, `publishDiagnostics` pushes are cached but not rendered or counted until `DependencyState.diagnosticsVisible`. That flag is sticky and is set by any of: the first `TypesMounted`, a boot failure, an install failure, unavailable types (collector failed, pack rejected, no mirror), or `typesTimeout` (default 60 s, configurable with `ScratchpadEditorSessionConfig.typesTimeout`) after the Container is ready. When types mounted, the cached pushes predate them and are dropped (the worker is already re-pulling). Otherwise they are shown. Re-installs never hide diagnostics again. If a later types copy fails, the earlier types stay and the phase returns to `ready`.
- **Phases**: `ContainerPhase` is `booting | installing | loading-types | ready | failed` (boot) `| install-failed { error: InstallFailed } | dependencies-unavailable { reason }`. It is derived from `DependencyState` by `containerPhaseOf`. `describeContainerPhase` covers every phase and has a `busy` flag that makes the badge pulse.
- **Sync-back in the UI**: host writes now refresh the explorer tree, and an open read-only tab (`package.json`, `pnpm-lock.yaml`) picks up the new content.

### For ticket 09 (Runs)

- Wait for "types first ready" with `Dependencies.awaitDiagnosticsVisible`. It resolves on the first `TypesMounted`, or when the Scratchpad gives up (failure or timeout). From atoms, use `containerPhaseAtom`: `ready` or `dependencies-unavailable` means the Container has the packages and Runs can go. `diagnosticsVisibleAtom` is the same gate as `awaitDiagnosticsVisible`.
- `Dependencies` is in the session runtime (kept out of its type like `Container`). Get it with `Effect.serviceOption(Dependencies)`. `Dependencies.install` starts a new cycle, superseding the running one, and returns once it is started. For `pnpm add` (ticket 13), run it through `Container.spawn`, then call `install`, so `package.json` syncs back and types reload.
- Put the Run preload in the host dir with `container.writeHostDirFile(name, script)`, and pass `container.hostDirPath(name)` in the `node` args.
- A Run should not start while the phase is `installing` or `loading-types` after a `package.json` change. Watch `Dependencies.stateChanges`, or wait for the phase to leave those two.

### For ticket 10 (failure overlay)

- `installLogAtom: Atom<InstallLog>` holds `{ run, running, output, exitCode }`. `output` is raw terminal output, ANSI included, capped at the last 64 KiB, and resets at the start of each install. `Dependencies.installLogChanges` streams the same data.
- An install failure is phase `install-failed` with `error: InstallFailed { exitCode, outputTail (last 4 KiB), message }`. `exitCode` is `-1` when `pnpm` could not be spawned.
- "Dependencies unavailable" is phase `dependencies-unavailable` with a one-line `reason`, which is the line to print in the output panel. The badge already shows it with `data-container-phase="dependencies-unavailable"`. A timeout while `pnpm install` is still running shows diagnostics but keeps the phase at `installing`.
- Retry is still open. `Dependencies.install` re-runs a failed install. A failed boot still needs the layer rebuild noted in ticket 07.

### Verification

- Unit tests: `dependencies.test.ts` (new, 12 tests: install, sync-back, phases, no re-install from the sync-back write, supersede and kill, install failure, the configurable timeout and the 60 s timeout under `TestClock`, rejected packs, no mirror, keeping the earlier types on a failed re-copy, boot failure, and the collector against a fake pnpm layout run with `node`). Also new cases in `lsp-worker-bridge.test.ts` (`ReplaceNodeModules` replace semantics, rejection, before connect; `tsconfig.json` removal and Reset), `worker-transport.test.ts` (transfer, id correlation, replay to a restarted worker), `editor.test.ts` (hidden until `TypesMounted` with stale pushes dropped; held pushes shown after 60 s; sync-back reaches the explorer and an open tab), `container.test.ts` and `status.test.ts`.
- The worker integration test runs against the real wasm without the dist pack: no types (2307) → `ReplaceNodeModules` → only 377001.
- E2E (`scratchpad-worker.spec.ts`, Chromium, real Container): all 7 pass. Tests that need Effect's types wait for `data-container-phase="ready"` and skip if the Container cannot boot or install. The smoke test now checks that diagnostics stay hidden during boot and install, that phase reaches `ready`, that `pnpm-lock.yaml` appears in the explorer, that hover resolves `@effect/platform-node`, and that neither seed file has error diagnostics. Each worker test now boots and installs (about 15 s each in Chromium here), so the spec's timeout is 240 s.
