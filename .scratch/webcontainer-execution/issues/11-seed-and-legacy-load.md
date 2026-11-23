# 11: Seed template and legacy workspace loading

Type: task
Status: ready-for-agent
Blocked by: 05, 06
Spec: ../spec.md

Seed new Scratchpads from the Playground v4 template and load legacy Playground workspaces.

- [ ] Seed from the Playground v4 template plus the plugin entry and `verbatimModuleSyntax: true`, with `src/DevTools.ts` importing `@effect/platform-node/NodeSocket` and `@types/node` pinned to `^24`, replacing `src/main.ts` + `src/greeter.ts`
- [ ] Load order: `#hash`, then `?code=` (a single `main.ts` swapped into the seed), then the Scratchpad autosave, then a one-time read of `/play`'s `workspace-autosave`, then the seed
- [ ] Normalize with the shared module, injecting the plugin entry and `verbatimModuleSyntax: true`
- [ ] A v3 workspace or one over the limits shows a notice with an "Open in Playground" link to the same source instead of loading
- [ ] Unit tests with fixtures of real legacy shares (v4, v3, `?code=`, over-limit)
