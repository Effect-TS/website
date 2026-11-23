# 10: Failure states and overlay

Type: task
Status: ready-for-agent
Blocked by: 03, 07, 08
Spec: ../spec.md

Make the Scratchpad degrade instead of failing when the Container can't do its job.

- [ ] Variant B2 from ticket 03: a strip across the top of the output panel that covers nothing, with the pnpm output printed below it as normal output
- [ ] Strip states: unsupported browser (with browser-support help), boot failed, install failed (with pnpm output visible)
- [ ] Dependencies unavailable (install succeeded, types never reached the editor): the badge plus one output line, with no strip, and Runs keep working
- [ ] Retry re-runs the failed phase without reloading the page
- [ ] Editing, LSP, share and autosave keep working in every failure state
- [ ] Unit tests for each state with the fake Container
