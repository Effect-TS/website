# 07: Trace viewer

Type: task
Status: resolved
Blocked by:
Spec: ../spec.md

`/play` has a Traces view: `features/playground/components/trace-viewer*`, `services/devtools*`, `domain/devtools.ts`. The Scratchpad already starts the dev-tools proxy (`container-webcontainer.ts`) but drops its output.

- [x] Move the trace viewer components and devtools model into `features/devtools/`, used by both `/play` and the Scratchpad. `/play` must behave the same (its tests still pass)
- [x] The Scratchpad reads the proxy's span stream and shows it in a Traces tab in the bottom panel, next to the terminal. Spans reset when a new Run starts
- [x] Find out what the program needs so its spans reach the proxy (on `/play` the seed or runner may set up the devtools layer); make the seeds or the run preload do the same, so the default seed's spans appear without user setup
- [x] Ticket 02 rewrites the bottom panel at the same time. Keep the Traces tab change to a small, self-contained addition (a tab entry plus a component) so it merges easily
- [x] Unit tests for the span store reset; real-Container e2e: the seed runs and spans appear in Traces

## Answer

### Shared `features/devtools/`

- `span.ts` (was `playground/domain/devtools.ts`) and `schema-v3.ts` (was `playground/services/devtools/schema.ts`), moved unchanged.
- `traces.ts` (new): the trace store. `DevToolsRequest` is the v4/v3 union codec that used to be in `playground/services/webcontainer.ts`. `parseDevToolsLine` decodes one proxy line and returns `None` for pings, blank lines and torn writes. `addSpan`, `addSpanEvent` and `applyDevToolsRequest` are the old `DevToolsLayer` logic as pure functions. `makeTraceAtoms()` returns `{ rootSpansAtom, selectedSpanIndexAtom, selectedSpanAtom }`, and there are `recordDevToolsRequest` and `resetTraces` (which also selects the first trace again).
- `components/` (was `playground/components/trace-viewer*`): `TraceViewer` now takes `atoms: TraceAtoms` and hands them to its parts through a context (`components/context.ts`), so the components no longer import `/play`'s module-level atoms.
- `/play`: `services/devtools.ts` keeps `DevToolsLayer`, which now records into `playgroundTraceAtoms = makeTraceAtoms()`. `index.tsx` renders `<TraceViewer atoms={playgroundTraceAtoms} />`, and `webcontainer.ts` imports `DevToolsRequest` from the shared module. `atoms/devtools.ts` is gone. Behaviour is unchanged.

### What the program needs

Nothing new. The seed's `src/main.ts` already provides `DevToolsLayer` from `src/DevTools.ts` (`DevTools.layerSocket` on port 34437), just as `/play`'s template does, so the seed's `program` span reaches the proxy with no user setup. The seed and the run preload are unchanged. A program that doesn't provide `DevToolsLayer` reports no spans, and the Traces tab says how to add it.

### Scratchpad

- `scratchpad/traces.ts` (new) now owns the dev-tools proxy, which `container-webcontainer.ts` used to start and whose output it dropped (that code is removed). `devToolsRequests(container)` waits for the Container to boot, including after a retry. It then writes `dev-tools-proxy.cjs` to the host dir, spawns it through the normal `spawn` API, and decodes its output line by line. The proxy buffers each connection to whole lines, so a Run killed mid-write cannot tear a line into the next Run's output. `followTraces` feeds the requests into the store, restarts the proxy if it exits, and resets the store whenever the Runs state shows a new Run id. `layerTraces(atoms)` wires it from the `Container` and `Runs` services.
- `editor.ts`: `traceAtoms` (keep-alive) on the session, and `layerTraces` added to the runtime layer when there is a Container. `context.tsx` and `Scratchpad.tsx` pass `traceAtoms` through.
- UI: `TracesPanel.tsx` (new) renders the shared `TraceViewer`, or an empty-state hint. `OutputPanel.tsx` has a real "Traces" tab next to "Output" (`panel-tab-output` / `panel-tab-traces`, local tab state). The Output body is hidden while Traces is shown, so the xterm stays mounted.

### Notes for ticket 02 (bottom panel rewrite)

The Scratchpad UI change is the tab buttons, a `tab` state, `hidden` on the output body when `tab !== "output"`, and `{tab === "traces" && <TracesPanel />}`. Everything else is in `TracesPanel.tsx` and `traces.ts`. The reset reads `RunsState.run.id` from `Runs.stateChanges`. If ticket 02 changes how Runs are identified, `layerTraces` needs a stream that emits once per new Run.

### Verification

- Unit: `test/features/devtools/traces.test.ts` covers spans grouping into traces (newest first), skipping pings and torn lines, and reset emptying the store and re-selecting the first trace. `test/features/scratchpad/traces.test.ts` uses the fake Container: a span split across output chunks reaches the store through the proxy (host script written, `node ../.scratchpad/dev-tools-proxy.cjs` spawned), a new Run id clears the spans, and a repeated id does not. `editor.test.ts`'s spawn assertion now ignores the proxy.
- E2E (real Container, `scratchpad-container.spec.ts`): "the seed's spans appear in Traces, and a new Run replaces them". The seed's `program` span shows in Traces. After an edit renames the span, Run #2 shows only `edited-span`. Back on Output, the terminal shows Run #2's output.
- Screenshot: `../screenshots/07-traces.png` (set `SCRATCHPAD_TRACES_SCREENSHOT=<path>` to have the e2e write it).
