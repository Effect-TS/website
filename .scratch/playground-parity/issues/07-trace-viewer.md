# 07: Trace viewer

Type: task
Status: ready-for-agent
Blocked by:
Spec: ../spec.md

`/play` has a Traces view: `features/playground/components/trace-viewer*`, `services/devtools*`, `domain/devtools.ts`. The Scratchpad already starts the dev-tools proxy (`container-webcontainer.ts`) but drops its output.

- [ ] Move the trace viewer components and devtools model into `features/devtools/`, used by both `/play` and the Scratchpad. `/play` must behave the same (its tests still pass)
- [ ] The Scratchpad reads the proxy's span stream and shows it in a Traces tab in the bottom panel, next to the terminal. Spans reset when a new Run starts
- [ ] Find out what the program needs so its spans reach the proxy (on `/play` the seed or runner may set up the devtools layer); make the seeds or the run preload do the same, so the default seed's spans appear without user setup
- [ ] Ticket 02 rewrites the bottom panel at the same time. Keep the Traces tab change to a small, self-contained addition (a tab entry plus a component) so it merges easily
- [ ] Unit tests for the span store reset; real-Container e2e: the seed runs and spans appear in Traces
