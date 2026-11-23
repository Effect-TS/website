# 10: Failure states and overlay

Type: task
Status: ready-for-agent
Blocked by: 03, 07, 08
Spec: ../spec.md

Make the Scratchpad degrade instead of failing when the Container can't do its job.

- [ ] The overlay design from ticket 03, non-blocking in the output panel
- [ ] States: unsupported browser (with browser-support help), boot failed, install failed (with pnpm output visible), dependencies unavailable
- [ ] Retry re-runs the failed phase without reloading the page
- [ ] Editing, LSP, share and autosave keep working in every failure state
- [ ] Unit tests for each state with the fake Container
