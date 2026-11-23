# 08: Install, sync-back, and installed types in the tsrs worker

Type: task
Status: ready-for-agent
Blocked by: 02, 05, 07
Spec: ../spec.md

Make the Container's installed packages the source of types (ADR 0004).

- [ ] Run `pnpm install -E` after mount and whenever `package.json` changes, as an interruptible, serialized install
- [ ] After each install, write the Container's `package.json` and `pnpm-lock.yaml` back into the Workspace through the host-only write path
- [ ] After each install, copy declarations into the tsrs worker with the mechanism from ticket 02 (a bulk worker FS op)
- [ ] Mirror `tsconfig.json` from the Workspace into the worker, and stop writing `WORKSPACE_TSCONFIG` for the Scratchpad
- [ ] Remove the `effect-types.pack.gz` build, asset plugin wiring and worker fetch for the Scratchpad
- [ ] Hide diagnostics until the first copy lands, keep the current diagnostics visible during re-installs, and unhide after a timeout with a "dependencies unavailable" status
- [ ] Status badge phases: booting, installing, loading types, ready
- [ ] Unit tests with the fake Container, and update `lsp-worker-bridge` tests for the new op
