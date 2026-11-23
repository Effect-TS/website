# 09: Runs: page-driven runner and output panel

Type: task
Status: ready-for-agent
Blocked by: 01, 03, 07, 08
Spec: ../spec.md

Add page-driven Runs.

- [ ] The runner from ticket 01: `node --experimental-transform-types --import <abs preload> src/main.ts`, with the preload from `prototypes/01-type-stripping-runner/container/runner-preload.mjs` kept outside the mirrored Workspace
- [ ] The first Run starts when types are first ready, and later Runs start about 500 ms after edits settle and Container writes are flushed
- [ ] Any tsrs error in the Workspace skips the Run and prints why. Warnings don't block
- [ ] A new Run kills the previous process, a skipped Run also stops it, there's no time limit, and Stop and Restart work
- [ ] A skipped Run shows the reason and clickable errors on top, with the previous Run's output kept below it, dimmed
- [ ] The bottom panel uses the layout from ticket 03, with a read-only xterm in the "Output" tab that clears per Run and writes a header (time and trigger)
- [ ] Status badge "running" state
- [ ] Unit tests for gating, debounce and replacement under `TestClock` with the fake Container
