# Experiment 03: single-threaded tsrs LSP with a message pump

Strategy B. Build the tsrs language server for `wasm32-wasip1` with no threads and no shared memory, keep one
instance alive for the whole session, and drive it by calling an export once per incoming JSON-RPC message.

It works. All three steps completed. The server runs in a single Web Worker on a page without cross-origin isolation
in Chromium, Firefox and WebKit. Diagnostics, hover, completion with resolve, definition, references, rename and
signature help all return the same answers as native `tsrs --lsp --stdio`. An edit followed by a diagnostics pull
takes 11 to 15 ms in Chromium, WebKit and Node, against about 600 ms for a full batch check in the published module,
because the server reuses the program and checker state between edits. The source change is 606 added lines, and 419
of those touch existing crates. Everything sits behind `tsrs_core::NO_THREADS`, so native builds are unaffected.

Two real limits remain. Deeply nested code overflows the browser engine's own stack and kills the instance, at 500
levels of nesting in Chromium. And background work such as the first auto-import registry build, about 450 ms, cannot
be interrupted once it starts.

Prototype code, the patch and build commands are in `../prototypes/03-single-thread-lsp/` (README.md there). Raw
results are in `../artifacts/03-results-*.json`.

## What I changed in tsrs

The work is against tsrs e083fd7 (7.1.0-beta.tsrs4). The patch is
`prototypes/03-single-thread-lsp/tsrs-single-thread-lsp.patch`. It has 15 files, +606 and -8 lines.

| file                                          | lines | change                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `crates/tsrs_core/src/pump.rs` (new)          | +134  | A process-wide run queue (`spawn`, `run_one`, `drain`, `pending`) and a timer table with deadlines (`timer_schedule`, `timer_stop`, `fire_due_timers`, `next_timer_in`). It stands in for threads on `NO_THREADS` targets.                                                                                                                                                                                            |
| `crates/tsrs_core/src/context.rs`             | +11   | `Context::after_func` callbacks go to the run queue instead of a new thread. `wait_timeout` returns at once (true if canceled), because on one thread nothing could cancel the context during the wait.                                                                                                                                                                                                               |
| `crates/tsrs_core/src/lib.rs`                 | +1    | `pub mod pump`.                                                                                                                                                                                                                                                                                                                                                                                                       |
| `crates/tsrs_project/src/background/queue.rs` | +19   | `Queue::enqueue` and `go` push to the run queue instead of the 6-thread pool. `Queue::wait` runs queued tasks until its own count is zero, and stops if the queue is empty.                                                                                                                                                                                                                                           |
| `crates/tsrs_project/src/background/timer.rs` | +13   | `after_func`, `Timer::stop` and `Timer::reset` use the pump's timer table instead of the timer thread.                                                                                                                                                                                                                                                                                                                |
| `crates/tsrs_project/src/session.rs`          | +9    | `close_idle_cache_clean` runs queued callbacks instead of waiting on a condvar.                                                                                                                                                                                                                                                                                                                                       |
| `crates/tsrs_project/src/checkerpool.rs`      | +6    | An assert with a clear message where a full checker semaphore would wait forever. It never fired.                                                                                                                                                                                                                                                                                                                     |
| `crates/tsrs_lsp/src/workerpool.rs`           | +6    | `go` runs the request's async work right away, on the dispatching thread.                                                                                                                                                                                                                                                                                                                                             |
| `crates/tsrs_lsp/src/dynamic_queue.rs`        | +5    | A non-blocking `try_get`.                                                                                                                                                                                                                                                                                                                                                                                             |
| `crates/tsrs_lsp/src/server.rs`               | +211  | The pump API, described below. `read_loop` and `dispatch_loop` bodies are split into `read_one` and `dispatch_one` so native and pump share them. Under `NO_THREADS`, `send_client_request` does not wait for the client and takes the result as `null`. `request_configuration` sends `workspace/configuration` without waiting and applies the answer when it arrives. The progress reporter thread is not started. |
| `crates/tsrs_lsp/src/lib.rs`                  | +1 -1 | Exports `PumpStatus`.                                                                                                                                                                                                                                                                                                                                                                                                 |
| `crates/tsrs_wasm_lsp/` (new crate)           | +188  | The cdylib with the exports listed below. It reuses `crates/tsrs_wasm/src/host.rs` through `#[path]`. `build.rs` sets an 80 MiB shadow stack, the same as `tsrs_wasm`.                                                                                                                                                                                                                                                |
| `Cargo.lock`                                  | +10   | The new crate.                                                                                                                                                                                                                                                                                                                                                                                                        |

The module ABI has six exports. `lsp_input(len)` returns a buffer for the next argument. `lsp_init(flags)` creates
the server, with the cwd in the buffer. `lsp_message()` handles one message. `lsp_tick()` runs queued background
tasks and timers that are due. `lsp_next_timer_ms()` gives the time until the next timer. `lsp_output()` and
`lsp_output_len()` return outgoing messages as newline-separated JSON. Status 0 means idle, 3 means background work is
queued, and 1 means the server exited. Imports are `tsrs_host.fs` and `fs_take`, with the same protocol as
`@tsrs/wasm`, plus WASI clocks, random, `fd_write` and environ. I verified the import list on the built module.

### How the pump works

`Server::pump_message` parses the message and runs the read-loop body (`read_one`), which handles `initialize`,
responses to server requests and `$/cancelRequest`, and queues other requests. It then dispatches each queued request
with the dispatch-loop body (`dispatch_one`). A language-service request does its synchronous part, such as taking a
snapshot, and then its async part runs at once on the same thread, because `workerpool::go` calls it inline. The
response goes into the outgoing queue.

Background tasks queued along the way are left for `pump_tick`. Snapshot adoption logging, project diagnostics,
watch updates and auto-import warming all fall in this group. The host calls `lsp_tick` when the status is 3.

That ordering came out of a measurement. My first version drained everything in FIFO order inside `lsp_message`. The
first edit's diagnostics pull then took 430 ms in the handler, against 15 ms natively. The cause was the snapshot
adoption task that `get_language_service` enqueued before the request's own work. It builds the auto-import registry
the first time (`UpdateAutoImports / Building autoimport registry` in the log), and on one thread it ran ahead of the
request. Running request work inline and deferring background tasks brought the first edit down to 26 to 31 ms. The
400 to 500 ms of registry building moved into the following `lsp_tick`.

### Server-to-client requests that block natively

Natively, `send_client_request` sends the request and then waits on a condvar until the read thread delivers the
reply. The comment above it warns that it must only be called from async work, but `handle_initialized` calls it on
the dispatch thread twice. Once it waits for `workspace/configuration`, if the client supports it. Then it waits for
`client/registerCapability` for the configuration watcher, every time. This only works natively because the read loop
is a separate thread. On one thread the reply can only arrive in a later host call, so waiting would deadlock. And
`Condvar::wait` on `wasm32-wasip1` without atomics would panic anyway.

I made three changes, all under `NO_THREADS`.

- `send_client_request` sends the request and returns `null` parsed as the result type. That is the only answer
  `registerCapability` and `unregisterCapability` get, so watch registration and the config watcher behave as before.
  If the client answers with an error, the server never sees it.
- `request_configuration` sends `workspace/configuration` without waiting. It starts with the preferences from
  `initializationOptions`, the same path as a client without configuration support. It records the request id, and
  `pump_response` parses the client's answer and calls `Session::configure` when the answer arrives. With a client
  that advertises configuration, I verified that the request goes out, that the server does not block, and that the
  session carries on. I did not verify that a specific preference changes behavior afterwards.
- `refresh_diagnostics`, inlay hint refresh and code lens refresh were already fire-and-forget.

For the website, CodeMirror's client advertises neither `workspace.configuration` nor watched-file registration. The
only server request is the `registerCapability` that `Quirks.ts` already answers with `null`. The server no longer
waits for that reply. Sending it is harmless and skipping it is fine too.

### What did not need changing

The task brief expected compile problems with `tsrs_fswatch`, `tsrs_ipc`, `tsrs_api` and `tsrs_api_transport`.
There were none. `cargo check -p tsrs_lsp --target wasm32-wasip1` succeeded on the pristine tree with no changes. I
verified this by running it. `libc` builds for WASI, and none of those crates fails to compile there. They are linked
into the module and cost size, but nothing in the session reaches them. `custom/initializeAPISession` would try to
bind a pipe. I expect that bind to fail with an error response rather than a crash, but I did not run it.

The compiler side already honors `NO_THREADS`. `Program::single_threaded()` is always true there, the rayon pool runs
on the calling thread, and the checker pool's work groups run inline. The new crate calls
`tsrs_compiler::worker_pool()` first, as `tsrs_wasm` does.

## Results

Hardware is a 32-core x86_64 NixOS box. Node is v24.22.3. Browsers are Playwright 1.63.0's Chromium 153, Firefox 151
(build 1532) and WebKit 26.6 (build 2359). The workspace is effect 4.1.5's `.d.ts` and `package.json` files, which
come to 241 files in the program. It uses the bridge's `workspace.tsconfig.json` with `skipLibCheck: true`, and one
`main.ts` with a planted TS2322 at line 7. The session uses CodeMirror lsp-client 6.3.1's exact client capabilities.
After each `didChange` it pulls `textDocument/diagnostic`, as `packages/lsp-bridge/src/LspSession.ts` does, and then
sends a hover.

The edit loop runs 50 incremental edits. Even-numbered edits append a declaration. Odd-numbered edits toggle
`label: string` and `label: number`, which removes and restores the error. The pull counts came back correct for
every edit in every runtime. A "fix" gave 0 diagnostics, a "break" gave 1, and an append kept the current state.

The wasm numbers below use the size-optimized module (`artifacts/tsrs-lsp-single.wasm`). The native column is
`tsrs --lsp --stdio` from the same tree, built release without LTO, over pipes. Natively a notification has no reply,
so I could not time its own handling. I measured native pull latency directly.

| measure                                                 | Node (wasm)        | Chromium worker | Firefox worker | WebKit worker | native tsrs           |
| ------------------------------------------------------- | ------------------ | --------------- | -------------- | ------------- | --------------------- |
| module compile                                          | 59 ms              | 89 ms           | 334 ms         | 199 ms        | n/a                   |
| instantiate                                             | 19 ms              | 86 ms           | 28 ms          | 59 ms         | n/a                   |
| `didOpen` handled (project load, parse, bind)           | 646 ms             | 553 ms          | 1607 ms        | 439 ms        | async                 |
| first pull after open                                   | 95 ms              | 123 ms          | 111 ms         | 35 ms         | 111 ms                |
| time to first diagnostics (open + pull)                 | 741 ms             | 676 ms          | 1718 ms        | 474 ms        | about 140 ms          |
| first edit: didChange + pull                            | 31 ms              | 27 ms           | 61 ms          | 20 ms         | 17 ms pull            |
| background work after first edit (auto-import registry) | 492 ms             | 449 ms          | 1117 ms        | 266 ms        | on other threads      |
| per edit: didChange + pull, median                      | 14.7 ms            | 12.7 ms         | 47 ms          | 11 ms         | 22 ms pull            |
| per edit, p90                                           | 24.7 ms            | 15.9 ms         | 49 ms          | 19 ms         | 24 ms pull            |
| `didChange` alone, median                               | 0.1 ms             |                 |                |               |                       |
| hover after edit, median                                | 2.3 ms             | 2 ms            | 7 ms           | 2 ms          | 6.3 ms                |
| hover, cold / repeat                                    | 13.8 / 0.3 ms      | 14.5 ms         | 19 ms          | 5 ms          | 2.5 / 0.9 ms          |
| completion after `Effect.` (229 items)                  | 14.1 ms            | 17.5 ms         | 15 ms          | 8 ms          | 6.5 ms                |
| completionItem/resolve                                  | 2.9 ms             | 4.6 ms          | 6 ms           | 3 ms          | 2.7 ms                |
| definition                                              | 23.6 ms            | 18.1 ms         | 59 ms          | 16 ms         | 112 ms*               |
| references                                              | 6.0 ms             | 5.3 ms          | 2 ms           | 1 ms          | 1.7 ms                |
| rename                                                  | 3.3 ms             | 3.1 ms          | 2 ms           | 0 ms          | 1.6 ms                |
| signatureHelp                                           | 4.7 ms             | 6.7 ms          | 4 ms           | 1 ms          | 1.8 ms                |
| wasm linear memory after init / open / 50 edits         | 93 / 205 / 254 MiB | same            | same           | same          | RSS 11 / 69 / 267 MiB |
| renderer process RSS (peak)                             |                    | 140 MiB (331)   | 343 MiB (387)  | not sampled   |                       |
| deepest nesting that survives                           | 1000               | 500             | 1000           | 5000          | 5000+                 |

\* Native definition resolved into effect's `src/*.ts` through declaration maps, because the native workspace was a
copy of the whole package directory. The wasm workspace had only `.d.ts` files. That is a workspace difference, not a
server difference.

Firefox and WebKit report `performance.now()` in whole milliseconds without cross-origin isolation, so their small
numbers are coarse. Every browser run reported `crossOriginIsolated === false` on both page and worker, and
`typeof SharedArrayBuffer === "undefined"`. I verified this by running it.

For comparison, `S/scripts/bench.mjs` on the published batch module measured 590 to 615 ms per full check on this
machine during this session, with a 903 ms first run and 134 MiB of memory. So the key question has a clear answer.
After the first edit, an edit plus re-check costs about 15 ms in Node and Chromium. That is about 40 times cheaper
than a batch check, and it holds steady over 300 edits. Most of it is the pull handler. `didChange` itself takes
0.1 ms, because it only queues the change and the snapshot updates lazily on the next request.

The size-optimized build used opt-level s, fat LTO, panic=abort and `wasm-opt -Os`, the same settings as
`tools/wasm/build.sh`. Sizes are measured with `gzip -9` and `brotli -q 11`.

| module                                                           | raw      | gzip    | brotli  |
| ---------------------------------------------------------------- | -------- | ------- | ------- |
| `tsrs-lsp-single.wasm` (LSP, optimized)                          | 12.48 MB | 3.86 MB | 2.64 MB |
| `tsrs-lsp-single.raw.wasm` (before wasm-opt)                     | 15.97 MB | 4.29 MB | 2.87 MB |
| `tsrs-lsp-single.dev.wasm` (opt 3, no LTO, used while iterating) | 26.56 MB | 6.12 MB | 3.94 MB |
| `@tsrs/wasm` batch `tsrs.wasm` 7.1.0-beta.tsrs4, for comparison  | 10.04 MB | 2.91 MB | 1.99 MB |

The language server adds about 2.4 MB raw and 0.65 MB brotli over the batch module. Timings with the dev module were
within noise of the optimized one. The Chromium edit median was 14.7 ms with the dev module and 12.7 ms optimized.

### Memory

Linear memory starts at 93 MiB, and 80 MiB of that is the reserved shadow stack. It reaches 205 MiB after the
project loads. After the first edit's checker and auto-import work it sits at 254 MiB and does not move for the rest
of the run. I checked edits 1, 10, 50, 100, 150, 200, 250 and 299 of a 300-edit Node run, and all read 254.3 MiB.
Wasm memory never shrinks, so this is a high-water mark. A leak would show up as growth, and there is none at this
scale.

The arena and region design in `docs/LSP.md` releases old program versions on one thread just as it does with many.
After the 30 s idle timers fired, memory rose once to 266.6 MiB, because the idle cache clean builds a fresh snapshot.
Native RSS for the same session ended at 267 MiB. That is a weak comparison, since RSS and linear memory measure
different things.

The 80 MiB shadow stack is the batch module's census value. The LSP may not need that much, and it costs initial
memory. I did not test smaller values.

### Deep recursion

I opened files of the form `export const deep = [[[...1...]]]` plus the same nesting with parentheses, then pulled
diagnostics and sent a hover. The first failing depth ends the probe, because the instance is dead afterwards. These
are the results I measured.

- Node: depth 1000 passes and 1500 fails with `RangeError: Maximum call stack size exceeded`. With
  `node --stack-size=7000`, depth 5000 passes and 10000 fails.
- Chromium worker: 500 passes and 1000 fails with `RangeError: Maximum call stack size exceeded`.
- Firefox worker: 1000 passes and 1500 fails with `InternalError: too much recursion`. My first host did not count
  that as a trap, and I fixed `isTrap` in `lsp-host.js`.
- WebKit worker: 5000 passes and 10000 fails with `RangeError: Maximum call stack size exceeded.`
- Native: 5000 passes on 512 MB thread stacks.

The limit comes from the JS engine's native stack, which holds the wasm frames. It does not come from the module's
80 MiB shadow stack. A Web Worker's stack size cannot be configured from a page, so this module cannot fix it. The
batch module runs the same checker code, so I expect the same limit there, but I did not measure it. The failure
kills the whole instance and all its state. The host has to start a new instance and replay `initialize`, the open
documents and their contents, and the first check costs about 700 ms again.

Time grows faster than linearly with depth in both wasm and native. Depth 5000 took 69 s in Node with a raised stack
and 52 s natively. That is a tsrs checker property, not a wasm one.

## Behavior differences from the native server

All of these come from reading the code, and most I also confirmed by running.

- **Debounces collapse to zero.** `Context::wait_timeout` returns at once. The 500 ms debounce on snapshot updates
  after `didClose` and on watched-file diagnostics refreshes therefore runs on the next `lsp_tick` instead. Changes
  are still coalesced within one host call, because a newer event cancels the queued task before it runs. Native
  coalesces over 500 ms. For the website, a `didClose` snapshot update now runs right away.
- **Timers only fire when the host ticks.** The idle cache clean and the checker pool's idle disposal (30 s each)
  wait for `lsp_tick` after `lsp_next_timer_ms`. I verified this with `run-node.mjs --timers`. Each tick took 0.5 to
  3 ms, and the next pull took 12 to 32 ms because the checker was recreated. If the host never ticks, caches are never
  cleaned and memory stays at its peak.
- **No concurrency.** One message runs to completion before the next. Native runs language-service requests on worker
  threads in parallel with the dispatch loop.
- **Cancellation is ineffective.** `$/cancelRequest` is processed when its message arrives, but by then the earlier
  request has already finished, so it never cancels anything. A long background task such as the 450 ms first
  auto-import build delays any message that arrives while it runs.
- **Server requests are fire-and-forget**, as described above. Errors from the client in reply to
  `registerCapability` are ignored, and `workspace/configuration` is applied late.
- **No project-loading progress.** The progress reporter is a thread, so `window/workDoneProgress` is never sent even
  if the client supports it. CodeMirror's client does not.
- **Panics abort.** wasm32-wasip1 cannot unwind, so `with_recover` cannot turn a handler panic into an error response.
  Natively it can. A panic traps and kills the instance. That never happened in these runs, apart from the stack
  overflows.
- **No push diagnostics for files, same as native.** File diagnostics come only from `textDocument/diagnostic`. Push
  only carries project-level tsconfig diagnostics. Native behaves the same way, which is why the bridge pulls.
- **No file watching.** The worker's file system is the in-memory map. A host that changes non-open files has to send
  `workspace/didChangeWatchedFiles` itself. I did not test this.

## Failures and blockers, with exact errors

- **Engine stack overflow on deep code.** `RangeError: Maximum call stack size exceeded` (Chromium, Node, WebKit) and
  `InternalError: too much recursion` (Firefox), at the depths listed above. This is not fixable in the module. A real
  fix would make the parser and checker recursion explicit, or use stack switching (JSPI or the wasm stack-switching
  proposal) to run on a bigger stack. Both are deep upstream work, and the first is a large refactor of
  checker-shaped code.
- **First edit in FIFO order.** This one is fixed. The pull took 430 ms in the handler (`handled method
'textDocument/diagnostic' (19) in 430.228839ms`) because the auto-import warming task ran first. Inline request work
  fixed it.
- **Firefox is 3 to 4 times slower** at steady-state edits, 47 ms against 11 to 13 ms. Project load took 1.6 s. I did
  not investigate why.
- **Firefox and WebKit setup on NixOS.** Firefox first failed with `libgtk-3.so.0: cannot open shared object file`.
  WebKit 2311 failed with `libgstreamer-1.0.so.0: cannot open shared object file`, then `Could not create WPE EGL
display: EGL_SUCCESS. Aborting...`, and then `Protocol error (Page.overrideSetting): Unknown setting:
PushAPIEnabled`, because the installed build is older than Playwright 1.63 expects. I worked around this with
  nixpkgs libraries on `LD_LIBRARY_PATH` and by downloading WebKit build 2359 into the scratch directory. The README
  has the details. None of this is a module problem.
- **Native test run.** `cargo test -p tsrs_lsp -p tsrs_project` on the patched tree gave 66 of 69 passing in
  `tsrs_lsp` and 147 of 147 in `tsrs_project`. The three failures are `stack_sanitizer_test` cases that panic reading
  `../../ts-ref/tsc/testdata/...`, a checkout the shallow clone does not have. I did not run them on the pristine
  tree, but they read a missing file and touch nothing I changed. `cargo clippy --no-deps` on the four touched crates
  is clean for both native and `wasm32-wasip1`.

## Verified versus inferred

I verified these by running them: compile success on the pristine tree, the module build and its import list, every
number in the tables, the correctness of diagnostics across 50 edits in four runtimes, flat memory over 300 edits,
timer firing, deep-recursion limits, the absence of cross-origin isolation, and the native test and clippy results.

These are inferred from reading the code: that native behavior is unchanged beyond what the tests cover (the edits
are behind `NO_THREADS`, a constant false natively, plus a mechanical loop-body extraction); that
`custom/initializeAPISession` fails with an error rather than a trap; that preferences from a late
`workspace/configuration` take effect; that the batch module hits the same engine-stack limit; and the cause of the
first-edit cost, which I took from server log lines.

## Verdict

As a replacement for the server-hosted LSP on the Scratchpad, this works. A single worker without SharedArrayBuffer
gives 11 to 15 ms re-checks in Chromium and WebKit, about 50 ms in Firefox, and complete LSP features. The cost is a
2.6 MB brotli download and about 250 MiB of wasm memory for an Effect workspace. First diagnostics take 0.5 to 0.7 s
after load, or 1.7 s in Firefox. The two risks to design around are deep nesting, where the host must detect a dead
instance and restart it, and non-preemptible background work. In the worker, call `lsp_tick` from a 0 ms timer after
each message, and drop or merge stale `didChange`-driven pulls on the page side so they do not queue behind that work.

On upstreaming, the change is small and follows existing patterns. The project already uses `tsrs_core::NO_THREADS` to
make the compiler single-threaded, and this patch extends the same switch to `Context`, the project background
queue, timers, the LSP worker pool and server requests. The edits to existing crates are 419 lines, and most of those
are the pump API in `server.rs`. Three parts would need review upstream.

- The fire-and-forget treatment of `send_client_request`. A cleaner version would make `handle_initialized` and the
  watch registration callback-based on all targets.
- The FIFO and priority policy of the run queue.
- Whether `crates/tsrs_wasm_lsp` should share a host crate with `tsrs_wasm` instead of the `#[path]` include.

It also links code that wasm never uses (`tsrs_api`, IPC, fswatch). Gating those out behind features would bring the
module closer to the batch size. I would call it upstreamable with modest cleanup, not a redesign.
