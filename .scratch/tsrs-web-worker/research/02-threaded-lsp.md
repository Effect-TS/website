# Strategy A: the threaded tsrs LSP as a wasm32-wasip1-threads module

Question: can `tsrs --lsp --stdio` itself, with all of its OS threads, run as a `wasm32-wasip1-threads` module in a
browser Web Worker, with few changes to tsrs?

Answer: yes, it runs. I got to step 3. The same module serves a full LSP session under wasmtime, under a small Node
host, and in headless Chromium, Firefox and WebKit. It needed 14 files of small changes to tsrs (+57 -21 lines), one
of which fixes a real bug in how tsrs detects a threaded wasm build. Two things stand in the way of shipping it. Deep
recursion overflows the browser's per-worker JS stack, which no page can raise, at about 1,000 to 3,000 levels where
native handles 50,000. And the browser pays for about 17 to 21 live JS workers, roughly 750 MB to 1 GB of extra memory
in Chromium and Firefox.

Prototype, patch and run commands are in `../prototypes/02-threaded-lsp/` (see its README). Modules are in
`../artifacts/tsrs-lsp-threads.wasm` and `../artifacts/tsrs-lsp-threads.opt.wasm`.

## What I ran it on

tsrs at e083fd7 (7.1.0-beta.tsrs4), pristine, not Effect-patched. Rust 1.100.0 via `S/rust/rs`. Linux x86_64,
32 cores, 125 GB RAM, other agents building and benchmarking at the same time, so treat the numbers as rough.
Node 24.22.3, wasmtime 45.0.2, Chromium 153.0.8010.12 (Playwright 1.63), Firefox 151.0 (Playwright build
firefox-1532), WebKit 26.4 WPE (nixpkgs playwright-driver 1.59.1). Workspace: `effect@4.1.5` `.d.ts` files (628 files,
12.2 MB), the lsp-bridge `workspace.tsconfig.json`, and the bench program from `S/scripts/bench.mjs` with its one
planted TS2322 at line 7.

The session in `lsp-session.js` sends `initialize`, `initialized`, `didOpen`, a pull `textDocument/diagnostic`
(this server advertises `diagnosticProvider`, as the lsp-bridge already assumes), two hovers, a completion after
`Effect.`, a definition on the `effect` import, 20 full-text `didChange` edits that toggle the planted error, each
followed by a diagnostic pull, a last hover, then `shutdown` and `exit`. The client answers server requests such as
`client/registerCapability` with null, the same quirk the lsp-bridge handles.

## Step 1: building it

`cargo build -p tsrs_lsp --target wasm32-wasip1-threads` compiled cleanly with no changes. `tsrs_fswatch` and
`tsrs_ipc` already have `cfg(unix)` / `cfg(not(unix))` splits, and wasm is not unix, so the expected libc trouble did
not happen.

The full CLI failed in one place, twice:

```
warning: libmimalloc-sys2@0.1.66: Compiler family detection failed due to error: ToolNotFound: failed to find tool "clang": No such file or directory (os error 2)
error: failed to run custom build command for `libmimalloc-sys2 v0.1.66`
```

`tsrs_cli` and `tsrs_lint` both depend on `mimalloc-safe`. I moved the dependency to
`[target.'cfg(not(target_family = "wasm"))'.dependencies]` in both crates and added `target_family = "wasm"` to the
`#[global_allocator]` and heap-stats cfgs in both `main.rs` files. The wasm build then uses Rust's default allocator
(wasi-libc's dlmalloc). After that the whole CLI built. Release with fat LTO takes 3 to 4 minutes.

I used the full CLI rather than a new LSP-only binary because it built, and it keeps the code path identical to the
server the Scratchpad uses today. An LSP-only binary would be smaller; I did not measure how much.

For files I used WASI preopens, not the batch module's `tsrs_host.fs` imports. The LSP reaches the file system through
`osvfs`, which is std `fs`, so preopens need no tsrs changes. wasmtime gets `--dir ws::/ws`. My JS hosts implement the
WASI file calls over an in-memory image.

## Step 2: running it, and the three runtime blockers

### wasmtime needs both flags

`wasmtime run -S threads` alone fails with
`Error: shared memory support is disabled for this engine -- see Config::shared_memory`. It needs
`-S threads -W threads,shared-memory`.

### Blocker 1: 512 MB thread stacks in a 4 GiB memory

The first real run died during `didOpen`:

```
src/background/queue.rs:64:18:
failed to spawn background worker thread: Os { code: 6, kind: WouldBlock, message: "Resource temporarily unavailable" }
...
   15: 0x9a4e36 - tsrs.wasm!<tsrs_project::session::Session>::update_snapshot_with
Caused by:
    wasm trap: wasm `unreachable` instruction executed
```

On wasm a thread's stack is `malloc`ed from linear memory. tsrs asks for 512 MB per thread in nine places (the
read, dispatch and write loops, request workers, the six background workers, checker threads, `concurrent.rs`
threads) and 256 MB for the rayon parse pool. Linear memory tops out at 4 GiB, so the seventh or so thread fails. I
added `tsrs_core::thread_stack_size(native)`, which returns `native` off wasm and `TSRS_WASM_THREAD_STACK_MB` MiB on
wasm, default 16, and used it at those call sites. The build also links with `--max-memory=4294967296`; the default
for this target is 1 GiB.

### Blocker 2: the core count

std cannot know the core count on WASI. tsrs reads `available_parallelism()` for the run-slot capacity, the LSP
worker pool, the checker count, the parse pool and `concurrent.rs`. I added `tsrs_core::available_parallelism()`,
which on wasm reads `TSRS_WASM_PARALLELISM` first, and used it at those five sites. I did not check what std itself
returns on wasip1-threads; every measured run sets the variable.

### Blocker 3: `shutdown` deadlocks, because tsrs thinks the build has no threads

After those two fixes every request worked under both wasmtime and Node, but `shutdown` hung forever with zero CPU
whenever there had been more than one edit. Tracing `Session::close` showed it stuck in `background_queue.close()`
waiting for three auto-import warming tasks. Pausing every worker through the Node inspector showed all three in
`rayon_core::registry::Registry::in_worker_cold`, called from `ThreadPool::install` in
`tsrs_ls::autoimport::registry::RegistryBuilder::extract_package`. No thread anywhere was running a rayon worker loop.

The cause is `tsrs_core::NO_THREADS`:

```rust
pub const NO_THREADS: bool = cfg!(all(target_family = "wasm", not(target_feature = "atomics")));
```

On stable Rust 1.100, `rustc --print cfg` prints the same target features for `wasm32-wasip1` and
`wasm32-wasip1-threads`, and neither includes `atomics`. So `NO_THREADS` is true in the threaded build. tsrs then
builds `tsrs_compiler::worker_pool()` as a one-thread pool on the calling thread (`use_current_thread`). Whichever
thread first calls it becomes the pool's only worker, and that thread is off doing other work. Any other thread that
calls `install` waits forever. It shows up at shutdown because shutdown is the first thing that waits for the warming
tasks. Before that the requests just leaked stuck background tasks.

The fix: `NO_THREADS` also checks a custom `--cfg tsrs_wasm_threads`, which `build-threads.sh` passes. After that,
shutdown takes 12 to 118 ms and the server exits like native, with `context canceled` and status 1.

This is the one change I would call a bug fix rather than a stub. The claim in the brief, that a threaded wasm build
takes the normal multi-threaded paths, is false on stable Rust today.

### The Node host

`node:wasi` has no `thread-spawn`, so `wasi-threads.js` is my own WASI preview 1 layer, about 400 lines, shared with the
browser. Each wasm thread is one JS worker from a pool created up front. The fd table, stdin ring, file system image
and pool slots all live in SharedArrayBuffers, so all threads see the same fds. `thread-spawn` takes an idle slot with
a compare-and-swap and wakes it with `Atomics.notify`, so no event loop is involved. Its stdin is a ring buffer that
`fd_read(0)` waits on with `Atomics.wait`.

Bugs I hit in my own harness, not in tsrs: the driver's option parser split paths that contain `--`, and Node
exiting with status 13 during eager compilation because nothing kept the event loop alive.

## Step 3: the browser

`browser/page.js` runs on the page and never blocks. It fetches the module, compiles it once, posts it to 24 module
Workers (one per wasm thread slot) together with the shared memory, and feeds stdin through the same SharedArrayBuffer
ring. stdout arrives as `postMessage`. `serve.mjs` sends COOP `same-origin` and COEP `require-corp`, and the page
checks `crossOriginIsolated`.

It worked in Chromium the first time. Firefox and WebKit needed NixOS workarounds, not code changes:

- Playwright 1.63 wants `firefox-1543` and `webkit-2359`; the cache has `firefox-1532` and `webkit-2311`.
- `firefox-1532` failed with `libgtk-3.so.0: cannot open shared object file`. It ran with about 30 nixpkgs library
  paths on `LD_LIBRARY_PATH`.
- `webkit-2311` failed with `libgstreamer-1.0.so.0: cannot open shared object file`, and `ldd` lists about 60 missing
  Ubuntu libraries including ICU 74. nixpkgs' WebKit 2272 then failed `browser.newPage` under Playwright 1.63
  (protocol mismatch) and, under its own Playwright 1.59.1, with `Could not create WPE EGL display: EGL_SUCCESS.
Aborting...`. It ran with Mesa's EGL vendor file and `LIBGL_ALWAYS_SOFTWARE=1`.

## Results

Medians or ranges over three runs. Request rows are the time from sending the request to its reply. "Edit re-check"
is `didChange` followed by a diagnostic pull, median of 20 edits sent back to back. "Gap 1 s" waits a second before
each edit so the background work from the previous edit can finish. Parallelism 4 everywhere unless noted.

|                                        |             native |                wasmtime |             Node, V8 default | Node, eager TurboFan |                      Chromium 153 |                       Firefox 151 |                       WebKit 26.4 |
| -------------------------------------- | -----------------: | ----------------------: | ---------------------------: | -------------------: | --------------------------------: | --------------------------------: | --------------------------------: |
| compile module                         |                    |         in `initialize` |                        51 ms |                7.0 s |                       27 to 36 ms |                     372 to 433 ms |                      79 to 146 ms |
| `initialize`                           |        3.5 to 5 ms | 625 ms (2.3 s uncached) |                490 to 550 ms |         7.1 to 7.4 s |                             32 ms |                             15 ms |                             20 ms |
| didOpen to first diagnostics           |      125 to 156 ms |           200 to 208 ms |                478 to 600 ms |               286 ms |                     635 to 675 ms |                   907 to 1,213 ms |                 1,541 to 2,027 ms |
| server start to first diagnostics      |      130 to 164 ms |           833 to 853 ms |               1.05 to 1.15 s |         7.4 to 7.6 s |                     656 to 708 ms |                   925 to 1,230 ms |                 1,562 to 2,052 ms |
| hover on `now`                         |      2.2 to 2.8 ms |           3.3 to 4.5 ms |              12.8 to 23.4 ms |        8.8 to 9.7 ms |                   12.9 to 15.7 ms |                   12.4 to 18.8 ms |                       19 to 54 ms |
| hover on `program`                     |      3.7 to 5.1 ms |           5.6 to 9.0 ms |                  19 to 25 ms |                16 ms |                       24 to 28 ms |                       28 to 39 ms |                       60 to 93 ms |
| completion after `Effect.` (229 items) |      4.3 to 4.9 ms |           5.0 to 6.5 ms |                  15 to 23 ms |        8.1 to 8.4 ms |                       17 to 21 ms |                       13 to 15 ms |                       33 to 49 ms |
| definition                             |      1.2 to 1.5 ms |           1.8 to 2.1 ms |               6.8 to 13.6 ms |               4.1 ms |                     5.7 to 6.9 ms |                     4.4 to 6.0 ms |                       14 to 17 ms |
| edit re-check, back to back            |    12.6 to 13.6 ms |             54 to 64 ms |                  74 to 82 ms |          64 to 71 ms |                       63 to 77 ms |                       88 to 92 ms |                     168 to 193 ms |
| edit re-check, gap 1 s                 |            21.6 ms |                 33.8 ms |                              |              35.1 ms |                           41.0 ms |                            101 ms |                                   |
| OS threads                             |                 45 |               81 to 113 |                 31 (pool 24) |                   31 |                   +102 over blank |                    +52 over blank |                   +130 over blank |
| memory                                 | 100 to 238 MiB RSS |      145 to 207 MiB RSS | 555 to 667 MiB RSS (pool 24) |       630 to 715 MiB | 1,188 to 1,220 MiB PSS, blank 454 | 1,802 to 1,820 MiB PSS, blank 876 | 1,954 to 1,985 MiB PSS, blank 915 |
| wasm linear memory                     |                    |                         |      368 then 437 to 446 MiB |     369 then 444 MiB |           368 then 437 to 467 MiB |           368 then 442 to 450 MiB |           368 then 431 to 434 MiB |

The native build is release without LTO, so native is if anything a little slow here. The Node and browser runs use
the module before `wasm-opt`. All runs returned the same diagnostics as native: `[[2322, 6, "Type 'number'
is not assignable to type 'string'."]]` on open, an empty list after a fixing edit, TS2322 back after a breaking
edit, and the same hover text and 229 completion items.

Threads. tsrs had started 17 wasm threads by the first diagnostics and 42 over the session, because request workers
past the idle limit exit and later ones start new threads. At most 17 ran at once with parallelism 4, 14 with
parallelism 1 and 21 with parallelism 8. In the browser every one of those is a live Worker with its own JS heap and
instance. The pool must be sized up front; 24 was enough here.

Parallelism 1 made back-to-back edits worse, 150 to 175 ms in Node, because request work then shares one run slot
with auto-import warming. Parallelism 8 was no better than 4.

### Where the time goes

Two separate costs, both measured:

1. V8 tiering. V8 compiles lazily with its baseline compiler Liftoff first and tiers up hot functions later. Eager
   TurboFan in Node (`--no-liftoff --no-wasm-lazy-compilation`) brings hover from 13 to 23 ms down to 9 ms and first
   diagnostics from about 550 ms to 286 ms, but compiling the whole module up front takes 7 s on 32 cores. A page
   cannot pick V8's tiering, so the browser numbers above include Liftoff time.
2. Contention after each edit. Every edit starts auto-import warming on background threads. With edits back to back,
   wasm is 4 to 6 times native; with a 1 s gap it is about 1.6 times native in wasmtime and Node, and 1.9 times in
   Chromium. I suspect the global lock in wasi-libc's dlmalloc, which every thread now shares where native uses
   mimalloc, but I did not prove it.

### Download size

| module                                                       |        raw |   gzip -9 | brotli 11 |
| ------------------------------------------------------------ | ---------: | --------: | --------: |
| `tsrs-lsp-threads.wasm`, opt-level s, fat LTO, names kept    | 19,543,717 | 5,315,383 | 3,504,859 |
| `tsrs-lsp-threads.opt.wasm`, after `wasm-opt -Os` (13 s)     | 15,101,309 | 4,759,327 | 3,210,392 |
| published batch `@tsrs/wasm` 7.1.0-beta.tsrs4, for reference | 10,041,556 | 2,910,150 | 1,986,988 |

The `.opt` module passed the same Node session. The threaded module carries the whole CLI: LSP, API server, linter,
`tsc -b`. The Effect `.d.ts` image is another 12.2 MB raw; I did not compress it here.

### Deep recursion

The probe opens `export const x = 1 + 1 + ...` with N terms, pulls diagnostics and hovers `x`. Native gets 512 MB
thread stacks.

| N terms | native    | Node, 4 MB V8 stack (default) | Node, 64 MB V8 stack | Node, 1 GB V8 stack | Chromium | Firefox  | WebKit   |
| ------: | --------- | ----------------------------- | -------------------- | ------------------- | -------- | -------- | -------- |
|   1,000 | ok        | ok                            |                      |                     | ok       | ok       |          |
|   1,500 |           |                               |                      |                     | overflow | ok       |          |
|   2,000 |           |                               |                      |                     | overflow | overflow | ok       |
|   3,000 |           |                               |                      |                     |          |          | ok       |
|   4,000 |           |                               |                      |                     |          |          | overflow |
|   5,000 | ok        | ok                            |                      |                     | overflow | overflow | overflow |
|   7,000 |           | ok                            |                      |                     |          |          |          |
|  10,000 |           | overflow                      |                      |                     | overflow | overflow | overflow |
|  20,000 | ok, 1.4 s | overflow                      | ok                   | ok                  | overflow | overflow | overflow |
|  50,000 | ok, 6.5 s | overflow                      |                      | ok, 5.9 s           | overflow | overflow | overflow |

Two stacks matter on wasm. The shadow stack lives in linear memory and is what `stack_size` sets: I chose 16 MiB, and
16 MiB was enough for 50,000 terms, while 1 MiB trapped at 20,000 with `RuntimeError: memory access out of bounds`.
The binding limit is the other one, the engine's native stack that holds the wasm frames, one per JS worker. Node lets
the host raise it (`resourceLimits.stackSizeMb`). Browsers do not. Chromium fails with
`RangeError: Maximum call stack size exceeded`, Firefox with `InternalError: too much recursion`, WebKit with
`RangeError: Maximum call stack size exceeded.`, between 1,000 and 4,000 terms.

An overflow is not a failed request. The trap leaves the shared memory with locks held by a thread that no longer
runs, so the host has to kill every thread and restart the server. This differs from native in a second way: the
build uses panic = abort, so any Rust panic in a request also takes down the whole server, where native catches it
per request (`run_or_exit`, the background queue's `catch_unwind`). I inferred that from the code and the build
setting; I did not trigger a panic.

## Source changes

All in `../prototypes/02-threaded-lsp/tsrs-wasm-threads.patch`. Native `cargo check -p tsrs_cli` passes with the
patch, with no warnings.

1. `tsrs_cli` and `tsrs_lint`: `mimalloc-safe` only off wasm; allocator and heap-stat cfgs skip wasm.
2. `tsrs_core::NO_THREADS` also honours `--cfg tsrs_wasm_threads`, because `target_feature = "atomics"` is not set
   on stable for `wasm32-wasip1-threads`.
3. New `tsrs_core::thread_stack_size`, used at the stack sizes in `tsrs_lsp` (server threads, worker pool),
   `tsrs_project` background queue, `tsrs_ls::concurrent`, `tsrs_compiler` checker pool, shared graph and parse pool.
4. New `tsrs_core::available_parallelism`, used in `runslots`, the LSP worker pool, the checker count, the parse pool
   and `concurrent.rs`.
5. Build flags, not source: `--max-memory=4294967296`, `-zstack-size=8388608`, panic = abort.

## What I did not test

- Multiple files, or edits to files that are not open. The in-memory file system is read-only and immutable after
  start; a real Scratchpad would need a shared writable file system and `didChangeWatchedFiles`.
- The Effect-patched tsrs and `@effect/language-service` diagnostics. This was pristine tsrs.
- Long sessions, memory growth over time, `$/cancelRequest` under load.
- A real network download, browser code caching of the compiled module, and mobile hardware. All fetches were from
  localhost, and the first brotli fetch in Chromium (45.7 s) measured my server compressing on demand, not the
  browser.
- What std's `available_parallelism` returns on wasip1-threads.

## Verified and inferred

Verified by running: every number in the tables, every error message quoted above, the deadlock and its stack, the
fix, and the browser runs in all three engines. Inferred from reading code: why 512 MB stacks fail (malloc in linear
memory; the error and the fix agree with it), the panic = abort consequence, and the dlmalloc contention guess, which
is a guess.

## Verdict

Strategy A works, with a small patch, and the correct answer comes back in all three browsers. In Chromium the
first diagnostics take about 0.7 s after the module is loaded, hover takes 13 to 28 ms and an edit re-check about
40 to 75 ms. That is usable for a Scratchpad, but 3 to 6 times slower than native and about 750 MB more memory than
an empty Chromium tab, mostly from 17 to 21 workers that each hold an instance and a JS heap.

The blocker I cannot fix from tsrs's side without a redesign is stack depth. The checker recurses on the call stack,
browsers fix each worker's native stack, and the result fails at 1,000 to 4,000 levels of nesting, then takes the
whole server down. Fixing that means making the deep paths in the parser, binder and checker iterative or bounded
with a depth guard that reports TypeScript's own "excessively deep" errors before the engine traps. That is a large
change across tsrs, not a cfg stub. Short of it, a browser build needs a supervisor that restarts the server after a
trap and a policy for inputs that keep crashing it. I would rate Strategy A viable for a demo and risky for
production until stack depth is handled.
