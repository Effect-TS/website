# 09: Runs: page-driven runner and output panel

Type: task
Status: ready-for-agent
Blocked by: 01, 03, 07, 08
Spec: ../spec.md

Add page-driven Runs.

- [ ] The runner chosen in ticket 01 (Node type stripping with the `.js` → `.ts` hook, or `tsc` emit)
- [ ] The first Run starts when types are first ready, and later Runs start about 500 ms after edits settle and Container writes are flushed
- [ ] Any tsrs error in the Workspace skips the Run and prints why. Warnings don't block
- [ ] A new Run kills the previous process, there's no time limit, and Stop and Restart work
- [ ] The bottom panel uses the layout from ticket 03, with a read-only xterm in the "Output" tab that clears per Run and writes a header (time and trigger)
- [ ] Status badge "running" state
- [ ] Unit tests for gating, debounce and replacement under `TestClock` with the fake Container
