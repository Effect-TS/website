# 06: Extract the shared Workspace format module

Type: task
Status: ready-for-agent
Spec: ../spec.md

Move the share format out of `features/playground` into one module that both `/play` and `/scratchpad` use.

- [ ] Move the `Workspace` schema (`File`, `Directory`, `WorkspaceShell`, `userManaged`, `prepare`, `shells`, `snapshots`), `normalizeWorkspace`, effect-version detection, `WorkspaceCompression`, and the shortener client
- [ ] Add a converter between the format's tree and the Scratchpad Workspace's flat file map, preserving `userManaged`, `prepare`, `shells` and `snapshots` on round trip
- [ ] Add the `@effect/language-service` plugin injection into `tsconfig.json` as a normalization step
- [ ] Switch the Playground to the shared module with no behaviour change, keeping `import.test.ts` green
